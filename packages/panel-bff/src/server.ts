import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { PORTS } from '@hermes-panel/shared';
import { logger } from './lib/logger.js';
import { errorMiddleware } from './middleware/error.js';
import { authMiddleware } from './middleware/auth.js';
import { getSessionToken } from './lib/token.js';
import { systemRouter } from './routes/system.js';
import { tokenRouter } from './routes/token.js';
import { sessionsRouter } from './routes/sessions.js';

export function createApp(): Koa {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });

  router.use(systemRouter.routes(), systemRouter.allowedMethods());
  router.use(tokenRouter.routes(), tokenRouter.allowedMethods());
  router.use(sessionsRouter.routes(), sessionsRouter.allowedMethods());

  app.use(errorMiddleware);
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
  createApp().listen(port, '127.0.0.1', () => {
    logger.info(`bff listening on http://127.0.0.1:${port}`);
  });
}
