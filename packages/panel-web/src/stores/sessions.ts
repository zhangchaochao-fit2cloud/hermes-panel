import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { HEADERS } from '@hermes-panel/shared';
import type { SessionSummary } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import { getBffBase, getPanelToken } from '@/api/token';

export type ViewMode = 'table' | 'grid';
/** Match real DB source values plus 'all'. Legacy 'desktop' / 'web' from older
 *  localStorage values are migrated to 'all' on read. */
export type SourceFilter = 'all' | 'cli' | 'cron' | 'api_server';
export type GroupBy = 'none' | 'source';

const VIEW_KEY = 'panel.sessions.view';
const SOURCE_KEY = 'panel.sessions.source';
const GROUP_KEY = 'panel.sessions.groupBy';

function readView(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  return v === 'grid' ? 'grid' : 'table';
}

function readSource(): SourceFilter {
  const s = localStorage.getItem(SOURCE_KEY);
  if (s === 'cli' || s === 'cron' || s === 'api_server') return s;
  // Migrate legacy 'desktop' / 'web' (never matched real DB rows) → 'all'.
  return 'all';
}

function readGroupBy(): GroupBy {
  const v = localStorage.getItem(GROUP_KEY);
  // Default to grouped — cron jobs produce many short sessions that drown out
  // CLI/API conversations in a flat list.
  return v === 'none' ? 'none' : 'source';
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
  const groupBy = ref<GroupBy>(readGroupBy());

  const total = computed(() => items.value.length);

  function setView(v: ViewMode): void {
    view.value = v;
    localStorage.setItem(VIEW_KEY, v);
  }

  function setSource(s: SourceFilter): void {
    source.value = s;
    localStorage.setItem(SOURCE_KEY, s);
  }

  function setGroupBy(g: GroupBy): void {
    groupBy.value = g;
    localStorage.setItem(GROUP_KEY, g);
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

  /**
   * Download a Blob to the user's disk via an anchor click. The blob URL is
   * revoked on the next tick so the click has time to start the download.
   */
  function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /**
   * The export endpoints return JSONL (text/plain) — not JSON — so bffFetch
   * would fail to parse the body. Use the underlying fetch directly with the
   * panel token header, and stream the response into a Blob.
   */
  async function fetchExport(path: string): Promise<Blob> {
    const url = `${getBffBase()}${path}`;
    const headers = new Headers();
    headers.set(HEADERS.PANEL_TOKEN, getPanelToken());
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = await res.json();
        if (j?.error?.message) msg = j.error.message;
      } catch { /* fall through with statusText */ }
      throw new Error(msg || `export failed (${res.status})`);
    }
    return await res.blob();
  }

  async function exportOne(id: string): Promise<void> {
    const blob = await fetchExport(`/api/sessions/${encodeURIComponent(id)}/export`);
    const safeId = id.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'session';
    triggerDownload(blob, `hermes-session-${safeId}.jsonl`);
  }

  async function exportAll(): Promise<void> {
    const params = new URLSearchParams();
    if (source.value !== 'all') params.set('source', source.value);
    const qs = params.toString();
    const blob = await fetchExport(`/api/sessions/export${qs ? `?${qs}` : ''}`);
    const name = source.value !== 'all'
      ? `hermes-sessions-${source.value}.jsonl`
      : 'hermes-sessions-all.jsonl';
    triggerDownload(blob, name);
  }

  return {
    // state
    items, loading, refreshing, error, initialized,
    search, source, view, groupBy,
    // computed
    total,
    // actions
    load, setView, setSource, setGroupBy,
    removeLocal, deleteRemote, rename,
    exportOne, exportAll,
  };
});
