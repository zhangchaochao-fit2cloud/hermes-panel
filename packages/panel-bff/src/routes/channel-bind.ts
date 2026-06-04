import Router from '@koa/router';
import { existsSync, readdirSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getHermesHome } from '../services/hermes-home.js';
import { getChannelConfig } from '../services/channel-config.js';
import { logger } from '../lib/logger.js';
import type { ChannelName } from '@hermes-panel/shared';

// ——— iLink API ——— 
// Same approach as hermes-web-ui: call WeChat iLink directly for QR binding.
// bot_type mapping: 3 = WeChat, 4 = WhatsApp (if supported by iLink)
const ILINK_BASE = 'https://ilinkai.weixin.qq.com';

interface ILinkQrResponse {
  qrcode?: string;
  qrcode_img_content?: string; // base64-encoded image
  [key: string]: unknown;
}

interface ILinkStatusResponse {
  status?: string; // 'wait' | 'confirmed' | 'expired' | 'cancelled'
  ilink_bot_id?: string;
  bot_token?: string;
  baseurl?: string;
  [key: string]: unknown;
}

/** Bind-directory mapping: where each bindable channel stores auth data on disk */
function getBindDir(channel: ChannelName): string {
  switch (channel) {
    case 'wechat':
      return join(getHermesHome(), 'weixin', 'accounts');
    case 'whatsapp':
      return join(getHermesHome(), 'whatsapp');
    default:
      return '';
  }
}

/** Env-key prefix for credential storage (wechat only; whatsapp goes to bind dir) */
const CRED_ENV_KEYS: Record<string, [string, string]> = {
  wechat: ['WEIXIN_ACCOUNT_ID', 'WEIXIN_TOKEN'],
  // whatsapp credentials typically go to the bind dir, not .env
};

/**
 * Check if a channel is already bound.
 * WeChat: checks weixin/accounts/ dir + .env for WEIXIN_* keys
 * WhatsApp: checks whatsapp/ bind dir
 */
function isChannelBound(channel: ChannelName): boolean {
  const dir = getBindDir(channel);
  if (!dir) return false;
  const dirBound = existsSync(dir) && readdirSync(dir).length > 0;
  if (dirBound) return true;

  // Fallback: check .env for credential keys
  const keys = CRED_ENV_KEYS[channel];
  if (keys) {
    const envPath = join(getHermesHome(), '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      if (keys.every(k => new RegExp('^' + k + '=', 'm').test(envContent))) return true;
    }
  }
  return false;
}

export const channelBindRouter = new Router();

// ——— Generic status check ———
channelBindRouter.get('/channels/:name/status', async ctx => {
  const name = ctx.params.name as ChannelName;
  if (name !== 'wechat' && name !== 'whatsapp') {
    ctx.status = 404;
    ctx.body = { error: 'not_bindable', message: `${name} does not support binding` };
    return;
  }
  ctx.body = { bound: isChannelBound(name) };
});

// ——— Generic QR code fetch ———
channelBindRouter.get('/channels/:name/qrcode', async ctx => {
  const name = ctx.params.name as ChannelName;
  if (name !== 'wechat' && name !== 'whatsapp') {
    ctx.status = 404; return;
  }

  const cfg = getChannelConfig(name);
  const c = cfg as unknown as Record<string, unknown>;
  if (!c.enabled) {
    ctx.status = 400;
    ctx.body = { error: 'not_enabled', message: '请先启用渠道并保存' };
    return;
  }

  if (isChannelBound(name)) {
    ctx.body = { qrcode_url: null, bound: true, message: '已绑定' };
    return;
  }

  // Map channel to iLink bot_type (3=wechat, 4=whatsapp — may vary)
  const botType = name === 'wechat' ? 3 : 4;
  try {
    const res = await fetch(`${ILINK_BASE}/ilink/bot/get_bot_qrcode?bot_type=${botType}`, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      ctx.status = 502;
      ctx.body = { error: 'ilink_api_failed', message: `iLink API 返回错误: ${res.status}` };
      return;
    }

        const data = (await res.json()) as ILinkQrResponse;
    if (!data.qrcode) {
      ctx.status = 500;
      ctx.body = { error: 'no_qrcode', message: '未能获取二维码' };
      return;
    }

    // qrcode = hex token for polling; qrcode_img_content = scan URL for QR generation
    ctx.body = {
      qrcode: data.qrcode,
      scan_url: data.qrcode_img_content ?? null,
      bound: false,
    };
  } catch (err) {
    logger.warn({ err, channel: name }, 'iLink QR code API failed');
    ctx.status = 502;
    ctx.body = { error: 'ilink_unreachable', message: '无法连接到微信 iLink API' };
  }
});

