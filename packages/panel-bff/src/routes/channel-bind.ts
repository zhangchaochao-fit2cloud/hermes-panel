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
  const hermesBin = process.env.HERMES_BIN ?? 'hermes';
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile(hermesBin, ['gateway', 'setup', 'weixin'], {
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
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    logger.warn({ err, stderr: e.stderr }, 'wechat bind failed');

    let hint = '运行 hermes gateway setup weixin 查看详情。';
    if (e.code === 'ENOENT') {
      hint = `hermes 二进制未找到 (${hermesBin})，请检查 HERMES_BIN 环境变量或 PATH。`;
    } else if (e.message?.includes('unknown command') || e.stderr?.includes('unknown command')) {
      hint = 'hermes CLI 不支持 gateway setup weixin 子命令。请升级 hermes 到 v0.9+ 或手动在终端运行绑定。';
    }

    ctx.status = 502;
    ctx.body = {
      error: {
        code: 'WECHAT_BIND_FAILED',
        message: hint,
      },
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
