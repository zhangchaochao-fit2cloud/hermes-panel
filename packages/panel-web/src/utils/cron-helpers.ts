// Lightweight cron expression helpers for the panel.
//
// Supports the standard 5-field syntax: minute hour day-of-month month day-of-week
// with `*`, step values (`*` + slash + n), ranges `a-b`, lists `a,b,c`, and combinations.
// Day-of-week 0 and 7 both mean Sunday.
//
// This is intentionally minimal — the BFF/Hermes is the source of truth for actual
// scheduling. The panel only needs a "next N runs" preview so users can sanity-check
// an expression at a glance. If the expression cannot be parsed, helpers return [].
//
// NOTE: We deliberately do not depend on `cron-parser` because it is not installed in
// this workspace and the surface we need here is tiny.

interface Field {
  readonly values: ReadonlySet<number>;
  readonly star: boolean;
}

const FIELD_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 59],   // minute
  [0, 23],   // hour
  [1, 31],   // day of month
  [1, 12],   // month (1-12)
  [0, 6],    // day of week (0 = Sunday)
];

function parseField(token: string, idx: number): Field | null {
  const [lo, hi] = FIELD_RANGES[idx];
  const star = token === '*' || /^\*\/\d+$/.test(token);
  const values = new Set<number>();

  for (const part of token.split(',')) {
    let stepStr = '1';
    let rangeStr = part;
    if (part.includes('/')) {
      const [r, s] = part.split('/');
      rangeStr = r;
      stepStr = s;
    }
    const step = Number(stepStr);
    if (!Number.isFinite(step) || step <= 0) return null;

    let start: number;
    let end: number;
    if (rangeStr === '*') {
      start = lo;
      end = hi;
    } else if (rangeStr.includes('-')) {
      const [a, b] = rangeStr.split('-');
      start = Number(a);
      end = Number(b);
    } else {
      start = Number(rangeStr);
      end = start;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < lo || end > hi || start > end) return null;

    for (let v = start; v <= end; v += step) values.add(v);
  }
  return { values, star };
}

interface ParsedCron {
  readonly minute: Field;
  readonly hour: Field;
  readonly dom: Field;
  readonly month: Field;
  readonly dow: Field;
}

export function parseCron(expr: string): ParsedCron | null {
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length !== 5) return null;
  const minute = parseField(tokens[0], 0);
  const hour = parseField(tokens[1], 1);
  const dom = parseField(tokens[2], 2);
  // Normalize "0/7" semantics for DOW so 7 == 0
  const monthTok = tokens[3];
  const dowTok = tokens[4].replace(/\b7\b/g, '0');
  const month = parseField(monthTok, 3);
  const dow = parseField(dowTok, 4);
  if (!minute || !hour || !dom || !month || !dow) return null;
  return { minute, hour, dom, month, dow };
}

function matches(parsed: ParsedCron, d: Date): boolean {
  if (!parsed.minute.values.has(d.getMinutes())) return false;
  if (!parsed.hour.values.has(d.getHours())) return false;
  if (!parsed.month.values.has(d.getMonth() + 1)) return false;
  // Cron's "OR" semantics between DOM and DOW when both restricted
  const domOk = parsed.dom.values.has(d.getDate());
  const dowOk = parsed.dow.values.has(d.getDay());
  if (parsed.dom.star && parsed.dow.star) return true;
  if (parsed.dom.star) return dowOk;
  if (parsed.dow.star) return domOk;
  return domOk || dowOk;
}

/**
 * Compute the next N run times for a 5-field cron expression.
 * Returns an array of unix ms timestamps. If the expression is invalid
 * or no match within 4 years, returns [].
 */
export function nextRuns(expr: string, n: number, from: number = Date.now()): number[] {
  const parsed = parseCron(expr);
  if (!parsed) return [];

  const out: number[] = [];
  // Start from the next whole minute to avoid returning "now".
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = from + 4 * 365 * 24 * 60 * 60 * 1000;
  while (out.length < n && cursor.getTime() <= limit) {
    if (matches(parsed, cursor)) {
      out.push(cursor.getTime());
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return out;
}

/**
 * Parse an ISO/RFC timestamp string returned by hermes-cli into unix ms.
 * Returns null on failure.
 */
export function tsToMs(ts: string | undefined | null): number | null {
  if (!ts) return null;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? t : null;
}

/**
 * Humanize the gap between `now` and `target` into a short string.
 * Examples (zh-CN): "1 小时 23 分钟后", "刚刚", "30 分钟前".
 *           (en-US): "in 1h 23m", "now", "30m ago".
 */
export function humanizeGap(target: number, locale: 'zh-CN' | 'en-US' = 'zh-CN', now: number = Date.now()): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  const m = Math.floor(abs / 60_000);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  const d = Math.floor(h / 24);

  if (m < 1) return locale === 'zh-CN' ? '即将' : 'soon';

  let core: string;
  if (d > 0) {
    core = locale === 'zh-CN' ? `${d} 天 ${h % 24} 小时` : `${d}d ${h % 24}h`;
  } else if (h > 0) {
    core = locale === 'zh-CN' ? `${h} 小时 ${mins} 分钟` : `${h}h ${mins}m`;
  } else {
    core = locale === 'zh-CN' ? `${mins} 分钟` : `${mins}m`;
  }

  if (diff >= 0) {
    return locale === 'zh-CN' ? `${core}后` : `in ${core}`;
  }
  return locale === 'zh-CN' ? `${core}前` : `${core} ago`;
}

/** Format unix ms as `HH:mm:ss` in the user's local timezone. */
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** Format unix ms as `YYYY-MM-DD HH:mm` in the user's local timezone. */
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
