import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Customizable hotkey actions exposed to the user.
 *
 * Note: not every action is wired to a global window-level listener — `send`
 * and `newline` are scoped to the chat composer textarea. Each consumer
 * decides where it installs the listener; the store is just the source of
 * truth for chord strings.
 */
export type HotkeyId = 'newChat' | 'search' | 'refresh' | 'send' | 'newline' | 'toggleSidebar' | 'sendAlt';

/**
 * Canonical chord format used everywhere in the app:
 *
 *   - lowercase
 *   - parts joined by `+`
 *   - modifiers always precede the main key
 *   - modifier order is fixed: `mod`, `ctrl`, `alt`, `shift`
 *     (`mod` collapses macOS ⌘ and other-OS Ctrl into a single binding)
 *   - main key is `event.key` lowercased, except:
 *       * ` ` (space)  → `space`
 *       * `+`          → `plus`  (so the separator stays unambiguous)
 *
 * Examples: `mod+n`, `mod+shift+p`, `enter`, `shift+enter`, `f5`.
 */
export type Chord = string;

export const DEFAULT_BINDINGS: Record<HotkeyId, Chord> = {
  newChat: 'mod+n',
  search: 'mod+k',
  refresh: 'mod+r',
  send: 'enter',
  newline: 'shift+enter',
  toggleSidebar: 'mod+/',
  sendAlt: 'mod+enter',
};

/** Order in which actions are rendered in the settings table. */
export const HOTKEY_IDS: readonly HotkeyId[] = [
  'newChat',
  'search',
  'refresh',
  'send',
  'newline',
  'toggleSidebar',
  'sendAlt',
] as const;

const STORAGE_KEY = 'panel.hotkeys';

/** Fixed modifier order so the canonical form is unambiguous. */
const MODIFIER_ORDER = ['mod', 'ctrl', 'alt', 'shift'] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * Build a canonical chord from a KeyboardEvent. Returns `null` when the event
 * carries no main key yet (e.g. the user only pressed Shift) — callers should
 * treat that as "still recording".
 */
export function chordFromEvent(e: KeyboardEvent): Chord | null {
  const key = e.key;
  // Ignore pure modifier presses — wait for the next keystroke.
  if (key === 'Meta' || key === 'Control' || key === 'Alt' || key === 'Shift') {
    return null;
  }
  // Browsers report Dead/Unidentified during IME composition; skip.
  if (key === 'Dead' || key === 'Unidentified' || key === '') return null;

  const mods: Modifier[] = [];
  // Collapse ⌘ (mac) and Ctrl (others) into a single `mod` modifier so a
  // single binding works on every platform.
  if (isMac() ? e.metaKey : e.ctrlKey) mods.push('mod');
  // If the *other* control key is held (Ctrl on mac, ⌘ on PC), record it
  // explicitly so chords like `ctrl+space` on mac stay distinguishable.
  if (isMac() && e.ctrlKey) mods.push('ctrl');
  if (!isMac() && e.metaKey) mods.push('ctrl');
  if (e.altKey) mods.push('alt');
  if (e.shiftKey) mods.push('shift');

  // Dedupe + sort by the fixed MODIFIER_ORDER.
  const orderedMods = MODIFIER_ORDER.filter((m) => mods.includes(m));

  let mainKey = key.toLowerCase();
  if (mainKey === ' ') mainKey = 'space';
  if (mainKey === '+') mainKey = 'plus';

  return [...orderedMods, mainKey].join('+');
}

/**
 * Normalize a chord string the user (or a stored value) provided. Lowercases
 * and reorders the modifiers so external strings round-trip through the same
 * canonical form `chordFromEvent` produces.
 */
export function normalizeChord(input: Chord): Chord {
  const parts = input.toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const mods: Modifier[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if ((MODIFIER_ORDER as readonly string[]).includes(p)) {
      mods.push(p as Modifier);
    } else {
      rest.push(p);
    }
  }
  const orderedMods = MODIFIER_ORDER.filter((m) => mods.includes(m));
  // If there's no main key, the chord is invalid — caller already validated.
  const main = rest[rest.length - 1] ?? '';
  return [...orderedMods, main].filter(Boolean).join('+');
}

