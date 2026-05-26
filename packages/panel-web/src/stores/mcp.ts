import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';

export interface McpServer {
  name: string;
  configured: boolean;
}

export interface AddMcpPayload {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  transport?: 'stdio' | 'http' | 'sse';
  auth?: 'oauth' | 'header';
  preset?: string;
}

interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<McpServer[]>([]);
  const loading = ref(false);
  const initialized = ref(false);
  const lastError = ref<string | null>(null);
  const mutating = ref<Set<string>>(new Set());
  const adding = ref(false);

  const total = computed(() => servers.value.length);
  const isEmpty = computed(() => initialized.value && servers.value.length === 0);

  async function load(): Promise<void> {
    loading.value = true;
    lastError.value = null;
    try {
      const r = await bffFetch<{ servers: McpServer[]; error?: string }>('/api/mcp');
      servers.value = r.servers;
      if (r.error) lastError.value = r.error;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      lastError.value = e.code ?? e.message ?? 'MCP_LIST_FAILED';
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function add(payload: AddMcpPayload): Promise<ActionResult> {
    adding.value = true;
    try {
      await bffFetch('/api/mcp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await load();
      return { ok: true };
    } catch (err) {
      const e = err as { code?: string; message?: string };
      return {
        ok: false,
        error: e.code ?? 'MCP_ADD_FAILED',
        message: e.message,
      };
    } finally {
      adding.value = false;
    }
  }

  async function remove(name: string): Promise<ActionResult> {
    mutating.value = new Set(mutating.value).add(name);
    try {
      await bffFetch(`/api/mcp/${encodeURIComponent(name)}`, { method: 'DELETE' });
      await load();
      return { ok: true };
    } catch (err) {
      const e = err as { code?: string; message?: string };
      return {
        ok: false,
        error: e.code ?? 'MCP_REMOVE_FAILED',
        message: e.message,
      };
    } finally {
      const next = new Set(mutating.value);
      next.delete(name);
      mutating.value = next;
    }
  }

  function isMutating(name: string): boolean {
    return mutating.value.has(name);
  }

  return {
    servers, loading, initialized, lastError, adding,
    total, isEmpty,
    load, add, remove, isMutating,
  };
});
