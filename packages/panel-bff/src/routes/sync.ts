import Router from '@koa/router';
import { PassThrough } from 'node:stream';
import { addClient, getClientCount } from '../services/sync-bus.js';

export const syncRouter = new Router();

// SSE endpoint: clients subscribe to real-time sync events
syncRouter.get('/sync/events', async ctx => {
  ctx.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  const stream = new PassThrough();
  ctx.body = stream;

  // Send initial heartbeat
  stream.write(`data: ${JSON.stringify({ type: 'connected', payload: { clientCount: getClientCount() + 1 }, timestamp: Date.now() })}\n\n`);

  addClient(stream);

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    try { stream.write(': ping\n\n'); }
    catch { clearInterval(keepAlive); }
  }, 30_000);

  ctx.req.on('close', () => {
    clearInterval(keepAlive);
    stream.end();
  });
});

// Get sync status
syncRouter.get('/sync/status', async ctx => {
  ctx.body = { clients: getClientCount() };
});
