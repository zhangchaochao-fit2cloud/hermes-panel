import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closePanelDb } from '../../src/services/panel-db.js';
import {
  hashPassword,
  verifyPassword,
  createUser,
  getUserByEmail,
  verifyCredentials,
  countUsers,
  isBootstrap,
  setupAdmin,
  resolveAdminUser,
  createSession,
  resolveSession,
  revokeSession,
  createLicense,
  isLicenseValid,
  getLicense,
  activateLicense,
  deactivateLicense,
  getLicenseForUser,
  getFeaturesForUser,
  tierToFeatures,
  revokeLicense,
} from '../../src/services/auth-store.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'auth-store-test-'));
  process.env.PANEL_HOME = tmp;
  closePanelDb();
});

afterEach(() => {
  closePanelDb();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', () => {
    const { hash, salt } = hashPassword('s3cret!');
    expect(verifyPassword('s3cret!', hash, salt)).toBe(true);
    expect(verifyPassword('wrong', hash, salt)).toBe(false);
  });

  it('produces a distinct salt per call', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('users', () => {
  it('counts, creates and looks up by email', () => {
    expect(countUsers()).toBe(0);
    const u = createUser({ email: 'Admin@X.com', password: 'pw', role: 'admin' });
    expect(countUsers()).toBe(1);
    expect(u.role).toBe('admin');
    expect(getUserByEmail('admin@x.com')?.id).toBe(u.id);
  });

  it('isBootstrap returns true when no users, false otherwise', () => {
    expect(isBootstrap()).toBe(true);
    createUser({ password: 'pw', role: 'admin' });
    expect(isBootstrap()).toBe(false);
  });

  it('setupAdmin creates admin only on fresh db', () => {
    expect(isBootstrap()).toBe(true);
    const u = setupAdmin('secret1');
    expect(u.role).toBe('admin');
    expect(isBootstrap()).toBe(false);
    expect(() => setupAdmin('secret2')).toThrow('Admin already exists');
  });

  it('verifyCredentials (password-only) resolves the admin user', () => {
    setupAdmin('secret1');
    expect(verifyCredentials({ password: 'wrong' })).toBeNull();
    const user = verifyCredentials({ password: 'secret1' });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('admin');
  });

  it('verifyCredentials with email resolves matching user', () => {
    createUser({ email: 'a@b.c', password: 'right' });
    expect(verifyCredentials({ email: 'a@b.c', password: 'right' })).not.toBeNull();
    expect(verifyCredentials({ email: 'a@b.c', password: 'wrong' })).toBeNull();
    expect(verifyCredentials({ email: 'nope@b.c', password: 'right' })).toBeNull();
  });

  it('resolveAdminUser returns first active admin', () => {
    expect(resolveAdminUser()).toBeNull();
    const u = setupAdmin('secret1');
    expect(resolveAdminUser()?.id).toBe(u.id);
  });
});

describe('sessions', () => {
  it('round-trips a token and revokes it', () => {
    const u = createUser({ email: 'a@b.c', password: 'pw' });
    const token = createSession(u.id, 'laptop');
    expect(resolveSession(token)?.id).toBe(u.id);
    revokeSession(token);
    expect(resolveSession(token)).toBeNull();
  });

  it('rejects an unknown token', () => {
    expect(resolveSession('deadbeef')).toBeNull();
  });

  it('supports multiple concurrent sessions per user (multi-device)', () => {
    const u = createUser({ email: 'a@b.c', password: 'pw' });
    const t1 = createSession(u.id, 'laptop');
    const t2 = createSession(u.id, 'phone');
    expect(resolveSession(t1)?.id).toBe(u.id);
    expect(resolveSession(t2)?.id).toBe(u.id);
    revokeSession(t1);
    expect(resolveSession(t1)).toBeNull();
    expect(resolveSession(t2)?.id).toBe(u.id);
  });
});

describe('licenses', () => {
  it('creates a tiered license with features', () => {
    const lic = createLicense({ tier: 'pro' });
    expect(lic.tier).toBe('pro');
    expect(lic.features.length).toBeGreaterThan(0);
    expect(isLicenseValid(lic.key)).toBe(true);
  });

  it('web tier has no premium features', () => {
    const lic = createLicense({ tier: 'web' });
    expect(lic.features).toEqual([]);
  });

  it('tierToFeatures maps correctly', () => {
    expect(tierToFeatures('web')).toEqual([]);
    expect(tierToFeatures('pro').length).toBeGreaterThan(0);
    expect(tierToFeatures('desktop').length).toBeGreaterThan(0);
  });

  it('activates license with device binding', () => {
    const lic = createLicense({ tier: 'pro' });
    const u = createUser({ password: 'pw' });
    const activated = activateLicense(lic.key, u.id, 'fp-abc', 'linux');
    expect(activated).not.toBeNull();
    expect(activated!.boundUserId).toBe(u.id);
    expect(activated!.boundDevice).toBe('fp-abc');
    expect(activated!.boundOs).toBe('linux');
    expect(activated!.activatedAt).toBeTruthy();
  });

  it('getLicenseForUser returns active license', () => {
    const lic = createLicense({ tier: 'pro' });
    const u = createUser({ password: 'pw' });
    activateLicense(lic.key, u.id, 'fp-abc', 'darwin');
    const found = getLicenseForUser(u.id);
    expect(found).not.toBeNull();
    expect(found!.tier).toBe('pro');
    expect(found!.features.length).toBeGreaterThan(0);
  });

  it('getFeaturesForUser returns features from active license', () => {
    const lic = createLicense({ tier: 'pro' });
    const u = createUser({ password: 'pw' });
    activateLicense(lic.key, u.id, 'fp-abc', 'linux');
    const features = getFeaturesForUser(u.id);
    expect(features.length).toBeGreaterThan(0);
    expect(features).toContain('workspaces');
  });

  it('deactivateLicense unbinds device', () => {
    const lic = createLicense({ tier: 'pro' });
    const u = createUser({ password: 'pw' });
    activateLicense(lic.key, u.id, 'fp-abc', 'linux');
    expect(deactivateLicense(lic.key, u.id)).toBe(true);
    const found = getLicenseForUser(u.id);
    expect(found).toBeNull();
  });

  it('revoked / expired licenses are invalid', () => {
    const lic = createLicense({ tier: 'web' });
    revokeLicense(lic.key);
    expect(isLicenseValid(lic.key)).toBe(false);
    const exp = createLicense({ tier: 'web', expiresAt: Date.now() - 1 });
    expect(isLicenseValid(exp.key)).toBe(false);
  });
});
