import Router from '@koa/router';
import { runDoctor } from '../services/hermes-doctor.js';

export const doctorRouter = new Router();

doctorRouter.get('/system/doctor', async ctx => {
  const r = await runDoctor();
  ctx.body = r;
});
