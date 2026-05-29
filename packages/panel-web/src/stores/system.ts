import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';
import type { HealthStatus } from '@hermes-panel/shared';

interface TokenInfo { hermesApiKey: string | null; hermesApiBase: string }

export const useSystemStore = defineStore('system', () => {
  const health = ref<HealthStatus | null>(null);
  const hermesApiKey = ref<string | null>(null);
  const hermesApiBase = ref<string>('http://127.0.0.1:8642');
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function refresh(opts: { silent?: boolean } = {}): Promise<void> {
    if (!opts.silent) loading.value = true;
    error.value = null;
    try {
      health.value = await bffFetch<HealthStatus>('/api/system/health', { silent: opts.silent });
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      if (!opts.silent) loading.value = false;
    }
  }

  async function loadToken(): Promise<void> {
    try {
      const t = await bffFetch<TokenInfo>('/api/token');
      hermesApiKey.value = t.hermesApiKey;
      hermesApiBase.value = t.hermesApiBase;
    } catch (err) {
      error.value = (err as Error).message;
    }
  }

  return { health, hermesApiKey, hermesApiBase, loading, error, refresh, loadToken };
});
