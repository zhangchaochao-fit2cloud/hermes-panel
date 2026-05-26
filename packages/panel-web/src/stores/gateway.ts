import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';
import { useSystemStore } from './system';

interface StartResponse { ok: true; pid?: number; bin?: string }
interface StopResponse { ok: true; output?: string }

export const useGatewayStore = defineStore('gateway', () => {
  const starting = ref(false);
  const stopping = ref(false);
  const error = ref<string | null>(null);

  async function start(): Promise<boolean> {
    if (starting.value || stopping.value) return false;
    starting.value = true;
    error.value = null;
    try {
      await bffFetch<StartResponse>('/api/gateway/start', { method: 'POST' });
      // Kick a refresh; the gateway needs a moment to bind :8642, so the
      // calling component is responsible for any short polling loop.
      await useSystemStore().refresh();
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      starting.value = false;
    }
  }

  async function stop(): Promise<boolean> {
    if (starting.value || stopping.value) return false;
    stopping.value = true;
    error.value = null;
    try {
      await bffFetch<StopResponse>('/api/gateway/stop', { method: 'POST' });
      await useSystemStore().refresh();
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      stopping.value = false;
    }
  }

  return { starting, stopping, error, start, stop };
});
