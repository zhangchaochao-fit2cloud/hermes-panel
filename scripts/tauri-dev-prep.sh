#!/usr/bin/env bash
# Used by tauri.conf.json beforeDevCommand.
# Starts fake-hermes + bff in background, then execs Vite in foreground.
# Tauri waits on Vite's "ready" output, so foreground command must be Vite.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Reuse a fixed token in dev so reloads don't break ongoing sessions
DEV_TOKEN="${PANEL_TOKEN:-devtoken123}"
FAKE_HERMES_PORT="${FAKE_HERMES_PORT:-18642}"
BFF_PORT="${BFF_PORT:-5667}"

# Kill any previous dev instances on the same ports (idempotent)
lsof -ti tcp:"$FAKE_HERMES_PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti tcp:"$BFF_PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true

# Background: fake-hermes
PORT="$FAKE_HERMES_PORT" pnpm --filter fake-hermes start >/tmp/hermes-panel-fake.log 2>&1 &
FAKE_PID=$!

# Background: bff (points at fake-hermes)
PANEL_TOKEN="$DEV_TOKEN" \
  HERMES_API_BASE="http://127.0.0.1:$FAKE_HERMES_PORT" \
  BFF_PORT="$BFF_PORT" \
  pnpm --filter @hermes-panel/bff start >/tmp/hermes-panel-bff.log 2>&1 &
BFF_PID=$!

echo "[dev-prep] fake-hermes pid=$FAKE_PID  http://127.0.0.1:$FAKE_HERMES_PORT"
echo "[dev-prep] bff         pid=$BFF_PID  http://127.0.0.1:$BFF_PORT  token=$DEV_TOKEN"

# When this script (and thus the parent vite) exits, clean up
trap 'kill $FAKE_PID $BFF_PID 2>/dev/null || true' EXIT INT TERM

# Foreground: Vite — Tauri reads this stdout for the "ready" line
exec env \
  VITE_PANEL_TOKEN="$DEV_TOKEN" \
  VITE_HERMES_API_BASE="http://127.0.0.1:$FAKE_HERMES_PORT" \
  pnpm --filter @hermes-panel/web dev
