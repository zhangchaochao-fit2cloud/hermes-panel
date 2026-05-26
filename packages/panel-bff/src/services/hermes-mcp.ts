import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { listMcpServers, type McpServer } from './hermes-tools.js';
import { logger } from '../lib/logger.js';

export type { McpServer };

export interface AddMcpInput {
  name: string;
  /** stdio server: the command to spawn (e.g. "npx") */
  command?: string;
  /** stdio server: arguments for the command */
  args?: string[];
  /** stdio server: env vars passed to the spawned process */
  env?: Record<string, string>;
  /** HTTP/SSE server: endpoint URL */
  url?: string;
  /** transport — purely informational, the CLI infers it from command vs url */
  transport?: 'stdio' | 'http' | 'sse';
  /** auth mode for url-based servers */
  auth?: 'oauth' | 'header';
  /** known preset name */
  preset?: string;
}

export interface AddMcpResult {
  ok: boolean;
  /** machine-readable error code; user-facing codes are uppercase snake */
  error?: string;
  /** raw stderr from the CLI, if any (only on failure) */
  detail?: string;
}

const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function validateAddInput(input: AddMcpInput): string | null {
  if (!input.name || typeof input.name !== 'string') return 'NAME_REQUIRED';
  if (!NAME_PATTERN.test(input.name)) return 'INVALID_NAME';

  const hasCommand = typeof input.command === 'string' && input.command.trim().length > 0;
  const hasUrl = typeof input.url === 'string' && input.url.trim().length > 0;
  const hasPreset = typeof input.preset === 'string' && input.preset.trim().length > 0;
  if (!hasCommand && !hasUrl && !hasPreset) return 'TRANSPORT_REQUIRED';
  if (hasCommand && hasUrl) return 'TRANSPORT_CONFLICT';

  if (input.args && !Array.isArray(input.args)) return 'INVALID_ARGS';
  if (input.args && input.args.some(a => typeof a !== 'string')) return 'INVALID_ARGS';

  if (input.env) {
    if (typeof input.env !== 'object' || Array.isArray(input.env)) return 'INVALID_ENV';
    for (const [k, v] of Object.entries(input.env)) {
      if (!ENV_KEY_PATTERN.test(k)) return 'INVALID_ENV';
      if (typeof v !== 'string') return 'INVALID_ENV';
    }
  }

  if (hasUrl) {
    try {
      const u = new URL(input.url!);
      if (!/^https?:$/.test(u.protocol)) return 'INVALID_URL';
    } catch {
      return 'INVALID_URL';
    }
  }

  if (input.auth && !['oauth', 'header'].includes(input.auth)) return 'INVALID_AUTH';

  return null;
}

function buildAddArgs(input: AddMcpInput): string[] {
  const args: string[] = ['mcp', 'add', input.name];
  if (input.url) args.push('--url', input.url);
  if (input.command) {
    args.push('--command', input.command);
    if (input.args && input.args.length > 0) {
      args.push('--args', ...input.args);
    }
  }
  if (input.env && Object.keys(input.env).length > 0) {
    args.push('--env', ...Object.entries(input.env).map(([k, v]) => `${k}=${v}`));
  }
  if (input.preset) args.push('--preset', input.preset);
  if (input.auth) args.push('--auth', input.auth);
  return args;
}

export async function addMcp(input: AddMcpInput): Promise<AddMcpResult> {
  const validationError = validateAddInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    await runHermesCli(buildAddArgs(input), { timeoutMs: 30_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const detail = (err.detail as { stderr?: string } | undefined)?.stderr ?? '';
      logger.warn({ err, code: err.code, name: input.name }, 'hermes mcp add failed');
      // Map known stderr patterns to nicer codes
      if (/already exists/i.test(detail)) return { ok: false, error: 'MCP_ALREADY_EXISTS', detail };
      return { ok: false, error: err.code, detail };
    }
    throw err;
  }
}

export async function removeMcp(name: string): Promise<AddMcpResult> {
  if (!name || typeof name !== 'string') return { ok: false, error: 'NAME_REQUIRED' };
  if (!NAME_PATTERN.test(name)) return { ok: false, error: 'INVALID_NAME' };

  try {
    await runHermesCli(['mcp', 'remove', name], { timeoutMs: 15_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      const detail = (err.detail as { stderr?: string } | undefined)?.stderr ?? '';
      logger.warn({ err, code: err.code, name }, 'hermes mcp remove failed');
      if (/not found|no such/i.test(detail)) return { ok: false, error: 'MCP_NOT_FOUND', detail };
      return { ok: false, error: err.code, detail };
    }
    throw err;
  }
}

export { listMcpServers };
