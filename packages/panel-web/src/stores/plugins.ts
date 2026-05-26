import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';

export interface PluginInfo {
  name: string;
  enabled: boolean;
  version?: string;
  description?: string;
  source?: string;
}

interface ListResponse {
  plugins: PluginInfo[];
  error?: string;
}

interface OpResult {
  ok: boolean;
  error?: string;
  message?: string;
}

async function callOp(path: string, init: RequestInit = {}): Promise<OpResult> {
  try {
    await bffFetch(path, init);
    return { ok: true };
  } catch (err) {
    if (err instanceof BffApiError) {
      return { ok: false, error: err.code, message: err.message };
    }
    return { ok: false, error: 'UNKNOWN', message: (err as Error).message };
  }
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<PluginInfo[]>([]);
  const loading = ref(false);
  const initialized = ref(false);
  const error = ref<string | null>(null);
  /** Per-plugin in-flight mutation tracking (enable/disable/update/remove). */
  const mutatingPlugins = ref<Set<string>>(new Set());
  /** True while an install is running (no specific name yet). */
  const installing = ref(false);

  const enabledCount = computed(() => plugins.value.filter(p => p.enabled).length);
  const totalCount = computed(() => plugins.value.length);
  const isEmpty = computed(() => initialized.value && plugins.value.length === 0);

  function isMutating(name: string): boolean {
    return mutatingPlugins.value.has(name);
  }

  function startMutation(name: string): void {
    mutatingPlugins.value = new Set(mutatingPlugins.value).add(name);
  }

  function endMutation(name: string): void {
    const next = new Set(mutatingPlugins.value);
    next.delete(name);
    mutatingPlugins.value = next;
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<ListResponse>('/api/plugins');
      plugins.value = r.plugins;
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function install(source: string): Promise<OpResult> {
    installing.value = true;
    try {
      const result = await callOp('/api/plugins', {
        method: 'POST',
        body: JSON.stringify({ source }),
      });
      if (result.ok) await load();
      return result;
    } finally {
      installing.value = false;
    }
  }

  async function update(name: string): Promise<OpResult> {
    startMutation(name);
    try {
      const result = await callOp(`/api/plugins/${encodeURIComponent(name)}/update`, {
        method: 'POST',
      });
      if (result.ok) await load();
      return result;
    } finally {
      endMutation(name);
    }
  }

  async function remove(name: string): Promise<OpResult> {
    startMutation(name);
    try {
      const result = await callOp(`/api/plugins/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (result.ok) await load();
      return result;
    } finally {
      endMutation(name);
    }
  }

  async function setEnabled(name: string, enabled: boolean): Promise<OpResult> {
    startMutation(name);
    // Optimistic toggle for snappier UI.
    const target = plugins.value.find(p => p.name === name);
    const previous = target?.enabled;
    if (target) target.enabled = enabled;
    try {
      const path = `/api/plugins/${encodeURIComponent(name)}/${enabled ? 'enable' : 'disable'}`;
      const result = await callOp(path, { method: 'POST' });
      if (!result.ok && target && previous !== undefined) {
        target.enabled = previous;
      }
      return result;
    } finally {
      endMutation(name);
    }
  }

  return {
    plugins,
    loading,
    initialized,
    error,
    mutatingPlugins,
    installing,
    enabledCount,
    totalCount,
    isEmpty,
    isMutating,
    load,
    install,
    update,
    remove,
    setEnabled,
  };
});
