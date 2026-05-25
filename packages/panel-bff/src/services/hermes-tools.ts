import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

export interface ToolInfo {
  name: string;
  enabled: boolean;
  icon?: string;
  label?: string;
  source: 'builtin' | 'mcp';
  server?: string;          // for mcp tools (server:tool)
}

export interface SkillInfo {
  name: string;
  category: string;
  source: string;          // builtin / local / hub etc.
  trust: string;           // builtin / local / verified ...
}

/**
 * A skill from the agentskills.io marketplace (or any other browseable source).
 * Returned by `hermes skills browse` / `hermes skills search`.
 */
export interface AvailableSkill {
  name: string;
  category?: string;
  description?: string;
  source?: string;
  installed?: boolean;
}

export interface McpServer {
  name: string;
  // hermes only tells us if it's configured; deeper info via mcp test
  configured: boolean;
}

/**
 * Parses `hermes tools list` text output. Format:
 *
 *   Built-in toolsets (cli):
 *     ✓ enabled  web  🔍 Web Search & Scraping
 *     ✗ disabled  moa  🧠 Mixture of Agents
 *
 *   MCP tools (when servers are configured):
 *     ✓ enabled  github:create_issue  ...
 */
export async function listTools(): Promise<{ tools: ToolInfo[]; error?: string }> {
  try {
    const { stdout } = await runHermesCli(['tools', 'list'], { timeoutMs: 10_000 });
    return { tools: parseToolsText(stdout) };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes tools list failed');
    return { tools: [], error: code };
  }
}

function parseToolsText(text: string): ToolInfo[] {
  const tools: ToolInfo[] = [];
  let currentSource: 'builtin' | 'mcp' = 'builtin';

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    // Section header
    if (/built-?in/i.test(line)) {
      currentSource = 'builtin';
      continue;
    }
    if (/^MCP\b/i.test(line) || /MCP tools?/i.test(line)) {
      currentSource = 'mcp';
      continue;
    }

    // Tool row: "  ✓ enabled  name  icon label..."
    const match = line.match(/^\s*([✓✗])\s+(enabled|disabled)\s+(\S+)\s*(.*)$/u);
    if (!match) continue;

    const [, , status, name, rest] = match;
    const enabled = status === 'enabled';
    // Extract first emoji-like glyph (anything before the first ASCII letter chunk) as icon
    const iconMatch = rest.match(/^([\u{1F300}-\u{1FAFF}\u{2300}-\u{27BF}]+)\s*(.*)$/u);
    const icon = iconMatch?.[1];
    const label = (iconMatch?.[2] ?? rest).trim() || undefined;

    let server: string | undefined;
    let displayName = name;
    if (currentSource === 'mcp' && name.includes(':')) {
      const [s, t] = name.split(':');
      server = s;
      displayName = t;
    }

    tools.push({
      name: displayName,
      enabled,
      icon,
      label,
      source: currentSource,
      server,
    });
  }
  return tools;
}

