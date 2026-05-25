import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export interface DevHistoryEntry {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  /** ISO timestamp (Date.now() when the request was sent) */
  timestamp: number;
  /** HTTP status of the last response, undefined if it failed before the wire */
  status?: number;
  /** Round-trip ms */
  durationMs?: number;
}

export interface DevRequestDraft {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

const STORAGE_KEY = 'panel.devHistory';
const MAX_HISTORY = 50;

function loadHistory(): DevHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is DevHistoryEntry => {
      return !!e && typeof e === 'object'
        && typeof (e as DevHistoryEntry).id === 'string'
        && typeof (e as DevHistoryEntry).method === 'string'
        && typeof (e as DevHistoryEntry).url === 'string'
        && typeof (e as DevHistoryEntry).timestamp === 'number';
    });
  } catch {
    return [];
  }
}

function saveHistory(items: DevHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function emptyDraft(): DevRequestDraft {
  return {
    method: 'POST',
    url: '/api/hermes/v1/runs',
    headers: {},
    body: JSON.stringify(
      {
        model: 'claude-sonnet-4-5',
        input: 'Hello from the Developer Playground',
        stream: true,
      },
      null,
      2,
    ),
  };
}

export const useDeveloperStore = defineStore('developer', () => {
  const history = ref<DevHistoryEntry[]>(loadHistory());
  const current = ref<DevRequestDraft>(emptyDraft());
  /** The history entry currently selected in the CodeGen tab. */
  const selectedHistoryId = ref<string | null>(history.value[0]?.id ?? null);

  const recent10 = computed(() => history.value.slice(0, 10));
  const selectedHistory = computed<DevHistoryEntry | null>(() => {
    if (!selectedHistoryId.value) return null;
    return history.value.find(h => h.id === selectedHistoryId.value) ?? null;
  });

  function pushHistory(entry: Omit<DevHistoryEntry, 'id'>): DevHistoryEntry {
    const id = `${entry.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const full: DevHistoryEntry = { ...entry, id };
    history.value = [full, ...history.value].slice(0, MAX_HISTORY);
    if (!selectedHistoryId.value) selectedHistoryId.value = id;
    return full;
  }

  function clearHistory(): void {
    history.value = [];
    selectedHistoryId.value = null;
  }

  function loadFromHistory(entry: DevHistoryEntry): void {
    current.value = {
      method: entry.method,
      url: entry.url,
      headers: { ...entry.headers },
      body: entry.body ?? '',
    };
  }

  function resetDraft(): void {
    current.value = emptyDraft();
  }

  watch(history, items => saveHistory(items), { deep: true });

  return {
    history,
    recent10,
    current,
    selectedHistoryId,
    selectedHistory,
    pushHistory,
    clearHistory,
    loadFromHistory,
    resetDraft,
  };
});
