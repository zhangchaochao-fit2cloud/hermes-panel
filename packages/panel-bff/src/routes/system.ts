import Router from '@koa/router';
import type { HealthStatus } from '@hermes-panel/shared';
import { PORTS } from '@hermes-panel/shared';
import { runHermesCli } from '../services/hermes-cli.js';

const startedAt = Date.now();
export const PANEL_VERSION = '0.1.0-alpha.0';

export const systemRouter = new Router();

systemRouter.get('/system/health', async ctx => {
  let hermesRunning = false;
  let version: string | null = null;
  let error: string | undefined;
  try {
    const r = await runHermesCli(['--version'], { timeoutMs: 2000 });
    hermesRunning = true;
    version = r.stdout.split('\n')[0]?.trim() ?? null;
  } catch (err) {
    error = (err as Error).message;
  }

  const body: HealthStatus = {
    hermes: {
      running: hermesRunning,
      version,
      apiBase: process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`,
      error,
    },
    bff: {
      running: true,
      version: PANEL_VERSION,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    },
    panel: { version: PANEL_VERSION },
  };
  ctx.body = body;
});

systemRouter.get('/system/health/deep', async ctx => {
  const bffResult = { ok: true, latencyMs: 0 };

  let hermesOk = false;
  let hermesLatencyMs = 0;
  let hermesError: string | undefined;

  const base = process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`;
  const start = Date.now();
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
    hermesLatencyMs = Date.now() - start;
    hermesOk = res.ok;
    if (!res.ok) hermesError = `HTTP ${res.status}`;
  } catch (err) {
    hermesLatencyMs = Date.now() - start;
    hermesError = (err as Error).message;
  }

  const overall = hermesOk ? 'healthy' : hermesError ? 'down' : 'degraded';

  ctx.body = {
    bff: bffResult,
    hermes: { ok: hermesOk, latencyMs: hermesLatencyMs, ...(hermesError ? { error: hermesError } : {}) },
    overall,
  };
});
