import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LICENSE_HOME = process.env.LICENSE_SERVER_HOME ?? join(homedir(), '.hermes-license-server');

let dbInstance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'customer'
                CHECK(role IN ('customer','admin')),
  created_at    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active','disabled'))
);

CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  tier       TEXT NOT NULL DEFAULT 'web'
             CHECK(tier IN ('web','desktop','pro')),
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK(status IN ('pending','paid','delivered','refunded')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         TEXT NOT NULL,
  license_key      TEXT NOT NULL UNIQUE,
  tier             TEXT NOT NULL DEFAULT 'web',
  user_id          TEXT NOT NULL,
  bound_device     TEXT,
  bound_os         TEXT,
  activated_at     INTEGER,
  deactivated_at   INTEGER,
  last_verified_at INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses(order_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  api_key       TEXT NOT NULL UNIQUE,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS server_keys (
  id          TEXT PRIMARY KEY,
  public_hex  TEXT NOT NULL,
  private_hex TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
`;

export function getLicenseDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dir = LICENSE_HOME;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const p = join(dir, 'license-server.db');
  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  dbInstance = db;
  return dbInstance;
}

export function closeLicenseDb(): void {
  if (dbInstance) {
    try { dbInstance.close(); } catch { /* ignore */ }
    dbInstance = null;
  }
}
