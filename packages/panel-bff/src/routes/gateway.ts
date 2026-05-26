import Router from '@koa/router';
import { startGateway, stopGateway, gatewayStatus } from '../services/hermes-gateway.js';
import { HermesCliError } from '../services/hermes-cli.js';
import { logger } from '../lib/logger.js';

export const gatewayRouter = new Router();

gatewayRouter.post('/gateway/start', async ctx => {
  try {
    const result = await startGateway();
    ctx.body = result;
  } catch (err) {
    if (err instanceof HermesCliError) {
      logger.warn({ err }, 'gateway start failed');
      ctx.status = err.code === 'HERMES_CLI_NOT_FOUND' ? 404 : 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});

gatewayRouter.post('/gateway/stop', async ctx => {
  try {
    const result = await stopGateway();
    ctx.body = result;
  } catch (err) {
    if (err instanceof HermesCliError) {
      logger.warn({ err }, 'gateway stop failed');
      ctx.status = err.code === 'HERMES_CLI_NOT_FOUND' ? 404 : 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});

gatewayRouter.get('/gateway/status', async ctx => {
  try {
    ctx.body = await gatewayStatus();
  } catch (err) {
    if (err instanceof HermesCliError) {
      ctx.status = err.code === 'HERMES_CLI_NOT_FOUND' ? 404 : 502;
      ctx.body = { error: { code: err.code, message: err.message } };
      return;
    }
    throw err;
  }
});
