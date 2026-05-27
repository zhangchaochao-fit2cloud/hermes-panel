#!/usr/bin/env bash
# Used by tauri.conf.json beforeDevCommand.
# Prefer real local hermes (with API_SERVER enabled on :8642);
# fall back to fake-hermes on :18642 when hermes is not installed.
# Tauri waits on Vite's "ready" output, so Vite stays in foreground.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEV_TOKEN="${PANEL_TOKEN:-devtoken123}"
BFF_PORT="${BFF_PORT:-5667}"

REAL_HERMES_PORT=8642
FAKE_HERMES_PORT="${FAKE_HERMES_PORT:-18642}"
WEB_PORT=5666

# Pre-flight: kill stale panel-managed dev processes (web :5666, bff,
# fake-hermes) plus any orphan tsx watchers from a previous run.
# Note: we do NOT touch :8642 — that's the production hermes gateway and
# is managed separately below (reused if up, otherwise started fresh).
echo "[dev-prep] cleaning up stale dev processes"
lsof -i:"$WEB_PORT" -i:"$BFF_PORT" -i:"$FAKE_HERMES_PORT" -t 2>/dev/null | xargs kill 2>/dev/null || true
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "fake-hermes" 2>/dev/null || true
sleep 1

HERMES_API_BASE=""

if command -v hermes >/dev/null 2>&1; then
  # Check if user already has hermes API server up. If they do, just reuse it.
  if curl -sf --max-time 2 "http://127.0.0.1:$REAL_HERMES_PORT/health" >/dev/null; then
    echo "[dev-prep] reusing existing hermes API server on :$REAL_HERMES_PORT"
    HERMES_API_BASE="http://127.0.0.1:$REAL_HERMES_PORT"
  else
    echo "[dev-prep] starting hermes gateway with API_SERVER on :$REAL_HERMES_PORT"
    # Replace any stale gateway. API_SERVER_ENABLED makes it expose /v1/*.
    API_SERVER_ENABLED=true \
      API_SERVER_PORT="$REAL_HERMES_PORT" \
      API_SERVER_HOST=127.0.0.1 \
      API_SERVER_CORS_ORIGINS="tauri://localhost,http://127.0.0.1:5666,http://localhost:5666" \
      API_SERVER_KEY="$DEV_TOKEN" \
      hermes gateway run --replace --quiet >/tmp/hermes-panel-hermes.log 2>&1 &
    HERMES_PID=$!

    # Wait up to 10s for API server to come up
    for i in $(seq 1 20); do
      sleep 0.5
      if curl -sf --max-time 1 "http://127.0.0.1:$REAL_HERMES_PORT/health" >/dev/null; then
        echo "[dev-prep] hermes gateway pid=$HERMES_PID  http://127.0.0.1:$REAL_HERMES_PORT"
        HERMES_API_BASE="http://127.0.0.1:$REAL_HERMES_PORT"
        break
      fi
    done

    if [ -z "$HERMES_API_BASE" ]; then
      echo "[dev-prep] WARN hermes gateway did not become ready (see /tmp/hermes-panel-hermes.log)"
      kill "$HERMES_PID" 2>/dev/null || true
    fi
  fi
fi

if [ -z "$HERMES_API_BASE" ]; then
  echo "[dev-prep] falling back to fake-hermes on :$FAKE_HERMES_PORT (no real conversations)"
  PORT="$FAKE_HERMES_PORT" pnpm --filter fake-hermes start >/tmp/hermes-panel-fake.log 2>&1 &
  FAKE_PID=$!
  HERMES_API_BASE="http://127.0.0.1:$FAKE_HERMES_PORT"
  sleep 1
fi

# BFF: point at whichever hermes is alive. If we authenticated with API_SERVER_KEY,
# pass it down so the frontend can use Bearer auth.
PANEL_TOKEN="$DEV_TOKEN" \
  HERMES_API_BASE="$HERMES_API_BASE" \
  HERMES_API_KEY="$DEV_TOKEN" \
  BFF_PORT="$BFF_PORT" \
  pnpm --filter @hermes-panel/bff start >/tmp/hermes-panel-bff.log 2>&1 &
BFF_PID=$!

echo "[dev-prep] bff         pid=$BFF_PID  http://127.0.0.1:$BFF_PORT  token=$DEV_TOKEN"
echo "[dev-prep] hermes api  $HERMES_API_BASE"

cleanup() {
  kill ${HERMES_PID:-} ${FAKE_PID:-} $BFF_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

exec env \
  VITE_PANEL_TOKEN="$DEV_TOKEN" \
  VITE_HERMES_API_BASE="$HERMES_API_BASE" \
  pnpm --filter @hermes-panel/web dev
