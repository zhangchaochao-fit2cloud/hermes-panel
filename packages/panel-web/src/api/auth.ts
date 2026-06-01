import type { AuthContext, AuthResult, LicenseInfo, MeResponse } from '@hermes-panel/shared';
import { bffFetch } from './bff.js';

export function fetchAuthContext(): Promise<AuthContext> {
  return bffFetch<AuthContext>('/api/auth/context', { silent: true });
}

/** First-launch: set admin password. */
export function setupAccount(password: string): Promise<AuthResult> {
  return bffFetch<AuthResult>('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

/** Login with password (email optional for backward compat). */
export function loginAccount(body: { password: string; email?: string }): Promise<AuthResult> {
  return bffFetch<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchMe(): Promise<MeResponse> {
  return bffFetch<MeResponse>('/api/auth/me', { silent: true });
}

export function logoutAccount(): Promise<void> {
  return bffFetch<void>('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
}

// License management (authenticated user)

/** Activate a license for the current user. */
export function activateUserLicense(key: string): Promise<{ license: LicenseInfo }> {
  return bffFetch<{ license: LicenseInfo }>('/api/auth/license/activate', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

export function getLicenseStatus(): Promise<{ license: LicenseInfo | null; features: string[] }> {
  return bffFetch<{ license: LicenseInfo | null; features: string[] }>('/api/auth/license/status');
}

export function deactivateUserLicense(key: string): Promise<void> {
  return bffFetch<void>('/api/auth/license/deactivate', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

// Admin — license CRUD

export function createLicense(body: { tier?: string; expiresAt?: number }): Promise<{ license: LicenseInfo }> {
  return bffFetch<{ license: LicenseInfo }>('/api/auth/licenses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listLicenses(): Promise<{ licenses: LicenseInfo[] }> {
  return bffFetch<{ licenses: LicenseInfo[] }>('/api/auth/licenses');
}

export function revokeLicense(key: string): Promise<void> {
  return bffFetch<void>(`/api/auth/licenses/${encodeURIComponent(key)}/revoke`, { method: 'POST' });
}
