import { HEADERS, PORTS } from '@hermes-panel/shared';
import { getHermesApiKey } from './hermes-api-key.js';

export interface DiscoveredModel {
  id: string;
  label?: string;
  provider?: string;
  source: 'hermes-api';
}

export interface ModelDiscoveryResult {
  checkedAt: number;
  source: string;
  models: DiscoveredModel[];
  error?: string;
}

function defaultHermesBase(): string {
  return process.env.HERMES_API_BASE ?? `http://127.0.0.1:${PORTS.HERMES_API}`;
}

function resolveHermesBase(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return defaultHermesBase();
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return raw.replace(/\/+$/, '');
    if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
      return raw.replace(/\/+$/, '');
    }
  } catch {
    return defaultHermesBase();
  }
  return defaultHermesBase();
}

function modelIdFromRow(row: unknown): string | null {
  if (typeof row === 'string') return row.trim() || null;
  if (!row || typeof row !== 'object') return null;
  const r = row as { id?: unknown; name?: unknown; model?: unknown };
  const value = r.id ?? r.name ?? r.model;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeModelRows(raw: unknown): DiscoveredModel[] {
  const data = raw && typeof raw === 'object' && 'data' in raw
    ? (raw as { data?: unknown }).data
    : raw && typeof raw === 'object' && 'models' in raw
      ? (raw as { models?: unknown }).models
      : raw;
  const rows = Array.isArray(data) ? data : [];
  const seen = new Set<string>();
  const models: DiscoveredModel[] = [];
  for (const row of rows) {
    const id = modelIdFromRow(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, label: id, source: 'hermes-api' });
  }
  return models;
}

export async function discoverHermesModels(
  endpointHeader: string | string[] | undefined,
): Promise<ModelDiscoveryResult> {
  const base = resolveHermesBase(endpointHeader);
  const headers: Record<string, string> = {};
  const key = await getHermesApiKey();
  if (key) headers.authorization = `Bearer ${key}`;

  try {
    const res = await fetch(`${base}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return {
        checkedAt: Date.now(),
        source: `${base}/v1/models`,
        models: [],
        error: `HTTP_${res.status}`,
      };
    }
    return {
      checkedAt: Date.now(),
      source: `${base}/v1/models`,
      models: normalizeModelRows(await res.json()),
    };
  } catch (err) {
    return {
      checkedAt: Date.now(),
      source: `${base}/v1/models`,
      models: [],
      error: err instanceof Error ? err.message : 'FETCH_FAILED',
    };
  }
}

export const HERMES_ENDPOINT_HEADER = HEADERS.HERMES_ENDPOINT.toLowerCase();
