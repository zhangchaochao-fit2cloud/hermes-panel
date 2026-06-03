import Router from '@koa/router';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from '../services/hermes-home.js';
import { logger } from '../lib/logger.js';

export const channelBindRouter = new Router();

// Check WeChat binding status
channelBindRouter.get('/channels/wechat/status', async ctx => {
  const accountsDir = join(getHermesHome(), 'weixin', 'accounts');
  const hasAccounts = existsSync(accountsDir) && readdirSync(accountsDir).length > 0;
  ctx.body = { bound: hasAccounts, accountsDir };
});

// Trigger WeChat QR code login
channelBindRouter.post('/channels/wechat/bind', async ctx => {
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile('hermes', ['gateway', 'setup', 'weixin'], {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, HERMES_QRCODE_RENDERER: 'ascii' },
      }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });

    // Extract QR code URL from output
    const qrUrl = extractQrUrl(result.stdout + result.stderr);
    ctx.body = { qrUrl, raw: result.stdout.slice(-500) };
  } catch (err) {
    logger.warn({ err }, 'wechat bind failed');
    ctx.status = 502;
    ctx.body = {
      error: (err as Error).message,
      hint: '运行 hermes gateway setup weixin 查看详情。确保已安装 qrcode: pip install qrcode[pil]',
    };
  }
});

function extractQrUrl(output: string): string | null {
  // Match QR code URLs from hermes output
  const patterns = [
    /https?:\/\/[^\s]*?weixin[^\s]*/i,
    /https?:\/\/[^\s]*?qr[^\s]*/i,
    /https?:\/\/[^\s]*?login[^\s]*/i,
    /扫描.*?(https?:\/\/[^\s]+)/,
  ];
  for (const p of patterns) {
    const m = output.match(p);
    if (m) return m[0];
  }
  return null;
}
