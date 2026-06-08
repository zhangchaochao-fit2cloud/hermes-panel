import Router from '@koa/router';
import { runDoctor, runDump } from '../services/hermes-doctor.js';

export const doctorRouter = new Router();

doctorRouter.get('/system/doctor', async ctx => {
  const r = await runDoctor();
  ctx.body = r;
});

doctorRouter.get('/system/dump', async ctx => {
  const r = await runDump();
  ctx.body = r;
});
