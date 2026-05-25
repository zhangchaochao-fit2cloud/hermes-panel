import { describe, it, expect } from 'vitest';
import { runHermesCli } from '../../src/services/hermes-cli.js';

describe('runHermesCli', () => {
  it('returns parsed JSON stdout for a quiet hermes call', async () => {
    // Use `node -e` to simulate a fast hermes-like binary
    const result = await runHermesCli([], {
      hermesBin: 'node',
      argsPrefix: ['-e', `console.log(JSON.stringify({version:'fake-0.8.0'}))`],
      timeoutMs: 2000,
    });
    expect(result.parsed).toEqual({ version: 'fake-0.8.0' });
    expect(result.exitCode).toBe(0);
  });

  it('returns error when binary not found', async () => {
    await expect(
      runHermesCli(['--version'], { hermesBin: 'does-not-exist-binary-xyz', timeoutMs: 1000 })
    ).rejects.toMatchObject({ code: 'HERMES_CLI_NOT_FOUND' });
  });

  it('times out a long-running command', async () => {
    await expect(
      runHermesCli([], {
        hermesBin: 'node',
        argsPrefix: ['-e', 'setTimeout(() => {}, 10000)'],
        timeoutMs: 200,
      })
    ).rejects.toMatchObject({ code: 'HERMES_CLI_TIMEOUT' });
  });
});
