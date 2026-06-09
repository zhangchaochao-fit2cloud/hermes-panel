import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

let request: ReturnType<typeof supertest>;
let token: string;
let tmpPanelHome: string;
let tmpHome: string;

beforeAll(() => {
  tmpPanelHome = mkdtempSync(join(tmpdir(), 'hermes-panel-providers-'));
  tmpHome = mkdtempSync(join(tmpdir(), 'hermes-home-providers-'));
  process.env.PANEL_HOME = tmpPanelHome;
  process.env.HERMES_HOME = tmpHome;
  process.env.HERMES_BIN = 'does-not-exist-xxx';
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

beforeEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  process.env.HERMES_BIN = 'does-not-exist-xxx';
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  if (tmpPanelHome) rmSync(tmpPanelHome, { recursive: true, force: true });
  if (tmpHome) rmSync(tmpHome, { recursive: true, force: true });
});

describe('provider model inspection routes', () => {
  it('POST /api/models/inspect returns credential and pricing metadata for candidates', async () => {
    const res = await request
      .post('/api/models/inspect')
      .set('X-Panel-Token', token)
      .send({
        models: [
          { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
          { id: 'llama3.1', label: 'Llama 3.1', provider: 'custom', baseUrl: 'http://localhost:11434/v1', requiresCredential: false },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      id: 'gpt-4o',
      provider: 'openai',
      credentialStatus: 'missing',
      availability: 'missing_credentials',
      pricing: {
        inputPerMillion: 2.5,
        outputPerMillion: 10,
        source: 'static',
      },
    });
    expect(res.body.items[1]).toMatchObject({
      id: 'llama3.1',
      provider: 'custom',
      credentialStatus: 'configured',
      availability: 'ready',
    });
  });

  it('POST /api/providers/login runs the official CLI login command', async () => {
    process.env.HERMES_BIN = '/bin/echo';

    const res = await request
      .post('/api/providers/login')
      .set('X-Panel-Token', token)
      .send({ provider: 'openai' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      source: 'hermes login openai',
      stdout: 'login openai\n',
    });
  });

  it('POST /api/providers/logout requires a safe provider and exposes CLI errors', async () => {
    const bad = await request
      .post('/api/providers/logout')
      .set('X-Panel-Token', token)
      .send({ provider: '--all' });

    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({
      ok: false,
      error: 'BAD_PROVIDER',
    });
  });

  it('GET /api/providers/balance reports real OpenRouter credits when an accessible key exists', async () => {
    process.env.OPENROUTER_API_KEY = 'or-test';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { total_credits: 12, total_usage: 5 } }),
    } as Response);

    const res = await request
      .get('/api/providers/balance?provider=openrouter')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      provider: 'openrouter',
      status: 'available',
      total: 12,
      used: 5,
      remaining: 7,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/credits',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer or-test' }),
      }),
    );
  });
});
