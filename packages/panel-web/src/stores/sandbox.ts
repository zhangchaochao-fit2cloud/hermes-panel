import { defineStore } from 'pinia';
import { ref } from 'vue';
import { HEADERS } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import { getBffBaseAsync, getPanelTokenAsync } from '@/api/token.js';

export interface SandboxOutput {
  type: 'stdout' | 'stderr' | 'system';
  text: string;
  timestamp: number;
}

export const useSandboxStore = defineStore('sandbox', () => {
  const available = ref(false);
  const unavailableReason = ref<string | null>(null);
  const sandboxId = ref<string | null>(null);
  const running = ref(false);
  const output = ref<SandboxOutput[]>([]);
  const executing = ref(false);

  function pushOutput(type: SandboxOutput['type'], text: string): void {
    output.value.push({ type, text, timestamp: Date.now() });
  }

  async function checkAvailable(): Promise<void> {
    const res = await bffFetch<{ available: boolean; reason?: string }>('/api/sandbox/available');
    available.value = res.available;
    unavailableReason.value = res.reason ?? null;
  }

  async function create(workspacePath?: string): Promise<void> {
    const res = await bffFetch<{ sandboxId: string }>('/api/sandbox/create', {
      method: 'POST',
      body: JSON.stringify({ workspacePath }),
    });
    sandboxId.value = res.sandboxId;
    running.value = true;
    pushOutput('system', `Sandbox created: ${res.sandboxId}`);
  }

  async function run(command: string): Promise<void> {
    if (!sandboxId.value) return;
    executing.value = true;
    pushOutput('system', `$ ${command}`);

    try {
      const base = await getBffBaseAsync();
      const token = await getPanelTokenAsync();
      const url = `${base}/api/sandbox/${sandboxId.value}/run`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          [HEADERS.PANEL_TOKEN]: token,
        },
        body: JSON.stringify({ command }),
      });

      if (!res.ok || !res.body) {
        pushOutput('stderr', `Request failed: HTTP ${res.status}`);
        executing.value = false;
        return;
      }

      const reader = res.body.getReader();
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
          const dataLine = raw.split('\n').find(line => line.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as { stdout?: string; stderr?: string; exitCode?: number };
            if (ev.stdout) pushOutput('stdout', ev.stdout);
            if (ev.stderr) pushOutput('stderr', ev.stderr);
            if (ev.exitCode !== undefined) {
              pushOutput('system', `exit code: ${ev.exitCode}`);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      pushOutput('stderr', (err as Error).message ?? 'Unknown error');
    } finally {
      executing.value = false;
    }
  }

  async function destroy(): Promise<void> {
    if (!sandboxId.value) return;
    await bffFetch<{ ok: true }>(`/api/sandbox/${sandboxId.value}`, { method: 'DELETE' });
    pushOutput('system', `Sandbox ${sandboxId.value} destroyed`);
    sandboxId.value = null;
    running.value = false;
  }

  async function checkStatus(): Promise<void> {
    if (!sandboxId.value) return;
    const res = await bffFetch<{ running: boolean }>(`/api/sandbox/${sandboxId.value}/status`);
    running.value = res.running;
  }

  return {
    available,
    unavailableReason,
    sandboxId,
    running,
    output,
    executing,
    checkAvailable,
    create,
    run,
    destroy,
    checkStatus,
  };
});
