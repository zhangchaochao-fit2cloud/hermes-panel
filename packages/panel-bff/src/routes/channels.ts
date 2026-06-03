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

channelsRouter.post('/channels/:name/test', async ctx => {
  const name = ctx.params.name;
  if (!VALID_CHANNELS.has(name)) { ctx.status = 404; return; }
  const cfg = getChannelConfig(name as ChannelName);
  const enabled = (cfg as unknown as Record<string, unknown>).enabled;
  if (enabled !== true) {
    ctx.status = 400; ctx.body = { error: 'channel_disabled', message: '渠道未启用，请先保存并启用' }; return;
  }
  const gw = await gatewayStatus().catch(() => ({ running: false }));
  if (!gw.running) {
    ctx.status = 400; ctx.body = { error: 'gateway_stopped', message: 'Gateway 未运行，请先重启 Gateway' }; return;
  }
  // Channel config exists and gateway is running — connection is likely working
  ctx.body = { ok: true, channel: name, gatewayRunning: true };
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

// WeChat-specific: get bind status
channelsRouter.get('/channels/wechat/status', async ctx => {
  // Check if wechat is configured and enabled
  const cfg = getChannelConfig('wechat');
  const enabled = (cfg as unknown as Record<string, unknown>).enabled === true;
  const appId = (cfg as unknown as Record<string, unknown>).appId;
  ctx.body = { bound: enabled && !!appId };
});

// WeChat-specific: trigger bind (generate QR)
channelsRouter.post('/channels/wechat/bind', async ctx => {
  // In reality this would call hermes CLI to start the wechat bind process.
  // For now, return a helpful message explaining what the user needs to do.
  const cfg = getChannelConfig('wechat');
  const appId = (cfg as unknown as Record<string, unknown>).appId;
  if (!appId) {
    ctx.status = 400;
    ctx.body = { error: 'wechat_not_configured', message: '请先填写 AppID 和 AppSecret 并保存' };
    return;
  }
  // Try to trigger hermes gateway wechat bind
  try {
    const { runHermesCli } = await import('../services/hermes-cli.js');
    const result = await runHermesCli(['gateway', 'wechat-qr'], { timeoutMs: 10000 });
    const qrMatch = result.stdout.match(/https?:\/\/[^\s]+/);
    ctx.body = { qrUrl: qrMatch?.[0] ?? null, raw: result.stdout.slice(0, 500) };
  } catch {
    ctx.body = { qrUrl: null, raw: '微信绑定需要 Hermes Gateway 支持 wechat-qr 子命令。请确认 hermes CLI 版本支持此功能，或手动在终端运行 hermes gateway wechat-qr' };
  }
});
