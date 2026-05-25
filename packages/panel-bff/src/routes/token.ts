import Router from '@koa/router';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from '../services/hermes-home.js';
import { PORTS } from '@hermes-panel/shared';

export const tokenRouter = new Router();

function loadHermesApiKey(): string | null {
  if (process.env.HERMES_API_KEY) return process.env.HERMES_API_KEY;
  const authJsonPath = join(getHermesHome(), 'auth.json');
  if (!existsSync(authJsonPath)) return null;
  try {
    const data = JSON.parse(readFileSync(authJsonPath, 'utf-8'));
    return data?.api_key ?? data?.apiKey ?? null;
  } catch {
    return null;
  }
}

tokenRouter.get('/token', ctx => {
  ctx.body = {
    hermesApiKey: loadHermesApiKey(),
    hermesApiBase: process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`,
  };
});
