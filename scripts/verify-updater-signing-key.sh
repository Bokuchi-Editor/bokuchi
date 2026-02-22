#!/usr/bin/env bash
# Verify Tauri updater signing key before a long build.
# Uses the same key decoding as "tauri build", so failures surface early.
# Usage: run from repo root with TAURI_SIGNING_PRIVATE_KEY (and optionally
#        TAURI_SIGNING_PRIVATE_KEY_PASSWORD) set in the environment.
# Exit: 0 if key is valid or not set (skip); 1 if key is set but invalid.

set -e

if [ -z "${TAURI_SIGNING_PRIVATE_KEY}" ]; then
  echo "TAURI_SIGNING_PRIVATE_KEY is not set. Skipping updater signing key verification."
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TMPFILE=""
cleanup() {
  [ -n "$TMPFILE" ] && [ -f "$TMPFILE" ] && rm -f "$TMPFILE" "${TMPFILE}.sig"
}
trap cleanup EXIT

TMPFILE=$(mktemp)
echo "verify" > "$TMPFILE"

echo "Verifying Tauri updater signing key..."
if npm run tauri -- signer sign "$TMPFILE" >/dev/null 2>&1; then
  echo "Updater signing key is valid."
  exit 0
else
  echo "ERROR: Updater signing key verification failed."
  echo "Check TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD."
  echo "See docs/UPDATER_SIGNING.md for troubleshooting."
  npm run tauri -- signer sign "$TMPFILE" 2>&1 || true
  exit 1
fi
