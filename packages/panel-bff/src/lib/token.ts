import { randomBytes } from 'node:crypto';

let cached: string | null = null;

export function getSessionToken(): string {
  if (cached) return cached;
  cached = process.env.PANEL_TOKEN ?? randomBytes(32).toString('hex');
  return cached;
}

export function regenerateToken(): string {
  cached = randomBytes(32).toString('hex');
  return cached;
}
