import Router from '@koa/router';
import type { ChannelName } from '@hermes-panel/shared';
import { CHANNEL_META } from '@hermes-panel/shared';
import {
  listChannels,
  getChannelConfig,
  setChannelConfig,
  removeChannelConfig,
  hasAnyChannelEnabled,
} from '../services/channel-config.js';
import { startGateway, gatewayStatus } from '../services/hermes-gateway.js';
import { logger } from '../lib/logger.js';

const VALID_CHANNELS = new Set<string>(Object.keys(CHANNEL_META));

export const channelsRouter = new Router();

channelsRouter.get('/channels', async ctx => {
  const gw = await gatewayStatus().catch(() => ({ running: false }));
  ctx.body = {
    channels: listChannels(),
    gatewayRunning: gw.running,
  };
});

channelsRouter.get('/channels/:name', async ctx => {
  const name = ctx.params.name;
  if (!VALID_CHANNELS.has(name)) {
    ctx.status = 404;
    ctx.body = { error: { code: 'UNKNOWN_CHANNEL', message: `unknown channel: ${name}` } };
    return;
  }
  ctx.body = getChannelConfig(name as ChannelName);
});

channelsRouter.put('/channels/:name', async ctx => {
  const name = ctx.params.name;
  if (!VALID_CHANNELS.has(name)) {
    ctx.status = 404;
    ctx.body = { error: { code: 'UNKNOWN_CHANNEL', message: `unknown channel: ${name}` } };
    return;
  }
  const body = ctx.request.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'body required' } };
    return;
  }
  try {
    setChannelConfig(name as ChannelName, body as any);
  } catch (err) {
    logger.warn({ err, channel: name }, 'failed to write channel config');
    ctx.status = 500;
    ctx.body = { error: { code: 'WRITE_FAILED', message: (err as Error).message } };
    return;
  }
  ctx.body = { ok: true, channel: name };
});

channelsRouter.delete('/channels/:name', async ctx => {
  const name = ctx.params.name;
  if (!VALID_CHANNELS.has(name)) {
    ctx.status = 404;
    ctx.body = { error: { code: 'UNKNOWN_CHANNEL', message: `unknown channel: ${name}` } };
    return;
  }
  removeChannelConfig(name as ChannelName);
  ctx.body = { ok: true };
});

channelsRouter.post('/channels/:name/restart', async ctx => {
  const name = ctx.params.name;
  if (!VALID_CHANNELS.has(name)) {
    ctx.status = 404;
    ctx.body = { error: { code: 'UNKNOWN_CHANNEL', message: `unknown channel: ${name}` } };
    return;
  }
  if (!hasAnyChannelEnabled()) {
    ctx.status = 400;
    ctx.body = { error: { code: 'NO_ENABLED_CHANNELS', message: 'at least one channel must be enabled to restart gateway' } };
    return;
  }
  try {
    await startGateway();
    ctx.body = { ok: true, message: 'gateway restarted' };
  } catch (err) {
    logger.warn({ err }, 'gateway restart failed');
    ctx.status = 502;
    ctx.body = { error: { code: 'GATEWAY_RESTART_FAILED', message: (err as Error).message } };
  }
});
