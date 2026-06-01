import type { LicenseInfo } from '@hermes-panel/shared';
import { bffFetch } from './bff.js';

/** Activate a license key (uploaded file content). */
export function activateLicense(key: string): Promise<{ license: LicenseInfo }> {
  return bffFetch<{ license: LicenseInfo }>('/api/auth/license/activate', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

/** Get current license status for the authenticated user. */
export function getLicenseStatus(): Promise<{ license: LicenseInfo | null; features: string[] }> {
  return bffFetch<{ license: LicenseInfo | null; features: string[] }>('/api/auth/license/status');
}

/** Deactivate the current license. */
export function deactivateLicense(key: string): Promise<void> {
  return bffFetch<void>('/api/auth/license/deactivate', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}
