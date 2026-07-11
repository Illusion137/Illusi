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
 *  - Each launch increments a counter in MMKV before applying any update.
 *  - Call mark_launch_success() once the app has fully booted — it resets it.
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
import { Alert, Platform } from "react-native";
import { mmkv } from "@native/mmkv/mmkv";
import Constants from "expo-constants";
import RNFS from "react-native-fs";

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
 * Call this once the app has fully booted successfully.
 * Resets the crash counter so a healthy launch doesn't trigger a future rollback.
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
