#!/usr/bin/env bash
# Bring up hermes gateway + bff + web for local dev.
# Uses the real hermes binary — no mock/fake needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[0/3] cleaning up stale dev processes"
lsof -i:5666 -i:5667 -i:8642 -t 2>/dev/null | xargs kill 2>/dev/null || true
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
sleep 1

echo "[1/3] starting hermes gateway :8642"
hermes gateway run --replace --quiet &
HERMES_PID=$!
sleep 2

# Wait for hermes to be healthy
for i in $(seq 1 15); do
  if curl -sf http://127.0.0.1:8642/health > /dev/null 2>&1; then
    echo "  hermes gateway ready"
    break
  fi
  sleep 1
done

echo "[2/3] starting bff :5667"
PANEL_TOKEN=devtoken123 \
  pnpm --filter @hermes-panel/bff start &

sleep 1

echo "[3/3] starting web :5666"
VITE_PANEL_TOKEN=devtoken123 pnpm --filter @hermes-panel/web dev &

echo ""
echo "ready. open http://127.0.0.1:5666 — Ctrl+C to stop"
wait
