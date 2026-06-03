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
      title: trimmed && trimmed.length > 0 ? trimmed : `[session] ${r.id.slice(0, 10)}`,
      body: `source=${r.source} model=${r.model ?? 'unknown'}`,
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

// Deduplication: only fire once per day per threshold crossing
let lastAlertDay = '';

export function checkTokenAlert(): NotificationEvent | null {
  const db = getDb();
  if (!db) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (lastAlertDay === today) return null; // already alerted today

  // Get today's token count
  const startOfToday = (() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() / 1000;
  })();
  const todayRow = db.prepare(`
    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens
    FROM sessions WHERE started_at >= ?
  `).get(startOfToday) as { tokens: number };

  // Get 7-day average (excluding today)
  const sevenDaysAgo = startOfToday - 7 * 86400;
  const weekRow = db.prepare(`
    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
           COUNT(DISTINCT strftime('%Y-%m-%d', started_at, 'unixepoch')) AS days
    FROM sessions WHERE started_at >= ? AND started_at < ?
  `).get(sevenDaysAgo, startOfToday) as { tokens: number; days: number };

  if (weekRow.days < 2) return null; // not enough history
  const dailyAvg = weekRow.tokens / weekRow.days;
  if (dailyAvg <= 0) return null;

  const ratio = todayRow.tokens / dailyAvg;
  if (ratio < 2.0) return null; // not a spike

  lastAlertDay = today;
  const ev: NotificationEvent = {
    id: `token-alert-${today}`,
    type: 'hermes.health',
    title: `⚠️ Token usage spike detected`,
    body: `Today: ${todayRow.tokens.toLocaleString()} tokens (${ratio.toFixed(1)}× avg ${Math.round(dailyAvg).toLocaleString()}/day)`,
    ts: Date.now(),
    read: false,
    context: { todayTokens: todayRow.tokens, avgDaily: Math.round(dailyAvg), ratio: Number(ratio.toFixed(2)) },
  };
  pushEvent(ev);
  return ev;
}