/** A chord must have a main key — modifier-only chords are not usable. */
export function isValidChord(chord: Chord): boolean {
  if (!chord) return false;
  const parts = chord.split('+');
  const last = parts[parts.length - 1];
  if (!last) return false;
  return !(MODIFIER_ORDER as readonly string[]).includes(last);
}

function loadFromStorage(): Partial<Record<HotkeyId, Chord>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<HotkeyId, Chord>> = {};
    for (const id of HOTKEY_IDS) {
      const v = parsed[id];
      if (typeof v === 'string' && isValidChord(normalizeChord(v))) {
        out[id] = normalizeChord(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveToStorage(bindings: Record<HotkeyId, Chord>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Quota / private-mode — silently ignore; runtime still uses in-memory state.
  }
}

export const useHotkeysStore = defineStore('hotkeys', () => {
  const stored = loadFromStorage();
  const bindings = ref<Record<HotkeyId, Chord>>({
    ...DEFAULT_BINDINGS,
    ...stored,
  });

  /**
   * Returns true if the given KeyboardEvent matches the bound chord for `id`.
   * Use this in keydown handlers instead of hand-rolled modifier checks.
   */
  function matches(e: KeyboardEvent, id: HotkeyId): boolean {
    const chord = chordFromEvent(e);
    if (!chord) return false;
    return chord === bindings.value[id];
  }

  function setBinding(id: HotkeyId, chord: Chord): void {
    const normalized = normalizeChord(chord);
    if (!isValidChord(normalized)) return;
    bindings.value = { ...bindings.value, [id]: normalized };
    saveToStorage(bindings.value);
  }

  function reset(id: HotkeyId): void {
    bindings.value = { ...bindings.value, [id]: DEFAULT_BINDINGS[id] };
    saveToStorage(bindings.value);
  }

  function resetAll(): void {
    bindings.value = { ...DEFAULT_BINDINGS };
    saveToStorage(bindings.value);
  }

  /**
   * Returns the set of action IDs that share the same chord as `id`, if any.
   * The settings UI uses this to flag conflicts (e.g. user binds two actions
   * to `mod+n`). Note: `send` and `newline` live in a different scope than
   * the global actions, so a clash between them and a global hotkey is still
   * surfaced — better to over-warn than to silently break the composer.
   */
  function conflictsFor(id: HotkeyId): HotkeyId[] {
    const chord = bindings.value[id];
    if (!chord) return [];
    return HOTKEY_IDS.filter((other) => other !== id && bindings.value[other] === chord);
  }

  return {
    bindings,
    matches,
    setBinding,
    reset,
    resetAll,
    conflictsFor,
  };
});

/**
 * Convert a canonical chord (e.g. `mod+shift+p`) to a list of platform-aware
 * display tokens (e.g. `['⌘', '⇧', 'P']`). Used by the read-only key cap
 * pills in the hotkeys settings table.
 */
export function chordToDisplayTokens(chord: Chord): string[] {
  if (!chord) return [];
  const mac = isMac();
  const parts = chord.split('+');
  const out: string[] = [];
  for (const p of parts) {
    switch (p) {
      case 'mod':
        out.push(mac ? '⌘' : 'Ctrl'); // ⌘ on mac, "Ctrl" elsewhere
        break;
      case 'ctrl':
        out.push(mac ? '⌃' : 'Ctrl'); // ⌃ on mac if explicitly Ctrl
        break;
      case 'alt':
        out.push(mac ? '⌥' : 'Alt'); // ⌥ on mac
        break;
      case 'shift':
        out.push(mac ? '⇧' : 'Shift'); // ⇧ on mac
        break;
      case 'enter':
        out.push(mac ? '⏎' : 'Enter'); // ⏎ on mac
        break;
      case 'space':
        out.push('Space');
        break;
      case 'plus':
        out.push('+');
        break;
      default:
        out.push(p.length === 1 ? p.toUpperCase() : p.replace(/^./, (c) => c.toUpperCase()));
    }
  }
  return out;
}
