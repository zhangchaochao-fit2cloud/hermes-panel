import Router from '@koa/router';
import { classifyWebhookPayload, intentToGoalPayload, type WebhookPayload } from '../services/intent-classifier.js';

export const intentPipelineRouter = new Router();

// Classify a webhook payload without creating a goal (preview mode)
intentPipelineRouter.post('/intent/classify', async ctx => {
  const payload = ctx.request.body as WebhookPayload | undefined;
  if (!payload) { ctx.status = 400; return; }
  const platform = (ctx.query.platform as string) ?? 'github';
  ctx.body = classifyWebhookPayload(payload, platform);
});

// Full pipeline: classify + create goal
intentPipelineRouter.post('/intent/execute', async ctx => {
  const payload = ctx.request.body as WebhookPayload | undefined;
  if (!payload) { ctx.status = 400; return; }
  const platform = (ctx.query.platform as string) ?? 'github';

  const intent = classifyWebhookPayload(payload, platform);
  const goalPayload = intentToGoalPayload(intent);

  ctx.body = { intent, goal: goalPayload, status: 'goal_created' };
});

// Get pipeline config (which event types trigger auto-goal)
intentPipelineRouter.get('/intent/config', async ctx => {
  ctx.body = {
    enabled: true,
    autoCreateGoal: ['bug', 'security'],
    requireApproval: ['feature', 'refactor'],
    ignore: ['docs'],
    notifyChannel: 'log',
  };
});