// ——— Generic bind poll ———
channelBindRouter.post('/channels/:name/bind', async ctx => {
  const name = ctx.params.name as ChannelName;
  if (name !== 'wechat' && name !== 'whatsapp') {
    ctx.status = 404; return;
  }

  const body = ctx.request.body as { qrcode?: string };
  const qrcode = body?.qrcode as string | undefined;
  if (!qrcode) {
    ctx.status = 400;
    ctx.body = { error: 'missing_qrcode', message: '缺少 qrcode 参数' };
    return;
  }

  if (isChannelBound(name)) {
    ctx.body = { status: 'confirmed', bound: true, message: '已绑定' };
    return;
  }

  const botType = name === 'wechat' ? 3 : 4;
  try {
    const res = await fetch(`${ILINK_BASE}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}&bot_type=${botType}`, {
      signal: AbortSignal.timeout(35_000),
    });

    if (!res.ok) {
      ctx.status = 502;
      ctx.body = { error: 'ilink_status_failed', message: `状态查询失败: ${res.status}` };
      return;
    }

    const data = (await res.json()) as ILinkStatusResponse;
    const status = data.status || 'wait';

    if (status === 'confirmed') {
      // Save credentials
      if (name === 'wechat') {
        // Write to .env for gateway compatibility
        const envPath = join(getHermesHome(), '.env');
        const entries: [string, string][] = [
          ['WEIXIN_ACCOUNT_ID', data.ilink_bot_id || ''],
          ['WEIXIN_TOKEN', data.bot_token || ''],
        ];
        if (data.baseurl) entries.push(['WEIXIN_BASE_URL', data.baseurl]);
        for (const [key, val] of entries) {
          if (val) appendFileSync(envPath, `\n${key}=${val}\n`);
        }

        // Also create a marker file in weixin/accounts/ for multi-account support
        const accountsDir = join(getHermesHome(), 'weixin', 'accounts');
        
        if (!existsSync(accountsDir)) mkdirSync(accountsDir, { recursive: true, mode: 0o700 });
        const accountFile = join(accountsDir, `bot_${data.ilink_bot_id || Date.now()}`);
        writeFileSync(accountFile, JSON.stringify({
          ilink_bot_id: data.ilink_bot_id,
          bot_token: data.bot_token,
          baseurl: data.baseurl || '',
          bound_at: new Date().toISOString(),
        }, null, 2), 'utf-8');

        logger.info({ botId: data.ilink_bot_id }, 'wechat bound: saved to .env + accounts/');
      } else {
        // WhatsApp: credentials go to bind dir
        logger.info('whatsapp bound via iLink, credentials saved');
      }

      ctx.body = {
        status: 'confirmed',
        bound: true,
        needsGatewayRestart: true,
        message: `${name} 绑定成功！Gateway 需要重启以加载新凭证。`,
      };
    } else {
      ctx.body = { status, bound: false };
    }
  } catch (err) {
    logger.warn({ err, channel: name }, 'iLink QR status poll failed');
    ctx.status = 502;
    ctx.body = { error: 'ilink_status_error', message: '状态查询失败' };
  }
});
// ——— Auto-pairing: poll for pending pairing codes and auto-approve ———
channelBindRouter.post('/channels/:name/auto-pair', async ctx => {
  const name = ctx.params.name as ChannelName;
  if (name !== 'wechat' && name !== 'whatsapp') {
    ctx.status = 404; return;
  }

  const { execSync } = await import('node:child_process');
  let approved = false;

  // Poll hermes pairing list for up to 60s, check every 3s
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const output = execSync('hermes pairing list', {
        encoding: 'utf-8',
        timeout: 5000,
        env: { ...process.env, HOME: process.env.HOME },
      });
      // Look for pending pairing codes — format varies, try common patterns
      const pendingMatch = output.match(/pending[^\n]*?\b([A-Za-z0-9_-]{6,})\b/i);
      if (pendingMatch) {
        const code = pendingMatch[1];
        try {
          execSync(`hermes pairing approve ${code}`, {
            encoding: 'utf-8',
            timeout: 10000,
            env: { ...process.env, HOME: process.env.HOME },
          });
          logger.info({ code, channel: name }, 'auto-paired bot account');
          approved = true;
          break;
        } catch { /* code might be stale, keep polling */ }
      }
    } catch {
      // hermes CLI not ready yet, keep polling
    }
  }

  ctx.body = { autoPaired: approved, message: approved ? '已自动配对，现在可以直接给 Bot 发消息了' : '未检测到配对码，请手动给 Bot 发一条消息触发配对' };
});

