import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  DEFAULT_BINDINGS,
  HOTKEY_IDS,
  chordFromEvent,
  normalizeChord,
  useHotkeysStore,
} from '@/stores/hotkeys';

/**
 * Hotkeys store tests. We pin `navigator.userAgent` to a non-Mac value so
 * `mod` consistently collapses to ctrl (the default `chordFromEvent` branch).
 * The Mac branch is exercised separately.
 */

function setUserAgent(ua: string): void {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    get: () => ua,
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
});

describe('DEFAULT_BINDINGS', () => {
  it('covers every action: send, newline, search, newChat, refresh', () => {
    expect(DEFAULT_BINDINGS.send).toBe('enter');
    expect(DEFAULT_BINDINGS.newline).toBe('shift+enter');
    expect(DEFAULT_BINDINGS.search).toBe('mod+shift+p');
    expect(DEFAULT_BINDINGS.newChat).toBe('mod+n');
    expect(DEFAULT_BINDINGS.refresh).toBe('mod+r');
    // HOTKEY_IDS is the source of truth for what the settings UI renders.
    for (const id of HOTKEY_IDS) {
      expect(DEFAULT_BINDINGS[id]).toBeTruthy();
    }
  });
});

describe('chordFromEvent', () => {
  it('normalizes mod+shift+P irrespective of which modifier was pressed first', () => {
    // Linux/PC: mod collapses to ctrlKey. Order of mods set doesn't matter.
    const ev = new KeyboardEvent('keydown', {
      key: 'P',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(chordFromEvent(ev)).toBe('mod+shift+p');
  });

  it('returns null for pure modifier presses (still recording)', () => {
    const ev = new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true });
    expect(chordFromEvent(ev)).toBeNull();
  });

  it('returns null during IME composition (Dead / Unidentified)', () => {
    expect(chordFromEvent(new KeyboardEvent('keydown', { key: 'Dead' }))).toBeNull();
    expect(chordFromEvent(new KeyboardEvent('keydown', { key: 'Unidentified' }))).toBeNull();
  });

  it('maps " " (space) to "space" and "+" to "plus"', () => {
    expect(chordFromEvent(new KeyboardEvent('keydown', { key: ' ' }))).toBe('space');
    expect(chordFromEvent(new KeyboardEvent('keydown', { key: '+' }))).toBe('plus');
  });

  it('uses ⌘ as `mod` on Mac', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    // On mac, metaKey is the mod, ctrlKey becomes an explicit `ctrl`
    const ev = new KeyboardEvent('keydown', { key: 'p', metaKey: true, shiftKey: true });
    expect(chordFromEvent(ev)).toBe('mod+shift+p');
  });
});

describe('normalizeChord (canonical form)', () => {
  it('lowercases', () => {
    expect(normalizeChord('Ctrl+SHIFT+A')).toBe('ctrl+shift+a');
  });

  it('reorders modifiers to mod/ctrl/alt/shift', () => {
    expect(normalizeChord('shift+alt+ctrl+mod+x')).toBe('mod+ctrl+alt+shift+x');
  });

  it('keeps the last segment as the main key when modifiers come after it', () => {
    expect(normalizeChord('a+shift')).toBe('shift+a');
  });

  it('handles already-canonical input idempotently', () => {
    expect(normalizeChord('mod+shift+p')).toBe('mod+shift+p');
  });
});

describe('useHotkeysStore.setBinding + reset', () => {
  it('persists round-tripped through localStorage in canonical form', () => {
    const store = useHotkeysStore();
    store.setBinding('newChat', 'Shift+Mod+M');
    expect(store.bindings.newChat).toBe('mod+shift+m');
    expect(JSON.parse(localStorage.getItem('panel.hotkeys')!).newChat).toBe('mod+shift+m');
  });

  it('reset restores the default for a single id', () => {
    const store = useHotkeysStore();
    store.setBinding('newChat', 'mod+m');
    store.reset('newChat');
    expect(store.bindings.newChat).toBe(DEFAULT_BINDINGS.newChat);
    expect(JSON.parse(localStorage.getItem('panel.hotkeys')!).newChat).toBe(DEFAULT_BINDINGS.newChat);
  });

  it('boot reads previously persisted bindings', () => {
    localStorage.setItem('panel.hotkeys', JSON.stringify({ newChat: 'mod+m' }));
    const store = useHotkeysStore();
    expect(store.bindings.newChat).toBe('mod+m');
    // unspecified ids fall through to defaults
    expect(store.bindings.search).toBe(DEFAULT_BINDINGS.search);
  });

  it('ignores stored invalid chords (modifier-only)', () => {
    localStorage.setItem('panel.hotkeys', JSON.stringify({ newChat: 'mod' }));
    const store = useHotkeysStore();
    expect(store.bindings.newChat).toBe(DEFAULT_BINDINGS.newChat);
  });
});

describe('useHotkeysStore.matches', () => {
  it('returns true when the event matches the default `send` chord', () => {
    const store = useHotkeysStore();
    const ev = new KeyboardEvent('keydown', { key: 'Enter' });
    expect(store.matches(ev, 'send')).toBe(true);
  });

  it('returns false when chord differs (Shift+Enter is newline, not send)', () => {
    const store = useHotkeysStore();
    const ev = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    expect(store.matches(ev, 'send')).toBe(false);
    expect(store.matches(ev, 'newline')).toBe(true);
  });
});

describe('useHotkeysStore.conflictsFor', () => {
  it('flags two actions bound to the same chord', () => {
    const store = useHotkeysStore();
    store.setBinding('newChat', 'mod+k');
    store.setBinding('refresh', 'mod+k');
    expect(store.conflictsFor('newChat')).toContain('refresh');
    expect(store.conflictsFor('refresh')).toContain('newChat');
  });
});

// Sanity: silence an unused-import lint if vi is dropped from the file.
vi.fn();
