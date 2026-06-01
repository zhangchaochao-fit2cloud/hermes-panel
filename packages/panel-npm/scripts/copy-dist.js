#!/usr/bin/env node
// Copy built workspace outputs into this package so `npx hermes-panel`
// can run without access to the monorepo's private workspace packages.
import { cpSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
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
copy('panel-bff/dist', 'dist-bff');

const sharedDest = join(pkgRoot, 'dist-bff/node_modules/@hermes-panel/shared');
if (existsSync(sharedDest)) rmSync(sharedDest, { recursive: true });
mkdirSync(sharedDest, { recursive: true });
cpSync(join(pkgRoot, '..', 'panel-shared/dist'), join(sharedDest, 'dist'), { recursive: true });
writeFileSync(
  join(sharedDest, 'package.json'),
  JSON.stringify({
    name: '@hermes-panel/shared',
    version: '0.1.0-beta.0',
    type: 'module',
    main: './dist/index.js',
    exports: { '.': './dist/index.js' },
  }, null, 2) + '\n',
);
console.log('✓ copied panel-shared/dist -> dist-bff/node_modules/@hermes-panel/shared/dist');
