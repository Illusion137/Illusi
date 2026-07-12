/**
 * OTA hot-update via GitHub (react-native-ota-hot-update, git mode).
 *
 * How it works:
 *  - Bundles live in OTA_REPO_URL on a branch **per native binary version**
 *    ("ios-ota-v21.0.9", …). A bundle is only ever pulled by binaries whose
 *    native code it was built against, so a JS push can never crash an older
 *    installed binary (the old single shared "ios-ota" branch could).
 *  - On first launch the app shallow-clones its version branch into the
 *    device's document directory, registers the bundle path, and restarts.
 *  - On every subsequent launch it does a `git pull`; when the bundle file
 *    changes, the bundle path is re-registered and the app restarts (or shows
 *    an alert when silent=false).
 *  - After a binary update the native side ignores the old bundle
 *    (VERSION_NAME check in OtaHotUpdate.getBundle) and the branch name no
 *    longer matches the clone, so the stale clone is wiped and the new
 *    version's branch is cloned fresh. Until that branch exists (first
 *    `yarn ota:release` after a store release) the clone fails harmlessly and
 *    the embedded bundle is used.
 *
 * Crash guard:
 *  - The first update check in a process increments a counter in MMKV (once per
 *    process — repeat checks, e.g. the dev screen, do not re-count).
 *  - Call mark_launch_success() once the app has survived the crash-prone
 *    startup window — it resets the counter. This must run *after* the
 *    increment (on a delay, not right after on_app_load), or a bundle that
 *    crashes on launch would keep resetting the counter and never roll back.
 *  - Applying a bundle (clone/pull) resets the counter so each new bundle gets
 *    a fresh CRASH_THRESHOLD boots to prove itself.
 *  - If the counter reaches CRASH_THRESHOLD (the updated bundle kept
 *    crashing), the app re-registers the *embedded* bundle and quarantines the
 *    bad OTA bundle by mtime: it will not be re-applied until a newer commit
 *    is pulled.
 *
 * Publish a new OTA bundle:
 *   yarn ota:release          — builds + pushes to ios-ota-v<package.json version>
 *   The package.json version MUST match the binary version users have
 *   installed, or nobody will receive the update.
 *
 * NOTE: OTA only applies in iOS release builds. Debug/dev-client always uses
 * Metro.
 *
 * NOTE on pull detection: isomorphic-git/http/web uses ReadableStream for
 * progress reporting, which React Native's fetch() does not support. onProgress
 * therefore never fires during a pull, so the library's internal `count > 0`
 * success check always returns false — calling onPullFailed("No updated") even
 * on a real update. We detect real updates by comparing the bundle file's
 * mtime before and after the pull, and — critically — we re-register the
 * bundle path with the native side ourselves: the library only registers it on
 * the initial clone, so without this every pulled update was silently ignored
 * whenever the native PATH had been cleared (binary update, crash rollback).
 */

import hotUpdate from "react-native-ota-hot-update";
import { Alert, NativeModules, Platform } from "react-native";
import { GLOBALS } from "@illusive/globals";
import { mmkv } from "@native/mmkv/mmkv";
import Constants from "expo-constants";
import RNFS from "react-native-fs";
import * as Sentry from "@sentry/react-native";

/** GitHub repo that stores the OTA bundles. Must be public (or use a token in the URL). */
const OTA_REPO_URL = "https://github.com/Illusion137/Illusi-ota.git";

/** Path inside the cloned repo where main.jsbundle lives. */
const OTA_BUNDLE_PATH = "output/main.jsbundle";

/** The library clones into this subdirectory of the document directory. */
const OTA_GIT_DIR = "git_hot_update";

/** MMKV key for the consecutive crash/bad-launch counter. */
const CRASH_COUNTER_KEY = "ota_crash_counter";

/** MMKV key holding the mtime of a bundle that crash-looped and was rolled back. */
const QUARANTINE_MTIME_KEY = "ota_quarantined_bundle_mtime";

/** How many consecutive failed launches before we roll back. */
const CRASH_THRESHOLD = 3;

