#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/packages/panel-desktop/src-tauri/resources/bff"

echo "→ staging desktop BFF runtime"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/dist"

cd "$ROOT_DIR"
pnpm --filter @hermes-panel/bff bundle:desktop

node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';

const bff = JSON.parse(readFileSync('packages/panel-bff/package.json', 'utf8'));
const nativeDependencies = ['better-sqlite3', 'keytar'];
writeFileSync(
  'packages/panel-desktop/src-tauri/resources/bff/package.json',
  JSON.stringify({
    name: '@hermes-panel/desktop-bff-runtime',
    version: bff.version,
    private: true,
    type: 'module',
    main: './dist/server.js',
    dependencies: Object.fromEntries(
      nativeDependencies.map((name) => [name, bff.dependencies[name]]),
    ),
  }, null, 2) + '\n',
);
NODE

(cd "$OUT_DIR" && npm install --omit=dev --package-lock=false --audit=false --fund=false)

find "$OUT_DIR/node_modules" -mindepth 1 -maxdepth 1 \( \
  ! -name better-sqlite3 \
  ! -name keytar \
  ! -name bindings \
  ! -name file-uri-to-path \
\) -exec rm -rf {} +

find "$OUT_DIR/node_modules" -mindepth 1 -maxdepth 2 -type l ! -path "*/.bin/*" -print0 | while IFS= read -r -d '' LINK_PATH; do
  LINK_TARGET="$(readlink "$LINK_PATH")"
  TARGET_PARENT="$(cd "$(dirname "$LINK_PATH")/$(dirname "$LINK_TARGET")" && pwd -P)"
  TARGET_ABS="$TARGET_PARENT/$(basename "$LINK_TARGET")"
  TMP_PATH="$LINK_PATH.__materialized"

  rm -rf "$TMP_PATH"
  cp -R "$TARGET_ABS" "$TMP_PATH"
  rm "$LINK_PATH"
  mv "$TMP_PATH" "$LINK_PATH"
done

rm -rf \
  "$OUT_DIR/node_modules/better-sqlite3/deps" \
  "$OUT_DIR/node_modules/better-sqlite3/src" \
  "$OUT_DIR/node_modules/node-addon-api"

find "$OUT_DIR/node_modules" -type d \( \
  -name test -o \
  -name tests -o \
  -name docs -o \
  -name benchmarks -o \
  -name benchmark -o \
  -name examples -o \
  -name example -o \
  -name coverage \
\) -prune -print0 | xargs -0 rm -rf

rm -f "$OUT_DIR/node_modules/.package-lock.json"

find "$OUT_DIR" -type f \( \
  -name '*.map' -o \
  -name '*.md' -o \
  -name '*.markdown' -o \
  -name '*.ts' -o \
  -name '*.d.ts' -o \
  -name '*.c' -o \
  -name '*.h' -o \
  -name '*.hpp' -o \
  -name '*.cpp' -o \
  -name '*.gyp' -o \
  -name '*.gypi' -o \
  -name '*.png' \
\) -delete

find "$OUT_DIR" -type f \( \
  -name 'LICENSE*' -o \
  -name 'CHANGELOG*' -o \
  -name 'HISTORY*' -o \
  -name 'README*' \
\) -delete

echo "✓ staged desktop BFF runtime at $OUT_DIR"
