import { spawn } from 'node:child_process';
import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

// `hermes gateway run` foregrounds the API server. To start it from the BFF
// we spawn it detached and let it survive the BFF restart. We pass --replace
// so any stale gateway is taken over cleanly, and --quiet to avoid filling
// stdout/stderr (which we route to /dev/null on detach).
//
// Note: `hermes gateway start` would use systemd/launchd, but that path is
// not installed in most dev environments. `run --replace` is what the
// project's own scripts/tauri-dev-prep.sh uses, and is the most portable.

export interface StartGatewayResult {
  ok: true;
  pid?: number;
  bin: string;
}

export interface StopGatewayResult {
  ok: true;
  output: string;
}

export interface GatewayStatusResult {
  running: boolean;
  pid?: number;
  raw?: string;
}

function resolveBin(): string {
  return process.env.HERMES_BIN ?? 'hermes';
}

/**
 * Spawn `hermes gateway run --replace --quiet` detached so the gateway
 * keeps running after the spawn call returns. We do NOT await exit.
 *
 * The child's stdio is piped to /dev/null via `stdio: 'ignore'`, and we
 * call `unref()` so the BFF event loop is not held open by the child.
 *
 * If the binary is missing, this throws a HermesCliError synchronously
 * once the spawn `error` event fires; otherwise it resolves immediately
 * with the child PID (the actual readiness probe is the existing
 * /api/system/health endpoint).
 */
/**
 * Hermes gateway only exposes the OpenAI-compatible /v1/* API when the
 * api_server "messaging platform" is enabled. By default it's off, and
 * config.yaml lacks a `platforms:` block — so the platform's only
 * trigger is the env-var pair API_SERVER_ENABLED + API_SERVER_PORT/HOST.
 *
 * `scripts/tauri-dev-prep.sh` injects these when bootstrapping the dev
 * gateway, but when the panel itself reaches over to start/restart the
 * gateway (e.g. after a provider switch), the BFF's own process env
 * isn't guaranteed to carry them. Injecting them here makes the api
 * server the panel's single source of truth — no more "ran fine on
 * first boot, then died after a config change" surprise.
 */
function gatewayEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    API_SERVER_ENABLED: process.env.API_SERVER_ENABLED ?? 'true',
    API_SERVER_HOST: process.env.API_SERVER_HOST ?? '127.0.0.1',
    API_SERVER_PORT: process.env.API_SERVER_PORT ?? '8642',
    API_SERVER_CORS_ORIGINS:
      process.env.API_SERVER_CORS_ORIGINS
      ?? 'tauri://localhost,http://127.0.0.1:5666,http://localhost:5666',
  };
}

export function startGateway(): Promise<StartGatewayResult> {
  const bin = resolveBin();
  return new Promise<StartGatewayResult>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };

    try {
      const child = spawn(bin, ['gateway', 'run', '--replace', '--quiet'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
        env: gatewayEnv(),
      });

      child.once('error', (err: NodeJS.ErrnoException) => {
        settle(() => {
          if (err.code === 'ENOENT') {
            reject(new HermesCliError('HERMES_CLI_NOT_FOUND', `hermes binary not found: ${bin}`));
            return;
          }
          reject(new HermesCliError('HERMES_CLI_FAILED', `failed to spawn hermes gateway: ${err.message}`));
        });
      });

      // If the child exits within the first 250ms, assume launch failed
      // (e.g. unknown subcommand, missing config). After that window we
      // consider startup successful — the gateway needs a few seconds to
      // actually bind :8642 and the caller polls /api/system/health.
      const earlyExit = (code: number | null, signal: NodeJS.Signals | null): void => {
        settle(() => {
          reject(new HermesCliError(
            'HERMES_CLI_FAILED',
            `hermes gateway exited early (code=${code} signal=${signal})`,
          ));
        });
      };
      child.once('exit', earlyExit);

      setTimeout(() => {
        child.removeListener('exit', earlyExit);
        child.unref();
        logger.info({ pid: child.pid }, 'hermes gateway spawned detached');
        settle(() => resolve({ ok: true, pid: child.pid, bin }));
      }, 250);
    } catch (err) {
      settle(() => reject(err));
    }
  });
}

/**
 * `hermes gateway stop` exits quickly once it has signalled the running
 * gateway. We give it a generous 10s in case of slow systems.
 */
export async function stopGateway(): Promise<StopGatewayResult> {
  const result = await runHermesCli(['gateway', 'stop'], { timeoutMs: 10_000 });
  return { ok: true, output: result.stdout.trim() };
}

/**
 * `hermes gateway status` returns a short summary. We don't try to parse
 * a PID out of arbitrary text — the panel's source of truth for "is the
 * gateway up?" is /api/system/health hitting the actual port. We return
 * the raw stdout so a status pane can show it verbatim, and a coarse
 * `running` boolean inferred from the CLI's exit code / wording.
 */
export async function gatewayStatus(): Promise<GatewayStatusResult> {
  try {
    const result = await runHermesCli(['gateway', 'status'], { timeoutMs: 5_000 });
    const raw = result.stdout.trim();
    // `hermes gateway status` prints something like
    //   "Gateway: running (pid 12345)"  or  "Gateway: not running"
    // We do a forgiving substring check.
    const lower = raw.toLowerCase();
    const running = lower.includes('running') && !lower.includes('not running');
    let pid: number | undefined;
    const m = raw.match(/pid[^0-9]*([0-9]+)/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) pid = n;
    }
    return { running, pid, raw };
  } catch (err) {
    if (err instanceof HermesCliError) {
      // status often exits non-zero when the gateway is down. Treat that
      // as a definite "not running" rather than propagating a 502.
      return { running: false, raw: err.message };
    }
    throw err;
  }
}
