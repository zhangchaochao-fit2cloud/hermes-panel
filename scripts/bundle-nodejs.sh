#!/bin/bash
# Bundle portable Node.js for Windows build.
# Downloads the Windows x64 Node.js binary and places it in Tauri resources.
# This eliminates the "node not found" error on fresh Windows installs.
# Adds ~30MB to the installer (compressed) vs ~50MB for full Node.js install.

set -euo pipefail

NODE_VERSION="20.19.0"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe"
DEST_DIR="packages/panel-desktop/src-tauri/resources/nodejs"
DEST_FILE="${DEST_DIR}/node.exe"

mkdir -p "$DEST_DIR"

if [ -f "$DEST_FILE" ]; then
  echo "[bundle-nodejs] node.exe already exists, skipping download"
  exit 0
fi

echo "[bundle-nodejs] downloading Node.js v${NODE_VERSION} for Windows..."
curl -fsSL "$NODE_URL" -o "$DEST_FILE"
chmod +x "$DEST_FILE"

echo "[bundle-nodejs] done: $DEST_FILE ($(du -sh "$DEST_FILE" | cut -f1))"
