import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppearanceStore } from '@/stores/appearance';

/**
 * Tests for the appearance store — covers theme migration, persistence,
 * DOM application, and `auto` / OS-dark behavior. happy-dom gives us
 * `localStorage`, `document.documentElement` and a stub-able `matchMedia`.
 */

function setMatchMedia(prefersDark: boolean): void {
  // happy-dom does not implement matchMedia, so stub it on the window.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('dark') ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }),
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  setMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('appearance.readMode migration', () => {
  it('migrates legacy "minimal-glass" -> "glass-minimal" and rewrites storage', () => {
    localStorage.setItem('panel.themeMode', 'minimal-glass');
    const store = useAppearanceStore();
    expect(store.mode).toBe('glass-minimal');
    expect(localStorage.getItem('panel.themeMode')).toBe('glass-minimal');
  });

  it('returns DEFAULT_MODE ("auto") for unknown stored values', () => {
    localStorage.setItem('panel.themeMode', 'rainbow-unicorn');
    const store = useAppearanceStore();
    expect(store.mode).toBe('auto');
  });

  it('keeps valid stored theme as-is', () => {
    localStorage.setItem('panel.themeMode', 'glass-tokyo');
    const store = useAppearanceStore();
    expect(store.mode).toBe('glass-tokyo');
  });
});

describe('appearance.setMode', () => {
  it('persists to localStorage and sets data-theme on documentElement', () => {
    const store = useAppearanceStore();
    store.setMode('codex-dark');
    expect(localStorage.getItem('panel.themeMode')).toBe('codex-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('codex-dark');
  });

  it('removes data-theme attr when mode resolves to "light"', () => {
    const store = useAppearanceStore();
    store.setMode('codex-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('codex-dark');
    store.setMode('light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('applies data-theme="dark" when mode="auto" and OS prefers dark', () => {
    setMatchMedia(true);
    const store = useAppearanceStore();
    store.setMode('auto');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('appearance.isGlass', () => {
  it('returns true for every glass-* theme including glass-minimal', () => {
    const store = useAppearanceStore();
    for (const m of ['glass-apple', 'glass-vibrant', 'glass-tokyo', 'glass-minimal'] as const) {
      store.setMode(m);
      expect(store.isGlass).toBe(true);
    }
  });

  it('returns false for non-glass themes', () => {
    const store = useAppearanceStore();
    for (const m of ['light', 'dark', 'auto', 'codex-light', 'codex-dark', 'github-primer'] as const) {
      store.setMode(m);
      expect(store.isGlass).toBe(false);
    }
  });
});

describe('appearance.effectiveDark', () => {
  it('"auto" follows the OS preference', () => {
    setMatchMedia(true);
    const store = useAppearanceStore();
    store.setMode('auto');
    expect(store.effectiveDark).toBe(true);
  });

  it('"auto" is light when the OS prefers light', () => {
    setMatchMedia(false);
    const store = useAppearanceStore();
    store.setMode('auto');
    expect(store.effectiveDark).toBe(false);
  });

  it('"glass-tokyo" is dark regardless of OS preference', () => {
    setMatchMedia(false);
    const store = useAppearanceStore();
    store.setMode('glass-tokyo');
    expect(store.effectiveDark).toBe(true);
  });

  it('"codex-light" is light regardless of OS preference', () => {
    setMatchMedia(true);
    const store = useAppearanceStore();
    store.setMode('codex-light');
    expect(store.effectiveDark).toBe(false);
  });
});

describe('appearance.setRouteTabsEnabled', () => {
  it('toggles + persists the value', () => {
    const store = useAppearanceStore();
    // default is true
    expect(store.routeTabsEnabled).toBe(true);
    store.setRouteTabsEnabled(false);
    expect(store.routeTabsEnabled).toBe(false);
    expect(localStorage.getItem('panel.routeTabsEnabled')).toBe('false');
    store.setRouteTabsEnabled(true);
    expect(localStorage.getItem('panel.routeTabsEnabled')).toBe('true');
  });

  it('reads "false" from storage at boot', () => {
    localStorage.setItem('panel.routeTabsEnabled', 'false');
    const store = useAppearanceStore();
    expect(store.routeTabsEnabled).toBe(false);
  });
});
