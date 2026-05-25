#!/usr/bin/env bash
# Convenience: bring up fake-hermes + bff + web for local dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[1/3] starting fake-hermes :18642"
pnpm --filter fake-hermes start &

sleep 1

echo "[2/3] starting bff :5667"
PANEL_TOKEN=devtoken123 HERMES_API_BASE=http://127.0.0.1:18642 \
  pnpm --filter @hermes-panel/bff start &

sleep 1

echo "[3/3] starting web :5666"
VITE_PANEL_TOKEN=devtoken123 pnpm --filter @hermes-panel/web dev &

echo ""
echo "ready. open http://127.0.0.1:5666 — Ctrl+C to stop"
wait
