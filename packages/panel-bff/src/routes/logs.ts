import Router from '@koa/router';
import { getLogs, type LogLevel } from '../services/hermes-logs.js';

export const logsRouter = new Router();

const ALLOWED_LEVELS: readonly LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseLevel(value: unknown): LogLevel | undefined {
  const s = asString(value);
  if (!s) return undefined;
  const upper = s.toUpperCase();
  // Accept `WARN` as an alias for `WARNING` from the UI.
  const normalized = upper === 'WARN' ? 'WARNING' : upper;
  return (ALLOWED_LEVELS as readonly string[]).includes(normalized)
    ? (normalized as LogLevel)
    : undefined;
}

function parseTail(value: unknown): number | undefined {
  const s = asString(value);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

logsRouter.get('/logs', async ctx => {
  const q = ctx.query;
  const result = await getLogs({
    level: parseLevel(q.level),
    since: asString(q.since),
    tail: parseTail(q.tail),
    query: asString(q.query),
    logName: asString(q.logName),
  });
  ctx.body = result;
});
