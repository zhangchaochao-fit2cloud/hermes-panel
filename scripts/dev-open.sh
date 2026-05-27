#!/usr/bin/env bash
# One-command "open the Mac desktop app from a fresh shell".
# - Cleans up stale dev ports (5666 vite, 5667 bff, 18642 fake-hermes) and tsx watchers
# - Leaves :8642 (hermes gateway) alone — expensive to restart
# - Ensures cargo is on PATH (zsh login shells often drop $HOME/.cargo/bin)
# - Verifies cargo + cargo-tauri are installed
# - Hands off to `cargo tauri dev`, which runs tauri-dev-prep.sh as beforeDevCommand
#
# NOTE: -u is on (catch unset vars), but -e is intentionally OFF — cleanup steps
# are best-effort and we want to keep going even when nothing is listening.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[dev-open] hermes-panel desktop dev launcher"
echo "[dev-open] repo: $ROOT"

# ---------------------------------------------------------------------------
# 1. Cleanup pre-flight (best-effort)
# ---------------------------------------------------------------------------
echo "[dev-open] cleanup: freeing dev ports and stale watchers"

# Free Vite (panel-web) on :5666
lsof -ti tcp:5666 2>/dev/null | xargs kill -9 2>/dev/null || true

# Free BFF on :5667
lsof -ti tcp:5667 2>/dev/null | xargs kill -9 2>/dev/null || true

# Free fake-hermes on :18642 (real hermes on :8642 is left alone on purpose)
lsof -ti tcp:18642 2>/dev/null | xargs kill -9 2>/dev/null || true

# Kill stray `tsx watch src/server` processes (BFF dev watchers that leaked)
pkill -f "tsx watch src/server" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. PATH fix: prepend $HOME/.cargo/bin if cargo is not visible
# ---------------------------------------------------------------------------
if ! command -v cargo >/dev/null 2>&1; then
  if [ -x "$HOME/.cargo/bin/cargo" ]; then
    echo "[dev-open] cargo not on PATH; prepending \$HOME/.cargo/bin"
    export PATH="$HOME/.cargo/bin:$PATH"
  fi
fi

# ---------------------------------------------------------------------------
# 3. Detect cargo + cargo-tauri; bail out clearly if missing
# ---------------------------------------------------------------------------
if ! command -v cargo >/dev/null 2>&1; then
  echo "[dev-open] ERROR: cargo not found on PATH and \$HOME/.cargo/bin/cargo does not exist." >&2
  echo "[dev-open]        install Rust via https://rustup.rs and re-run this script." >&2
  exit 1
fi

if ! cargo tauri --version >/dev/null 2>&1; then
  echo "[dev-open] ERROR: cargo-tauri is not installed." >&2
  echo "[dev-open]        install with: cargo install tauri-cli --version '^2'" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Launch the desktop app. Tauri's beforeDevCommand starts bff + vite for us.
# ---------------------------------------------------------------------------
echo "[dev-open] launching cargo tauri dev in packages/panel-desktop"
cd "$ROOT/packages/panel-desktop"
exec cargo tauri dev
