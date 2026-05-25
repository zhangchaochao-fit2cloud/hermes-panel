#!/usr/bin/env node
// Copy panel-web's static dist into this package so that
// hermes-panel can serve a single self-contained directory.
// BFF runs in-process via direct workspace import.
import { cpSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');

function copy(srcRel, destRel) {
  const src = join(pkgRoot, '..', srcRel);
  const dest = join(pkgRoot, destRel);
  if (!existsSync(src)) {
    throw new Error(`source missing: ${src} — run "pnpm build" first`);
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓ copied ${srcRel} -> ${destRel}`);
}

copy('panel-web/dist', 'dist-web');
