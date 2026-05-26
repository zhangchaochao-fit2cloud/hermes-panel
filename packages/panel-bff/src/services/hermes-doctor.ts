import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

export type DoctorStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface DoctorCheck {
  category?: string;
  name: string;
  status: DoctorStatus;
  message?: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  raw: string;
  error?: string;
}

// Strip ANSI escape sequences from CLI output so the parser sees raw text.
// The ESC code point is assembled at runtime to keep this source free of
// literal control bytes.
const ESC_CHAR = String.fromCharCode(0x1b);
const BEL_CHAR = String.fromCharCode(0x07);
const ANSI_CSI_RE = new RegExp(`${ESC_CHAR}\\[[0-9;?]*[A-Za-z]`, 'g');
const ANSI_OSC_RE = new RegExp(`${ESC_CHAR}\\][^${BEL_CHAR}${ESC_CHAR}]*(?:${BEL_CHAR}|${ESC_CHAR}\\\\)`, 'g');

function stripAnsi(input: string): string {
  return input.replace(ANSI_CSI_RE, '').replace(ANSI_OSC_RE, '');
}

/**
 * Wraps `hermes doctor`. Doctor probes network so we allow a generous timeout.
 *
 * The CLI exits non-zero when it finds issues. `execFile` throws in that case
 * but its `err.stdout` still contains the rendered report — we recover that
 * here so the panel can present results regardless of exit code.
 */
export async function runDoctor(): Promise<DoctorReport> {
  let raw = '';
  let errorCode: string | undefined;

  try {
    const r = await runHermesCli(['doctor'], { timeoutMs: 30_000 });
    raw = r.stdout;
  } catch (err) {
    if (err instanceof HermesCliError) {
      errorCode = err.code;
      // When hermes doctor exits non-zero we still want to surface its report.
      const detail = err.detail as { stderr?: string; stdout?: string } | undefined;
      // runHermesCli only stuffs stderr/exitCode into detail today, but check
      // both fields for forward-compat with future error shapes.
      const maybeStdout = detail && typeof (detail as { stdout?: unknown }).stdout === 'string'
        ? (detail as { stdout?: string }).stdout
        : undefined;
      if (maybeStdout) raw = maybeStdout;
      // If the binary is missing, no point trying to parse anything.
      if (err.code === 'HERMES_CLI_NOT_FOUND' || err.code === 'HERMES_CLI_TIMEOUT') {
        logger.warn({ code: err.code }, 'hermes doctor failed');
        return { checks: [], raw, error: err.code };
      }
      logger.warn({ code: err.code }, 'hermes doctor returned non-zero exit');
    } else {
      logger.warn({ err }, 'hermes doctor failed unexpectedly');
      return { checks: [], raw, error: 'UNKNOWN' };
    }
  }

  const stripped = stripAnsi(raw);
  const checks = parseDoctorText(stripped);

  return errorCode ? { checks, raw, error: errorCode } : { checks, raw };
}

/**
 * Best-effort parser for `hermes doctor` output. Format observed:
 *
 *   ┌──────────────────────────────────────┐
 *   │           🩺 Hermes Doctor          │
 *   └──────────────────────────────────────┘
 *
 *   ◆ Python Environment
 *     ✓ Python 3.11.15
 *     ✓ Virtual environment active
 *
 *   ◆ Required Packages
 *     ✓ OpenAI SDK
 *     ⚠ Browser tools (agent-browser) deps (... run: ...)
 *     ✗ Something missing
 *
 *   ...
 *
 *   ────────────────────────────────────────
 *     Found N issue(s) to address:
 *     1. ...
 *
 * Each `◆` line opens a new category. Each indented row begins with a status
 * glyph: ✓ (ok), ⚠ (warn), ✗ / ✘ / × (fail), or a plain bullet (info).
 *
 * Anything inside the trailing "Found N issue(s)" / "Tip:" summary block is
 * skipped — those are duplicates of the per-row reports.
 *
 * If we can't recover any structured checks the caller falls back to showing
 * the raw output.
 */
