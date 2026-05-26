import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';

export type LogLevelFilter = 'all' | 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogLine {
  ts?: number;
  level?: LogLevel;
  component?: string;
  msg: string;
  raw: string;
}

export interface LogFilters {
  level: LogLevelFilter;
  tail: number;
  query: string;
}

interface LogsResponse {
  lines: LogLine[];
  error?: string;
}

const DEFAULT_TAIL = 200;
const AUTO_REFRESH_MS = 5_000;

export const useLogsStore = defineStore('logs', () => {
  const lines = ref<LogLine[]>([]);
  const filters = ref<LogFilters>({ level: 'all', tail: DEFAULT_TAIL, query: '' });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const autoRefresh = ref(false);
  const lastLoadedAt = ref<number | null>(null);

  let timer: ReturnType<typeof setInterval> | null = null;

  function buildQuery(): string {
    const params = new URLSearchParams();
    if (filters.value.level !== 'all') params.set('level', filters.value.level);
    params.set('tail', String(filters.value.tail || DEFAULT_TAIL));
    const q = filters.value.query.trim();
    if (q) params.set('query', q);
    return params.toString();
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<LogsResponse>(`/api/logs?${buildQuery()}`);
      lines.value = r.lines ?? [];
      if (r.error) error.value = r.error;
      lastLoadedAt.value = Date.now();
    } catch (err) {
      error.value = (err as Error).message;
      lines.value = [];
    } finally {
      loading.value = false;
    }
  }

  function setFilter<K extends keyof LogFilters>(key: K, value: LogFilters[K]): void {
    filters.value[key] = value;
  }

  function clearAutoRefreshTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startAutoRefreshTimer(): void {
    clearAutoRefreshTimer();
    timer = setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);
  }

  function toggleAutoRefresh(): void {
    autoRefresh.value = !autoRefresh.value;
    if (autoRefresh.value) {
      startAutoRefreshTimer();
      void load();
    } else {
      clearAutoRefreshTimer();
    }
  }

  function stopAutoRefresh(): void {
    autoRefresh.value = false;
    clearAutoRefreshTimer();
  }

  return {
    lines,
    filters,
    loading,
    error,
    autoRefresh,
    lastLoadedAt,
    load,
    setFilter,
    toggleAutoRefresh,
    stopAutoRefresh,
  };
});
