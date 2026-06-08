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

describe('doctor routes', () => {
  it('requires auth for support dump', async () => {
    const res = await request.get('/api/system/dump');
    expect(res.status).toBe(401);
  });

  it('returns hermes dump output', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const res = await request
      .get('/api/system/dump')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: 'hermes dump',
      stdout: 'dump\n',
    });
    expect(res.body.error).toBeUndefined();
  });
});
