import { getDb } from './sqlite-reader.js';
import type { SessionRow } from './sqlite-reader.js';
import { logger } from '../lib/logger.js';

/**
 * Notification feed.
 *
 * v0.1 strategy: we keep a watermark (highest started_at we've reported)
 * in memory, and on every /api/notifications poll, return all sessions
 * started since the watermark as "new session" events.
 *
 * Later versions will add cron events, hermes health transitions, etc.
 * persisted to ~/.hermes-panel/events.db.
 */

export interface NotificationEvent {
  id: string;
  type: 'session.new' | 'cron.completed' | 'hermes.health';
  title: string;
  body?: string;
  ts: number;          // unix ms
  read: boolean;
  context?: Record<string, unknown>;
}

let watermark = 0;          // unix seconds
let buffer: NotificationEvent[] = [];
const MAX_BUFFER = 200;

function pushEvent(ev: NotificationEvent): void {
  buffer.push(ev);
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
}

/**
 * Initialise the watermark to "now" so the first poll doesn't flood
 * the user with their entire session history as "new" notifications.
 */
export function initWatermark(): void {
  watermark = Date.now() / 1000;
  logger.info({ watermark }, 'notification feed initialised');
}

/**
 * Discover new sessions since last watermark; convert into notification events.
 * Idempotent — calling repeatedly only emits each session once.
 */
export function pollNewSessions(): NotificationEvent[] {
  const db = getDb();
  if (!db) return [];

  const rows = db.prepare(`
    SELECT id, title, source, model, started_at, message_count
    FROM sessions
    WHERE started_at > ?
    ORDER BY started_at ASC
  `).all(watermark) as Pick<SessionRow, 'id' | 'title' | 'source' | 'model' | 'started_at' | 'message_count'>[];

  const newEvents: NotificationEvent[] = rows.map(r => {
    const trimmed = r.title?.trim();
    return {
      id: `sess-${r.id}`,
      type: 'session.new' as const,
      title: trimmed && trimmed.length > 0 ? trimmed : `新会话 ${r.id.slice(0, 10)}…`,
      body: `来源 ${r.source} · 模型 ${r.model ?? 'unknown'}`,
      ts: Math.floor(r.started_at * 1000),
      read: false,
      context: { sessionId: r.id, source: r.source },
    };
  });

  if (newEvents.length > 0) {
    for (const ev of newEvents) pushEvent(ev);
    watermark = rows[rows.length - 1].started_at;
  }

  return newEvents;
}

/** All buffered events, newest first. */
export function listEvents(opts: { unreadOnly?: boolean; limit?: number } = {}): NotificationEvent[] {
  let out = buffer.slice().sort((a, b) => b.ts - a.ts);
  if (opts.unreadOnly) out = out.filter(e => !e.read);
  if (opts.limit) out = out.slice(0, opts.limit);
  return out;
}

export function markAllRead(): number {
  let count = 0;
  for (const ev of buffer) {
    if (!ev.read) { ev.read = true; count++; }
  }
  return count;
}

export function markRead(id: string): boolean {
  const ev = buffer.find(e => e.id === id);
  if (!ev) return false;
  ev.read = true;
  return true;
}

export function clearAll(): void {
  buffer = [];
}

export function unreadCount(): number {
  return buffer.filter(e => !e.read).length;
}
