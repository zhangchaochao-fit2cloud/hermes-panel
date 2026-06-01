/** Signed payload embedded in a license key file. */
export interface LicensePayload {
  sub: string;
  orderId: string;
  tier: 'web' | 'desktop' | 'pro';
  iat: number;
  exp: number;
  features: string[];
}

/** Request body from Panel BFF to the activation server. */
export interface LicenseActivationRequest {
  license: string;
  fingerprint: string;
  os: string;
}

/** Response from the activation server (sk₂-signed). */
export interface LicenseActivationResponse {
  approved: boolean;
  status: 'active' | 'invalid' | 'expired' | 'revoked' | 'bound_to_other';
  tier: string;
  features: string[];
  expiresAt: number | null;
  serverTimestamp: number;
  signature: string;
}

/** Periodic verification response (sk₂-signed). */
export interface LicenseVerifyResponse {
  status: 'active' | 'invalid' | 'expired' | 'revoked' | 'bound_to_other';
  tier: string;
  features: string[];
  expiresAt: number | null;
  serverTimestamp: number;
  signature: string;
}

export interface LicenseDeactivateResponse {
  approved: boolean;
  serverTimestamp: number;
  signature: string;
}
