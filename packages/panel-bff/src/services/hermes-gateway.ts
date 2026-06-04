import { spawn, exec } from 'node:child_process';
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

/**
 * Best-effort: kill anything still bound to `port`. Uses `lsof -i:PORT -t`
 * to list PIDs, SIGTERMs them, waits 1s, then SIGKILLs anything that's
 * still alive. All errors are swallowed — this is purely a safety net for
 * the case where `hermes gateway stop` couldn't talk to the running
 * process (e.g. PID file mismatch, crashed CLI).
 */
function forceKillPort(port: number): Promise<void> {
  return new Promise<void>(resolve => {
    exec(`lsof -i:${port} -t`, { timeout: 2_000 }, (_err, stdout) => {
      const pids = (stdout || '')
        .split(/\s+/)
        .map(s => Number(s.trim()))
        .filter(n => Number.isInteger(n) && n > 0);

      if (pids.length === 0) {
        resolve();
        return;
      }

      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          /* already gone — ignore */
        }
      }

      // After 1s, anything still bound gets SIGKILL.
      setTimeout(() => {
        exec(`lsof -i:${port} -t`, { timeout: 2_000 }, (_err2, stdout2) => {
          const stragglers = (stdout2 || '')
            .split(/\s+/)
            .map(s => Number(s.trim()))
            .filter(n => Number.isInteger(n) && n > 0);
          for (const pid of stragglers) {
            try {
              process.kill(pid, 'SIGKILL');
            } catch {
              /* ignore */
            }
          }
          resolve();
        });
      }, 1_000);
    });
  });
}

/**
 * Restart hermes gateway by first stopping the existing one (if any),
 * then starting fresh. We tried `hermes gateway run --replace` first
 * but on the current hermes-cli that flag does NOT actually swap a
 * detached background gateway in-place — the old process keeps
 * running on :8642 and the new spawn either fails to bind or exits.
 *
 * Explicit stop → start sidesteps that. We swallow errors from the
 * stop call because "no running gateway" is the most common reason
 * it fails and is exactly what we want to recover from.
 *
 * As a belt-and-braces guard, we also `forceKillPort(8642)` after the
 * CLI stop — this catches the case where the gateway's PID file is
 * out of sync with the live process and `hermes gateway stop`
 * silently no-ops.
 */
async function stopGatewayBestEffort(): Promise<void> {
  try {
    await runHermesCli(['gateway', 'stop'], { timeoutMs: 5_000 });
  } catch {
    /* no-op: nothing was running */
  }
  // Give the OS a beat to release :8642.
  await new Promise(r => setTimeout(r, 500));
  // Belt-and-braces: kill anything still bound to :8642.
  try {
    await forceKillPort(8642);
  } catch {
    /* best-effort */
  }
}

export async function startGateway(): Promise<StartGatewayResult> {
  await stopGatewayBestEffort();
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

/**
 * Poll the hermes API health endpoint until the gateway responds, or timeout.
 * Returns true when ready, false on timeout.
 */
export async function waitForGatewayReady(maxWaitMs = 15_000): Promise<boolean> {
  const hermesBase = process.env.HERMES_API_BASE ?? 'http://127.0.0.1:8642';
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${hermesBase}/api/system/health`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 800));
  }
  return false;
}
