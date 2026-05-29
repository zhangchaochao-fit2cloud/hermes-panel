import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;
let previousPanelHome: string | undefined;
let tmpPanelHome: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

beforeEach(() => {
  previousPanelHome = process.env.PANEL_HOME;
  tmpPanelHome = mkdtempSync(join(tmpdir(), 'hermes-panel-prefs-'));
  process.env.PANEL_HOME = tmpPanelHome;
});

afterEach(() => {
  if (previousPanelHome === undefined) delete process.env.PANEL_HOME;
  else process.env.PANEL_HOME = previousPanelHome;
  rmSync(tmpPanelHome, { recursive: true, force: true });
});

describe('preferences pinned sessions', () => {
  it('requires auth', async () => {
    const res = await request.get('/api/preferences/pinned-sessions');
    expect(res.status).toBe(401);
  });

  it('persists and normalizes pinned ids', async () => {
    const writeRes = await request
      .put('/api/preferences/pinned-sessions')
      .set('X-Panel-Token', token)
      .send({ ids: ['run_a', '', 'run_a', ' run_b ', 42] });

    expect(writeRes.status).toBe(200);
    expect(writeRes.body).toEqual({ ids: ['run_a', 'run_b'] });

    const readRes = await request
      .get('/api/preferences/pinned-sessions')
      .set('X-Panel-Token', token);

    expect(readRes.status).toBe(200);
    expect(readRes.body).toEqual({ ids: ['run_a', 'run_b'] });
  });

  it('rejects malformed payloads', async () => {
    const res = await request
      .put('/api/preferences/pinned-sessions')
      .set('X-Panel-Token', token)
      .send({ ids: 'run_a' });

    expect(res.status).toBe(400);
  });
});