/**
 * Whether this JS process has already been counted as a launch attempt.
 * A single app process is a single launch, but check_and_apply_update can run
 * multiple times within one process (the dev screen's manual "check now", a
 * future foreground re-check, …). Counting each of those bumped the crash
 * counter with no crash involved, and once it reached CRASH_THRESHOLD the guard
 * rolled back to the embedded bundle and skipped the update outright — so a
 * perfectly good bundle already on disk never applied. Gate the increment on
 * this flag so only the first check per process counts.
 */
let launch_attempt_counted = false;

/**
 * Version of the installed native binary. expo-constants embeds app.config
 * into the native bundle at build time (EXConstants.bundle), so this stays
 * correct even when the running JS came from an OTA bundle built at a
 * different version — exactly the property the branch gating needs.
 */
function native_binary_version(): string | null {
	return Constants.expoConfig?.version ?? null;
}

/** Branch in OTA_REPO_URL holding the bundle for this binary version. */
function ota_branch(): string | null {
	const version = native_binary_version();
	return version === null ? null : `ios-ota-v${version}`;
}

/** Full path to the cloned OTA repo on device. */
function git_dir_path(): string {
	return `${RNFS.DocumentDirectoryPath}/${OTA_GIT_DIR}`;
}

/** Full path to the bundle file on device. */
function device_bundle_path(): string {
	return `${git_dir_path()}/${OTA_BUNDLE_PATH}`;
}

/** Path of the bundle shipped inside the app binary (rollback target). */
function embedded_bundle_path(): string {
	return `${RNFS.MainBundlePath}/main.jsbundle`;
}

/** Returns the mtime (ms) of the bundle file, or null if it doesn't exist. */
async function bundle_mtime(): Promise<number | null> {
	try {
		const stat = await RNFS.stat(device_bundle_path());
		return new Date(stat.mtime).getTime();
	} catch (_) {
		return null;
	}
}

/** Delete the cloned OTA repo (forces a fresh clone on the next check). */
async function wipe_git_dir(): Promise<void> {
	try {
		await RNFS.unlink(git_dir_path());
	} catch (_) {
		// didn't exist
	}
}

/** Which JS bundle this process actually booted from. */
function running_bundle(): "ota" | "embedded" | "metro" {
	const source_code = NativeModules?.SourceCode;
	const script_url: string = source_code?.getConstants?.()?.scriptURL ?? source_code?.scriptURL ?? "";
	if (script_url.includes(`/${OTA_GIT_DIR}/`)) return "ota";
	if (script_url.startsWith("http")) return "metro";
	return "embedded";
}

/**
 * Report the real OTA state to Sentry. The SDK's built-in "OTA Updates"
 * (ota_updates) context only knows about expo-updates — which this app doesn't
 * use — so it permanently shows is_enabled=false and can't be overridden (the
 * ExpoContext integration re-stamps it on every event). This context is the
 * one to read when triaging.
 */
async function set_sentry_ota_context(branch: string | null): Promise<void> {
	try {
		Sentry.setContext("ota_hot_update", {
			is_enabled: branch !== null,
			branch,
			running_bundle: running_bundle(),
			bundle_mtime: await bundle_mtime(),
			quarantined: (await mmkv().get_number(QUARANTINE_MTIME_KEY)) !== undefined
		});
	} catch (_) {
		// telemetry only — never let it break the update flow
	}
}

// ─── Crash guard ─────────────────────────────────────────────────────────────

/**
 * Increment the launch counter and roll back if we've exceeded the crash threshold.
 * Returns true if a rollback was triggered (caller should skip the normal update flow).
 *
 * Rollback = point the native loader back at the embedded bundle and remember
 * the bad bundle's mtime. The cloned repo is left intact so a future pull with
 * a fix (mtime > quarantined mtime) recovers automatically; the unchanged bad
 * bundle is never re-applied. (The library's rollbackToPreviousBundle only
 * works for versioned zip updates — in git mode there is no bundle history,
 * so it always failed and crash loops previously ran forever.)
 */
