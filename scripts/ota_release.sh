#!/usr/bin/env bash
# ota_release.sh — build the iOS JS bundle and push it to the OTA GitHub repo.
#
# Usage:
#   yarn ota:release
#   yarn ota:release --message "fix: crash on startup"
#
# Prerequisites:
#   • git must be able to push to OTA_REPO_URL without prompting
#     (configure SSH keys, a credential helper, or embed a PAT token in the URL).
#
# What this does:
#   1. Reads the app version from package.json.
#   2. Resolves the entry file exactly the way Xcode does.
#   3. Runs expo export:embed via @expo/cli (same as the Xcode build phase).
#   4. Shallow-clones the OTA repo's ios-ota branch into a temp directory.
#   5. Copies the bundle to output/main.jsbundle and pushes.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
OTA_REPO_URL="https://github.com/Illusion137/Illusi-ota.git"
OTA_BRANCH="ios-ota"
BUNDLE_DEST="output/main.jsbundle"   # must match bundlePath in ota_update.ts

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
TMP_DIR="$(mktemp -d)"
BUNDLE_OUT="$ROOT/ios/output/main.jsbundle"
ASSETS_OUT="$ROOT/ios/output"

# ── Parse args ────────────────────────────────────────────────────────────────
VERSION=$(node -p "require('$ROOT/package.json').version")
COMMIT_MSG="OTA update v$VERSION"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --message|-m) COMMIT_MSG="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo ""
echo "┌─ Illusi OTA Release ────────────────────────────────────────────────────┐"
echo "│  Version : $VERSION"
echo "│  Branch  : $OTA_BRANCH"
echo "│  Repo    : $OTA_REPO_URL"
echo "│  Commit  : $COMMIT_MSG"
echo "└─────────────────────────────────────────────────────────────────────────┘"
echo ""

# ── Step 1: Resolve the entry file (same method as the Xcode build phase) ─────
cd "$ROOT"
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

# ── Step 4: Copy bundle and push ──────────────────────────────────────────────
echo ""
echo "▶ Copying bundle into OTA repo…"
mkdir -p "$TMP_DIR/$(dirname "$BUNDLE_DEST")"
cp "$BUNDLE_OUT" "$TMP_DIR/$BUNDLE_DEST"

cd "$TMP_DIR"
git config user.name  "OTA Release Bot"
git config user.email "ota-bot@illusi.dev"
git add "$BUNDLE_DEST"

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
