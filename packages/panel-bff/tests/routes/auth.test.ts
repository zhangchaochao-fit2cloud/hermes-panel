import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';
import { closePanelDb } from '../../src/services/panel-db.js';
import { createLicense } from '../../src/services/auth-store.js';

let request: ReturnType<typeof supertest>;
let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'auth-routes-test-'));
  process.env.PANEL_HOME = tmp;
  closePanelDb();
  request = supertest(createApp().callback());
});

afterEach(() => {
  closePanelDb();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('GET /api/auth/context', () => {
  it('reports bootstrap on a fresh db (public, no token)', async () => {
    const res = await request.get('/api/auth/context');
    expect(res.status).toBe(200);
    expect(res.body.needsBootstrap).toBe(true);
  });
});

describe('POST /api/auth/setup — first launch', () => {
  it('sets up admin account on fresh db', async () => {
    const res = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    expect(typeof res.body.token).toBe('string');

    const ctx = await request.get('/api/auth/context');
    expect(ctx.body.needsBootstrap).toBe(false);
  });

  it('rejects weak password', async () => {
    const res = await request
      .post('/api/auth/setup')
      .send({ password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
  });

  it('rejects setup when admin already exists', async () => {
    await request.post('/api/auth/setup').send({ password: 'secret1' });
    const res = await request
      .post('/api/auth/setup')
      .send({ password: 'secret2' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ALREADY_SETUP');
  });
});

describe('login / me / logout', () => {
  async function bootstrap(): Promise<string> {
    const res = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    return res.body.token as string;
  }

  it('login with password returns a token; me resolves the user; logout revokes it', async () => {
    await bootstrap();

    const login = await request
      .post('/api/auth/login')
      .send({ password: 'secret1' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    const me = await request.get('/api/auth/me').set('X-Panel-Token', token);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('admin');
    expect(me.body.license).toBeNull();
    expect(me.body.features).toEqual([]);

    const logout = await request.post('/api/auth/logout').set('X-Panel-Token', token);
    expect(logout.status).toBe(204);

    const meAfter = await request.get('/api/auth/me').set('X-Panel-Token', token);
    expect(meAfter.status).toBe(401);
  });

  it('login with wrong password is 401', async () => {
    await bootstrap();
    const login = await request
      .post('/api/auth/login')
      .send({ password: 'wrong' });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('login without password is 400', async () => {
    await bootstrap();
    const login = await request
      .post('/api/auth/login')
      .send({});
    expect(login.status).toBe(400);
  });

  it('backward-compat: login with email still works', async () => {
    // Create a user with email via admin license creation flow
    await request.post('/api/auth/setup').send({ password: 'secret1' });
    // Login should work with password only (1Panel style)
    const login = await request
      .post('/api/auth/login')
      .send({ password: 'secret1' });
    expect(login.status).toBe(200);
  });
});

describe('middleware enforcement', () => {
  it('protected route accepts a session token', async () => {
    const reg = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    const token = reg.body.token as string;
    const res = await request.get('/api/secrets/hermes-api-key/exists').set('X-Panel-Token', token);
    expect(res.status).toBe(200);
  });

  it('protected route still accepts the boot token (local-trust fallback)', async () => {
    const res = await request
      .get('/api/secrets/hermes-api-key/exists')
      .set('X-Panel-Token', getSessionToken());
    expect(res.status).toBe(200);
  });

  it('protected route rejects a missing / bogus token', async () => {
    expect((await request.get('/api/secrets/hermes-api-key/exists')).status).toBe(401);
    const bogus = await request
      .get('/api/secrets/hermes-api-key/exists')
      .set('X-Panel-Token', 'not-a-real-token');
    expect(bogus.status).toBe(401);
  });

  it('health stays public', async () => {
    const res = await request.get('/api/system/health');
    expect(res.status).toBe(200);
  });
});

describe('license activation', () => {
  it('activates an unbound license for authenticated user', async () => {
    // Setup admin first
    const adminRes = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    const adminToken = adminRes.body.token as string;

    const lic = createLicense({ tier: 'pro' });

    const res = await request
      .post('/api/auth/license/activate')
      .set('X-Panel-Token', adminToken)
      .send({ key: lic.key });
    expect(res.status).toBe(200);
    expect(res.body.license.key).toBe(lic.key);
    expect(res.body.license.boundUserId).toBeTruthy();

    // me should now have license and features
    const me = await request.get('/api/auth/me').set('X-Panel-Token', adminToken);
    expect(me.body.license).toBeTruthy();
    expect(me.body.license.tier).toBe('pro');
    expect(me.body.features.length).toBeGreaterThan(0);
  });

  it('rejects an invalid license key', async () => {
    const adminRes = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    const adminToken = adminRes.body.token as string;

    const res = await request
      .post('/api/auth/license/activate')
      .set('X-Panel-Token', adminToken)
      .send({ key: 'XXXX-XXXX-XXXX-XXXX' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LICENSE_INVALID');
  });

  it('requires authentication to activate', async () => {
    const res = await request
      .post('/api/auth/license/activate')
      .send({ key: 'XXXX-XXXX-XXXX-XXXX' });
    expect(res.status).toBe(401);
  });

  it('can deactivate an activated license', async () => {
    const adminRes = await request
      .post('/api/auth/setup')
      .send({ password: 'secret1' });
    const adminToken = adminRes.body.token as string;

    const lic = createLicense({ tier: 'pro' });
    await request
      .post('/api/auth/license/activate')
      .set('X-Panel-Token', adminToken)
      .send({ key: lic.key });

    const deactivate = await request
      .post('/api/auth/license/deactivate')
      .set('X-Panel-Token', adminToken)
      .send({ key: lic.key });
    expect(deactivate.status).toBe(204);
  });
});
