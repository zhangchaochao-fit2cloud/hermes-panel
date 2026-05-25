import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';
import {
  HERMES_API_KEY_ACCOUNT,
  HERMES_SECRET_SERVICE,
  deleteSecret,
  getSecret,
  _resetKeytarCacheForTests,
} from '../../src/services/secure-store.js';
import { invalidateHermesApiKeyCache } from '../../src/services/hermes-api-key.js';

let request: ReturnType<typeof supertest>;
let token: string;
let tmpPanelHome: string;
let tmpHome: string;

beforeAll(() => {
  tmpPanelHome = mkdtempSync(join(tmpdir(), 'hermes-panel-home-'));
  tmpHome = mkdtempSync(join(tmpdir(), 'hermes-home-'));
  process.env.PANEL_HOME = tmpPanelHome;
  process.env.HERMES_HOME = tmpHome;
  delete process.env.HERMES_API_KEY;
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

beforeEach(async () => {
  try {
    await deleteSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT);
  } catch {
    /* ignore */
  }
  _resetKeytarCacheForTests();
  invalidateHermesApiKeyCache();
});

afterAll(async () => {
  try {
    await deleteSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT);
  } catch {
    /* ignore */
  }
  if (tmpPanelHome) rmSync(tmpPanelHome, { recursive: true, force: true });
  if (tmpHome) rmSync(tmpHome, { recursive: true, force: true });
});

describe('secrets routes', () => {
  it('GET exists returns false when not set', async () => {
    const res = await request
      .get('/api/secrets/hermes-api-key/exists')
      .set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exists: false });
  });

  it('PUT writes to secure store', async () => {
    const res = await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({ value: 'panel-set-key' });
    expect(res.status).toBe(204);

    const stored = await getSecret(
      HERMES_SECRET_SERVICE,
      HERMES_API_KEY_ACCOUNT,
    );
    expect(stored).toBe('panel-set-key');
  });

  it('PUT then GET exists reports true and does NOT leak the value', async () => {
    await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({ value: 'panel-set-key' });

    const res = await request
      .get('/api/secrets/hermes-api-key/exists')
      .set('X-Panel-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exists: true });
    // Defensive: response must not contain the secret value anywhere.
    expect(JSON.stringify(res.body)).not.toContain('panel-set-key');
  });

  it('PUT rejects empty / non-string body', async () => {
    const res1 = await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({});
    expect(res1.status).toBe(400);

    const res2 = await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({ value: '' });
    expect(res2.status).toBe(400);

    const res3 = await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({ value: 42 });
    expect(res3.status).toBe(400);
  });

  it('DELETE removes the secret', async () => {
    await request
      .put('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token)
      .send({ value: 'transient' });

    const del = await request
      .delete('/api/secrets/hermes-api-key')
      .set('X-Panel-Token', token);
    expect(del.status).toBe(204);

    const exists = await request
      .get('/api/secrets/hermes-api-key/exists')
      .set('X-Panel-Token', token);
    expect(exists.body).toEqual({ exists: false });
  });

  it('requires panel token (401 on missing header)', async () => {
    const res = await request.get('/api/secrets/hermes-api-key/exists');
    expect(res.status).toBe(401);
  });
});
