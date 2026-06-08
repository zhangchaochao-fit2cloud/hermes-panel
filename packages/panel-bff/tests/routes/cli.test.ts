import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

afterEach(() => {
  delete process.env.HERMES_BIN;
});

describe('CLI routes', () => {
  it('requires auth for command inventory', async () => {
    const res = await request.get('/api/cli/commands');
    expect(res.status).toBe(401);
  });

  it('returns inventory fallback instead of 5xx when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-cli-route-test';
    const res = await request
      .get('/api/cli/commands')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: 'hermes --help',
      commands: [],
      summary: { all: 0, ready: 0, partial: 0, missing: 0 },
      error: 'HERMES_CLI_NOT_FOUND',
    });
    expect(typeof res.body.generatedAt).toBe('number');
  });

  it('returns raw hermes command help output', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const res = await request
      .get('/api/cli/commands/chat/help')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      command: 'chat',
      source: 'hermes chat --help',
      stdout: 'chat --help\n',
    });
    expect(res.body.error).toBeUndefined();
  });

  it('rejects unsafe command names before invoking hermes', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const res = await request
      .get('/api/cli/commands/chat%20--json/help')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      command: 'chat --json',
      source: 'hermes chat --json --help',
      stdout: '',
      error: 'BAD_COMMAND',
    });
  });
});
