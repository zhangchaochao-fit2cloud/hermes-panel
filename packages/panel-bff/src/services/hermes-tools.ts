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
