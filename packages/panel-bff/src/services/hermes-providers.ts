import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { getHermesHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

export interface ModelState {
  default: string;
  provider: string;
  baseUrl?: string;
  /** True if model.api_key is set in config.yaml (we never return the value). */
  hasApiKey: boolean;
}

export interface ProviderCredential {
  label: string;
  type: 'api_key' | 'oauth' | string;
  source: string;
  active: boolean;
}

export interface ProviderInfo {
  /** Raw provider id as it appears in `hermes auth list` (may include suffix like `custom:api.deepseek.com`). */
  id: string;
  /** Stripped provider name (e.g. `custom`, `openrouter`). */
  family: string;
  credentials: ProviderCredential[];
}

export interface ProvidersState {
  model: ModelState | null;
  providers: ProviderInfo[];
  error?: string;
}

/**
 * Read the model block from ~/.hermes/config.yaml. Returns null if the file
 * is missing or unparseable — callers should treat that as "no config yet".
 */
function readModelFromConfig(): ModelState | null {
  const path = join(getHermesHome(), 'config.yaml');
  if (!existsSync(path)) return null;
  try {
    const doc = parseYaml(readFileSync(path, 'utf8')) as
      | { model?: { default?: unknown; provider?: unknown; base_url?: unknown; api_key?: unknown } }
      | null
      | undefined;
    const m = doc?.model;
    if (!m || typeof m !== 'object') return null;
    return {
      default: typeof m.default === 'string' ? m.default : '',
      provider: typeof m.provider === 'string' ? m.provider : '',
      baseUrl: typeof m.base_url === 'string' ? m.base_url : undefined,
      hasApiKey: typeof m.api_key === 'string' && m.api_key.trim() !== '',
    };
  } catch (err) {
    logger.warn({ err, path }, 'failed to parse hermes config.yaml');
    return null;
  }
}

/**
 * Parse `hermes auth list`. Format:
 *   <provider-id> (<n> credentials):
 *     #1  <label>  <type>  <source> [←]
 *     ...
 * Blank lines separate groups.
 */
function parseAuthList(stdout: string): ProviderInfo[] {
  const providers: ProviderInfo[] = [];
  let current: ProviderInfo | null = null;
  for (const raw of stdout.split('\n')) {
    const line = raw.trimEnd();
    // Group header
    const head = line.match(/^([^\s]+)\s+\(\d+\s+credentials?\):\s*$/);
    if (head) {
      if (current) providers.push(current);
      const id = head[1];
      current = { id, family: id.split(':')[0], credentials: [] };
      continue;
    }
    if (!current) continue;
    // Credential row: "  #1  LABEL   TYPE   SOURCE [←]"
    const row = line.match(/^\s+#\d+\s+(.+?)\s+(api_key|oauth)\s+(\S+)(\s+←)?\s*$/);
    if (row) {
      const [, label, type, source, active] = row;
      current.credentials.push({
        label: label.trim(),
        type: type as 'api_key' | 'oauth',
        source: source.trim(),
        active: !!active,
      });
    }
  }
  if (current) providers.push(current);
  return providers;
}

export async function readProvidersState(): Promise<ProvidersState> {
  const model = readModelFromConfig();
  try {
    const { stdout } = await runHermesCli(['auth', 'list'], { timeoutMs: 8_000 });
    return { model, providers: parseAuthList(stdout) };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes auth list failed');
    return { model, providers: [], error: code };
  }
}

export interface SetModelInput {
  name: string;
  provider?: string;
  baseUrl?: string;
  /** API key for the new model. We never expose existing keys; this only writes. */
  apiKey?: string;
}

/**
 * Apply model selection via `hermes config set`. We always set `model` (default
 * name); provider/base_url/api_key only when caller provided them, so partial
 * updates work (e.g. switching model within the same provider).
 *
 * Note: `hermes config set` rewrites config.yaml and may drop trailing comments.
 * That is hermes-cli's behavior, not ours.
 */
export async function setModel(input: SetModelInput): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'MODEL_NAME_REQUIRED' };

  const ops: [string, string][] = [['model.default', name]];
  if (input.provider !== undefined) ops.push(['model.provider', input.provider.trim()]);
  if (input.baseUrl !== undefined) ops.push(['model.base_url', input.baseUrl.trim()]);
  if (input.apiKey !== undefined && input.apiKey.trim() !== '') {
    ops.push(['model.api_key', input.apiKey.trim()]);
  }

  for (const [key, value] of ops) {
    try {
      await runHermesCli(['config', 'set', key, value], { timeoutMs: 8_000 });
    } catch (err) {
      if (err instanceof HermesCliError) return { ok: false, error: err.code };
      throw err;
    }
  }
  return { ok: true };
}

export interface AddCredentialInput {
  provider: string;
  apiKey: string;
  label?: string;
}

/**
 * Add a pooled credential via `hermes auth add <provider> --type api-key --api-key xxx [--label foo]`.
 * Pass api_key (not api-key) for type since both spellings are accepted but
 * api_key matches the CLI choice list cleanly.
 */
export async function addCredential(input: AddCredentialInput): Promise<{ ok: boolean; error?: string }> {
  const provider = input.provider.trim();
  if (!provider) return { ok: false, error: 'PROVIDER_REQUIRED' };
  if (!input.apiKey.trim()) return { ok: false, error: 'API_KEY_REQUIRED' };

  const args: string[] = ['auth', 'add', provider, '--type', 'api_key', '--api-key', input.apiKey.trim()];
  if (input.label?.trim()) args.push('--label', input.label.trim());

  try {
    await runHermesCli(args, { timeoutMs: 12_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}
