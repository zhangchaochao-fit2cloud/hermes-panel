import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

/**
 * Hermes log levels, normalized to upper-case. Hermes CLI accepts DEBUG / INFO
 * / WARNING / ERROR; we expose `WARN` as an alias to keep the UI compact.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogLine {
  /** Unix milliseconds parsed from the line prefix (if present). */
  ts?: number;
  /** Normalized log level. */
  level?: LogLevel;
  /** Component / logger name (e.g. `agent.auxiliary_client`). */
  component?: string;
  /** Message body — everything after the colon following the component. */
  msg: string;
  /** The full unmodified line as emitted by `hermes logs`. */
  raw: string;
}

export interface GetLogsOptions {
  level?: LogLevel;
  /** e.g. `1h`, `30m`, `2d` — passed through to `hermes logs --since`. */
  since?: string;
  /** Tail line count (passed to `hermes logs -n`). Default 200. */
  tail?: number;
  /** Free-text filter applied locally to the `raw` line, case-insensitive. */
  query?: string;
  /** Which log file: `agent` (default), `errors`, `gateway`. */
  logName?: string;
}

export interface GetLogsResult {
  lines: LogLine[];
  /** Error code (HERMES_CLI_*) when the call failed; `lines` is empty then. */
  error?: string;
}

const VALID_LEVELS: ReadonlySet<LogLevel> = new Set(['DEBUG', 'INFO', 'WARNING', 'ERROR']);
const VALID_LOG_NAMES: ReadonlySet<string> = new Set(['agent', 'errors', 'gateway']);

/**
 * Parses a single line of `hermes logs` output. Format:
 *
 *   `2026-05-26 08:01:21,440 INFO gateway.run: Gateway stopped`
 *
 * `hermes logs` prefixes a banner like `--- ~/.hermes/logs/agent.log (last 50) ---`
 * which we detect and ignore. Lines that do not match the format are returned
 * with `raw` only so the UI can still display them verbatim.
 */
export function parseLogLine(raw: string): LogLine | null {
  // Filter the banner line emitted at the top of `hermes logs` output.
  if (/^---\s.*\s---\s*$/.test(raw)) return null;
  if (!raw.trim()) return null;

  const m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})(?:[,.](\d{1,6}))?\s+(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\s+([\w.]+):\s*(.*)$/,
  );

  if (!m) {
    return { msg: raw, raw };
  }

  const [, y, mo, d, h, mi, s, ms, lvlRaw, component, msg] = m;
  // Hermes logs use the host's local clock with no TZ marker — interpret
  // them in local time so the UI shows the same wall-clock as `tail -f`.
  const ts = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    ms ? Number(ms.padEnd(3, '0').slice(0, 3)) : 0,
  ).getTime();

  let level: LogLevel | undefined;
  switch (lvlRaw) {
    case 'DEBUG':
      level = 'DEBUG';
      break;
    case 'INFO':
      level = 'INFO';
      break;
    case 'WARN':
    case 'WARNING':
      level = 'WARNING';
      break;
    case 'ERROR':
    case 'CRITICAL':
      level = 'ERROR';
      break;
    default:
      level = undefined;
  }

  return { ts, level, component, msg, raw };
}

function clampTail(tail: number | undefined): number {
  if (!Number.isFinite(tail ?? NaN)) return 200;
  const n = Math.floor(Number(tail));
  return Math.max(1, Math.min(5_000, n));
}

function isSafeSince(value: string): boolean {
  // Hermes accepts patterns like `1h`, `30m`, `2d`. Keep this strict so we
  // never pass arbitrary strings to the CLI.
  return /^\d{1,5}(s|m|h|d)$/.test(value);
}

function isSafeLogName(value: string): boolean {
  return VALID_LOG_NAMES.has(value);
}

/**
 * Fetches recent Hermes log lines.
 *
 * `hermes logs` does not currently support `--json`, so we always shell out in
 * text mode and parse line-by-line. The `raw` field is preserved on every
 * returned `LogLine` so the UI can always fall back to the original text.
 *
 * Server-side filtering for level / since / tail is delegated to the CLI. Free
 * text `query` is applied here (case-insensitive substring match against
 * `raw`) so the UI doesn't have to round-trip a separate field through the
 * CLI, which would require shell quoting.
 */
export async function getLogs(opts: GetLogsOptions = {}): Promise<GetLogsResult> {
  const tail = clampTail(opts.tail);
  const args: string[] = ['logs'];

  // Positional log_name comes first.
  if (opts.logName && isSafeLogName(opts.logName)) {
    args.push(opts.logName);
  }

  args.push('-n', String(tail));

  if (opts.level) {
    const lvl = opts.level.toUpperCase() as LogLevel;
    if (VALID_LEVELS.has(lvl)) {
      args.push('--level', lvl);
    }
  }

  if (opts.since && isSafeSince(opts.since)) {
    args.push('--since', opts.since);
  }

  try {
    const { stdout } = await runHermesCli(args, { timeoutMs: 15_000 });
    let lines = stdout
      .split('\n')
      .map(parseLogLine)
      .filter((l): l is LogLine => l !== null);

    const query = opts.query?.trim().toLowerCase();
    if (query) {
      lines = lines.filter(l => l.raw.toLowerCase().includes(query));
    }

    return { lines };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code, args }, 'hermes logs failed');
    return { lines: [], error: code };
  }
}
