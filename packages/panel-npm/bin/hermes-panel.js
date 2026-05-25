#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import sirv from 'sirv';
import open from 'open';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');

const WEB_PORT = Number(process.env.PANEL_WEB_PORT ?? 5666);
const BFF_PORT = Number(process.env.PANEL_BFF_PORT ?? 5667);
const TOKEN = process.env.PANEL_TOKEN ?? randomBytes(32).toString('hex');

process.env.PANEL_TOKEN = TOKEN;
process.env.BFF_PORT = String(BFF_PORT);

// 1) start BFF in-process. We rely on the BFF package's `main` (./dist/server.js)
//    after `pnpm build`. In a fresh workspace the dist may not exist yet — we
//    fall back to dynamic ts-on-the-fly via tsx if needed.
async function loadBff() {
  try {
    return await import('@hermes-panel/bff');
  } catch (err) {
    console.error('[bff] failed to import; did you run "pnpm build"?');
    throw err;
  }
}

const { createApp } = await loadBff();
const bffApp = createApp();
bffApp.listen(BFF_PORT, '127.0.0.1');
console.log(`[bff] http://127.0.0.1:${BFF_PORT}`);

// 2) serve static web with token injection
const webDist = join(pkgRoot, 'dist-web');
const serve = sirv(webDist, { dev: false, etag: true });
const indexHtml = readFileSync(join(webDist, 'index.html'), 'utf-8')
  .replace('__PANEL_TOKEN__', TOKEN);

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
    return;
  }
  serve(req, res, () => {
    res.writeHead(404).end();
  });
});

server.listen(WEB_PORT, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${WEB_PORT}`;
  console.log(`[web] ${url}`);
  console.log(`[token] ${TOKEN.slice(0, 8)}...`);
  if (!process.env.NO_OPEN) {
    await open(url).catch(() => { /* ignore */ });
  }
});

const shutdown = () => {
  console.log('\nshutting down...');
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
