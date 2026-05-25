import { HEADERS } from '@hermes-panel/shared';
import { getBffBase, getPanelToken } from './token.js';

interface BffError { code: string; message: string }

export class BffApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'BffApiError';
  }
}

export async function bffFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(HEADERS.PANEL_TOKEN, getPanelToken());
  const res = await fetch(`${getBffBase()}${path}`, { ...init, headers });
  if (!res.ok) {
    let err: BffError = { code: 'HTTP_ERROR', message: res.statusText };
    try { err = (await res.json()).error ?? err; } catch { /* ignore */ }
    throw new BffApiError(err.code, err.message, res.status);
  }
  return (await res.json()) as T;
}
