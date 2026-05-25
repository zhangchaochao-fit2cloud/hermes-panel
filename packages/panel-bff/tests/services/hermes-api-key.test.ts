import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getHermesApiKey,
  invalidateHermesApiKeyCache,
} from '../../src/services/hermes-api-key.js';
import {
  HERMES_API_KEY_ACCOUNT,
  HERMES_SECRET_SERVICE,
  deleteSecret,
  getSecret,
  setSecret,
  _resetKeytarCacheForTests,
} from '../../src/services/secure-store.js';

// We test against the real service name so that the migration code path
// exercises the same key it will use in production. To keep the test
// hermetic we wipe that entry before and after.
const SERVICE = HERMES_SECRET_SERVICE;
const ACCOUNT = HERMES_API_KEY_ACCOUNT;

let tmpHome: string;
let tmpPanelHome: string;

async function wipeKeychainEntry(): Promise<void> {
  try {
    await deleteSecret(SERVICE, ACCOUNT);
  } catch {
    /* ignore */
  }
}

beforeEach(async () => {
  // Each test gets a fresh HERMES_HOME so auth.json migration is
  // deterministic.
  tmpHome = mkdtempSync(join(tmpdir(), 'hermes-home-'));
  tmpPanelHome = mkdtempSync(join(tmpdir(), 'hermes-panel-home-'));
  process.env.HERMES_HOME = tmpHome;
  process.env.PANEL_HOME = tmpPanelHome;
  delete process.env.HERMES_API_KEY;
  await wipeKeychainEntry();
  _resetKeytarCacheForTests();
  invalidateHermesApiKeyCache();
});

afterAll(async () => {
  await wipeKeychainEntry();
  if (tmpHome) rmSync(tmpHome, { recursive: true, force: true });
  if (tmpPanelHome) rmSync(tmpPanelHome, { recursive: true, force: true });
});

describe('getHermesApiKey()', () => {
  it('returns null when nothing is configured', async () => {
    const got = await getHermesApiKey();
    expect(got).toBeNull();
  });

  it('returns env var when no other source is set', async () => {
    process.env.HERMES_API_KEY = 'env-key-123';
    const got = await getHermesApiKey();
    expect(got).toBe('env-key-123');
  });

  it('migrates from ~/.hermes/auth.json into the secure store', async () => {
    mkdirSync(tmpHome, { recursive: true });
    writeFileSync(
      join(tmpHome, 'auth.json'),
      JSON.stringify({ api_key: 'legacy-key-abc' }),
      'utf-8',
    );

    const got = await getHermesApiKey();
    expect(got).toBe('legacy-key-abc');

    // Verify it landed in the secure store for next run.
    const stored = await getSecret(SERVICE, ACCOUNT);
    expect(stored).toBe('legacy-key-abc');
  });

  it('prefers the secure store over auth.json and env var', async () => {
    await setSecret(SERVICE, ACCOUNT, 'store-key-xyz');
    mkdirSync(tmpHome, { recursive: true });
    writeFileSync(
      join(tmpHome, 'auth.json'),
      JSON.stringify({ api_key: 'legacy-not-used' }),
      'utf-8',
    );
    process.env.HERMES_API_KEY = 'env-not-used';

    const got = await getHermesApiKey();
    expect(got).toBe('store-key-xyz');
  });

  it('supports both api_key and apiKey field names', async () => {
    mkdirSync(tmpHome, { recursive: true });
    writeFileSync(
      join(tmpHome, 'auth.json'),
      JSON.stringify({ apiKey: 'camel-cased' }),
      'utf-8',
    );
    const got = await getHermesApiKey();
    expect(got).toBe('camel-cased');
  });

  it('caches across calls; invalidate forces re-read', async () => {
    await setSecret(SERVICE, ACCOUNT, 'first');
    expect(await getHermesApiKey()).toBe('first');

    // Update directly in the store — without invalidating cache the
    // function should still return the cached value.
    await setSecret(SERVICE, ACCOUNT, 'second');
    expect(await getHermesApiKey()).toBe('first');

    invalidateHermesApiKeyCache();
    expect(await getHermesApiKey()).toBe('second');
  });
});
