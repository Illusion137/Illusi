#!/usr/bin/env bash
#
# Fetches the large, gitignored binaries the Piper TTS engine needs and lays them
# out under ios/SherpaOnnx/ so the local SherpaOnnx pod can vendor them:
#
#   ios/SherpaOnnx/vendor/sherpa-onnx.xcframework      (+ onnxruntime.xcframework)
#   ios/SherpaOnnx/c-api.h                             (C API header → Clang module)
#   ios/SherpaOnnx/model/espeak-ng-data/               (shared phonemizer data)
#
# Voice models are NOT bundled — they download on demand in-app via
# MrLecture.downloadModel. Only espeak-ng-data ships in the binary, because
# ModelDownloader copies it beside every downloaded model and sherpa-onnx
# can't initialize a Piper/Kokoro model without it.
#
# The Swift API wrapper (SherpaOnnxAPI.swift) is NOT fetched — it is baked into
# the react-native-mr-lecture patch so it survives `npm install`.
#
# Idempotent: existing artifacts are skipped. Pass FORCE=1 to re-download.
# Run once after a fresh clone (and again if SHERPA_VERSION changes),
# then `npx pod-install` (or cd ios && pod install).
set -euo pipefail

SHERPA_VERSION="${SHERPA_VERSION:-v1.13.2}"
# Only used as the tarball to extract espeak-ng-data from (identical across models).
PIPER_MODEL="${PIPER_MODEL:-vits-piper-en_US-amy-medium}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$ROOT_DIR/ios/SherpaOnnx"
VENDOR_DIR="$DEST/vendor"
ESPEAK_DIR="$DEST/model/espeak-ng-data"

GH="https://github.com/k2-fsa/sherpa-onnx/releases/download"

mkdir -p "$VENDOR_DIR"

log() { printf '\033[1;36m[fetch-piper]\033[0m %s\n' "$*"; }

dl() { # url dest
	local url="$1" dest="$2"
	log "downloading $(basename "$dest")"
	curl -fL --retry 3 --retry-delay 2 --progress-bar "$url" -o "$dest"
}

# ---------------------------------------------------------------------------
# 1. sherpa-onnx iOS XCFrameworks (the native engine + onnxruntime)
# ---------------------------------------------------------------------------
if [[ "${FORCE:-0}" == "1" ]] || [[ ! -d "$VENDOR_DIR/sherpa-onnx.xcframework" ]]; then
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT
	dl "$GH/$SHERPA_VERSION/sherpa-onnx-$SHERPA_VERSION-ios.tar.bz2" "$tmp/sherpa.tar.bz2"
	log "extracting sherpa-onnx iOS framework"
	tar -xjf "$tmp/sherpa.tar.bz2" -C "$tmp"
	found=0
	while IFS= read -r fw; do
		name="$(basename "$fw")"
		rm -rf "$VENDOR_DIR/$name"
		cp -R "$fw" "$VENDOR_DIR/$name"
		log "vendored $name"
		found=1
	done < <(find "$tmp" -type d -name '*.xcframework')
	[[ "$found" == "1" ]] || { echo "ERROR: no .xcframework found in sherpa tarball" >&2; exit 1; }
	rm -rf "$tmp"
	trap - EXIT
else
	log "sherpa-onnx.xcframework present — skipping (FORCE=1 to redo)"
fi

# ---------------------------------------------------------------------------
# 2. C API header → exposed as the `SherpaOnnx` Clang module (see podspec).
#    Copied out of the vendored xcframework (identical across slices).
# ---------------------------------------------------------------------------
if [[ "${FORCE:-0}" == "1" ]] || [[ ! -f "$DEST/c-api.h" ]]; then
	header="$(find "$VENDOR_DIR/sherpa-onnx.xcframework" -name 'c-api.h' | head -1)"
	[[ -n "$header" ]] || { echo "ERROR: c-api.h not found in vendored xcframework" >&2; exit 1; }
	cp "$header" "$DEST/c-api.h"
	log "copied c-api.h"
else
	log "c-api.h present — skipping"
fi

# ---------------------------------------------------------------------------
# 3. espeak-ng-data (shared phonemizer data; voice models download on demand)
# ---------------------------------------------------------------------------
if [[ "${FORCE:-0}" == "1" ]] || [[ ! -d "$ESPEAK_DIR" ]]; then
	tmp="$(mktemp -d)"
	trap 'rm -rf "$tmp"' EXIT
	dl "$GH/tts-models/$PIPER_MODEL.tar.bz2" "$tmp/model.tar.bz2"
	log "extracting espeak-ng-data from $PIPER_MODEL"
	tar -xjf "$tmp/model.tar.bz2" -C "$tmp"
	espeak="$(find "$tmp" -type d -name 'espeak-ng-data' | head -1)"
	[[ -n "$espeak" ]] || { echo "ERROR: no espeak-ng-data in model tarball" >&2; exit 1; }
	rm -rf "$DEST/model"
	mkdir -p "$DEST/model"
	cp -R "$espeak" "$ESPEAK_DIR"
	log "espeak-ng-data laid out at $ESPEAK_DIR"
	rm -rf "$tmp"
	trap - EXIT
else
	log "espeak-ng-data present — skipping"
fi

log "done. Next: cd ios && pod install (or npx pod-install)"
