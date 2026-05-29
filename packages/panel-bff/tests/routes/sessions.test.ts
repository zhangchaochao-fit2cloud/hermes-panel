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

  it('uses first user message when stored title is generated noise', async () => {
    vi.spyOn(sqliteReader, 'listSessions').mockReturnValueOnce([
      {
        id: 'run_202605271030_abcd1234', title: '2026-05-27-plan-01-8f4a3c2d',
        source: 'cron', model: 'fake', message_count: 2, tool_call_count: 0,
        input_tokens: 5, output_tokens: 5, started_at: 1, ended_at: 2,
        estimated_cost_usd: null,
        first_user_message: '优化左侧计划列表标题，不要展示日期和编码',
      },
    ]);

    const res = await request.get('/api/sessions').set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('优化左侧计划列表标题，不要展示日期和编码');
  });

  it('trims conversational prefixes from generated titles', async () => {
    vi.spyOn(sqliteReader, 'listSessions').mockReturnValueOnce([
      {
        id: 'run_202605271031_abcd1234', title: '',
        source: 'cli', model: 'fake', message_count: 2, tool_call_count: 0,
        input_tokens: 5, output_tokens: 5, started_at: 1, ended_at: 2,
        estimated_cost_usd: null,
        first_user_message: '帮我优化下右侧快捷历史浮层展示',
      },
    ]);

    const res = await request.get('/api/sessions').set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('右侧快捷历史浮层展示');
  });

  it('returns empty array when sqlite is missing', async () => {
    vi.spyOn(sqliteReader, 'listSessions').mockReturnValueOnce([]);
    const res = await request.get('/api/sessions').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
