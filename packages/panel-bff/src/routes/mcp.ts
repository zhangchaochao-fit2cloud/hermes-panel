import Router from '@koa/router';
import { listMcpServers, addMcp, removeMcp, type AddMcpInput } from '../services/hermes-mcp.js';

export const mcpRouter = new Router();

// Validation error codes that should surface as 400 rather than 502.
const VALIDATION_CODES = new Set([
  'NAME_REQUIRED',
  'INVALID_NAME',
  'TRANSPORT_REQUIRED',
  'TRANSPORT_CONFLICT',
  'INVALID_ARGS',
  'INVALID_ENV',
  'INVALID_URL',
  'INVALID_AUTH',
]);

mcpRouter.get('/mcp', async ctx => {
  const r = await listMcpServers();
  ctx.body = r;
});

mcpRouter.post('/mcp', async ctx => {
  const body = ctx.request.body as Partial<AddMcpInput> | undefined;
  if (!body || typeof body !== 'object') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'body is required' } };
    return;
  }
  const input: AddMcpInput = {
    name: typeof body.name === 'string' ? body.name : '',
    command: typeof body.command === 'string' ? body.command : undefined,
    args: Array.isArray(body.args) ? body.args : undefined,
    env: body.env && typeof body.env === 'object' && !Array.isArray(body.env)
      ? body.env as Record<string, string>
      : undefined,
    url: typeof body.url === 'string' ? body.url : undefined,
    transport: body.transport,
    auth: body.auth,
    preset: typeof body.preset === 'string' ? body.preset : undefined,
  };

  const r = await addMcp(input);
  if (!r.ok) {
    ctx.status = VALIDATION_CODES.has(r.error ?? '') ? 400 : 502;
    ctx.body = {
      error: {
        code: r.error ?? 'MCP_ADD_FAILED',
        message: r.detail || 'failed to add MCP server',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});

mcpRouter.delete('/mcp/:name', async ctx => {
  const r = await removeMcp(ctx.params.name);
  if (!r.ok) {
    ctx.status = VALIDATION_CODES.has(r.error ?? '') ? 400
      : r.error === 'MCP_NOT_FOUND' ? 404
      : 502;
    ctx.body = {
      error: {
        code: r.error ?? 'MCP_REMOVE_FAILED',
        message: r.detail || 'failed to remove MCP server',
      },
    };
    return;
  }
  ctx.body = { ok: true };
});
