import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * A user-configurable Hermes API endpoint. The panel can run pointed at the
 * default local gateway (http://127.0.0.1:8642) or at a remote instance —
 * useful when sharing the panel with a self-hosted gateway over the LAN.
 *
 * v1 deliberately does NOT store an API key per endpoint. The BFF still holds
 * the single key from keytar. Remote auth is a follow-up: see task #117 notes
 * and the security note in routes/hermes-proxy.ts.
 */
export interface HermesEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  /** Built-in entries cannot be removed by the user. */
  builtin: boolean;
}

const STORAGE_ENDPOINTS = 'panel.hermesEndpoints';
const STORAGE_ACTIVE = 'panel.hermesEndpointActive';

export const DEFAULT_LOCAL_ENDPOINT: HermesEndpoint = {
  id: 'local',
  name: 'Local',
  baseUrl: 'http://127.0.0.1:8642',
  builtin: true,
};

const DEFAULT_LIST: HermesEndpoint[] = [DEFAULT_LOCAL_ENDPOINT];

function isHermesEndpoint(v: unknown): v is HermesEndpoint {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && typeof o.baseUrl === 'string'
    && typeof o.builtin === 'boolean';
}

function readEndpoints(): HermesEndpoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_ENDPOINTS);
    if (!raw) return [...DEFAULT_LIST];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_LIST];
    const list = parsed.filter(isHermesEndpoint);
    // Always guarantee the built-in 'local' entry is present so the user can
    // recover even if they hand-edited localStorage.
    if (!list.some(e => e.id === 'local')) list.unshift(DEFAULT_LOCAL_ENDPOINT);
    return list;
  } catch {
    return [...DEFAULT_LIST];
  }
}

function readActiveId(): string {
  return localStorage.getItem(STORAGE_ACTIVE) ?? 'local';
}

function persistEndpoints(list: HermesEndpoint[]): void {
  localStorage.setItem(STORAGE_ENDPOINTS, JSON.stringify(list));
}

function persistActive(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE, id);
}

/** Validate http/https URL with a host. Reject everything else (file:, javascript:, etc.). */
export function isValidEndpointUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value: string): string {
  // Strip trailing slash so we never produce `http://host//v1/runs`.
  return value.replace(/\/+$/, '');
}

export const useHermesEndpointStore = defineStore('hermesEndpoint', () => {
  const endpoints = ref<HermesEndpoint[]>(readEndpoints());
  const activeId = ref<string>(readActiveId());

  const active = computed<HermesEndpoint>(() => {
    return endpoints.value.find(e => e.id === activeId.value)
      ?? endpoints.value[0]
      ?? DEFAULT_LOCAL_ENDPOINT;
  });

  /** Add a user endpoint. Returns the created entry, or null on validation failure. */
  function addEndpoint(input: { name: string; baseUrl: string }): HermesEndpoint | null {
    const name = input.name.trim();
    const baseUrl = normalizeBaseUrl(input.baseUrl.trim());
    if (!name) return null;
    if (!isValidEndpointUrl(baseUrl)) return null;
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: HermesEndpoint = { id, name, baseUrl, builtin: false };
    endpoints.value = [...endpoints.value, entry];
    persistEndpoints(endpoints.value);
    return entry;
  }

  /** Remove a user endpoint. No-op for built-ins. */
  function removeEndpoint(id: string): void {
    const target = endpoints.value.find(e => e.id === id);
    if (!target || target.builtin) return;
    endpoints.value = endpoints.value.filter(e => e.id !== id);
    persistEndpoints(endpoints.value);
    // If we removed the active one, fall back to local.
    if (activeId.value === id) setActiveEndpoint('local');
  }

  function setActiveEndpoint(id: string): void {
    if (!endpoints.value.some(e => e.id === id)) return;
    activeId.value = id;
    persistActive(id);
  }

  return {
    endpoints,
    activeId,
    active,
    addEndpoint,
    removeEndpoint,
    setActiveEndpoint,
  };
});
