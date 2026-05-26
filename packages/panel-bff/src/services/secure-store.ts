/**
 * Cross-platform secure storage for the hermes API key (and any future
 * secret BFF needs to persist).
 *
 * Backends (in priority order):
 *   1. keytar — native module that wraps:
 *      - macOS: Security framework / login keychain
 *      - Windows: WindowsCredential (DPAPI under the hood)
 *      - Linux: libsecret (Secret Service / gnome-keyring)
 *   2. Encrypted file fallback at ~/.hermes-panel/secrets.enc using
 *      AES-256-GCM with a key derived (scrypt) from hostname + username.
 *      This is a *best-effort* protection — not cryptographically strong.
 *      Used only when keytar fails to load (e.g. headless Linux without
 *      libsecret, or pnpm rebuild skipped the native build).
 *
 * Threat model (v0.1):
 *   - Protects against casual disk inspection / cloud-backup leakage.
 *   - Does NOT protect against an attacker with code-exec as the user
 *     (they can read the same secrets we can). Spec §19.4 lists
 *     "AES-256 + user passphrase" as future work.
 *
 * Service / account naming convention:
 *   - service: 'hermes-panel'
 *   - account: 'hermes-api-key'  (or other named secrets)
 */

import { promises as fsp } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { hostname, userInfo } from 'node:os';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { logger } from '../lib/logger.js';
import { getPanelHome } from './hermes-home.js';

// Lazily resolved keytar module — may be null if the native module
// failed to load (no libsecret, build skipped, etc.).
type KeytarLike = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

let keytarMod: KeytarLike | null = null;
let keytarTried = false;

async function loadKeytar(): Promise<KeytarLike | null> {
  if (keytarTried) return keytarMod;
  keytarTried = true;
  try {
    // Dynamic import so a missing native module doesn't crash module init.
    // We type-cast through `unknown` because keytar's @types are not
    // installed (the package itself ships its own .d.ts) and we want to
    // tolerate both ESM-default and CJS-namespace shapes.
    const mod = (await import('keytar')) as unknown as Record<string, unknown>;
    const candidate = (mod.default ?? mod) as KeytarLike;
    if (
      typeof candidate.getPassword === 'function' &&
      typeof candidate.setPassword === 'function' &&
      typeof candidate.deletePassword === 'function'
    ) {
      keytarMod = candidate;
      logger.debug('keytar loaded; using OS keychain for secrets');
    } else {
      logger.warn('keytar module loaded but missing expected API; ignoring');
      keytarMod = null;
    }
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'keytar unavailable, falling back to encrypted file store',
    );
    keytarMod = null;
  }
  return keytarMod;
}

// ---------------------------------------------------------------------------
// Encrypted file fallback
// ---------------------------------------------------------------------------

const FALLBACK_FILE = 'secrets.enc';
const SCRYPT_SALT = Buffer.from('hermes-panel/secrets/v1', 'utf-8');
const KEY_LEN = 32;
const IV_LEN = 12; // GCM standard

function deriveKey(): Buffer {
  // Best-effort machine binding: hostname + username + a process-local salt.
  // NOT cryptographically strong; only deters casual filesystem reading.
  const material = `${hostname()}::${userInfo().username}`;
  return scryptSync(material, SCRYPT_SALT, KEY_LEN);
}

type Vault = Record<string, Record<string, string>>; // service -> account -> value

async function ensurePanelDir(): Promise<string> {
  const dir = getPanelHome();
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

async function readVault(): Promise<Vault> {
  const path = join(getPanelHome(), FALLBACK_FILE);
  if (!existsSync(path)) return {};
  try {
    const raw = await fsp.readFile(path);
    if (raw.length < IV_LEN + 16) return {};
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const ciphertext = raw.subarray(IV_LEN + 16);
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf-8');
    return JSON.parse(plaintext) as Vault;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'failed to decrypt fallback vault; treating as empty',
    );
    return {};
  }
}

async function writeVault(vault: Vault): Promise<void> {
  await ensurePanelDir();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(vault), 'utf-8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, tag, ciphertext]);
  const path = join(getPanelHome(), FALLBACK_FILE);
  // Write to tmp then rename to avoid torn writes.
  const tmp = path + '.tmp';
  await fsp.writeFile(tmp, blob, { mode: 0o600 });
  await fsp.rename(tmp, path);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSecret(
  service: string,
  account: string,
): Promise<string | null> {
  const k = await loadKeytar();
  if (k) {
    try {
      return await k.getPassword(service, account);
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'keytar.getPassword failed');
      // Fall through to file vault.
    }
  }
  const vault = await readVault();
  return vault[service]?.[account] ?? null;
}

export async function setSecret(
  service: string,
  account: string,
  value: string,
): Promise<void> {
  const k = await loadKeytar();
  if (k) {
    try {
      await k.setPassword(service, account, value);
      return;
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'keytar.setPassword failed, using file vault',
      );
    }
  }
  const vault = await readVault();
  if (!vault[service]) vault[service] = {};
  vault[service][account] = value;
  await writeVault(vault);
}

export async function deleteSecret(
  service: string,
  account: string,
): Promise<boolean> {
  let deleted = false;
  const k = await loadKeytar();
  if (k) {
    try {
      deleted = (await k.deletePassword(service, account)) || deleted;
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'keytar.deletePassword failed',
      );
    }
  }
  const vault = await readVault();
  if (vault[service]?.[account] !== undefined) {
    delete vault[service][account];
    if (Object.keys(vault[service]).length === 0) delete vault[service];
    await writeVault(vault);
    deleted = true;
  }
  return deleted;
}

// Convenience constants — the canonical names used across the BFF.
export const HERMES_SECRET_SERVICE = 'hermes-panel';
export const HERMES_API_KEY_ACCOUNT = 'hermes-api-key';

/**
 * For tests: reset the cached keytar handle so a subsequent call to
 * loadKeytar() re-tries the dynamic import (useful when a test mocks
 * the module).
 */
export function _resetKeytarCacheForTests(): void {
  keytarMod = null;
  keytarTried = false;
}
