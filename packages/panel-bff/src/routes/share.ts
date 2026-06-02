import Router from '@koa/router';
import { randomUUID } from 'node:crypto';
import { getSession, getMessages } from '../services/sqlite-reader.js';

export const shareRouter = new Router();

interface ShareEntry {
  id: string;
  sessionId: string;
  expiresAt: number; // unix ms
  createdAt: number;
}

// In-memory share store (persists during BFF lifetime)
const shares = new Map<string, ShareEntry>();

// Cleanup expired shares periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of shares) {
    if (entry.expiresAt < now) shares.delete(id);
  }
}, 60_000).unref();

// Create a share link (authenticated)
shareRouter.post('/share', async ctx => {
  const { sessionId, ttlMinutes } = ctx.request.body as { sessionId?: string; ttlMinutes?: number } | undefined ?? {};
  if (!sessionId) { ctx.status = 400; ctx.body = { error: 'sessionId required' }; return; }

  const session = getSession(sessionId);
  if (!session) { ctx.status = 404; ctx.body = { error: 'session not found' }; return; }

  const ttl = Math.min(Math.max(5, ttlMinutes ?? 60), 1440); // 5min to 24h
  const entry: ShareEntry = {
    id: randomUUID(),
    sessionId,
    expiresAt: Date.now() + ttl * 60 * 1000,
    createdAt: Date.now(),
  };
  shares.set(entry.id, entry);
  ctx.body = { shareId: entry.id, expiresAt: entry.expiresAt, url: `/api/share/${entry.id}` };
});

// Read a shared session (unauthenticated — accessible by anyone with the link)
shareRouter.get('/share/:id', async ctx => {
  const entry = shares.get(ctx.params.id);
  if (!entry) { ctx.status = 404; ctx.body = { error: 'share link not found or expired' }; return; }
  if (entry.expiresAt < Date.now()) {
    shares.delete(ctx.params.id);
    ctx.status = 410; ctx.body = { error: 'share link expired' }; return;
  }

  const session = getSession(entry.sessionId);
  const messages = getMessages(entry.sessionId);
  ctx.body = { session, messages, expiresAt: entry.expiresAt };
});

// Revoke a share link (authenticated)
shareRouter.delete('/share/:id', async ctx => {
  const deleted = shares.delete(ctx.params.id);
  ctx.status = deleted ? 200 : 404;
  ctx.body = { ok: deleted };
});

// List active shares for a session (authenticated)
shareRouter.get('/share/session/:sessionId', async ctx => {
  const active: ShareEntry[] = [];
  const now = Date.now();
  for (const entry of shares.values()) {
    if (entry.sessionId === ctx.params.sessionId && entry.expiresAt > now) {
      active.push(entry);
    }
  }
  ctx.body = active;
});
