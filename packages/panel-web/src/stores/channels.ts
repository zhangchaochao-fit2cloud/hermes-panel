import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChannelName, ChannelConfig, ChannelStatus, AllChannelsState } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';

export const useChannelsStore = defineStore('channels', () => {
  const channels = ref<ChannelStatus[]>([]);
  const gatewayRunning = ref(false);
  const loading = ref(false);
  const saving = ref<string | null>(null);
  const error = ref<string | null>(null);

  const enabledCount = computed(() => channels.value.filter(c => c.enabled).length);

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const data = await bffFetch<AllChannelsState>('/api/channels');
      channels.value = data.channels;
      gatewayRunning.value = data.gatewayRunning;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchConfig(name: ChannelName): Promise<ChannelConfig> {
    return bffFetch<ChannelConfig>(`/api/channels/${name}`);
  }

  async function saveConfig(name: ChannelName, config: ChannelConfig): Promise<void> {
    saving.value = name;
    error.value = null;
    try {
      await bffFetch(`/api/channels/${name}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      await fetchAll();
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      saving.value = null;
    }
  }

  async function removeConfig(name: ChannelName): Promise<void> {
    saving.value = name;
    try {
      await bffFetch(`/api/channels/${name}`, { method: 'DELETE' });
      await fetchAll();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      saving.value = null;
    }
  }

  async function restartGateway(): Promise<void> {
    saving.value = 'gateway';
    try {
      await bffFetch('/api/gateway/start', { method: 'POST' });
      gatewayRunning.value = true;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      saving.value = null;
    }
  }

  return {
    channels, gatewayRunning, loading, saving, error, enabledCount,
    fetchAll, fetchConfig, saveConfig, removeConfig, restartGateway,
  };
});
