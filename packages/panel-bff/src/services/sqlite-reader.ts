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
    // Escape LIKE wildcards so queries containing literal `%` or `_`
    // (e.g. run_xxx ids) match only their literal characters.
    const escaped = opts.search.replace(/[\\%_]/g, c => `\\${c}`);
    where.push(
      "(title LIKE @search ESCAPE '\\' OR id LIKE @search ESCAPE '\\' " +
      "OR EXISTS (SELECT 1 FROM messages WHERE session_id = sessions.id AND content LIKE @search_like ESCAPE '\\' LIMIT 1))",
    );
    params.search = `%${escaped}%`;
    params.search_like = `%${escaped}%`;
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

export interface CacheStats {
  total_input_tokens: number;
  total_cache_read_tokens: number;
  total_cache_write_tokens: number;
  cache_hit_ratio: number;          // cache_read / (input + cache_read)
  estimated_saved_usd: number;       // cache_read tokens count at 90% discount
}

export interface MonthlyPace {
  month_start: string;
  days_elapsed: number;
  days_in_month: number;
  tokens_so_far: number;
  cost_so_far_usd: number;
  projected_tokens: number;
  projected_cost_usd: number;
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

export function cacheStats(days: number = 30): CacheStats {
  const db = getDb();
  if (!db) return { total_input_tokens: 0, total_cache_read_tokens: 0, total_cache_write_tokens: 0, cache_hit_ratio: 0, estimated_saved_usd: 0 };
  const cutoff = (Date.now() / 1000) - days * 86400;
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens), 0) AS input,
      COALESCE(SUM(cache_read_tokens), 0) AS cache_read,
      COALESCE(SUM(cache_write_tokens), 0) AS cache_write
    FROM sessions WHERE started_at >= ?
  `).get(cutoff) as { input: number; cache_read: number; cache_write: number };
  const denom = row.input + row.cache_read;
  const ratio = denom > 0 ? row.cache_read / denom : 0;
  // Rough Anthropic-style pricing: cache reads at ~10% of input cost; assume $3/M base
  const estimatedSavedUsd = (row.cache_read / 1_000_000) * 3 * 0.9;
  return {
    total_input_tokens: row.input,
    total_cache_read_tokens: row.cache_read,
    total_cache_write_tokens: row.cache_write,
    cache_hit_ratio: ratio,
    estimated_saved_usd: estimatedSavedUsd,
  };
}

export function monthlyPace(): MonthlyPace {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / 86_400_000) + 1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  if (!db) {
    return {
      month_start: monthStartIso, days_elapsed: daysElapsed, days_in_month: daysInMonth,
      tokens_so_far: 0, cost_so_far_usd: 0, projected_tokens: 0, projected_cost_usd: 0,
    };
  }

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
      COALESCE(SUM(estimated_cost_usd), 0) AS cost
    FROM sessions WHERE started_at >= ?
  `).get(monthStart.getTime() / 1000) as { tokens: number; cost: number };

  const rate = row.tokens / daysElapsed;
  const projectedTokens = Math.round(rate * daysInMonth);
  const costRate = row.cost / daysElapsed;
  const projectedCost = costRate * daysInMonth;

  return {
    month_start: monthStartIso,
    days_elapsed: daysElapsed,
    days_in_month: daysInMonth,
    tokens_so_far: row.tokens,
    cost_so_far_usd: row.cost,
    projected_tokens: projectedTokens,
    projected_cost_usd: projectedCost,
  };
}
