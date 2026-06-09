import { afterEach, describe, expect, it } from 'vitest';
import { loginProvider, logoutProvider } from '../../src/services/hermes-providers.js';

afterEach(() => {
  delete process.env.HERMES_BIN;
});

describe('provider CLI auth commands', () => {
  it('runs official hermes login and logout commands', async () => {
    process.env.HERMES_BIN = '/bin/echo';

    await expect(loginProvider('openai')).resolves.toMatchObject({
      ok: true,
      source: 'hermes login openai',
      stdout: 'login openai\n',
    });
    await expect(logoutProvider('openai')).resolves.toMatchObject({
      ok: true,
      source: 'hermes logout openai',
      stdout: 'logout openai\n',
    });
  });

  it('rejects empty and option-like provider arguments before invoking hermes', async () => {
    process.env.HERMES_BIN = '/bin/echo';

    await expect(loginProvider('')).resolves.toMatchObject({
      ok: false,
      error: 'PROVIDER_REQUIRED',
    });
    await expect(logoutProvider('--all')).resolves.toMatchObject({
      ok: false,
      error: 'BAD_PROVIDER',
    });
  });
});
