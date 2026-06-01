#!/usr/bin/env bash
# Verify the packaged desktop app contains a runnable BFF resource.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app}"

case "$APP" in
  /*) ;;
  *) APP="$ROOT/$APP" ;;
esac

APP_BFF="$APP/Contents/Resources/resources/bff"
SERVER="$APP_BFF/dist/server.js"
PORT="${BFF_PORT:-5977}"
TOKEN="${PANEL_TOKEN:-appsmoke}"
LOG_FILE="$(mktemp)"

cleanup() {
  kill "${BFF_PID:-}" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT INT TERM

if [ ! -f "$SERVER" ]; then
  echo "missing packaged BFF server: $SERVER" >&2
  exit 1
fi

if [ ! -d "$APP_BFF/node_modules/better-sqlite3" ] || [ ! -d "$APP_BFF/node_modules/keytar" ]; then
  echo "missing packaged BFF dependencies under $APP_BFF/node_modules" >&2
  exit 1
fi

(cd "$APP_BFF" && PANEL_TOKEN="$TOKEN" BFF_PORT="$PORT" NODE_ENV=production node "$SERVER" >"$LOG_FILE" 2>&1) &
BFF_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT/api/system/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -fsS "http://127.0.0.1:$PORT/api/system/health" >/dev/null; then
  echo "packaged BFF did not become healthy" >&2
  echo "--- packaged BFF log ---" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

echo "✓ desktop packaged BFF smoke passed"
