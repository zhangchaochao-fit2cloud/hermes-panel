/**
 * Account + session store backed by panel.db.
 *
 * Crypto choices (no third-party deps — Node built-in crypto only):
 *   - Passwords: scrypt (N=16384,r=8,p=1) with a per-user random salt.
 *     Stored as password_hash (hex) + password_salt (hex).
 *   - Session tokens: randomBytes(32).hex. We store only sha256(token) so a
 *     panel.db leak does not reveal live tokens. Multiple rows per user =
 *     multiple devices logged in simultaneously.
 */

import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import type { PublicUser, UserRole, LicenseTier, LicenseInfo } from '@hermes-panel/shared';
import { PREMIUM_FEATURES } from '@hermes-panel/shared';
import { getPanelDb } from './panel-db.js';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return { hash: derived.toString('hex'), salt: salt.toString('hex') };
}

export function verifyPassword(password: string, hashHex: string, saltHex: string): boolean {
  if (!hashHex || !saltHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, expected.length, SCRYPT_PARAMS);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// ---------------------------------------------------------------------------
// Row → DTO mappers
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  password_salt: string | null;
  display_name: string | null;
  role: string;
  created_at: number;
  status: string;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    status: row.status as PublicUser['status'],
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function countUsers(): number {
  const db = getPanelDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

/** True if no users exist — first launch / needs setup. */
export function isBootstrap(): boolean {
  return countUsers() === 0;
}

export function getUserById(id: string): PublicUser | null {
  const db = getPanelDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toPublicUser(row) : null;
}

export function getUserByEmail(email: string): PublicUser | null {
  const db = getPanelDb();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .get(email) as UserRow | undefined;
  return row ? toPublicUser(row) : null;
}

export interface CreateUserInput {
  email?: string | null;
  password?: string | null;
  displayName?: string | null;
  role?: UserRole;
}

export function createUser(input: CreateUserInput): PublicUser {
  const db = getPanelDb();
  const id = randomUUID();
  let hash: string | null = null;
  let salt: string | null = null;
  if (input.password) {
    const h = hashPassword(input.password);
    hash = h.hash;
    salt = h.salt;
  }
  db.prepare(
    `INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
  ).run(
    id,
    input.email ?? null,
    hash,
    salt,
    input.displayName ?? null,
    input.role ?? 'member',
    Date.now(),
  );
  return getUserById(id)!;
}

/** Returns the user if credentials match and the account is active.
 *  email is optional for backward compatibility with existing email accounts;
 *  if omitted, resolves the admin user (password-only login, 1Panel style). */
export function verifyCredentials(opts: { password: string; email?: string }): PublicUser | null {
  const db = getPanelDb();
  let row: UserRow | undefined | null;
  if (opts.email) {
    row = db
      .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
      .get(opts.email) as UserRow | undefined;
  } else {
    // Password-only login: resolve the sole admin user.
    row = resolveAdminUserRow();
  }
  if (!row || row.status !== 'active') return null;
  if (!row.password_hash || !row.password_salt) return null;
  if (!verifyPassword(opts.password, row.password_hash, row.password_salt)) return null;
  return toPublicUser(row);
}

/** First-launch admin setup. Only works when no users exist. */
export function setupAdmin(password: string): PublicUser {
  if (!isBootstrap()) {
    throw new Error('Admin already exists — use login instead');
  }
  return createUser({ password, role: 'admin' });
}

function resolveAdminUserRow(): UserRow | null {
  const db = getPanelDb();
  const row = db
    .prepare("SELECT * FROM users WHERE role = 'admin' AND status = 'active' ORDER BY created_at ASC LIMIT 1")
    .get() as UserRow | undefined;
  return row ?? null;
}

/** Resolve the admin user for password-only login. */
export function resolveAdminUser(): PublicUser | null {
  const row = resolveAdminUserRow();
  return row ? toPublicUser(row) : null;
}

// ---------------------------------------------------------------------------
// Sessions (opaque tokens)
// ---------------------------------------------------------------------------

/** Creates a session row and returns the PLAINTEXT token (shown once). */
export function createSession(userId: string, deviceLabel?: string): string {
  const db = getPanelDb();
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare(
    `INSERT INTO auth_sessions (token_hash, user_id, device_label, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(sha256(token), userId, deviceLabel ?? null, now, now + SESSION_TTL_MS, now);
  return token;
}

/** Validates a plaintext token; returns the user or null. Touches last_seen_at. */
export function resolveSession(token: string): PublicUser | null {
  if (!token) return null;
  const db = getPanelDb();
  const hash = sha256(token);
  const row = db
    .prepare('SELECT user_id, expires_at FROM auth_sessions WHERE token_hash = ?')
    .get(hash) as { user_id: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hash);
    return null;
  }
  db.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?').run(Date.now(), hash);
  return getUserById(row.user_id);
}

export function revokeSession(token: string): void {
  if (!token) return;
  const db = getPanelDb();
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(sha256(token));
}

// ---------------------------------------------------------------------------
// Licenses (tiered, device-bound, feature-gated)
// ---------------------------------------------------------------------------

interface LicenseRow {
  key: string;
  tier: string;
  bound_user_id: string | null;
  bound_device: string | null;
  bound_os: string | null;
  created_by: string | null;
  created_at: number;
  expires_at: number | null;
  activated_at: number | null;
  features: string | null; // JSON array
  revoked: number;
}

function toLicense(row: LicenseRow): LicenseInfo {
  let features: string[] = [];
  if (row.features) {
    try { features = JSON.parse(row.features); } catch { /* keep empty */ }
  }
  return {
    key: row.key,
    tier: row.tier as LicenseTier,
    boundUserId: row.bound_user_id,
    boundDevice: row.bound_device,
    boundOs: row.bound_os,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    features,
    revoked: row.revoked === 1,
    createdAt: row.created_at,
  };
}

/** Maps a license tier to its feature set. */
export function tierToFeatures(tier: LicenseTier): string[] {
  if (tier === 'web') {
    return []; // web tier = basic only, no premium features
  }
  // pro / desktop = all premium features
  return [...PREMIUM_FEATURES];
}

export function createLicense(opts: {
  tier?: LicenseTier;
  createdBy?: string;
  expiresAt?: number | null;
}): LicenseInfo {
  const db = getPanelDb();
  const raw = randomBytes(8).toString('hex').toUpperCase();
  const key = raw.match(/.{1,4}/g)!.join('-');
  const features = JSON.stringify(tierToFeatures(opts.tier ?? 'web'));
  db.prepare(
    `INSERT INTO licenses (key, tier, bound_user_id, bound_device, bound_os, created_by, created_at, expires_at, activated_at, features, revoked)
     VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, NULL, ?, 0)`,
  ).run(key, opts.tier ?? 'web', opts.createdBy ?? null, Date.now(), opts.expiresAt ?? null, features);
  return toLicense(db.prepare('SELECT * FROM licenses WHERE key = ?').get(key) as LicenseRow);
}

export function listLicenses(): LicenseInfo[] {
  const db = getPanelDb();
  const rows = db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all() as LicenseRow[];
  return rows.map(toLicense);
}

export function getLicense(key: string): LicenseInfo | null {
  const db = getPanelDb();
  const row = db.prepare('SELECT * FROM licenses WHERE key = ?').get(key) as LicenseRow | undefined;
  return row ? toLicense(row) : null;
}

export function isLicenseValid(key: string): boolean {
  const lic = getLicense(key);
  if (!lic || lic.revoked) return false;
  if (lic.expiresAt != null && lic.expiresAt < Date.now()) return false;
  return true;
}

export function bindLicense(key: string, userId: string): void {
  const db = getPanelDb();
  db.prepare('UPDATE licenses SET bound_user_id = ? WHERE key = ?').run(userId, key);
}

/** Activate a license: bind device + user, set activated_at. */
export function activateLicense(key: string, userId: string, deviceFingerprint: string, os: string): LicenseInfo | null {
  const db = getPanelDb();
  const now = Date.now();
  const res = db.prepare(
    `UPDATE licenses SET bound_user_id = ?, bound_device = ?, bound_os = ?, activated_at = ?
     WHERE key = ? AND revoked = 0`,
  ).run(userId, deviceFingerprint, os, now, key);
  if (res.changes === 0) return null;
  return getLicense(key);
}

/** Get the active license for a user (most recently activated, non-revoked, non-expired). */
export function getLicenseForUser(userId: string): LicenseInfo | null {
  const db = getPanelDb();
  const row = db.prepare(
    `SELECT * FROM licenses WHERE bound_user_id = ? AND revoked = 0
       AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY activated_at DESC LIMIT 1`,
  ).get(userId, Date.now()) as LicenseRow | undefined;
  return row ? toLicense(row) : null;
}

/** Deactivate (unbind) a license for a user. */
export function deactivateLicense(key: string, userId: string): boolean {
  const db = getPanelDb();
  const res = db.prepare(
    `UPDATE licenses SET bound_user_id = NULL, bound_device = NULL, bound_os = NULL, activated_at = NULL
     WHERE key = ? AND bound_user_id = ?`,
  ).run(key, userId);
  return res.changes > 0;
}

export function revokeLicense(key: string): void {
  const db = getPanelDb();
  db.prepare('UPDATE licenses SET revoked = 1 WHERE key = ?').run(key);
}

/** Get features for a user from their active license. Returns empty array for unlicensed users. */
export function getFeaturesForUser(userId: string): string[] {
  const lic = getLicenseForUser(userId);
  return lic?.features ?? [];
}
