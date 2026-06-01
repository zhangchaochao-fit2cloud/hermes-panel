/**
 * License verification utilities.
 *
 * - Ed25519 verification for license files (pk₁) and server responses (pk₂)
 * - Device fingerprint collection (cross-platform, zero npm deps)
 * - TLS certificate pinning for activation server communication
 *
 * Keys are embedded as hex strings. In production these should be split across
 * multiple constants and/or moved to Rust (Tauri) for hardening.
 */

import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import os from 'node:os';
import https from 'node:https';
import type { LicensePayload } from '@hermes-panel/shared';

// ---------------------------------------------------------------------------
// Embedded public keys (hex-encoded Ed25519)
// ---------------------------------------------------------------------------

/** pk₁ — verifies license file signatures. */
const LICENSE_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY_PK1 ?? '';

/** pk₂ — verifies activation/verify response signatures from the license server. */
const SERVER_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY_PK2 ?? '';

/** SHA256 fingerprint of the activation server TLS certificate. */
const SERVER_TLS_FINGERPRINT = process.env.LICENSE_SERVER_TLS_FINGERPRINT ?? '';

// ---------------------------------------------------------------------------
// Ed25519 helpers
// ---------------------------------------------------------------------------

/** Parse a license key file into payload + signature. */
export function parseLicense(licenseKey: string): { payload: LicensePayload; signature: Buffer } | null {
  try {
    const parts = licenseKey.trim().split('.');
    if (parts.length !== 2) return null;
    const payloadJson = Buffer.from(parts[0], 'base64url').toString('utf8');
    const payload: LicensePayload = JSON.parse(payloadJson);
    const signature = Buffer.from(parts[1], 'base64url');
    if (signature.length !== 64) return null;
    return { payload, signature };
  } catch {
    return null;
  }
}

/** Verify an Ed25519 signature. Returns true if the public key is configured and the signature is valid. */
export function verifyEd25519(payload: Buffer, signature: Buffer, publicKeyHex: string): boolean {
  if (!publicKeyHex) return false;
  try {
    const publicKey = Buffer.from(publicKeyHex, 'hex');
    return crypto.verify(null, payload, publicKey, signature);
  } catch {
    return false;
  }
}

/** Verify a license file's Ed25519 signature against the embedded pk₁. */
export function verifyLicenseSignature(licenseKey: string): { payload: LicensePayload } | null {
  const parsed = parseLicense(licenseKey);
  if (!parsed) return null;
  const payloadBytes = Buffer.from(licenseKey.split('.')[0], 'base64url');
  // For bootstrap/dev, skip if pk₁ is not configured
  if (LICENSE_PUBLIC_KEY && !verifyEd25519(payloadBytes, parsed.signature, LICENSE_PUBLIC_KEY)) {
    return null;
  }
  return { payload: parsed.payload };
}

/** Verify a server response's Ed25519 signature against the embedded pk₂. */
export function verifyServerResponse(response: Record<string, unknown> & { signature?: string }): boolean {
  if (!SERVER_PUBLIC_KEY) return true; // skip if not configured (dev mode)
  const sig = response.signature;
  if (typeof sig !== 'string') return false;
  // Reconstruct the signed payload: everything except signature
  const { signature: _, ...payloadFields } = response;
  const payloadStr = JSON.stringify(payloadFields, Object.keys(payloadFields).sort());
  return verifyEd25519(Buffer.from(payloadStr), Buffer.from(sig, 'base64url'), SERVER_PUBLIC_KEY);
}

// ---------------------------------------------------------------------------
// Device fingerprint
// ---------------------------------------------------------------------------

/** Collect a cross-platform device fingerprint. Pure Node — zero npm deps. */
export function getDeviceFingerprint(): { fingerprint: string; os: string; arch: string; hostname: string } {
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();
  const mac = getPrimaryMac();
  const machineId = getMachineId();

  const parts = [platform, arch, hostname];
  if (machineId) parts.push(machineId);
  if (mac) parts.push(mac);

  const hash = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return { fingerprint: hash, os: platform, arch, hostname };
}

function getPrimaryMac(): string | null {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    // Skip virtual / loopback
    if (/^(lo|docker|veth|br-|vmnet|utun|tun|tailscale)/.test(name)) continue;
    const addrs = ifaces[name];
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
        return addr.mac;
      }
    }
  }
  return null;
}

function getMachineId(): string | null {
  try {
    switch (os.platform()) {
      case 'linux':
        return execSync('cat /etc/machine-id', { encoding: 'utf8', timeout: 2000 }).trim() || null;
      case 'darwin':
        return execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk -F\\\" '/IOPlatformUUID/{print $4}'", {
          encoding: 'utf8', timeout: 3000,
        }).trim() || null;
      case 'win32':
        return execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', {
          encoding: 'utf8', timeout: 3000,
        }).split('REG_SZ')[1]?.trim() || null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TLS certificate pinning
// ---------------------------------------------------------------------------

/** Create an HTTPS agent that pins the server certificate fingerprint. */
export function createPinnedAgent(): https.Agent {
  if (!SERVER_TLS_FINGERPRINT) {
    return new https.Agent({ keepAlive: true });
  }
  return new https.Agent({
    keepAlive: true,
    checkServerIdentity: (_host, cert) => {
      const fp = crypto.createHash('sha256').update(cert.raw).digest('base64');
      if (fp !== SERVER_TLS_FINGERPRINT) {
        const err = new Error('License server TLS fingerprint mismatch');
        (err as NodeJS.ErrnoException).code = 'ERR_CERT_PINNED';
        throw err;
      }
      return undefined;
    },
  });
}
