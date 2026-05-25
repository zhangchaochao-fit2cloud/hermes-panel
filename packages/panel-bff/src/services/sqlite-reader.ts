import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

let dbInstance: Database.Database | null = null;
let lastError: Error | null = null;

function dbPath(): string {
  return join(getHermesHome(), 'state.db');
}

export function getDb(): Database.Database | null {
  if (dbInstance) return dbInstance;
  const p = dbPath();
  if (!existsSync(p)) {
    lastError = new Error(`hermes state.db not found at ${p}`);
    return null;
  }
  try {
    // NOTE: we open read-write because better-sqlite3's readonly mode
    // cannot read uncommitted WAL entries. We never call any write
    // statement — discipline enforced by query helpers below.
    dbInstance = new Database(p, { readonly: false, fileMustExist: true });
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('query_only = ON');  // belt-and-suspenders: any write errors out
    lastError = null;
    return dbInstance;
  } catch (err) {
    lastError = err as Error;
    logger.warn({ err, path: p }, 'failed to open hermes state.db');
    return null;
  }
}

export function closeDb(): void {
  if (dbInstance) {
    try { dbInstance.close(); } catch { /* ignore */ }
    dbInstance = null;
  }
}

export function getLastError(): Error | null {
  return lastError;
}

export interface SessionRow {
  id: string;
  title: string | null;
  source: string;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  started_at: number;
  ended_at: number | null;
  estimated_cost_usd: number | null;
}

export interface MessageRow {
  id: number;
  session_id: string;
  role: string;
  content: string | null;
  tool_name: string | null;
  timestamp: number;
  token_count: number | null;
  reasoning: string | null;
}

export function listSessions(opts: { limit?: number; search?: string; source?: string } = {}): SessionRow[] {
  const db = getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 500);

  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.search) {
    where.push('(title LIKE @search OR id LIKE @search)');
    params.search = `%${opts.search}%`;
  }
  if (opts.source) {
    where.push('source = @source');
    params.source = opts.source;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT id, title, source, model, message_count, tool_call_count,
           input_tokens, output_tokens, started_at, ended_at, estimated_cost_usd
    FROM sessions
    ${whereSql}
    ORDER BY started_at DESC
    LIMIT @limit
  `;
  return db.prepare(sql).all({ ...params, limit }) as SessionRow[];
}

export function getSession(id: string): SessionRow | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`
    SELECT id, title, source, model, message_count, tool_call_count,
           input_tokens, output_tokens, started_at, ended_at, estimated_cost_usd
    FROM sessions WHERE id = ?
  `).get(id) as SessionRow | undefined;
  return row ?? null;
}

export function getMessages(sessionId: string): MessageRow[] {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`
    SELECT id, session_id, role, content, tool_name, timestamp, token_count, reasoning
    FROM messages WHERE session_id = ? ORDER BY timestamp ASC
  `).all(sessionId) as MessageRow[];
}

export interface DailyTokenRow {
  day: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  session_count: number;
  estimated_cost_usd: number;
}

export function dailyTokenUsage(days: number = 7): DailyTokenRow[] {
  const db = getDb();
  if (!db) return [];
  const cutoff = (Date.now() / 1000) - days * 86400;
  return db.prepare(`
    SELECT
      strftime('%Y-%m-%d', started_at, 'unixepoch', 'localtime') AS day,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
      COUNT(*) AS session_count,
      COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd
    FROM sessions
    WHERE started_at >= ?
    GROUP BY day
    ORDER BY day ASC
  `).all(cutoff) as DailyTokenRow[];
}

export interface ModelStatRow {
  model: string;
  session_count: number;
  total_tokens: number;
}

export function modelDistribution(days: number = 30): ModelStatRow[] {
  const db = getDb();
  if (!db) return [];
  const cutoff = (Date.now() / 1000) - days * 86400;
  return db.prepare(`
    SELECT
      COALESCE(model, 'unknown') AS model,
      COUNT(*) AS session_count,
      COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens
    FROM sessions
    WHERE started_at >= ?
    GROUP BY model
    ORDER BY total_tokens DESC
  `).all(cutoff) as ModelStatRow[];
}

export interface OverallStats {
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  today_tokens: number;
  today_cost_usd: number;
}

export function overallStats(): OverallStats {
  const db = getDb();
  if (!db) return { total_sessions: 0, total_messages: 0, total_tokens: 0, today_tokens: 0, today_cost_usd: 0 };

  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() / 1000;
  })();

  const sessions = db.prepare(`
    SELECT
      COUNT(*) AS total_sessions,
      COALESCE(SUM(message_count), 0) AS total_messages,
      COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens
    FROM sessions
  `).get() as { total_sessions: number; total_messages: number; total_tokens: number };

  const today = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens + output_tokens), 0) AS today_tokens,
      COALESCE(SUM(estimated_cost_usd), 0) AS today_cost_usd
    FROM sessions
    WHERE started_at >= ?
  `).get(startOfToday) as { today_tokens: number; today_cost_usd: number };

  return { ...sessions, ...today };
}
