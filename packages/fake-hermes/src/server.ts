import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PORTS } from '@hermes-panel/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? PORTS.FAKE_HERMES);

const sseReplay = readFileSync(
  join(__dirname, 'fixtures/sse-replay.jsonl'),
  'utf-8'
).trim().split('\n').map(line => JSON.parse(line));

const runs = new Map<string, { createdAt: number }>();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // CORS for browser dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (url.pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', version: 'fake-0.1.0' }));
    return;
  }

  if (url.pathname === '/v1/models' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      object: 'list',
      data: [{ id: 'hermes-agent', object: 'model', created: 0, owned_by: 'hermes' }],
    }));
    return;
  }

  if (url.pathname === '/v1/runs' && req.method === 'POST') {
    const runId = `run_${Math.random().toString(36).slice(2, 10)}`;
    runs.set(runId, { createdAt: Date.now() });
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ run_id: runId, status: 'queued' }));
    return;
  }

  const runMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/events$/);
  if (runMatch && req.method === 'GET') {
    const runId = runMatch[1];
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    // Hermes API format: `data: {"event": "...", "run_id": "...", ...}\n\n`
    // No SSE event header; event type lives inside the JSON payload.
    for (const event of sseReplay) {
      const { delayMs, ...payload } = event;
      await new Promise(r => setTimeout(r, delayMs ?? 100));
      const enriched = { ...payload, run_id: runId, timestamp: Date.now() / 1000 };
      res.write(`data: ${JSON.stringify(enriched)}\n\n`);
    }
    res.end();
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found', path: url.pathname }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake-hermes listening on http://127.0.0.1:${PORT}`);
});
