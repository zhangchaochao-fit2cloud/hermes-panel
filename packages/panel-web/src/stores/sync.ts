import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getBffBaseAsync, getPanelTokenAsync } from '@/api/token';
import { HEADERS } from '@hermes-panel/shared';

export const useSyncStore = defineStore('sync', () => {
  const connected = ref(false);
  const clientCount = ref(0);
  const lastEvent = ref<{ type: string; timestamp: number } | null>(null);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let abortController: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  const MAX_RETRIES = 10;

  async function connect(): Promise<void> {
    if (connected.value) return;
    abortController = new AbortController();

    try {
      const base = await getBffBaseAsync();
      const token = await getPanelTokenAsync();
      const res = await fetch(`${base}/api/sync/events`, {
        headers: { [HEADERS.PANEL_TOKEN]: token },
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) return;
      connected.value = true;
      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (raw.startsWith(':')) continue; // ping
          const dataLine = raw.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine.slice(5).trim());
            retryCount = 0; // Reset on successful data
            lastEvent.value = { type: event.type, timestamp: event.timestamp };
            if (event.type === 'connected') clientCount.value = event.payload.clientCount;
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError' && retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.warn(`[sync] connection lost, retry ${retryCount}/${MAX_RETRIES} in ${delay / 1000}s`);
        reconnectTimer = setTimeout(() => void connect(), delay);
      }
    } finally {
      connected.value = false;
    }
  }

  function disconnect(): void {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    abortController?.abort();
    abortController = null;
    retryCount = 0;
    reader = null;
    connected.value = false;
  }

  return { connected, clientCount, lastEvent, connect, disconnect };
});