async function check_crash_guard(): Promise<boolean> {
	// Count a launch at most once per process — see launch_attempt_counted.
	if (launch_attempt_counted) return false;
	launch_attempt_counted = true;

	const store = mmkv();
	const count = ((await store.get_number(CRASH_COUNTER_KEY)) ?? 0) + 1;
	await store.set_number(CRASH_COUNTER_KEY, count);
	console.log(`[OTA] Launch attempt #${count}`);

	if (count < CRASH_THRESHOLD) return false;

	console.warn(`[OTA] ${count} consecutive bad launches — rolling back to embedded bundle`);
	await store.set_number(CRASH_COUNTER_KEY, 0);

	const bad_mtime = await bundle_mtime();
	if (bad_mtime !== null) await store.set_number(QUARANTINE_MTIME_KEY, bad_mtime);

	const ok = await hotUpdate.setupExactBundlePath(embedded_bundle_path());
	if (ok) {
		hotUpdate.resetApp();
	} else {
		// Embedded bundle not found where expected — last resort: delete the OTA
		// bundle files and clear the native path entirely.
		console.error("[OTA] Could not register embedded bundle — removing OTA bundle instead");
		hotUpdate.removeUpdate(true);
	}
	return true;
}

/**
 * Call this once the app has survived the crash-prone startup window (see the
 * delayed caller in app/_layout.tsx). Resets the crash counter so a healthy
 * launch doesn't contribute to a future rollback. Must run *after*
 * check_and_apply_update has incremented the counter for this process, or the
 * guard can never accumulate across a crash loop.
 */
