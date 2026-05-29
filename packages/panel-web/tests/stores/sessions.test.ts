import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

/**
 * Module mocks must be hoisted before the SUT imports the mocked modules,
 * so we declare them at the top of the file. `vi.mock` calls are hoisted by
 * Vitest above any `import` statement.
 */
vi.mock('@/api/bff', () => ({
  bffFetch: vi.fn(),
  // BffApiError isn't used here, but the export shape must match.
  BffApiError: class extends Error {},
}));
vi.mock('@/api/token', () => ({
  getBffBase: () => 'http://test.local:5667',
  getPanelToken: () => 'devtoken123',
  getBffBaseAsync: async () => 'http://test.local:5667',
  getPanelTokenAsync: async () => 'devtoken123',
}));

// Imported *after* the mocks so the store picks up the mocked bffFetch.
import { bffFetch } from '@/api/bff';
import { useSessionsStore } from '@/stores/sessions';

const mockedBffFetch = bffFetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  mockedBffFetch.mockReset();
});

describe('sessions.readSource migration', () => {
  it('migrates legacy "desktop" -> "all"', () => {
    localStorage.setItem('panel.sessions.source', 'desktop');
    const store = useSessionsStore();
    expect(store.source).toBe('all');
  });

  it('migrates legacy "web" -> "all"', () => {
    localStorage.setItem('panel.sessions.source', 'web');
    const store = useSessionsStore();
    expect(store.source).toBe('all');
  });

  it('keeps a valid stored source like "cron" / "cli" / "api_server"', () => {
    for (const s of ['cli', 'cron', 'api_server'] as const) {
      localStorage.setItem('panel.sessions.source', s);
      setActivePinia(createPinia());
      const store = useSessionsStore();
      expect(store.source).toBe(s);
    }
  });
});

describe('sessions.groupBy default + persistence', () => {
  it('defaults to "source"', () => {
    const store = useSessionsStore();
    expect(store.groupBy).toBe('source');
  });

  it('honors stored "none"', () => {
    localStorage.setItem('panel.sessions.groupBy', 'none');
    const store = useSessionsStore();
    expect(store.groupBy).toBe('none');
  });

  it('falls back to "source" for unknown stored values', () => {
    localStorage.setItem('panel.sessions.groupBy', 'random-string');
    const store = useSessionsStore();
    expect(store.groupBy).toBe('source');
  });

  it('setGroupBy persists', () => {
    const store = useSessionsStore();
    store.setGroupBy('none');
    expect(localStorage.getItem('panel.sessions.groupBy')).toBe('none');
    store.setGroupBy('source');
    expect(localStorage.getItem('panel.sessions.groupBy')).toBe('source');
  });
});

describe('sessions.setSource + setView persist', () => {
  it('setView writes to panel.sessions.view', () => {
    const store = useSessionsStore();
    store.setView('grid');
    expect(localStorage.getItem('panel.sessions.view')).toBe('grid');
    expect(store.view).toBe('grid');
  });

  it('setSource writes to panel.sessions.source', () => {
    const store = useSessionsStore();
    store.setSource('cron');
    expect(localStorage.getItem('panel.sessions.source')).toBe('cron');
    expect(store.source).toBe('cron');
  });
});

describe('sessions.load', () => {
  it('populates items from the BFF and toggles loading flags', async () => {
    mockedBffFetch.mockResolvedValueOnce([
      { id: 's1', title: 'one' },
      { id: 's2', title: 'two' },
    ]);
    const store = useSessionsStore();
    const p = store.load({ initial: true });
    expect(store.loading).toBe(true);
    await p;
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(true);
    expect(store.items).toHaveLength(2);
    expect(store.items[0].id).toBe('s1');
    expect(store.error).toBeNull();
  });

  it('captures error and clears loading on failure', async () => {
    mockedBffFetch.mockRejectedValueOnce(new Error('boom'));
    const store = useSessionsStore();
    await store.load({ initial: true });
    expect(store.error).toBe('boom');
    expect(store.loading).toBe(false);
  });

  it('non-initial load sets refreshing flag instead of loading', async () => {
    mockedBffFetch.mockResolvedValueOnce([]);
    const store = useSessionsStore();
    const p = store.load();
    expect(store.refreshing).toBe(true);
    expect(store.loading).toBe(false);
    await p;
    expect(store.refreshing).toBe(false);
  });
});
