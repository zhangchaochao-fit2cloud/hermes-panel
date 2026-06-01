#!/usr/bin/env bash
# Install the packed npm tarball into a fresh temp project, start it, and
# verify both the packaged BFF and static web server respond.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARBALL="${1:-}"

if [ -z "$TARBALL" ]; then
  TARBALL="$(find "$ROOT/dist" -name 'hermes-panel-*.tgz' -maxdepth 1 2>/dev/null | head -1)"
fi

if [ -z "$TARBALL" ] || [ ! -f "$TARBALL" ]; then
  echo "missing npm tarball; run make release-npm first" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
LOG_FILE="$TMP_DIR/hermes-panel.log"
WEB_PORT="${PANEL_WEB_PORT:-5966}"
BFF_PORT="${PANEL_BFF_PORT:-5967}"
TOKEN="${PANEL_TOKEN:-packtest}"

cleanup() {
  kill "${PANEL_PID:-}" 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

cd "$TMP_DIR"
npm install --package-lock=false --audit=false --fund=false "$TARBALL" >/dev/null

PANEL_WEB_PORT="$WEB_PORT" \
PANEL_BFF_PORT="$BFF_PORT" \
PANEL_TOKEN="$TOKEN" \
NO_OPEN=1 \
  ./node_modules/.bin/hermes-panel >"$LOG_FILE" 2>&1 &
PANEL_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$BFF_PORT/api/system/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

curl -fsS "http://127.0.0.1:$BFF_PORT/api/system/health" >/dev/null
INDEX_HTML="$(curl -fsS "http://127.0.0.1:$WEB_PORT/")"

if ! printf '%s' "$INDEX_HTML" | grep -q "$TOKEN"; then
  echo "web index did not include injected panel token" >&2
  echo "--- hermes-panel log ---" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

PACKAGE_JSON="$(tar -xOf "$TARBALL" package/package.json)"
if printf '%s' "$PACKAGE_JSON" | grep -q 'workspace:'; then
  echo "packed package.json still contains workspace: dependencies" >&2
  exit 1
fi

echo "✓ npm package smoke passed"
