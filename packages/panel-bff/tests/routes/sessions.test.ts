import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';
import * as cliModule from '../../src/services/hermes-cli.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/sessions', () => {
  it('returns 401 without token', async () => {
    const res = await request.get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('lists sessions from hermes CLI', async () => {
    vi.spyOn(cliModule, 'runHermesCli').mockResolvedValueOnce({
      stdout: JSON.stringify([
        { id: 's1', title: 'hi', model: 'fake', message_count: 2, token_total: 10, created_at: 1, updated_at: 2 },
      ]),
      stderr: '',
      exitCode: 0,
      parsed: [
        { id: 's1', title: 'hi', model: 'fake', message_count: 2, token_total: 10, created_at: 1, updated_at: 2 },
      ],
    });
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 's1', title: 'hi', messageCount: 2 });
  });

  it('returns empty array when hermes cli fails', async () => {
    vi.spyOn(cliModule, 'runHermesCli').mockRejectedValueOnce(
      new cliModule.HermesCliError('HERMES_CLI_NOT_FOUND', 'no hermes')
    );
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
