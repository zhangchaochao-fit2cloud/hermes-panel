import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPanelDb, closePanelDb } from '../../src/services/panel-db.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'panel-db-test-'));
  process.env.PANEL_HOME = tmp;
  closePanelDb();
});

afterEach(() => {
  closePanelDb();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('panel-db', () => {
  it('opens and creates all expected tables', () => {
    const db = getPanelDb();
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = rows.map(r => r.name);
    for (const t of ['users', 'auth_sessions', 'licenses', 'license_snapshots']) {
      expect(names).toContain(t);
    }
  });

  it('is idempotent across close/reopen', () => {
    getPanelDb();
    closePanelDb();
    expect(() => getPanelDb()).not.toThrow();
  });

  it('round-trips a user row', () => {
    const db = getPanelDb();
    db.prepare(
      'INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)',
    ).run('u1', 'a@b.c', 'admin', Date.now());
    const row = db
      .prepare('SELECT id, email, role FROM users WHERE id = ?')
      .get('u1') as { id: string; email: string; role: string };
    expect(row.email).toBe('a@b.c');
    expect(row.role).toBe('admin');
  });

  it('enforces email uniqueness', () => {
    const db = getPanelDb();
    const insert = db.prepare(
      'INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)',
    );
    insert.run('u1', 'dup@x.c', 'member', Date.now());
    expect(() => insert.run('u2', 'dup@x.c', 'member', Date.now())).toThrow();
  });
});
