import { promises as fsp, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { logger } from '../lib/logger.js';
import { getPanelHome } from './hermes-home.js';

/**
 * Persistent usage ledger.
 *
 * Each completed run appends one JSON line to `~/.hermes-panel/usage.jsonl`.
 * The file is append-only with no rotation in v1 — back-of-envelope: 200 bytes
 * per line × 1000 runs/day ≈ 200 KB/day, an order of magnitude below anything
 * that would matter. We can add rotation when someone actually hits 100 MB.
 *
 * Reads scan the entire file; that's fine while it fits in RAM. Summaries are
 * computed lazily on each /api/usage call so we never have to keep an in-memory
 * mirror in sync with disk.
 *
 * All FS errors are swallowed (logger.warn) — the ledger is a nice-to-have,
 * never block the user's chat.
 */

export interface UsageEntry {
  ts: number;                 // unix ms — when run.completed fired
  sessionId?: string;
  model: string;              // raw model id, e.g. "claude-sonnet-4-5"
  provider: string;           // "anthropic" | "openai" | "deepseek" | "gemini" | "unknown"
  input: number;
  output: number;
  total: number;
  cost?: number;              // USD; undefined if model unknown
}

export interface UsageBucket {
  tokens: number;
  cost: number;               // USD, may be 0 if no priced models in window
  runs: number;
}

export interface UsageSummary {
  today: UsageBucket;
  thisMonth: UsageBucket;
  allTime: UsageBucket;
  byModel: Record<string, UsageBucket>;
}

/**
 * Per-1k-token cost rates (USD) for common model families.
 *
 * We match against the lowercased model id with `startsWith`/`includes`,
 * picking the most specific rule first. If nothing matches we leave the
 * `cost` field undefined and let the UI show "—".
 *
 * Numbers reflect the public pricing pages as of early 2026; tweak as
 * vendors update. The goal isn't to bill users — it's to give them a
 * rough "you're at $4 today" feel.
 */
interface CostRate { input: number; output: number; provider: string }
const COST_TABLE: { match: (m: string) => boolean; rate: CostRate }[] = [
  // Anthropic
  { match: m => m.includes('claude-opus-4')   || m.includes('claude-4-opus'),   rate: { input: 0.015,  output: 0.075,  provider: 'anthropic' } },
  { match: m => m.includes('claude-sonnet-4') || m.includes('claude-4-sonnet'), rate: { input: 0.003,  output: 0.015,  provider: 'anthropic' } },
  { match: m => m.includes('claude-haiku-4')  || m.includes('claude-4-haiku'),  rate: { input: 0.0008, output: 0.004,  provider: 'anthropic' } },
  { match: m => m.includes('claude-3-5-sonnet') || m.includes('claude-3.5-sonnet'), rate: { input: 0.003, output: 0.015, provider: 'anthropic' } },
  { match: m => m.includes('claude-3-5-haiku')  || m.includes('claude-3.5-haiku'),  rate: { input: 0.0008, output: 0.004, provider: 'anthropic' } },
  { match: m => m.includes('claude-3-opus'),   rate: { input: 0.015,  output: 0.075,  provider: 'anthropic' } },
  { match: m => m.includes('claude'),          rate: { input: 0.003,  output: 0.015,  provider: 'anthropic' } },

  // OpenAI
  { match: m => m.startsWith('gpt-5'),         rate: { input: 0.005,  output: 0.020,  provider: 'openai' } },
  { match: m => m.startsWith('gpt-4o-mini'),   rate: { input: 0.00015, output: 0.0006, provider: 'openai' } },
  { match: m => m.startsWith('gpt-4o'),        rate: { input: 0.0025, output: 0.010,  provider: 'openai' } },
  { match: m => m.startsWith('gpt-4-turbo'),   rate: { input: 0.010,  output: 0.030,  provider: 'openai' } },
  { match: m => m.startsWith('gpt-4'),         rate: { input: 0.030,  output: 0.060,  provider: 'openai' } },
  { match: m => m.startsWith('o1-mini'),       rate: { input: 0.003,  output: 0.012,  provider: 'openai' } },
  { match: m => m.startsWith('o1'),            rate: { input: 0.015,  output: 0.060,  provider: 'openai' } },
  { match: m => m.startsWith('o3-mini'),       rate: { input: 0.0011, output: 0.0044, provider: 'openai' } },
  { match: m => m.startsWith('o3'),            rate: { input: 0.010,  output: 0.040,  provider: 'openai' } },
  { match: m => m.startsWith('gpt-3.5'),       rate: { input: 0.0005, output: 0.0015, provider: 'openai' } },

  // DeepSeek
  { match: m => m.includes('deepseek-reasoner') || m.includes('deepseek-r1'), rate: { input: 0.00055, output: 0.00219, provider: 'deepseek' } },
  { match: m => m.includes('deepseek-chat')     || m.includes('deepseek-v3'), rate: { input: 0.00027, output: 0.00110, provider: 'deepseek' } },
  { match: m => m.includes('deepseek'),         rate: { input: 0.00027, output: 0.00110, provider: 'deepseek' } },

  // Google Gemini
  { match: m => m.includes('gemini-2.5-pro')   || m.includes('gemini-2-5-pro'), rate: { input: 0.00125, output: 0.010, provider: 'gemini' } },
  { match: m => m.includes('gemini-2.5-flash') || m.includes('gemini-2-5-flash'), rate: { input: 0.000075, output: 0.0003, provider: 'gemini' } },
  { match: m => m.includes('gemini-1.5-pro'),    rate: { input: 0.00125, output: 0.005, provider: 'gemini' } },
  { match: m => m.includes('gemini-1.5-flash'),  rate: { input: 0.000075, output: 0.0003, provider: 'gemini' } },
  { match: m => m.includes('gemini'),            rate: { input: 0.00125, output: 0.005, provider: 'gemini' } },
];

function resolveRate(model: string): CostRate | null {
  if (!model) return null;
  const m = model.toLowerCase();
  for (const row of COST_TABLE) if (row.match(m)) return row.rate;
  return null;
}

/**
 * Compute the USD cost for a usage entry. Returns undefined when we can't
 * recognise the model — never returns 0 in that case, because the UI uses
 * `cost === undefined` to render "—" instead of "$0.00".
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const rate = resolveRate(model);
  if (!rate) return undefined;
  // Rates are per 1k tokens — divide.
  return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
}

/** Best-effort provider inference from a model id; falls back to "unknown". */
export function inferProvider(model: string): string {
  const rate = resolveRate(model);
  return rate?.provider ?? 'unknown';
}

function ledgerPath(): string {
  return join(getPanelHome(), 'usage.jsonl');
}

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Append a single ledger entry. Tolerates a missing directory by creating it.
 * Any FS error is logged at warn level and swallowed — chat must not break.
 */
export async function recordUsage(entry: UsageEntry): Promise<void> {
  const path = ledgerPath();
  try {
    ensureDir(path);
    // JSON.stringify on a single line + trailing newline → strict JSONL
    await fsp.appendFile(path, JSON.stringify(entry) + '\n', { encoding: 'utf-8' });
  } catch (err) {
    logger.warn({ err, path }, 'usage-ledger: failed to append entry');
  }
}

/**
 * Local-time day key (YYYY-MM-DD) using the host's timezone.
 *
 * We intentionally use the host's local timezone here. Hermes itself reports
 * stats in local time (see sqlite-reader's daily aggregations), and users
 * comparing today's panel total against Hermes itself need them to agree.
 * The deploy target is overwhelmingly Asia/Shanghai today but this stays
 * correct if a developer runs the panel in another tz.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function emptyBucket(): UsageBucket {
  return { tokens: 0, cost: 0, runs: 0 };
}

function addTo(bucket: UsageBucket, entry: UsageEntry): void {
  bucket.tokens += entry.total;
  if (typeof entry.cost === 'number' && Number.isFinite(entry.cost)) bucket.cost += entry.cost;
  bucket.runs += 1;
}

/**
 * Read the whole ledger and roll it up into today / this-month / all-time
 * buckets plus a per-model breakdown. Missing or empty file yields all zeros.
 *
 * O(n) over the file each call. Fine for v1 — we can memoise with mtime later
 * if anyone notices.
 */
export async function readUsageSummary(): Promise<UsageSummary> {
  const path = ledgerPath();
  const summary: UsageSummary = {
    today: emptyBucket(),
    thisMonth: emptyBucket(),
    allTime: emptyBucket(),
    byModel: {},
  };
  let raw: string;
  try {
    raw = await fsp.readFile(path, 'utf-8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') logger.warn({ err, path }, 'usage-ledger: read failed');
    return summary;
  }

  const now = new Date();
  const todayKey = localDayKey(now);
  const monthKey = localMonthKey(now);

  for (const line of raw.split('\n')) {
    if (!line) continue;
    let entry: UsageEntry;
    try {
      entry = JSON.parse(line) as UsageEntry;
    } catch {
      // A single malformed line shouldn't blow up the whole summary —
      // skip it and keep going.
      continue;
    }
    if (typeof entry.ts !== 'number' || typeof entry.total !== 'number') continue;

    addTo(summary.allTime, entry);
    const when = new Date(entry.ts);
    if (localMonthKey(when) === monthKey) addTo(summary.thisMonth, entry);
    if (localDayKey(when) === todayKey)   addTo(summary.today, entry);

    const key = entry.model || 'unknown';
    summary.byModel[key] ??= emptyBucket();
    addTo(summary.byModel[key], entry);
  }
  return summary;
}
