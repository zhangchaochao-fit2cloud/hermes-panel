import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deleteSecret,
  getSecret,
  setSecret,
  _resetKeytarCacheForTests,
} from '../../src/services/secure-store.js';

// Use a uniquely-named service so we don't collide with any real
// hermes-panel secret on the developer's machine.
const TEST_SERVICE = `hermes-panel-vitest-${process.pid}-${Date.now()}`;
const ACCOUNT = 'unit-test-account';

let tmpPanelHome: string;

beforeAll(() => {
  tmpPanelHome = mkdtempSync(join(tmpdir(), 'hermes-panel-secstore-'));
  process.env.PANEL_HOME = tmpPanelHome;
  _resetKeytarCacheForTests();
});

afterAll(async () => {
  try {
    await deleteSecret(TEST_SERVICE, ACCOUNT);
  } catch {
    // ignore
  }
  if (tmpPanelHome && existsSync(tmpPanelHome)) {
    rmSync(tmpPanelHome, { recursive: true, force: true });
  }
});

describe('secure-store', () => {
  it('round-trips a secret (keychain or encrypted file)', async () => {
    const value = `value-${Math.random().toString(36).slice(2)}`;
    await setSecret(TEST_SERVICE, ACCOUNT, value);
    const got = await getSecret(TEST_SERVICE, ACCOUNT);
    expect(got).toBe(value);
  });

  it('returns null for unknown account', async () => {
    const got = await getSecret(TEST_SERVICE, 'does-not-exist');
    expect(got).toBeNull();
  });

  it('overwrites an existing secret', async () => {
    await setSecret(TEST_SERVICE, ACCOUNT, 'first');
    await setSecret(TEST_SERVICE, ACCOUNT, 'second');
    const got = await getSecret(TEST_SERVICE, ACCOUNT);
    expect(got).toBe('second');
  });

  it('deletes a secret', async () => {
    await setSecret(TEST_SERVICE, ACCOUNT, 'to-delete');
    const ok = await deleteSecret(TEST_SERVICE, ACCOUNT);
    expect(ok).toBe(true);
    const got = await getSecret(TEST_SERVICE, ACCOUNT);
    expect(got).toBeNull();
  });
});
