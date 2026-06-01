import { getLicenseDb } from '../db.js';
import { signResponse, getLicenseSigningKey, ed25519Sign } from './auth.js';

interface LicenseRow {
  id: number;
  order_id: string;
  license_key: string;
  tier: string;
  user_id: string;
  bound_device: string | null;
  bound_os: string | null;
  activated_at: number | null;
  deactivated_at: number | null;
  last_verified_at: number | null;
  created_at: number;
}

export interface LicenseInfo {
  id: number;
  orderId: string;
  licenseKey: string;
  tier: string;
  userId: string;
  boundDevice: string | null;
  boundOs: string | null;
  activatedAt: number | null;
  deactivatedAt: number | null;
  lastVerifiedAt: number | null;
  createdAt: number;
}

function toLic(row: LicenseRow): LicenseInfo {
  return {
    id: row.id, orderId: row.order_id, licenseKey: row.license_key,
    tier: row.tier, userId: row.user_id, boundDevice: row.bound_device,
    boundOs: row.bound_os, activatedAt: row.activated_at,
    deactivatedAt: row.deactivated_at, lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
  };
}

const FEATURES_BY_TIER: Record<string, string[]> = {
  web: [],
  desktop: ['workspaces', 'cron', 'memory', 'files', 'tools', 'developer', 'providers', 'backup', 'sandbox', 'gateway', 'webhook'],
  pro: ['workspaces', 'cron', 'memory', 'files', 'tools', 'developer', 'providers', 'backup', 'sandbox', 'gateway', 'webhook', 'doctor', 'logs', 'secrets'],
};

export function tierToFeatures(tier: string): string[] {
  return FEATURES_BY_TIER[tier] ?? [];
}

/** Build a signed license key string: base64url(header).base64url(payload).base64url(signature) */
function buildLicenseKey(orderId: string, userId: string, tier: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 365 * 24 * 60 * 60; // 1 year
  const payload = {
    sub: userId,
    orderId,
    tier,
    iat: now,
    exp,
    features: tierToFeatures(tier),
  };

  const header = { alg: 'Ed25519', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const message = `${headerB64}.${payloadB64}`;

  const kp = getLicenseSigningKey();
  const sig = ed25519Sign(Buffer.from(message), kp.privateKey);
  const sigB64 = sig.toString('base64url');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

/** Issue a license — generates an Ed25519-signed license key. */
export function issueLicense(orderId: string, userId: string, tier: string): LicenseInfo {
  const db = getLicenseDb();
  const key = buildLicenseKey(orderId, userId, tier);
  const now = Date.now();
  const result = db.prepare(
    `INSERT INTO licenses (order_id, license_key, tier, user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(orderId, key, tier, userId, now);
  const row = db.prepare('SELECT * FROM licenses WHERE id = ?').get(result.lastInsertRowid) as LicenseRow;
  return toLic(row);
}

export function getLicenseByKey(key: string): LicenseInfo | null {
  const db = getLicenseDb();
  const row = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(key) as LicenseRow | undefined;
  return row ? toLic(row) : null;
}

export function listLicenses(userId: string): LicenseInfo[] {
  const db = getLicenseDb();
  const rows = db.prepare('SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC').all(userId) as LicenseRow[];
  return rows.map(toLic);
}

export function listAllLicenses(): LicenseInfo[] {
  const db = getLicenseDb();
  const rows = db.prepare('SELECT * FROM licenses ORDER BY created_at DESC').all() as LicenseRow[];
  return rows.map(toLic);
}

/** Panel calls this to activate a license on a device. */
export function activateLicense(key: string, fingerprint: string, os: string): { success: boolean; reason?: string; features?: string[]; tier?: string } {
  const lic = getLicenseByKey(key);
  if (!lic) return { success: false, reason: 'invalid' };
  if (lic.boundDevice && lic.boundDevice !== fingerprint) return { success: false, reason: 'bound_to_other' };
  if (lic.deactivatedAt) return { success: false, reason: 'deactivated' };

  const db = getLicenseDb();
  const now = Date.now();
  db.prepare(
    `UPDATE licenses SET bound_device = ?, bound_os = ?, activated_at = ?, last_verified_at = ?, deactivated_at = NULL
     WHERE license_key = ?`,
  ).run(fingerprint, os, now, now, key);

  const features = tierToFeatures(lic.tier);
  return { success: true, features, tier: lic.tier };
}

/** Panel calls this to verify license is still active. */
export function verifyLicense(key: string, fingerprint: string): { success: boolean; reason?: string; features?: string[]; tier?: string } {
  const lic = getLicenseByKey(key);
  if (!lic) return { success: false, reason: 'invalid' };
  if (lic.boundDevice && lic.boundDevice !== fingerprint) return { success: false, reason: 'bound_to_other' };
  if (lic.deactivatedAt) return { success: false, reason: 'deactivated' };

  const db = getLicenseDb();
  const now = Date.now();
  db.prepare('UPDATE licenses SET last_verified_at = ? WHERE license_key = ?').run(now, key);

  const features = tierToFeatures(lic.tier);
  return { success: true, features, tier: lic.tier };
}

/** Panel calls this to deactivate (unbind) a license. */
export function deactivateLicense(key: string, fingerprint: string): boolean {
  const lic = getLicenseByKey(key);
  if (!lic) return false;
  if (lic.boundDevice && lic.boundDevice !== fingerprint) return false;

  const db = getLicenseDb();
  const now = Date.now();
  db.prepare(
    `UPDATE licenses SET deactivated_at = ?, bound_device = NULL, bound_os = NULL WHERE license_key = ?`,
  ).run(now, key);
  return true;
}

/** Sign a response with the server Ed25519 key (sk₂). */
export function signedResponse(data: Record<string, unknown>): Record<string, unknown> {
  const sig = signResponse(data);
  return { ...data, signature: sig };
}
