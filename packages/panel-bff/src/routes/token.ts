import Router from '@koa/router';
import { PORTS } from '@hermes-panel/shared';
import { getHermesApiKey } from '../services/hermes-api-key.js';

export const tokenRouter = new Router();

tokenRouter.get('/token', async ctx => {
  ctx.body = {
    hermesApiKey: await getHermesApiKey(),
    hermesApiBase:
      process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`,
  };
});
