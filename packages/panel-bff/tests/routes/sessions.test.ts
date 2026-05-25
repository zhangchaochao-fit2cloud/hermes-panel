import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';
import * as sqliteReader from '../../src/services/sqlite-reader.js';

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

  it('lists sessions from sqlite-reader', async () => {
    vi.spyOn(sqliteReader, 'listSessions').mockReturnValueOnce([
      {
        id: 'run_test123', title: 'hi', source: 'api_server', model: 'fake',
        message_count: 2, tool_call_count: 0, input_tokens: 5, output_tokens: 5,
        started_at: 1, ended_at: 2, estimated_cost_usd: null,
      },
    ]);
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'run_test123',
      title: 'hi',
      messageCount: 2,
      tokenTotal: 10,
    });
  });

  it('returns empty array when sqlite is missing', async () => {
    vi.spyOn(sqliteReader, 'listSessions').mockReturnValueOnce([]);
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
