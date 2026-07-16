#!/usr/bin/env bash
# ota_release.sh — build the iOS JS bundle and push it to the OTA GitHub repo.
#
# Usage:
#   yarn ota:release
#   yarn ota:release --message "fix: crash on startup"
#   yarn ota:release --target 21.0.9   # push a JS-only fix to an already-shipped binary
#
# Prerequisites:
#   • git must be able to push to OTA_REPO_URL without prompting
#     (configure SSH keys, a credential helper, or embed a PAT token in the URL).
#
# What this does:
#   1. Reads the app version from package.json (or --target).
#   2. Resolves the entry file exactly the way Xcode does.
#   3. Runs expo export:embed via @expo/cli (same as the Xcode build phase).
#   4. Shallow-clones the OTA repo's ios-ota-v<version> branch into a temp dir.
#   5. Copies the bundle to output/main.jsbundle, the image assets to
#      output/assets/ (required — see Step 4 below), and pushes.
#
# IMPORTANT — version gating: each binary version pulls ONLY from its own
# branch (ios-ota-v<CFBundleShortVersionString>, see utils/ota_update.ts).
# A push lands on devices only if the branch version matches the binary
# version users have installed. So:
#   • For a JS-only hotfix, do NOT bump package.json — or pass
#     --target <shipped version> explicitly.
#   • Never push a bundle built against different native code to an old
#     version's branch — that's what the version gating exists to prevent.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
OTA_REPO_URL="https://github.com/Illusion137/Illusi-ota.git"
BUNDLE_DEST="output/main.jsbundle"   # must match bundlePath in ota_update.ts

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
TMP_DIR="$(mktemp -d)"
BUNDLE_OUT="$ROOT/ios/output/main.jsbundle"
ASSETS_OUT="$ROOT/ios/output"

# ── Parse args ────────────────────────────────────────────────────────────────
VERSION=$(node -p "require('$ROOT/package.json').version")
TARGET_VERSION=""
COMMIT_MSG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --message|-m) COMMIT_MSG="$2"; shift 2 ;;
    --target|-t)  TARGET_VERSION="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -n "$TARGET_VERSION" && "$TARGET_VERSION" != "$VERSION" ]]; then
  echo "⚠  Targeting binary v$TARGET_VERSION with a bundle built from source at v$VERSION."
  echo "   Make sure no native modules changed between those versions."
  VERSION="$TARGET_VERSION"
fi
OTA_BRANCH="ios-ota-v$VERSION"
[[ -n "$COMMIT_MSG" ]] || COMMIT_MSG="OTA update v$VERSION"

echo ""
echo "┌─ Illusi OTA Release ────────────────────────────────────────────────────┐"
echo "│  Version : $VERSION"
echo "│  Branch  : $OTA_BRANCH"
echo "│  Repo    : $OTA_REPO_URL"
echo "│  Commit  : $COMMIT_MSG"
echo "└─────────────────────────────────────────────────────────────────────────┘"
echo ""

# ── Step 0: Sync the vendored lib-origin copy ────────────────────────────────
# Metro resolves @illusive/@origin/etc to mobile/lib-origin — a filtered COPY of
# ../lib-origin — so without this sync a standalone `yarn ota:release` would
# silently bundle stale library code. (Being gitignored is irrelevant: Metro
# reads the filesystem, not git.) Note: release.sh additionally refreshes
# ../lib-origin's .env cookies via its prebuild.ts first; that step is
# deliberately not repeated here.
cd "$ROOT"
echo "▶ Syncing lib-origin (yarn prebuild)…"
yarn prebuild

# ── Step 1: Resolve the entry file (same method as the Xcode build phase) ─────
NODE_BINARY=$(command -v node)
ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$ROOT" ios absolute | tail -n 1)"
echo "▶ Entry file: $ENTRY_FILE"

# Resolve @expo/cli path the same way Xcode does
CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"

# ── Step 2: Build the bundle ──────────────────────────────────────────────────
echo ""
echo "▶ Building iOS bundle…"
mkdir -p "$ASSETS_OUT"

"$NODE_BINARY" "$CLI_PATH" export:embed \
  --entry-file "$ENTRY_FILE" \
  --platform ios \
  --dev false \
  --reset-cache \
  --bundle-output "$BUNDLE_OUT" \
  --assets-dest "$ASSETS_OUT"

if [[ ! -f "$BUNDLE_OUT" ]]; then
  echo "✗ Bundle not found at $BUNDLE_OUT — aborting."
  exit 1
fi

echo "✓ Bundle built: $(du -sh "$BUNDLE_OUT" | cut -f1)"

# ── Step 3: Clone the OTA repo ────────────────────────────────────────────────
echo ""
echo "▶ Cloning OTA repo (branch: $OTA_BRANCH)…"

if git clone --depth 1 --branch "$OTA_BRANCH" "$OTA_REPO_URL" "$TMP_DIR" 2>/dev/null; then
  echo "✓ Cloned existing branch"
else
  echo "  Branch '$OTA_BRANCH' not found — initialising"
  if git clone --depth 1 "$OTA_REPO_URL" "$TMP_DIR" 2>/dev/null; then
    cd "$TMP_DIR"
    git checkout -B "$OTA_BRANCH"
    cd "$ROOT"
  else
    # Repo doesn't exist yet — bare init
    git init "$TMP_DIR"
    cd "$TMP_DIR"
    git remote add origin "$OTA_REPO_URL"
    git checkout -b "$OTA_BRANCH"
    cd "$ROOT"
  fi
fi

# ── Step 4: Copy bundle + assets and push ─────────────────────────────────────
# Local `require()`'d images (e.g. context-menu icons) resolve at runtime to a
# file:// URL built as `dirname(scriptURL) + "assets/<relative path>"` (see
# react-native's AssetSourceResolver.scaledAssetURLNearBundle). For a bundle
# booted from the git-cloned dir, that's `<git_dir>/output/assets/...` — the
# exact same layout export:embed writes locally via --assets-dest ("$ASSETS_OUT").
# Without shipping that folder too, the image file doesn't exist at the path the
# JS bundle expects; RN's own CodePush-style fallback (RCTImageFromLocalBundleAssetURL)
# then throws NSInvalidArgumentException instead of failing gracefully, crashing
# the app the moment a context menu with a REQUIRE'd icon is opened.
echo ""
echo "▶ Copying bundle + assets into OTA repo…"
mkdir -p "$TMP_DIR/$(dirname "$BUNDLE_DEST")"
cp "$BUNDLE_OUT" "$TMP_DIR/$BUNDLE_DEST"
rm -rf "$TMP_DIR/output/assets"
cp -R "$ASSETS_OUT/assets" "$TMP_DIR/output/assets"

cd "$TMP_DIR"
git config user.name  "OTA Release Bot"
git config user.email "ota-bot@illusi.dev"
git add "$BUNDLE_DEST" output/assets

if git diff --cached --quiet; then
  echo "⚠  Bundle unchanged — nothing new to push."
else
  git commit -m "$COMMIT_MSG"
  git push origin "$OTA_BRANCH" --force
  echo "✓ Pushed to $OTA_REPO_URL ($OTA_BRANCH)"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
cd "$ROOT"
rm -rf "$TMP_DIR"

echo ""
echo "✓ OTA release done — v$VERSION is live."
echo ""
