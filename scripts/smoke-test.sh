#!/usr/bin/env bash
# Headless smoke: start all three, hit endpoints, kill.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

pnpm --filter fake-hermes start &
sleep 1
PANEL_TOKEN=smoketoken HERMES_API_BASE=http://127.0.0.1:18642 \
  pnpm --filter @hermes-panel/bff start &
sleep 1
VITE_PANEL_TOKEN=smoketoken pnpm --filter @hermes-panel/web dev &
sleep 4

fail=0
check() {
  local label=$1 url=$2 expected=${3:-200}
  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo 000)
  if [ "$got" = "$expected" ]; then
    echo "✓ $label ($url) → $got"
  else
    echo "✗ $label ($url) → expected $expected got $got"
    fail=1
  fi
}

check "fake-hermes health"   http://127.0.0.1:18642/health
check "bff health"           http://127.0.0.1:5667/api/system/health
check "web index"            http://127.0.0.1:5666

# Auth: should be 401 without token, 200 with
got=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5667/api/sessions)
if [ "$got" = "401" ]; then echo "✓ auth rejects missing token"; else echo "✗ auth missing token = $got"; fail=1; fi
got=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Panel-Token: smoketoken" http://127.0.0.1:5667/api/sessions)
if [ "$got" = "200" ]; then echo "✓ auth accepts valid token"; else echo "✗ auth valid token = $got"; fail=1; fi

if [ $fail -ne 0 ]; then exit 1; fi
echo ""
echo "all smoke checks passed."
