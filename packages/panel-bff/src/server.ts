import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { HEADERS, PORTS } from '@hermes-panel/shared';
import { logger } from './lib/logger.js';
import { errorMiddleware } from './middleware/error.js';
import { authMiddleware } from './middleware/auth.js';
import { getSessionToken } from './lib/token.js';
import { systemRouter } from './routes/system.js';
import { tokenRouter } from './routes/token.js';
import { sessionsRouter } from './routes/sessions.js';
import { hermesProxyRouter } from './routes/hermes-proxy.js';
import { statsRouter } from './routes/stats.js';
import { toolsRouter } from './routes/tools.js';
import { notificationsRouter } from './routes/notifications.js';
import { initWatermark } from './services/notification-feed.js';
import { profileCronRouter } from './routes/profile-cron.js';
import { memoryRouter } from './routes/memory.js';
import { capabilitiesRouter } from './routes/capabilities.js';
import { draftRouter } from './routes/draft.js';
import { secretsRouter } from './routes/secrets.js';
import { providersRouter } from './routes/providers.js';
import { mcpRouter } from './routes/mcp.js';
import { logsRouter } from './routes/logs.js';
import { doctorRouter } from './routes/doctor.js';
import { gatewayRouter } from './routes/gateway.js';
import { webhookRouter } from './routes/webhook.js';
import { pluginsRouter } from './routes/plugins.js';
import { backupRouter } from './routes/backup.js';

// Origins allowed to call BFF. Tauri WebView serves the app from
// tauri://localhost (and http://tauri.localhost on some platforms).
// Browser dev uses http://127.0.0.1:5666 / http://localhost:5666.
function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;  // same-origin / curl
  if (origin === 'tauri://localhost') return true;
  if (origin === 'http://tauri.localhost') return true;
  if (origin === 'https://tauri.localhost') return true;
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return true;
  const extra = (process.env.PANEL_CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

export function createApp(): Koa {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });

  router.use(systemRouter.routes(), systemRouter.allowedMethods());
  router.use(tokenRouter.routes(), tokenRouter.allowedMethods());
  router.use(sessionsRouter.routes(), sessionsRouter.allowedMethods());
  router.use(statsRouter.routes(), statsRouter.allowedMethods());
  router.use(toolsRouter.routes(), toolsRouter.allowedMethods());
  router.use(notificationsRouter.routes(), notificationsRouter.allowedMethods());
  router.use(profileCronRouter.routes(), profileCronRouter.allowedMethods());
  router.use(memoryRouter.routes(), memoryRouter.allowedMethods());
  router.use(capabilitiesRouter.routes(), capabilitiesRouter.allowedMethods());
  router.use(draftRouter.routes(), draftRouter.allowedMethods());
  router.use(secretsRouter.routes(), secretsRouter.allowedMethods());
  router.use(providersRouter.routes(), providersRouter.allowedMethods());
  router.use(mcpRouter.routes(), mcpRouter.allowedMethods());
  router.use(logsRouter.routes(), logsRouter.allowedMethods());
  router.use(doctorRouter.routes(), doctorRouter.allowedMethods());
  router.use(gatewayRouter.routes(), gatewayRouter.allowedMethods());
  router.use(webhookRouter.routes(), webhookRouter.allowedMethods());
  router.use(pluginsRouter.routes(), pluginsRouter.allowedMethods());
  router.use(backupRouter.routes(), backupRouter.allowedMethods());
  router.use(hermesProxyRouter.routes(), hermesProxyRouter.allowedMethods());

  app.use(errorMiddleware);
  app.use(cors({
    origin: (ctx) => {
      const origin = ctx.headers.origin ?? '';
      return isAllowedOrigin(origin) ? origin : '';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', HEADERS.PANEL_TOKEN, HEADERS.HERMES_SESSION],
    maxAge: 600,
  }));
  app.use(bodyParser());
  app.use(authMiddleware);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.BFF_PORT ?? PORTS.PANEL_BFF);
  const token = getSessionToken();
  logger.info({ port, token: token.slice(0, 8) + '...' }, 'starting bff');
  initWatermark();
  createApp().listen(port, '127.0.0.1', () => {
    logger.info(`bff listening on http://127.0.0.1:${port}`);
  });
}
