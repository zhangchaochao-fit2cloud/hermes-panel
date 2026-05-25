import Router from '@koa/router';
import type { SessionSummary } from '@hermes-panel/shared';
import { runHermesCli, HermesCliError } from '../services/hermes-cli.js';
import { logger } from '../lib/logger.js';

export const sessionsRouter = new Router();

interface HermesSessionRaw {
  id: string;
  title?: string;
  model?: string;
  message_count?: number;
  token_total?: number;
  created_at?: number;
  updated_at?: number;
}

function normalize(raw: HermesSessionRaw): SessionSummary {
  return {
    id: raw.id,
    title: raw.title ?? '(untitled)',
    model: raw.model ?? 'unknown',
    messageCount: raw.message_count ?? 0,
    tokenTotal: raw.token_total ?? 0,
    createdAt: raw.created_at ?? 0,
    updatedAt: raw.updated_at ?? 0,
  };
}

sessionsRouter.get('/sessions', async ctx => {
  try {
    const result = await runHermesCli(['sessions', 'list', '--json'], { timeoutMs: 5000 });
    const raw = (result.parsed ?? []) as HermesSessionRaw[];
    ctx.body = Array.isArray(raw) ? raw.map(normalize) : [];
  } catch (err) {
    if (err instanceof HermesCliError) {
      logger.warn({ code: err.code }, 'hermes sessions list failed; returning []');
      ctx.body = [];
      return;
    }
    throw err;
  }
});
