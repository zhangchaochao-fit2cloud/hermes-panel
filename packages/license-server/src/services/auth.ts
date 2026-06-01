import crypto from 'node:crypto';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash, generateKeyPairSync } from 'node:crypto';
import { getLicenseDb } from '../db.js';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for license server sessions

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

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  display_name: string | null;
  role: string;
  created_at: number;
  status: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: number;
}

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, createdAt: row.created_at };
}

export function getUserByEmail(email: string): PublicUser | null {
  const db = getLicenseDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined;
  return row ? toPublic(row) : null;
}

export function getUserById(id: string): PublicUser | null {
  const db = getLicenseDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toPublic(row) : null;
}

export function registerUser(email: string, password: string, displayName?: string): PublicUser {
  const db = getLicenseDb();
  if (getUserByEmail(email)) throw Object.assign(new Error('Email already registered'), { status: 409 });
  const id = randomUUID();
  const { hash, salt } = hashPassword(password);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at, status)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, 'active')`,
  ).run(id, email, hash, salt, displayName ?? null, Date.now());
  return getUserById(id)!;
}

export function verifyCredentials(email: string, password: string): PublicUser | null {
  const db = getLicenseDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined;
  if (!row || row.status !== 'active') return null;
  if (!verifyPassword(password, row.password_hash, row.password_salt)) return null;
  return toPublic(row);
}

// Session tokens
export function createSession(userId: string): string {
  const db = getLicenseDb();
  const token = randomBytes(32).toString('hex');
  const hash = sha256(token);
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(hash, userId, now, now + SESSION_TTL_MS);
  return token;
}

export function resolveSession(token: string): PublicUser | null {
  if (!token) return null;
  const db = getLicenseDb();
  const hash = sha256(token);
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(hash) as { user_id: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
    return null;
  }
  return getUserById(row.user_id);
}

export function revokeSession(token: string): void {
  if (!token) return;
  const db = getLicenseDb();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

// Admin API key verification
export function verifyApiKey(apiKey: string): boolean {
  if (!apiKey) return false;
  const db = getLicenseDb();
  const row = db.prepare('SELECT id FROM admin_users WHERE api_key = ?').get(apiKey) as { id: string } | undefined;
  return Boolean(row);
}

// ── Ed25519 key pairs ──────────────────────────────────────────
//
// sk₁ / pk₁: License signing key pair
//   sk₁ held by license server, used to sign license files.
//   pk₁ embedded in Hermes Panel (Rust + JS) to verify license authenticity.
//
// sk₂ / pk₂: Server response signing key pair
//   sk₂ held by license server, used to sign activation/verify responses.
//   pk₂ embedded in Hermes Panel (Rust + JS) to verify server response authenticity.

interface KeyPair {
  publicKey: Buffer;  // raw 32 bytes
  privateKey: Buffer; // raw 32 bytes (seed)
}

function rawEd25519FromJWK(pubB64url: string, privB64url: string): KeyPair {
  return {
    publicKey: Buffer.from(pubB64url, 'base64url'),
    privateKey: Buffer.from(privB64url, 'base64url'),
  };
}

function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ format: 'jwk' }) as { x: string };
  const priv = privateKey.export({ format: 'jwk' }) as { d: string };
  return rawEd25519FromJWK(pub.x, priv.d);
}

function getOrCreateKeyPair(dbKey: string): KeyPair {
  const db = getLicenseDb();
  const row = db.prepare("SELECT public_hex, private_hex FROM server_keys WHERE id = ?").get(dbKey) as { public_hex: string; private_hex: string } | undefined;
  if (row) {
    return {
      publicKey: Buffer.from(row.public_hex, 'hex'),
      privateKey: Buffer.from(row.private_hex, 'hex'),
    };
  }
  const kp = generateEd25519KeyPair();
  db.prepare("INSERT INTO server_keys (id, public_hex, private_hex, created_at) VALUES (?, ?, ?, ?)")
    .run(dbKey, kp.publicKey.toString('hex'), kp.privateKey.toString('hex'), Date.now());
  return kp;
}

/** sk₂/pk₂ — used to sign/verify activation server responses. */
export function getServerKeyPair(): KeyPair {
  return getOrCreateKeyPair('ed25519-server');
}

/** sk₁/pk₁ — used to sign/verify license files. */
export function getLicenseSigningKey(): KeyPair {
  return getOrCreateKeyPair('ed25519-license');
}

/** Sign a payload with Ed25519 (returns raw 64-byte signature). */
export function ed25519Sign(message: Buffer, privateKey: Buffer): Buffer {
  const wrapped = wrapEd25519PrivateKey(privateKey);
  const priv = crypto.createPrivateKey({ key: wrapped, format: 'der', type: 'pkcs8' });
  return crypto.sign(null, message, priv);
}

/** Verify an Ed25519 signature (raw 64 bytes) against a message and public key (raw 32 bytes). */
export function ed25519Verify(message: Buffer, signature: Buffer, publicKey: Buffer): boolean {
  const wrapped = wrapEd25519PublicKey(publicKey);
  const pub = crypto.createPublicKey({ key: wrapped, format: 'der', type: 'spki' });
  return crypto.verify(null, message, pub, signature);
}

// Minimal ASN.1 DER wrappers for Ed25519 raw keys.
// PKCS#8: 30 2e 02 01 00 30 05 06 03 2b 65 70 04 22 04 20 [32 bytes]
// SPKI:   30 2a 30 05 06 03 2b 65 70 03 21 00 [32 bytes]
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function wrapEd25519PrivateKey(raw: Buffer): Buffer {
  return Buffer.concat([ED25519_PKCS8_PREFIX, raw]);
}

function wrapEd25519PublicKey(raw: Buffer): Buffer {
  return Buffer.concat([ED25519_SPKI_PREFIX, raw]);
}

/** Sign a JSON payload with the server signing key (sk₂). */
export function signResponse(payload: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(payload, Object.keys(payload).sort());
    const keyPair = getServerKeyPair();
    const sig = ed25519Sign(Buffer.from(json), keyPair.privateKey);
    return sig.toString('base64url');
  } catch {
    return '';
  }
}
