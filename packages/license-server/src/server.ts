import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getLicenseDb, seedAdmin } from './db.js';
import { authRouter } from './routes/auth.js';
import { ordersRouter } from './routes/orders.js';
import { licensesRouter } from './routes/licenses.js';
import { activateRouter } from './routes/activate.js';

const PORT = Number(process.env.LICENSE_SERVER_PORT ?? 5701);
const HOST = process.env.LICENSE_SERVER_HOST ?? '127.0.0.1';

export function createApp(): Koa {
  const app = new Koa();
  const router = new Router({ prefix: '/api' });

  router.use(authRouter.routes(), authRouter.allowedMethods());
  router.use(ordersRouter.routes(), ordersRouter.allowedMethods());
  router.use(licensesRouter.routes(), licensesRouter.allowedMethods());
  router.use(activateRouter.routes(), activateRouter.allowedMethods());

  app.use(cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-License-Api-Key'],
  }));
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

if (realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]!)) {
  getLicenseDb();
  const admin = seedAdmin(
    process.env.LICENSE_ADMIN_EMAIL ?? 'admin@hermes.local',
    process.env.LICENSE_ADMIN_PASSWORD ?? 'hermes-admin-2026',
  );
  const app = createApp();
  app.listen(PORT, HOST, () => {
    console.log(`License server listening on http://${HOST}:${PORT}`);
    console.log(`Admin API Key: ${admin.apiKey}`);
  });
}
