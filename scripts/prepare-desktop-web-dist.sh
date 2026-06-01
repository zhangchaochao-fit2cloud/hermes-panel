#!/usr/bin/env bash
# Remove web-only downloadable/icon-source assets before Tauri embeds dist.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIST="$ROOT_DIR/packages/panel-web/dist"

if [ ! -d "$WEB_DIST" ]; then
  echo "missing panel-web dist: $WEB_DIST" >&2
  exit 1
fi

rm -rf \
  "$WEB_DIST/icons/hermes-panel" \
  "$WEB_DIST/icons/source"

echo "✓ pruned desktop web dist at $WEB_DIST"
