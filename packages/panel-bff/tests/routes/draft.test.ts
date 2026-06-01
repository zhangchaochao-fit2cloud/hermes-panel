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

describe('draft routes', () => {
  it('stages IDE cwd as the current workspace status source', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'hermes-panel-draft-cwd-'));
    try {
      const draftRes = await request
        .post('/api/draft')
        .set('X-Panel-Token', token)
        .send({ prompt: 'hello', source: 'vscode', cwd: tmp });

      expect(draftRes.status).toBe(200);

      const statusRes = await request
        .get('/api/workspace/status')
        .set('X-Panel-Token', token);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.cwd).toBe(realpathSync(tmp));
      expect(statusRes.body.source).toBe('ide');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
