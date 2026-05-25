import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SessionSummary } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';

export type ViewMode = 'table' | 'grid';
export type SourceFilter = 'all' | 'cli' | 'desktop' | 'web';

const VIEW_KEY = 'panel.sessions.view';
const SOURCE_KEY = 'panel.sessions.source';

function readView(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  return v === 'grid' ? 'grid' : 'table';
}

function readSource(): SourceFilter {
  const s = localStorage.getItem(SOURCE_KEY);
  if (s === 'cli' || s === 'desktop' || s === 'web') return s;
  return 'all';
}

export const useSessionsStore = defineStore('sessions', () => {
  const items = ref<SessionSummary[]>([]);
  const loading = ref(false);
  const refreshing = ref(false); // filter/search refresh (non-blocking)
  const error = ref<string | null>(null);
  const initialized = ref(false);

  const search = ref('');
  const source = ref<SourceFilter>(readSource());
  const view = ref<ViewMode>(readView());

  const total = computed(() => items.value.length);

  function setView(v: ViewMode): void {
    view.value = v;
    localStorage.setItem(VIEW_KEY, v);
  }

  function setSource(s: SourceFilter): void {
    source.value = s;
    localStorage.setItem(SOURCE_KEY, s);
  }

  function buildQuery(): string {
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (search.value.trim()) params.set('search', search.value.trim());
    if (source.value !== 'all') params.set('source', source.value);
    return params.toString();
  }

  async function load(opts: { initial?: boolean } = {}): Promise<void> {
    error.value = null;
    if (opts.initial) {
      loading.value = true;
    } else {
      refreshing.value = true;
    }
    try {
      const data = await bffFetch<SessionSummary[]>(`/api/sessions?${buildQuery()}`);
      items.value = data;
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to load sessions';
    } finally {
      loading.value = false;
      refreshing.value = false;
      initialized.value = true;
    }
  }

  /** Optimistic remove — returns a restore function and the index. */
  function removeLocal(id: string): { restore: () => void; snapshot: SessionSummary | null } {
    const idx = items.value.findIndex(s => s.id === id);
    if (idx < 0) return { restore: () => {}, snapshot: null };
    const [snapshot] = items.value.splice(idx, 1);
    return {
      snapshot,
      restore: () => {
        // re-insert at original index if still possible, otherwise push
        const exists = items.value.some(s => s.id === snapshot.id);
        if (exists) return;
        if (idx <= items.value.length) {
          items.value.splice(idx, 0, snapshot);
        } else {
          items.value.push(snapshot);
        }
      },
    };
  }

  async function deleteRemote(id: string): Promise<void> {
    await bffFetch<{ deleted: boolean }>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async function rename(id: string, title: string): Promise<void> {
    await bffFetch<{ ok: boolean }>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    const item = items.value.find(s => s.id === id);
    if (item) item.title = title;
  }

  return {
    // state
    items, loading, refreshing, error, initialized,
    search, source, view,
    // computed
    total,
    // actions
    load, setView, setSource,
    removeLocal, deleteRemote, rename,
  };
});
