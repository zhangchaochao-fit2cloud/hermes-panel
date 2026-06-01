import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/server.js';
import { closePanelDb } from '../../src/services/panel-db.js';

let request: ReturnType<typeof supertest>;
let tmp: string;

/** Bootstrap an admin account and return the session token. */
async function bootstrapAdmin(): Promise<string> {
  const res = await request
    .post('/api/auth/setup')
    .send({ password: 'secret1' });
  return res.body.token as string;
}

/** Create a member account (via admin creating a user in panel.db directly). */
async function createMember(): Promise<string> {
  const { createUser, createSession } = await import('../../src/services/auth-store.js');
  const user = createUser({ password: 'member1', role: 'member' });
  return createSession(user.id);
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'auth-admin-test-'));
  process.env.PANEL_HOME = tmp;
  closePanelDb();
  request = supertest(createApp().callback());
});

afterEach(() => {
  closePanelDb();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('admin — licenses', () => {
  it('admin can create, list, and revoke a license', async () => {
    const token = await bootstrapAdmin();

    // Create with tier
    const create = await request
      .post('/api/auth/licenses')
      .set('X-Panel-Token', token)
      .send({ tier: 'pro' });
    expect(create.status).toBe(201);
    expect(create.body.license.tier).toBe('pro');
    expect(create.body.license.key).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(create.body.license.revoked).toBe(false);

    // List
    const list = await request
      .get('/api/auth/licenses')
      .set('X-Panel-Token', token);
    expect(list.status).toBe(200);
    expect(list.body.licenses.length).toBe(1);

    // Revoke
    const revoke = await request
      .post(`/api/auth/licenses/${create.body.license.key}/revoke`)
      .set('X-Panel-Token', token);
    expect(revoke.status).toBe(204);

    const list2 = await request
      .get('/api/auth/licenses')
      .set('X-Panel-Token', token);
    expect(list2.body.licenses[0].revoked).toBe(true);
  });

  it('default tier is web (no premium features)', async () => {
    const token = await bootstrapAdmin();
    const create = await request
      .post('/api/auth/licenses')
      .set('X-Panel-Token', token)
      .send({});
    expect(create.status).toBe(201);
    expect(create.body.license.tier).toBe('web');
    expect(create.body.license.features).toEqual([]);
  });

  it('non-admin cannot access license management', async () => {
    await bootstrapAdmin();
    const memberToken = await createMember();

    const list = await request
      .get('/api/auth/licenses')
      .set('X-Panel-Token', memberToken);
    expect(list.status).toBe(403);
  });

  it('unauthenticated request is rejected', async () => {
    const res = await request.post('/api/auth/licenses').send({ tier: 'pro' });
    expect(res.status).toBe(401);
  });
});
