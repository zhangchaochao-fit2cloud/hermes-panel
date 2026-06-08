import Router from '@koa/router';
import {
  getCliCommandHelp,
  getCliCommandInventory,
  getCliCompletionScript,
} from '../services/hermes-cli-inventory.js';

export const cliRouter = new Router();

cliRouter.get('/cli/commands', async ctx => {
  ctx.body = await getCliCommandInventory();
});

cliRouter.get('/cli/commands/:command/help', async ctx => {
  ctx.body = await getCliCommandHelp(ctx.params.command);
});

cliRouter.get('/cli/completion/:shell', async ctx => {
  ctx.body = await getCliCompletionScript(ctx.params.shell);
});
