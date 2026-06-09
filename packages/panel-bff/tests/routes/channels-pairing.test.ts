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

describe('channels pairing routes', () => {
  it('requires auth for pairing list', async () => {
    const res = await request.get('/api/channels/pairing/list');
    expect(res.status).toBe(401);
  });

  it('returns hermes pairing list output', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const res = await request
      .get('/api/channels/pairing/list')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: 'hermes pairing list',
      stdout: 'pairing list\n',
    });
    expect(res.body.error).toBeUndefined();
  });
});
