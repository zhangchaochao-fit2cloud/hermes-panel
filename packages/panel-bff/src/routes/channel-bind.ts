import Router from '@koa/router';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from '../services/hermes-home.js';
import { getChannelConfig } from '../services/channel-config.js';
import { gatewayStatus } from '../services/hermes-gateway.js';
import { logger } from '../lib/logger.js';

export const channelBindRouter = new Router();

channelBindRouter.get('/channels/wechat/status', async ctx => {
  const dir = join(getHermesHome(), 'weixin', 'accounts');
  ctx.body = { bound: existsSync(dir) && readdirSync(dir).length > 0 };
});

channelBindRouter.post('/channels/wechat/bind', async ctx => {
  const cfg = getChannelConfig('wechat');
  const c = cfg as unknown as Record<string, unknown>;
  if (!c.enabled) {
    ctx.status = 400;
    ctx.body = { error: 'not_enabled', message: '请先启用微信渠道并保存' };
    return;
  }

  const gw = await gatewayStatus().catch(() => ({ running: false }));
  if (!gw.running) {
    ctx.status = 400;
    ctx.body = { error: 'gateway_stopped', message: 'Gateway 未运行，请先重启 Gateway' };
    return;
  }

  // Already bound?
  const accountsDir = join(getHermesHome(), 'weixin', 'accounts');
  const isBound = existsSync(accountsDir) && readdirSync(accountsDir).length > 0;
  if (isBound) {
    ctx.body = { qrUrl: null, bound: true, instruction: '微信已绑定，无需重复操作。' };
    return;
  }

  // Non-interactive: pipe "14" to select WeChat/Weixin from gateway setup menu
  try {
    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      const child = execFile('hermes', ['gateway', 'setup'], {
        timeout: 35000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, HERMES_QRCODE_RENDERER: 'ascii' },
      }, (err, stdout) => {
        if (err && !stdout) reject(err);
        else resolve({ stdout });
      });
      // Select WeChat (14), delay, confirm QR (y), delay for QR to render
      child.stdin?.write('14\n');
      setTimeout(() => child.stdin?.write('y\n'), 1500);
      setTimeout(() => child.stdin?.end(), 4000);
    });

    const output = stdout;
    // Extract QR URL - look for https URLs in the output
    const urlMatch = output.match(/https?:\/\/[^\s]{30,}/);
    const qrUrl = urlMatch?.[0] ?? null;

    // Check binding again (may have been created)
    const nowBound = existsSync(accountsDir) && readdirSync(accountsDir).length > 0;

    ctx.body = { qrUrl, bound: nowBound, raw: output.slice(-500) };
  } catch (err) {
    logger.warn({ err }, 'wechat bind attempted');
    // Fallback: check if binding happened despite error
    const nowBound = existsSync(accountsDir) && readdirSync(accountsDir).length > 0;
    ctx.body = {
      qrUrl: null, bound: nowBound,
      instruction: '请在终端运行 hermes gateway setup，选择 Weixin (选项14) 进行扫码绑定。',
    };
  }
});

channelBindRouter.get('/channels/whatsapp/status', async ctx => {
  const dir = join(getHermesHome(), 'whatsapp');
  ctx.body = { bound: existsSync(dir) && readdirSync(dir).length > 0 };
});
