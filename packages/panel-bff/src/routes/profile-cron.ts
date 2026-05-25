import Router from '@koa/router';
import { listProfiles, profileUse, listCron, cronAction } from '../services/hermes-profile-cron.js';

export const profileCronRouter = new Router();

profileCronRouter.get('/profiles', async ctx => { ctx.body = await listProfiles(); });

profileCronRouter.post('/profiles/:name/use', async ctx => {
  const r = await profileUse(ctx.params.name);
  if (!r.ok) {
    ctx.status = 502;
    ctx.body = { error: { code: r.error ?? 'PROFILE_USE_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});

profileCronRouter.get('/cron', async ctx => { ctx.body = await listCron(); });

profileCronRouter.post('/cron/:id/:action', async ctx => {
  const action = ctx.params.action;
  if (!['pause', 'resume', 'run', 'remove'].includes(action)) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'unsupported action' } };
    return;
  }
  const r = await cronAction(ctx.params.id, action as 'pause' | 'resume' | 'run' | 'remove');
  if (!r.ok) {
    ctx.status = 502;
    ctx.body = { error: { code: r.error ?? 'CRON_ACTION_FAILED', message: 'failed' } };
    return;
  }
  ctx.body = { ok: true };
});
