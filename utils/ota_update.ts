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
 */

import hotUpdate from "react-native-ota-hot-update";
import { Alert } from "react-native";
import { mmkv } from "@native/mmkv/mmkv";

/** GitHub repo that stores the OTA bundles. Must be public (or use a token in the URL). */
const OTA_REPO_URL = "https://github.com/Illusion137/Illusi-ota.git";

/** Branch in OTA_REPO_URL that holds the iOS bundle. */
const OTA_BRANCH = "ios-ota";

/** Path inside the cloned repo where main.jsbundle lives. */
const OTA_BUNDLE_PATH = "output/main.jsbundle";

/** MMKV key for the consecutive crash/bad-launch counter. */
const CRASH_COUNTER_KEY = "ota_crash_counter";

/** How many consecutive failed launches before we roll back. */
const CRASH_THRESHOLD = 3;

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
		onPullSuccess: () => {
			console.log("[OTA] Bundle updated via pull");
			if (silent) {
				hotUpdate.resetApp();
			} else {
				Alert.alert("Update ready", "A new version has been downloaded. Restart now?", [
					{ text: "Later", style: "cancel" },
					{ text: "Restart", onPress: async () => hotUpdate.resetApp() }
				]);
			}
		},
		onPullFailed: (msg: string) => {
			console.warn("[OTA] Pull failed:", msg);
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