export async function setToolEnabled(name: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const cmd = enabled ? 'enable' : 'disable';
  try {
    await runHermesCli(['tools', cmd, name], { timeoutMs: 10_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}

/**
 * Parses `hermes skills list` table. The header row contains `Name`, `Category`,
 * `Source`, `Trust`. Rows use box-drawing dividers.
 */
export async function listSkills(): Promise<{ skills: SkillInfo[]; error?: string }> {
  try {
    const { stdout } = await runHermesCli(['skills', 'list'], { timeoutMs: 15_000 });
    return { skills: parseSkillsText(stdout) };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes skills list failed');
    return { skills: [], error: code };
  }
}

function parseSkillsText(text: string): SkillInfo[] {
  const skills: SkillInfo[] = [];
  for (const raw of text.split('\n')) {
    if (!raw.includes('│')) continue;
    const cells = raw.split('│').map(s => s.trim()).filter(s => s.length > 0);
    if (cells.length < 4) continue;
    const [name, category, source, trust] = cells;
    // Skip header row
    if (name === 'Name' || name.toLowerCase() === 'name') continue;
    if (/^[━─=]+$/.test(name)) continue;
    skills.push({ name, category: category || '(uncategorized)', source, trust });
  }
  return skills;
}

/**
 * Browse / search skills from the marketplace (agentskills.io etc).
 * Wraps `hermes skills browse` or `hermes skills search <query>`.
 *
 * Output formatting varies across hermes versions: we parse defensively and
 * fall back to interpreting any non-blank line that has an installable-looking
 * identifier.
 */
export async function browseSkills(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ skills: AvailableSkill[]; total: number; error?: string }> {
  const q = opts.search?.trim();
  const args = q ? ['skills', 'search', q] : ['skills', 'browse'];

  try {
    const { stdout } = await runHermesCli(args, { timeoutMs: 30_000 });
    const stripped = stripAnsi(stdout);
    const allSkills = parseAvailableSkillsText(stripped);

    // Mark already-installed skills using local list if available
    try {
      const local = await listSkills();
      const installedNames = new Set(local.skills.map(s => s.name.toLowerCase()));
      for (const s of allSkills) {
        if (installedNames.has(s.name.toLowerCase())) s.installed = true;
      }
    } catch {
      // Best-effort enrichment; ignore failures
    }

    const total = allSkills.length;
    const pageSize = Math.max(1, Math.min(opts.pageSize ?? 30, 200));
    const page = Math.max(1, opts.page ?? 1);
    const start = (page - 1) * pageSize;
    const skills = allSkills.slice(start, start + pageSize);
    return { skills, total };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code, args }, 'hermes skills browse failed');
    return { skills: [], total: 0, error: code };
  }
}

export async function installSkill(name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runHermesCli(['skills', 'install', name], { timeoutMs: 120_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}

export async function uninstallSkill(name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runHermesCli(['skills', 'uninstall', name], { timeoutMs: 30_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}

// Strip ANSI escape sequences (CSI + OSC) from CLI output so the parser sees
// raw text. We build the regex from the ESC code point at runtime so this
// source file stays free of literal control bytes.
const ESC_CHAR = String.fromCharCode(0x1b);
const BEL_CHAR = String.fromCharCode(0x07);
const ANSI_CSI_RE = new RegExp(`${ESC_CHAR}\\[[0-9;?]*[A-Za-z]`, 'g');
const ANSI_OSC_RE = new RegExp(`${ESC_CHAR}\\][^${BEL_CHAR}${ESC_CHAR}]*(?:${BEL_CHAR}|${ESC_CHAR}\\\\)`, 'g');

function stripAnsi(input: string): string {
  return input.replace(ANSI_CSI_RE, '').replace(ANSI_OSC_RE, '');
}

/**
 * Defensive parser for `hermes skills browse` / `search` output.
 *
 * Handles two known shapes:
 *   1) Box-drawing table with `│` cell separators (same as `skills list`),
 *      with columns roughly: Name [| Category] [| Description] [| Source].
 *   2) Free-form "card" style:  `name (category)  description...` per line.
 *
 * Header rows ("Name", "Category", ...) and divider rows are skipped.
 */
function parseAvailableSkillsText(text: string): AvailableSkill[] {
  const skills: AvailableSkill[] = [];
  const seen = new Set<string>();

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;

    // Table row with `│` separators (preferred path)
    if (line.includes('│')) {
      const cells = line.split('│').map(s => s.trim()).filter(s => s.length > 0);
      if (cells.length < 1) continue;
      const [name, ...rest] = cells;
      if (!name || /^[━─=]+$/.test(name)) continue;
      const lower = name.toLowerCase();
      if (lower === 'name' || lower === 'skill') continue;

      const skill: AvailableSkill = { name };
      // Best-effort column mapping
      if (rest[0]) skill.category = rest[0];
      if (rest.length >= 3) {
        skill.description = rest[1];
        skill.source = rest[2];
      } else if (rest.length === 2) {
        // Could be (category, source) or (category, description). Heuristic:
        // if rest[1] looks like a url/path, treat it as source; otherwise description.
        if (/^(https?:\/\/|\/|[\w.-]+\/)/.test(rest[1])) {
          skill.source = rest[1];
        } else {
          skill.description = rest[1];
        }
      }
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        skills.push(skill);
      }
      continue;
    }

    // Card / flat format: "name  (category)  description"
    // or "  name - description"
    const m = line.match(/^\s*[•*\-]?\s*([@\w][@\w./-]*)\s*(?:\(([^)]+)\))?\s*[-–—:]?\s*(.*)$/u);
    if (!m) continue;
    const [, name, category, descRaw] = m;
    if (!name || name.length < 2) continue;
    const lower = name.toLowerCase();
    // Skip noisy section headers like "Browsing", "Results", etc.
    if (['browsing', 'results', 'page', 'total', 'name', 'skills'].includes(lower)) continue;
    const description = descRaw?.trim() || undefined;
    if (!seen.has(name)) {
      seen.add(name);
      skills.push({
        name,
        category: category?.trim() || undefined,
        description,
      });
    }
  }

  return skills;
}

export async function listMcpServers(): Promise<{ servers: McpServer[]; error?: string }> {
  try {
    const { stdout } = await runHermesCli(['mcp', 'list'], { timeoutMs: 10_000 });
    const servers: McpServer[] = [];
    for (const raw of stdout.split('\n')) {
      const line = raw.trim();
      // Heuristic: server names usually appear after a status marker
      // Default output is "No MCP servers configured." when empty.
      if (/no mcp servers/i.test(line)) break;
      const m = line.match(/^([a-z][\w-]*)\s+/i);
      if (m) servers.push({ name: m[1], configured: true });
    }
    return { servers };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes mcp list failed');
    return { servers: [], error: code };
  }
}
