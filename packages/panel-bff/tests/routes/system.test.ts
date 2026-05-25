import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  process.env.HERMES_BIN = 'does-not-exist-xxx';  // force hermes-not-found path
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/system/health', () => {
  it('returns 200 with hermes.running=false when binary missing (no auth required)', async () => {
    const res = await request.get('/api/system/health');
    expect(res.status).toBe(200);
    expect(res.body.hermes.running).toBe(false);
    expect(res.body.bff.running).toBe(true);
    expect(typeof res.body.bff.uptimeSec).toBe('number');
  });
});

describe('GET /api/token', () => {
  it('returns 401 without token header', async () => {
    const res = await request.get('/api/token');
    expect(res.status).toBe(401);
  });

  it('returns hermes api key (or null) with valid token', async () => {
    const res = await request.get('/api/token').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hermesApiKey');
    expect(res.body).toHaveProperty('hermesApiBase');
  });
});