export function parseDoctorText(text: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  let currentCategory: string | undefined;
  let inSummary = false;

  // Status glyphs. Hermes uses heavyweight Unicode (◆/✓/✗/⚠) plus a few
  // ASCII fallbacks observed across versions.
  const okGlyphs = ['✓', '✔', '[OK]'];
  const warnGlyphs = ['⚠', '!', '[WARN]'];
  const failGlyphs = ['✗', '✘', '×', '✕', '[FAIL]'];

  function classify(line: string): { status: DoctorStatus; rest: string } | null {
    // Match an optional leading whitespace, a glyph, then required whitespace.
    // We must not eat the glyph in the middle of a word (e.g. a check
    // description that happens to contain ✓), so anchor to start.
    for (const g of okGlyphs) {
      const re = new RegExp(`^\\s*${escapeRegex(g)}\\s+(.*)$`);
      const m = line.match(re);
      if (m) return { status: 'ok', rest: m[1] };
    }
    for (const g of warnGlyphs) {
      const re = new RegExp(`^\\s*${escapeRegex(g)}\\s+(.*)$`);
      const m = line.match(re);
      if (m) return { status: 'warn', rest: m[1] };
    }
    for (const g of failGlyphs) {
      const re = new RegExp(`^\\s*${escapeRegex(g)}\\s+(.*)$`);
      const m = line.match(re);
      if (m) return { status: 'fail', rest: m[1] };
    }
    // Plain bullet (•, ·, -): treat as informational
    const bullet = line.match(/^\s*(?:[•·–-]|\*)\s+(.+)$/);
    if (bullet) return { status: 'info', rest: bullet[1] };
    return null;
  }

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Box-drawing borders and the title banner — skip.
    if (/^[┌┐└┘─━│┃═╔╗╚╝╠╣╩╦╬]+$/.test(trimmed)) continue;
    if (/Hermes Doctor/i.test(trimmed) && /^[│┃|]/.test(trimmed)) continue;

    // Horizontal divider before the summary block (a run of ─ characters)
    if (/^─{5,}$/.test(trimmed) || /^-{5,}$/.test(trimmed) || /^={5,}$/.test(trimmed)) {
      inSummary = true;
      continue;
    }
    // The summary block uses lines like "Found N issue(s) to address:" and
    // numbered items beneath. Skip entirely; per-row reports already captured
    // the same content above.
    if (/^Found \d+ issue\(s\)/i.test(trimmed)) { inSummary = true; continue; }
    if (/^Tip:/i.test(trimmed)) { inSummary = true; continue; }
    if (inSummary) continue;

    // Category header: "◆ <name>" (or other heavyweight bullets observed)
    const cat = trimmed.match(/^[◆◇◈❖▣▪■□●○♦]\s+(.+)$/);
    if (cat) {
      currentCategory = cat[1].trim();
      continue;
    }

    const c = classify(line);
    if (!c) continue;

    // Split "Name (extra detail or instructions)" into name + message.
    // We treat the first parenthesised group as the message when it carries
    // remediation guidance (contains "run", a colon, or commas) — otherwise
    // it's likely just a version/qualifier and stays in the name.
    let name = c.rest.trim();
    let message: string | undefined;

    // If the line is "Name  ✓ Something" (status appears mid-line) the
    // remainder after our leading glyph already includes the relevant text,
    // so no further splitting is needed for the rare "API Connectivity"
    // section that prints both a heading and a status on the same row.
    // The classifier already consumed the leading glyph; collapse any leftover
    // double-spaced segments.
    name = name.replace(/\s{2,}/g, '  ').trim();

    // Walk every top-level parenthesised group and pick the *largest* one
    // that looks like remediation guidance. Multi-group lines like
    //   "Browser tools (agent-browser) deps (0 critical ... run: ...)"
    // need the second group, not the first.
    const groups = findTopLevelParenGroups(name);
    let bestGroup: { start: number; end: number; inside: string } | null = null;
    for (const g of groups) {
      const inside = g.inside;
      const looksLikeRemediation = /(?:run:|run |\bnpm\b|\bcd \b|missing |not found|: |set in|rate limit| — )/i.test(inside)
        || inside.includes(',');
      const isMeaningfullyLong = inside.length > 18;
      if (looksLikeRemediation && isMeaningfullyLong) {
        if (!bestGroup || inside.length > bestGroup.inside.length) bestGroup = g;
      }
    }
    if (bestGroup) {
      message = bestGroup.inside;
      const before = name.slice(0, bestGroup.start).trim();
      const after = name.slice(bestGroup.end + 1).trim();
      name = [before, after].filter(Boolean).join(' ').trim();
    }

    if (!name) continue;
    checks.push({
      category: currentCategory,
      name,
      status: c.status,
      message,
    });
  }

  return checks;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Enumerate every top-level (depth-0) parenthesised group in `s`. Each
 * returned record has the indices of the opening `(` and matching `)` plus
 * the trimmed content between them. Unbalanced groups are skipped.
 */
function findTopLevelParenGroups(s: string): Array<{ start: number; end: number; inside: string }> {
  const out: Array<{ start: number; end: number; inside: string }> = [];
  let depth = 0;
  let openIdx = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') {
      if (depth === 0) openIdx = i;
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0 && openIdx >= 0) {
        out.push({
          start: openIdx,
          end: i,
          inside: s.slice(openIdx + 1, i).trim(),
        });
        openIdx = -1;
      }
      if (depth < 0) {
        // Unbalanced — reset and keep scanning so we don't get stuck.
        depth = 0;
      }
    }
  }
  return out;
}
