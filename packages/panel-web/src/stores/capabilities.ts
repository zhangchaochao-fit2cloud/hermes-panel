import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';

export interface Capabilities {
  hermes: { found: boolean; version?: string };
  api_server: boolean;
  profile: boolean;
  cron: boolean;
  memory: boolean;
  mcp: boolean;
  skills: boolean;
}

export const useCapabilitiesStore = defineStore('capabilities', () => {
  const caps = ref<Capabilities | null>(null);
  const loading = ref(false);

  async function load(): Promise<void> {
    if (caps.value) return;
    loading.value = true;
    try {
      caps.value = await bffFetch<Capabilities>('/api/capabilities');
    } catch {
      // Default to "everything available" on error so we don't hide features
      caps.value = {
        hermes: { found: true },
        api_server: true,
        profile: true,
        cron: true,
        memory: true,
        mcp: true,
        skills: true,
      };
    } finally {
      loading.value = false;
    }
  }

  /** Returns true if the given capability is available (or unknown). */
  function has(key: keyof Omit<Capabilities, 'hermes'>): boolean {
    return caps.value?.[key] ?? true;
  }

  const ready = computed(() => caps.value !== null);

  return { caps, loading, ready, load, has };
});
