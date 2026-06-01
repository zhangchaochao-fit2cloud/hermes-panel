export type UserRole = 'admin' | 'member';
export type UserStatus = 'active' | 'disabled';
export type LicenseTier = 'web' | 'desktop' | 'pro';

/** Premium features gated behind license activation. */
export const PREMIUM_FEATURES = [
  'workspaces',
  'cron',
  'memory',
  'files',
  'tools',
  'developer',
  'providers',
  'backup',
  'sandbox',
  'gateway',
  'webhook',
  'doctor',
  'logs',
  'secrets',
  'channels',
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
}

/** Returned by login/setup — the session token is plaintext, shown once. */
export interface AuthResult {
  token: string;
  user: PublicUser;
}

/** GET /api/auth/me when authenticated. */
export interface MeResponse {
  user: PublicUser;
  license: LicenseInfo | null;
  features: string[];
}

/** GET /api/auth/context — public, drives the login page UI. */
export interface AuthContext {
  /** No users exist yet → first launch shows "set password" instead of "login". */
  needsBootstrap: boolean;
}

export interface LicenseInfo {
  key: string;
  tier: LicenseTier;
  boundUserId: string | null;
  boundDevice: string | null;
  boundOs: string | null;
  activatedAt: number | null;
  expiresAt: number | null;
  features: string[];
  revoked: boolean;
  createdAt: number;
}
