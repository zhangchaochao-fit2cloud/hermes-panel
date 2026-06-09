import { afterEach, describe, expect, it } from 'vitest';
import { listPairings } from '../../src/services/hermes-pairing.js';

afterEach(() => {
  delete process.env.HERMES_BIN;
});

describe('hermes pairing service', () => {
  it('returns hermes pairing list output', async () => {
    process.env.HERMES_BIN = '/bin/echo';

    const report = await listPairings();

    expect(report).toMatchObject({
      source: 'hermes pairing list',
      stdout: 'pairing list\n',
    });
    expect(report.error).toBeUndefined();
  });

  it('falls back with an error code when the CLI is unavailable', async () => {
    process.env.HERMES_BIN = 'does-not-exist-hermes-for-pairing-test';

    const report = await listPairings();

    expect(report).toMatchObject({
      source: 'hermes pairing list',
      stdout: '',
      error: 'HERMES_CLI_NOT_FOUND',
    });
  });
});
