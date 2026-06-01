import Router from '@koa/router';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runHermesCli } from '../services/hermes-cli.js';
import { getHermesHome } from '../services/hermes-home.js';
import { isDockerAvailable } from '../services/sandbox.js';
import { logger } from '../lib/logger.js';

/**
 * Probe what the local hermes install supports, so the frontend can grey
 * out features that aren't available rather than failing mid-action.
 *
 * Per spec §21.2.7 capability gates.
 */
interface Capabilities {
  hermes: { found: boolean; version?: string };
  api_server: boolean;        // hermes /v1/* endpoints reachable
  profile: boolean;
  cron: boolean;
  memory: boolean;
  mcp: boolean;
  skills: boolean;
  sandbox: { available: boolean; reason?: string };
}

export const capabilitiesRouter = new Router();

let cached: Capabilities | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function detect(): Promise<Capabilities> {
  const caps: Capabilities = {
    hermes: { found: false },
    api_server: false,
    profile: false,
    cron: false,
    memory: false,
    mcp: false,
    skills: false,
    sandbox: { available: false },
  };

  // hermes version
  try {
    const r = await runHermesCli(['--version'], { timeoutMs: 3000 });
    caps.hermes = { found: true, version: r.stdout.split('\n')[0]?.trim() };
  } catch {
    return caps;
  }

  // API server health
  try {
    const base = process.env.HERMES_API_BASE ?? 'http://127.0.0.1:8642';
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
    caps.api_server = res.ok;
  } catch {/* ignore */}

  // Memory dir
  caps.memory = existsSync(join(getHermesHome(), 'memories'));

  // Subcommand presence — fast check via --help
  for (const [key, cmd] of [
    ['profile', 'profile'],
    ['cron', 'cron'],
    ['mcp', 'mcp'],
    ['skills', 'skills'],
  ] as const) {
    try {
      await runHermesCli([cmd, '--help'], { timeoutMs: 2000 });
      caps[key] = true;
    } catch (err) {
      logger.debug({ err, cmd }, 'capability probe failed');
    }
  }

  // Docker sandbox
  const dockerAvailable = await isDockerAvailable();
  caps.sandbox = dockerAvailable
    ? { available: true }
    : { available: false, reason: 'Docker CLI not found or daemon not running' };

  return caps;
}

capabilitiesRouter.get('/capabilities', async ctx => {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) {
    ctx.body = cached;
    return;
  }
  cached = await detect();
  cachedAt = now;
  ctx.body = cached;
});
