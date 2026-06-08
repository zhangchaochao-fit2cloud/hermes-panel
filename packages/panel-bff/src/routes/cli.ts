import Router from '@koa/router';
import { getCliCommandInventory } from '../services/hermes-cli-inventory.js';

export const cliRouter = new Router();

cliRouter.get('/cli/commands', async ctx => {
  ctx.body = await getCliCommandInventory();
});
