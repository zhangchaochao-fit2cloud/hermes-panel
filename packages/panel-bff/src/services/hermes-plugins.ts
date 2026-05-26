import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

export interface PluginInfo {
  /** Plugin name (from manifest if present, otherwise directory name) */
  name: string;
  /** Whether the plugin is currently enabled */
  enabled: boolean;
  /** Version string from the plugin manifest (may be missing) */
  version?: string;
  /** Short description from the plugin manifest (may be missing) */
  description?: string;
  /**
   * Where the plugin came from. `hermes plugins list` only distinguishes
   * `git` (installed via `hermes plugins install`) and `local` (manually
   * dropped into `~/.hermes/plugins/`). Preserved as-is.
   */
  source?: string;
}

export interface ListPluginsResult {
  plugins: PluginInfo[];
  error?: string;
}

export interface PluginOpResult {
  ok: boolean;
  error?: string;
  /** Raw stderr from the CLI when the call failed. */
  detail?: string;
}

/** Allowed plugin name characters for sanity checks. */
const PLUGIN_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * `hermes plugins install` accepts either a Git URL (https/git/ssh) or an
 * `owner/repo` shorthand. We accept anything that looks like one of those.
 */
const SOURCE_HTTP_PATTERN = /^https?:\/\/\S+$/i;
const SOURCE_GIT_SCHEME_PATTERN = /^(git|ssh):\/\/\S+$/i;
const SOURCE_SCP_PATTERN = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:[\w./~-]+(?:\.git)?$/;
const SOURCE_OWNER_REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

function isValidSource(s: string): boolean {
  return (
    SOURCE_HTTP_PATTERN.test(s) ||
    SOURCE_GIT_SCHEME_PATTERN.test(s) ||
    SOURCE_SCP_PATTERN.test(s) ||
    SOURCE_OWNER_REPO_PATTERN.test(s)
  );
}

/**
 * Parse the `Status` column. The table renders styled text with TTY but
 * since we're capturing via execFile (no TTY), Rich emits plain `enabled` /
 * `disabled` strings. We're defensive against either.
 */
function parseStatus(cell: string): boolean {
  const lower = cell.trim().toLowerCase();
  // Strip any leftover Rich markup just in case ("[green]enabled[/green]")
  const stripped = lower.replace(/\[\/?[^\]]+\]/g, '').trim();
  return stripped === 'enabled';
}

/**
 * Parse `hermes plugins list` output. Two known shapes:
 *
 *   1) Empty:
 *      `No plugins installed.\nInstall with: hermes plugins install owner/repo`
 *
 *   2) Rich table with `│` cell separators:
 *
 *      ┏━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━━━━┳━━━━━━━━┓
 *      ┃ Name        ┃ Status   ┃ Version ┃ Description   ┃ Source ┃
 *      ┡━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━━━━╇━━━━━━━━┩
 *      │ test-plugin │ enabled  │ 0.1.0   │ A test plugin │ git    │
 *      └─────────────┴──────────┴─────────┴───────────────┴────────┘
 *
 * Header and divider rows are skipped. Columns after `Name`/`Status` are
 * optional (the CLI may grow more in the future).
 */
export function parsePluginsText(text: string): PluginInfo[] {
  const plugins: PluginInfo[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.includes('│')) continue;

    // Split into trimmed non-empty cells. The leading/trailing `│` produce
    // empty strings which we drop. Divider rows (`├───┼───┤`) would split
    // into purely box-drawing chars; we filter those out below.
    const cells = line.split('│').map(s => s.trim()).filter(s => s.length > 0);
    if (cells.length < 2) continue;

    const [name, status, version, description, source] = cells;
    if (!name) continue;
    // Header
    if (name.toLowerCase() === 'name') continue;
    // Pure divider chars (some Rich themes use ─ inside `││`)
    if (/^[━─=]+$/.test(name)) continue;

    const info: PluginInfo = {
      name,
      enabled: parseStatus(status ?? ''),
    };
    if (version && version.length > 0) info.version = version;
    if (description && description.length > 0) info.description = description;
    if (source && source.length > 0) info.source = source;
    plugins.push(info);
  }
  return plugins;
}

export async function listPlugins(): Promise<ListPluginsResult> {
  try {
    const { stdout } = await runHermesCli(['plugins', 'list'], { timeoutMs: 15_000 });
    return { plugins: parsePluginsText(stdout) };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes plugins list failed');
    // Match the established "panel must stay usable" pattern: return empty
    // data rather than 5xx when the CLI is unavailable.
    return { plugins: [], error: code };
  }
}

/**
 * `hermes plugins install <identifier>`. The identifier is either a Git URL
 * (https, git, ssh, or scp-style) or `owner/repo` shorthand. We validate the
 * shape here so callers get a clean 400 instead of a CLI error.
 */
export async function installPlugin(source: string): Promise<PluginOpResult> {
  if (typeof source !== 'string') return { ok: false, error: 'SOURCE_REQUIRED' };
  const trimmed = source.trim();
  if (!trimmed) return { ok: false, error: 'SOURCE_REQUIRED' };
  if (!isValidSource(trimmed)) return { ok: false, error: 'INVALID_SOURCE' };

  try {
    // Install can include network + git clone; allow a generous timeout.
    await runHermesCli(['plugins', 'install', trimmed], { timeoutMs: 120_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const detail = (err.detail as { stderr?: string } | undefined)?.stderr ?? '';
      logger.warn({ err, code: err.code, source: trimmed }, 'hermes plugins install failed');
      if (/already exists/i.test(detail)) return { ok: false, error: 'PLUGIN_ALREADY_EXISTS', detail };
      if (/git clone failed|unable to access|could not resolve host/i.test(detail)) {
        return { ok: false, error: 'PLUGIN_CLONE_FAILED', detail };
      }
      return { ok: false, error: err.code, detail };
    }
    throw err;
  }
}

function validateName(name: string): string | null {
  if (!name || typeof name !== 'string') return 'NAME_REQUIRED';
  if (!PLUGIN_NAME_PATTERN.test(name)) return 'INVALID_NAME';
  return null;
}

async function runWithName(
  name: string,
  cliArgs: string[],
  failureCode: string,
  timeoutMs = 60_000,
): Promise<PluginOpResult> {
  const validationError = validateName(name);
  if (validationError) return { ok: false, error: validationError };

  try {
    await runHermesCli(cliArgs, { timeoutMs });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const detail = (err.detail as { stderr?: string } | undefined)?.stderr ?? '';
      logger.warn({ err, code: err.code, name, cliArgs }, `${failureCode} failed`);
      if (/not installed|no such|not found/i.test(detail)) {
        return { ok: false, error: 'PLUGIN_NOT_FOUND', detail };
      }
      return { ok: false, error: err.code, detail };
    }
    throw err;
  }
}

export function updatePlugin(name: string): Promise<PluginOpResult> {
  return runWithName(name, ['plugins', 'update', name], 'plugin update', 120_000);
}

export function removePlugin(name: string): Promise<PluginOpResult> {
  return runWithName(name, ['plugins', 'remove', name], 'plugin remove', 30_000);
}

export function enablePlugin(name: string): Promise<PluginOpResult> {
  return runWithName(name, ['plugins', 'enable', name], 'plugin enable', 15_000);
}

export function disablePlugin(name: string): Promise<PluginOpResult> {
  return runWithName(name, ['plugins', 'disable', name], 'plugin disable', 15_000);
}
