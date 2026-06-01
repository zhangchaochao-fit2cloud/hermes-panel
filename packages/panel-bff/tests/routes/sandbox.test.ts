import { describe, it, expect, beforeAll, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { getSessionToken } from '../../src/lib/token.js';

vi.mock('../../src/services/sandbox.js', () => ({
  isDockerAvailable: vi.fn().mockResolvedValue(false),
  createSandbox: vi.fn(),
  runInSandbox: vi.fn(),
  destroySandbox: vi.fn(),
  getSandboxStatus: vi.fn(),
  SandboxError: class extends Error {
    code: string;
    detail: unknown;
    constructor(code: string, message: string, detail?: unknown) {
      super(message);
      this.code = code;
      this.detail = detail;
      this.name = 'SandboxError';
    }
  },
}));

let request: ReturnType<typeof supertest>;
let token: string;

beforeAll(() => {
  const app = createApp();
  request = supertest(app.callback());
  token = getSessionToken();
});

describe('GET /api/sandbox/available', () => {
  it('requires auth', async () => {
    const res = await request.get('/api/sandbox/available');
    expect(res.status).toBe(401);
  });

  it('returns available: false when docker is not available', async () => {
    const res = await request
      .get('/api/sandbox/available')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('available');
    expect(res.body.available).toBe(false);
    expect(res.body).toHaveProperty('reason');
  });
});

describe('POST /api/sandbox/create', () => {
  it('requires auth', async () => {
    const res = await request.post('/api/sandbox/create').send({ sessionId: 'test-1' });
    expect(res.status).toBe(401);
  });

  it('returns 503 when docker is not available', async () => {
    const res = await request
      .post('/api/sandbox/create')
      .send({ sessionId: 'test-1' })
      .set('X-Panel-Token', token);

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('DOCKER_NOT_AVAILABLE');
  });
});

describe('DELETE /api/sandbox/:id', () => {
  it('requires auth', async () => {
    const res = await request.delete('/api/sandbox/test-1');
    expect(res.status).toBe(401);
  });

  it('returns 503 when docker is not available', async () => {
    const res = await request
      .delete('/api/sandbox/test-1')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DOCKER_NOT_AVAILABLE');
  });
});

describe('POST /api/sandbox/:id/run', () => {
  it('requires auth', async () => {
    const res = await request.post('/api/sandbox/test-1/run').send({ command: 'echo hi' });
    expect(res.status).toBe(401);
  });

  it('returns 503 when docker is not available', async () => {
    const res = await request
      .post('/api/sandbox/test-1/run')
      .send({ command: 'echo hi' })
      .set('X-Panel-Token', token);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DOCKER_NOT_AVAILABLE');
  });

  it('returns 400 when command is missing', async () => {
    const res = await request
      .post('/api/sandbox/test-1/run')
      .send({})
      .set('X-Panel-Token', token);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});

describe('GET /api/sandbox/:id/status', () => {
  it('requires auth', async () => {
    const res = await request.get('/api/sandbox/test-1/status');
    expect(res.status).toBe(401);
  });

  it('returns 503 when docker is not available', async () => {
    const res = await request
      .get('/api/sandbox/test-1/status')
      .set('X-Panel-Token', token);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DOCKER_NOT_AVAILABLE');
  });
});
