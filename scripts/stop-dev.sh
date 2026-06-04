#!/usr/bin/env bash
# Stop Hermes Panel dev processes managed by this repository.
# Leaves the real Hermes gateway on :8642 alone; use `make gateway-stop` for it.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-stop}"
PORTS=(5666 5667 18642)

collect_port_pids() {
  local port
  for port in "${PORTS[@]}"; do
    lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  done
}

collect_process_pids() {
  ps -axo pid=,command= | awk -v root="$ROOT" '
    $0 ~ /scripts\/stop-dev\.sh/ { next }
    index($0, root) && ($0 ~ /vite\/bin\/vite/ || $0 ~ /tsx/ || $0 ~ /fake-hermes/ || $0 ~ /cargo tauri dev/ || $0 ~ /hermes-panel-desktop/) { print $1; next }
    $0 ~ /target\/debug\/hermes-panel-desktop/ { print $1; next }
  '
}

collect_pids() {
  {
    collect_port_pids
    collect_process_pids
  } | awk 'NF' | sort -u
}

kill_pids() {
  local signal="$1"
  shift
  if [ "$#" -eq 0 ]; then
    return 0
  fi
  kill "-$signal" "$@" 2>/dev/null || true
}

pids=()
while IFS= read -r pid; do
  pids+=("$pid")
done < <(collect_pids)
if [ "${#pids[@]}" -eq 0 ]; then
  echo "no panel dev processes found"
  exit 0
fi

if [ "$MODE" = "--force" ] || [ "$MODE" = "force" ]; then
  echo "killing panel dev pids: ${pids[*]}"
  kill_pids KILL "${pids[@]}"
  exit 0
fi

echo "stopping panel dev pids: ${pids[*]}"
kill_pids TERM "${pids[@]}"
sleep 1

leftovers=()
while IFS= read -r pid; do
  leftovers+=("$pid")
done < <(collect_pids)
if [ "${#leftovers[@]}" -gt 0 ]; then
  echo "forcing remaining panel dev pids: ${leftovers[*]}"
  kill_pids KILL "${leftovers[@]}"
fi