export async function mark_launch_success(): Promise<void> {
	if (__DEV__) return;
	await mmkv().set_number(CRASH_COUNTER_KEY, 0);
	console.log("[OTA] Launch success — crash counter reset");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check the OTA repo for updates and apply them if available.
 * Requires MMKV to already be loaded (call after on_app_load).
 *
 * @param silent  true  → restart automatically without asking the user.
 *                false → show an "Update ready — restart now?" alert (default).
 */
export async function check_and_apply_update(silent = false): Promise<void> {
	if (__DEV__ || Platform.OS !== "ios") return;

	const branch = ota_branch();
	set_sentry_ota_context(branch).catch((e) => e);
	if (branch === null) {
		console.warn("[OTA] Native binary version unavailable — skipping update check");
		return;
	}

	const rolled_back = await check_crash_guard();
	if (rolled_back) return;

	// A clone from a previous binary version (or the legacy shared "ios-ota"
	// branch) tracks the wrong branch — pull would never see this version's
	// updates. Wipe it and clone the right branch fresh.
	const cloned_branch: string | null = await hotUpdate.git.getBranchName();
	if (cloned_branch !== null && cloned_branch !== branch) {
		console.log(`[OTA] Clone tracks '${cloned_branch}' but binary needs '${branch}' — recloning`);
		await wipe_git_dir();
	}

	// Snapshot the bundle mtime before the pull attempt (see header NOTE on
	// why update detection is mtime-based).
	const mtime_before = await bundle_mtime();

	// Register the pulled bundle with the native loader and restart. The
	// library does this only on the initial clone; after a pull the native
	// PATH may be stale or cleared (binary update, crash rollback), so we must
	// re-register it explicitly or the update never takes effect.
	async function apply_pulled_bundle() {
		const store = mmkv();
		const mtime_after = await bundle_mtime();
		if (mtime_after === null) return;

		const quarantined_mtime = await store.get_number(QUARANTINE_MTIME_KEY);
		if (quarantined_mtime !== undefined) {
			if (mtime_after <= quarantined_mtime) {
				console.log("[OTA] Bundle is quarantined after a crash rollback — waiting for a newer push");
				return;
			}
			await store.remove_key(QUARANTINE_MTIME_KEY);
		}

		const registered = await hotUpdate.setupExactBundlePath(device_bundle_path());
		if (!registered) {
			console.warn("[OTA] Failed to register pulled bundle path");
			return;
		}
		// A freshly applied bundle earns a fresh crash budget: reset the counter
		// so CRASH_THRESHOLD is measured against *this* bundle's boots, not the
		// launches of whatever bundle was running when we downloaded it.
		await store.set_number(CRASH_COUNTER_KEY, 0);
		// Surface the update via the app's toast system. In silent mode this is
		// the only notice the user gets before the restart; in the alert path it
		// complements the modal.
		GLOBALS.global_var.bottom_alert?.("Update downloaded — restarting to apply", "GOOD");
		if (silent) {
			hotUpdate.resetApp();
		} else {
			Alert.alert("Update ready", "A new version has been downloaded. Restart now?", [
				{ text: "Later", style: "cancel" },
				{ text: "Restart", onPress: async () => hotUpdate.resetApp() }
			]);
		}
	}

	await hotUpdate.git.checkForGitUpdate({
		url: OTA_REPO_URL,
		branch,
		bundlePath: OTA_BUNDLE_PATH,
		restartAfterInstall: false, // we handle restart ourselves so we can show UI

		onProgress: (received: number, total: number) => {
			if (total > 0) {
				const pct = ((received / total) * 100).toFixed(0);
				console.log(`[OTA] ${pct}%`);
			}
		},

		// First-ever install (clone): always restart silently — the user hasn't
		// seen any UI yet, so there's nothing to interrupt. The library already
		// registered the bundle path itself on clone success.
		onCloneSuccess: () => {
			console.log("[OTA] Initial bundle cloned, restarting…");
			// Fresh clone → fresh crash budget for the bundle we're about to boot.
			mmkv().set_number(CRASH_COUNTER_KEY, 0).catch((e) => e);
			hotUpdate.resetApp();
		},
		onCloneFailed: (msg: string) => {
			// Expected until the first ota:release for this binary version. Wipe
			// whatever the failed clone left behind — a partial .git dir would make
			// the next check take the pull path and wedge OTA permanently.
			console.warn("[OTA] Clone failed:", msg);
			wipe_git_dir().catch((e) => e);
		},

		// Subsequent update (pull): respect the silent flag.
		// onPullSuccess fires only if onProgress reported bytes (unlikely in RN).
		onPullSuccess: () => {
			console.log("[OTA] Bundle updated via pull (progress detected)");
			apply_pulled_bundle().catch((e) => console.warn("[OTA] Apply failed:", e));
		},

		// The library fires onPullFailed("No updated") whenever onProgress never
		// fired — which is always in RN. Check mtime to distinguish a real "no
		// changes" from a successful pull that went undetected.
		onPullFailed: async (msg: string) => {
			const mtime_after = await bundle_mtime();
			const updated = mtime_after !== null && (mtime_before === null || mtime_after > mtime_before);
			if (updated) {
				console.log("[OTA] Bundle updated (detected via mtime — library progress bug workaround)");
				apply_pulled_bundle().catch((e) => console.warn("[OTA] Apply failed:", e));
				return;
			}
			if (msg === "No updated") {
				console.log("[OTA] Already up to date");
			} else {
				console.warn("[OTA] Pull failed:", msg);
			}
		},

		onFinishProgress: () => {
			console.log("[OTA] Done");
		}
	});
}

/**
 * Force this version's latest OTA bundle to (re)apply, bypassing every
 * short-circuit that normally suppresses an update:
 *  - clears a crash-rollback quarantine,
 *  - resets the crash counter (so the guard can't early-return),
 *  - wipes the on-device clone so the next check clones the branch tip fresh
 *    (the CLONE path always registers + restarts, sidestepping the pull's
 *    "already up to date" mtime check).
 *
 * Then runs the update silently — on success the app re-clones the tip and
 * restarts into it. No-op in dev builds (Metro serves the JS) and off-iOS,
 * same as check_and_apply_update. Intended for the dev screen.
 */
export async function force_update_to_latest(): Promise<void> {
	if (__DEV__ || Platform.OS !== "ios") return;
	const store = mmkv();
	await store.remove_key(QUARANTINE_MTIME_KEY);
	await store.set_number(CRASH_COUNTER_KEY, 0);
	await wipe_git_dir();
	await check_and_apply_update(true);
}

/** Roll back to the embedded bundle and quarantine the current OTA bundle. */
export async function rollback_update(): Promise<boolean> {
	const bad_mtime = await bundle_mtime();
	if (bad_mtime !== null) await mmkv().set_number(QUARANTINE_MTIME_KEY, bad_mtime);
	return hotUpdate.setupExactBundlePath(embedded_bundle_path());
}

/** Version number of the currently active OTA bundle (0 = shipped bundle). */
export async function current_bundle_version(): Promise<number> {
	return hotUpdate.getCurrentVersion();
}

// ─── Diagnostics (dev screen) ────────────────────────────────────────────────

export interface OTADiagnostics {
	/** OTA is a no-op in dev builds — everything below is still readable. */
	is_dev: boolean;
	enabled: boolean;
	binary_version: string | null;
	expected_branch: string | null;
	/** Branch of the on-device clone; null when nothing has been cloned yet. */
	cloned_branch: string | null;
	/** mtime (ms) of the pulled bundle on disk; null when never cloned. */
	bundle_mtime: number | null;
	running_bundle: "ota" | "embedded" | "metro";
	quarantined_mtime: number | null;
	crash_counter: number;
	repo_url: string;
}

/** Snapshot of the full on-device OTA state (works in dev builds too). */
export async function get_ota_diagnostics(): Promise<OTADiagnostics> {
	const store = mmkv();
	let cloned_branch: string | null = null;
	try {
		cloned_branch = (await hotUpdate.git.getBranchName()) ?? null;
	} catch (_) {
		cloned_branch = null;
	}
	return {
		is_dev: __DEV__,
		enabled: !__DEV__ && Platform.OS === "ios" && ota_branch() !== null,
		binary_version: native_binary_version(),
		expected_branch: ota_branch(),
		cloned_branch,
		bundle_mtime: await bundle_mtime(),
		running_bundle: running_bundle(),
		quarantined_mtime: (await store.get_number(QUARANTINE_MTIME_KEY)) ?? null,
		crash_counter: (await store.get_number(CRASH_COUNTER_KEY)) ?? 0,
		repo_url: OTA_REPO_URL
	};
}

export interface OTARemoteBundle {
	sha: string;
	date: string;
	message: string;
}

/**
 * List the bundle commits available on this binary version's branch, newest
 * first (GitHub API). Returns [] when the branch doesn't exist yet — i.e. no
 * ota:release has been run for this version.
 */
export async function list_remote_bundles(): Promise<OTARemoteBundle[]> {
	const branch = ota_branch();
	if (branch === null) throw new Error("Native binary version unavailable");
	const repo = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(OTA_REPO_URL);
	if (repo === null) throw new Error(`Not a GitHub repo URL: ${OTA_REPO_URL}`);
	const response = await fetch(`https://api.github.com/repos/${repo[1]}/${repo[2]}/commits?sha=${encodeURIComponent(branch)}&per_page=20`, { headers: { Accept: "application/vnd.github+json" } });
	// 404/422 = repo or branch missing — expected before the first ota:release
	if (response.status === 404 || response.status === 422) return [];
	if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
	const commits = (await response.json()) as { sha: string; commit: { message: string; committer?: { date?: string }; author?: { date?: string } } }[];
	return commits.map((c) => ({
		sha: c.sha,
		date: c.commit.committer?.date ?? c.commit.author?.date ?? "",
		message: c.commit.message.split("\n")[0]
	}));
}

/** Lift a crash-rollback quarantine so the current remote bundle can apply again. */
export async function clear_quarantine(): Promise<void> {
	await mmkv().remove_key(QUARANTINE_MTIME_KEY);
}

/** Delete the on-device clone; the next check does a fresh clone. */
export async function wipe_ota_clone(): Promise<void> {
	await wipe_git_dir();
}
