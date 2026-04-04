/**
 * OTA hot-update via GitHub (react-native-ota-hot-update, git mode).
 *
 * How it works:
 *  - On first launch the app shallow-clones OTA_REPO_URL (branch: "ios-ota") into the
 *    device's document directory, registers the bundle path, and restarts.
 *  - On every subsequent launch it does a `git pull`; if there are new commits it restarts
 *    (or shows an alert when silent=false).
 *
 * Setup:
 *  1. Create a GitHub repo (e.g. "Illusion137/Illusi-ota").
 *  2. Set OTA_REPO_URL below.
 *  3. Call checkAndApplyUpdate() early in your root layout (after the app is mounted).
 *
 * Publish a new OTA bundle:
 *   yarn ota:release          — builds + pushes to the ios-ota branch
 *
 * NOTE: OTA only applies in release builds. Debug/dev-client always uses Metro.
 */

import hotUpdate from 'react-native-ota-hot-update';
import { Alert } from 'react-native';

/** GitHub repo that stores the OTA bundles. Must be public (or use a token in the URL). */
const OTA_REPO_URL = 'https://github.com/Illusion137/Illusi-ota.git';

/** Branch in OTA_REPO_URL that holds the iOS bundle. */
const OTA_BRANCH = 'ios-ota';

/** Path inside the cloned repo where main.jsbundle lives. */
const OTA_BUNDLE_PATH = 'output/main.jsbundle';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check the OTA repo for updates and apply them if available.
 *
 * @param silent  true  → restart automatically without asking the user.
 *                false → show an "Update ready — restart now?" alert (default).
 */
export async function checkAndApplyUpdate(silent = false): Promise<void> {
  if (__DEV__) return;

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
      console.log('[OTA] Initial bundle cloned, restarting…');
      hotUpdate.resetApp();
    },
    onCloneFailed: (msg: string) => {
      console.warn('[OTA] Clone failed:', msg);
    },

    // Subsequent update (pull): respect the silent flag.
    onPullSuccess: () => {
      console.log('[OTA] Bundle updated via pull');
      if (silent) {
        hotUpdate.resetApp();
      } else {
        Alert.alert(
          'Update ready',
          'A new version has been downloaded. Restart now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart', onPress: () => hotUpdate.resetApp() },
          ]
        );
      }
    },
    onPullFailed: (msg: string) => {
      console.warn('[OTA] Pull failed:', msg);
    },

    onFinishProgress: () => {
      console.log('[OTA] Done');
    },
  });
}

/** Roll back to the previously installed bundle and restart. */
export async function rollbackUpdate(): Promise<boolean> {
  return hotUpdate.rollbackToPreviousBundle();
}

/** Version number of the currently active OTA bundle (0 = shipped bundle). */
export async function currentBundleVersion(): Promise<number> {
  return hotUpdate.getCurrentVersion();
}
