/**
 * OTA hot-update via GitHub (react-native-ota-hot-update, git mode).
 *
 * How it works:
 *  - On first launch the app shallow-clones OTA_REPO_URL (branch: "ios-ota") into the
 *    device's document directory, registers the bundle path, and restarts.
 *  - On every subsequent launch it does a `git pull`; if there are new commits it restarts
 *    (or shows an alert when silent=false).
 *
 * Crash guard:
 *  - Each launch increments a counter in MMKV before applying any update.
 *  - Call mark_launch_success() once the app has fully booted — it resets the counter.
 *  - If the counter reaches CRASH_THRESHOLD without being reset (i.e. the updated bundle
 *    kept crashing), the previous bundle is restored and the counter is cleared.
 *
 * Setup:
 *  1. Create a GitHub repo (e.g. "Illusion137/Illusi-ota").
 *  2. Set OTA_REPO_URL below.
 *  3. Call check_and_apply_update() inside on_app_load (after MMKV is ready).
 *  4. Call mark_launch_success() after the app has fully booted.
 *
 * Publish a new OTA bundle:
 *   yarn ota:release          — builds + pushes to the ios-ota branch
 *
 * NOTE: OTA only applies in release builds. Debug/dev-client always uses Metro.
 *
 * NOTE on pull detection: isomorphic-git/http/web uses ReadableStream for progress
 * reporting, which React Native's fetch() does not support. This means onProgress
 * never fires during a pull, so the library's internal `count > 0` success check
 * always returns false — calling onPullFailed("No updated") even on a real update.
 * We work around this by comparing the bundle file's mtime before and after the pull.
 */

import hotUpdate from "react-native-ota-hot-update";
import { Alert } from "react-native";
import { mmkv } from "@native/mmkv/mmkv";
import RNFS from "react-native-fs";

/** GitHub repo that stores the OTA bundles. Must be public (or use a token in the URL). */
const OTA_REPO_URL = "https://github.com/Illusion137/Illusi-ota.git";

/** Branch in OTA_REPO_URL that holds the iOS bundle. */
const OTA_BRANCH = "ios-ota";

/** Path inside the cloned repo where main.jsbundle lives. */
const OTA_BUNDLE_PATH = "output/main.jsbundle";

/** The library clones into this subdirectory of the document directory. */
const OTA_GIT_DIR = "git_hot_update";

/** MMKV key for the consecutive crash/bad-launch counter. */
const CRASH_COUNTER_KEY = "ota_crash_counter";

/** How many consecutive failed launches before we roll back. */
const CRASH_THRESHOLD = 3;

/** Full path to the bundle file on device. */
function device_bundle_path(): string {
	return `${RNFS.DocumentDirectoryPath}/${OTA_GIT_DIR}/${OTA_BUNDLE_PATH}`;
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

// ─── Crash guard ─────────────────────────────────────────────────────────────

/**
 * Increment the launch counter and roll back if we've exceeded the crash threshold.
 * Returns true if a rollback was triggered (caller should skip the normal update flow).
 */
async function check_crash_guard(): Promise<boolean> {
	const store = mmkv();
	const count = ((await store.get_number(CRASH_COUNTER_KEY)) ?? 0) + 1;
	await store.set_number(CRASH_COUNTER_KEY, count);
	console.log(`[OTA] Launch attempt #${count}`);

	if (count >= CRASH_THRESHOLD) {
		console.warn(`[OTA] ${count} consecutive bad launches — rolling back`);
		await store.set_number(CRASH_COUNTER_KEY, 0);
		const ok = await hotUpdate.rollbackToPreviousBundle();
		if (ok) {
			hotUpdate.resetApp();
		} else {
			console.error("[OTA] Rollback failed — no previous bundle available");
		}
		return true;
	}

	return false;
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
	if (__DEV__) return;

	const rolled_back = await check_crash_guard();
	if (rolled_back) return;

	// Snapshot the bundle mtime before the pull attempt.
	// isomorphic-git/http/web doesn't support RN streaming so onProgress never
	// fires, making the library report every pull as "No updated". We detect
	// real updates by comparing mtime before vs after.
	const mtime_before = await bundle_mtime();

	function handle_pull_update() {
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
		branch: OTA_BRANCH,
		bundlePath: OTA_BUNDLE_PATH,
		restartAfterInstall: false, // we handle restart ourselves so we can show UI

		onProgress: (received: number, total: number) => {
			if (total > 0) {
				const pct = ((received / total) * 100).toFixed(0);
				console.log(`[OTA] ${pct}%`);
			}
		},

		// First-ever install (clone): always restart silently — the user hasn't
		// seen any UI yet, so there's nothing to interrupt.
		onCloneSuccess: () => {
			console.log("[OTA] Initial bundle cloned, restarting…");
			hotUpdate.resetApp();
		},
		onCloneFailed: (msg: string) => {
			console.warn("[OTA] Clone failed:", msg);
		},

		// Subsequent update (pull): respect the silent flag.
		// onPullSuccess fires only if onProgress reported bytes (unlikely in RN).
		onPullSuccess: () => {
			console.log("[OTA] Bundle updated via pull (progress detected)");
			handle_pull_update();
		},

		// The library fires onPullFailed("No updated") whenever onProgress never
		// fired — which is always in RN. Check mtime to distinguish a real "no
		// changes" from a successful pull that went undetected.
		onPullFailed: async (msg: string) => {
			const mtime_after = await bundle_mtime();
			if (mtime_before !== null && mtime_after !== null && mtime_after > mtime_before) {
				console.log("[OTA] Bundle updated (detected via mtime — library progress bug workaround)");
				handle_pull_update();
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

/** Roll back to the previously installed bundle and restart. */
export async function rollback_update(): Promise<boolean> {
	return hotUpdate.rollbackToPreviousBundle();
}

/** Version number of the currently active OTA bundle (0 = shipped bundle). */
export async function current_bundle_version(): Promise<number> {
	return hotUpdate.getCurrentVersion();
}
