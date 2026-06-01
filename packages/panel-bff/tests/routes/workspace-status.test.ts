import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/workspace/status', () => {
  it('requires auth', async () => {
    const res = await request.get('/api/workspace/status');
    expect(res.status).toBe(401);
  });

  it('returns local workspace status', async () => {
    const res = await request
      .get('/api/workspace/status')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cwd');
    expect(res.body).toHaveProperty('source');
    expect(res.body).toHaveProperty('isGitRepo');
    expect(res.body).toHaveProperty('changeCount');
    expect(res.body).toHaveProperty('githubCliAvailable');
  });

  it('can read an explicit workspace cwd', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'hermes-panel-workspace-'));
    try {
      const res = await request
        .get(`/api/workspace/status?cwd=${encodeURIComponent(tmp)}`)
        .set('X-Panel-Token', token);

      expect(res.status).toBe(200);
      expect(res.body.cwd).toBe(realpathSync(tmp));
      expect(res.body.source).toBe('query');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
