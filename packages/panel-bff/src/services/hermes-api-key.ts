/**
 * Single source of truth for the hermes API key inside the BFF.
 *
 * Resolution order on first read:
 *   1. Secure store (keychain / encrypted file).
 *   2. Legacy ~/.hermes/auth.json  → migrate into secure store, then
 *      return the value.
 *   3. process.env.HERMES_API_KEY  → returned but NOT persisted; env
 *      var is itself the operator's choice of storage.
 *
 * After the first successful read the value is cached in memory for
 * the lifetime of the process. Use `invalidateHermesApiKeyCache()`
 * when the user updates the key via PUT /api/secrets/hermes-api-key.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../lib/logger.js';
import { getHermesHome } from './hermes-home.js';
import {
  HERMES_API_KEY_ACCOUNT,
  HERMES_SECRET_SERVICE,
  getSecret,
  setSecret,
} from './secure-store.js';

let cached: string | null = null;
let loaded = false;

function readAuthJsonKey(): string | null {
  const authJsonPath = join(getHermesHome(), 'auth.json');
  if (!existsSync(authJsonPath)) return null;
  try {
    const data = JSON.parse(readFileSync(authJsonPath, 'utf-8'));
    const key = data?.api_key ?? data?.apiKey ?? null;
    return typeof key === 'string' && key.length > 0 ? key : null;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'failed to parse hermes auth.json',
    );
    return null;
  }
}

export async function getHermesApiKey(): Promise<string | null> {
  if (loaded) return cached;
  loaded = true;

  // 1. Try secure store.
  try {
    const fromStore = await getSecret(
      HERMES_SECRET_SERVICE,
      HERMES_API_KEY_ACCOUNT,
    );
    if (fromStore) {
      cached = fromStore;
      logger.info({ len: fromStore.length }, 'loaded api key from secure store');
      return cached;
    }
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'secure-store read failed; trying legacy sources',
    );
  }

  // 2. Migrate from legacy auth.json.
  const legacy = readAuthJsonKey();
  if (legacy) {
    cached = legacy;
    logger.info({ len: legacy.length }, 'loaded api key from auth.json');
    try {
      await setSecret(HERMES_SECRET_SERVICE, HERMES_API_KEY_ACCOUNT, legacy);
      logger.info('migrated api key from auth.json to secure store');
    } catch (err) {
      // Migration failure must not break startup. The key still works
      // for this process; next run will retry.
      logger.warn(
        { err: (err as Error).message },
        'auth.json migration to secure store failed',
      );
    }
    return cached;
  }

  // 3. Env-var fallback.
  if (process.env.HERMES_API_KEY) {
    cached = process.env.HERMES_API_KEY;
    logger.info(
      { len: cached.length },
      'loaded api key from HERMES_API_KEY env',
    );
    return cached;
  }

  cached = null;
  logger.info('no hermes api key configured');
  return null;
}

/** Reset the in-process cache. Call after writes/deletes. */
export function invalidateHermesApiKeyCache(): void {
  cached = null;
  loaded = false;
}

/**
 * For tests only — directly seed or clear the cached value without
 * touching the secure store.
 */
export function _setHermesApiKeyCacheForTests(value: string | null): void {
  cached = value;
  loaded = true;
}
