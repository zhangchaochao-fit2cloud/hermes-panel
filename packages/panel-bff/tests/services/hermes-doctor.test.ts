import { afterEach, describe, expect, it } from 'vitest';
import { runDump } from '../../src/services/hermes-doctor.js';

afterEach(() => {
  delete process.env.HERMES_BIN;
});

describe('runDump', () => {
  it('returns stdout from hermes dump', async () => {
    process.env.HERMES_BIN = '/bin/echo';
    const dump = await runDump();
    expect(dump.source).toBe('hermes dump');
    expect(dump.stdout).toBe('dump\n');
    expect(dump.error).toBeUndefined();
  });

  it('returns fallback error when hermes binary is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-dump-test';
    const dump = await runDump();
    expect(dump.source).toBe('hermes dump');
    expect(dump.stdout).toBe('');
    expect(dump.error).toBe('HERMES_CLI_NOT_FOUND');
  });
});
