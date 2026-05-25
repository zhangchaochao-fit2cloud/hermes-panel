<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  NInput,
  NButton,
  NSelect,
  NEmpty,
  NTag,
  useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { HEADERS } from '@hermes-panel/shared';
import { getBffBase, getPanelToken } from '@/api/token';

const { t } = useI18n();
const message = useMessage();

interface StreamEvent {
  id: number;
  timestamp: number;
  name: string;
  payload: unknown;
  expanded: boolean;
}

const url = ref<string>('/api/hermes/v1/runs/<run_id>/events');
const events = ref<StreamEvent[]>([]);
const filter = ref<string>('__all__');
const status = ref<'idle' | 'connecting' | 'streaming' | 'paused' | 'closed' | 'error'>('idle');
const errorMsg = ref<string | null>(null);
const lastEventId = ref(0);

let controller: AbortController | null = null;
let paused = false;

const eventTypes = computed<string[]>(() => {
  const set = new Set<string>();
  for (const e of events.value) set.add(e.name);
  return Array.from(set).sort();
});

const filterOptions = computed(() => [
  { label: t('developer.sse.filterAll'), value: '__all__' },
  ...eventTypes.value.map(n => ({ label: n, value: n })),
]);

const visibleEvents = computed(() =>
  filter.value === '__all__'
    ? events.value
    : events.value.filter(e => e.name === filter.value),
);

function appendEvent(name: string, payload: unknown): void {
  if (paused) return;
  lastEventId.value++;
  events.value.push({
    id: lastEventId.value,
    timestamp: Date.now(),
    name,
    payload,
    expanded: false,
  });
}

async function start(): Promise<void> {
  if (status.value === 'streaming' || status.value === 'connecting') return;
  if (!url.value.trim()) {
    message.error(t('developer.sse.urlRequired'));
    return;
  }

  paused = false;
  status.value = 'connecting';
  errorMsg.value = null;
  controller = new AbortController();

  try {
    const res = await fetch(`${getBffBase()}${url.value}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        [HEADERS.PANEL_TOKEN]: getPanelToken(),
      },
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      status.value = 'error';
      errorMsg.value = `HTTP ${res.status}`;
      return;
    }

    status.value = 'streaming';
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
        let parsed: unknown = payload;
        let name = 'message';
        try {
          parsed = JSON.parse(payload);
          if (parsed && typeof parsed === 'object' && 'event' in (parsed as Record<string, unknown>)) {
            const ev = (parsed as { event: unknown }).event;
            if (typeof ev === 'string') name = ev;
          }
        } catch {
          // Treat non-JSON payloads as raw strings
        }
        appendEvent(name, parsed);
      }
    }
    if (status.value === 'streaming') status.value = 'closed';
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') {
      const cur = status.value as string;
      if (cur !== 'paused' && cur !== 'closed') status.value = 'closed';
      return;
    }
    status.value = 'error';
    errorMsg.value = (err as Error).message ?? 'unknown error';
  }
}

function stop(): void {
  controller?.abort();
  controller = null;
  status.value = 'closed';
}

function togglePause(): void {
  if (status.value === 'streaming') {
    paused = true;
    status.value = 'paused';
  } else if (status.value === 'paused') {
    paused = false;
    status.value = 'streaming';
  }
}

function clear(): void {
  events.value = [];
  lastEventId.value = 0;
}

function exportJsonl(): void {
  if (events.value.length === 0) {
    message.warning(t('developer.sse.nothingToExport'));
    return;
  }
  const lines = events.value.map(e =>
    JSON.stringify({ ts: e.timestamp, event: e.name, payload: e.payload }),
  );
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/jsonl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sse-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function quickStart(): Promise<void> {
  // POST /v1/runs first to get a run_id, then attach to /events.
  try {
    const res = await fetch(`${getBffBase()}/api/hermes/v1/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [HEADERS.PANEL_TOKEN]: getPanelToken(),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        input: 'Ping from SSE Inspector',
        stream: true,
      }),
    });
    if (!res.ok) {
      message.error(`startRun ${res.status}`);
      return;
    }
    const data = await res.json() as { run_id?: string };
    if (!data.run_id) {
      message.error('Missing run_id');
      return;
    }
    url.value = `/api/hermes/v1/runs/${data.run_id}/events`;
    await start();
  } catch (err) {
    message.error((err as Error).message ?? 'quickStart failed');
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function fmtPayload(p: unknown): string {
  try { return JSON.stringify(p, null, 2); }
  catch { return String(p); }
}

function statusTagType(): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status.value) {
    case 'streaming': return 'success';
    case 'connecting': return 'info';
    case 'paused': return 'warning';
    case 'error': return 'error';
    default: return 'default';
  }
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <NInput
        v-model:value="url"
        size="small"
        placeholder="/api/hermes/v1/runs/<run_id>/events"
        class="flex-1 min-w-[300px]"
      />
      <NButton
        v-if="status !== 'streaming' && status !== 'connecting'"
        type="primary"
        size="small"
        @click="start"
      >
        {{ t('developer.sse.start') }}
      </NButton>
      <NButton
        v-else
        size="small"
        @click="stop"
      >
        {{ t('developer.sse.stop') }}
      </NButton>
      <NButton size="small" tertiary @click="quickStart">
        {{ t('developer.sse.quickStart') }}
      </NButton>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <NTag :type="statusTagType()" size="small" :bordered="false">
        {{ t(`developer.sse.status.${status}`) }}
      </NTag>
      <NSelect
        v-if="eventTypes.length > 0"
        v-model:value="filter"
        :options="filterOptions"
        size="small"
        style="width: 200px"
      />
      <span class="text-xs text-[var(--text-3)]">
        {{ visibleEvents.length }} / {{ events.length }}
      </span>
      <div class="flex-1" />
      <NButton
        v-if="status === 'streaming' || status === 'paused'"
        size="tiny"
        @click="togglePause"
      >
        {{ status === 'paused' ? t('developer.sse.resume') : t('developer.sse.pause') }}
      </NButton>
      <NButton size="tiny" @click="clear">{{ t('developer.sse.clear') }}</NButton>
      <NButton size="tiny" @click="exportJsonl">{{ t('developer.sse.export') }}</NButton>
    </div>

    <div v-if="errorMsg" class="text-sm text-[var(--color-error,#e88080)] p-3 rounded-md bg-[var(--color-error,#e88080)]/10">
      {{ errorMsg }}
    </div>

    <NEmpty
      v-if="visibleEvents.length === 0"
      size="small"
      :description="t('developer.sse.empty')"
      class="py-10"
    />

    <div
      v-else
      class="rounded-md border border-[var(--border)] overflow-y-auto"
      style="max-height: 600px"
    >
      <div
        v-for="ev in visibleEvents"
        :key="ev.id"
        class="border-b border-[var(--border)] last:border-b-0 px-3 py-2 text-xs font-mono hover:bg-[var(--bg-elevate)]/50"
      >
        <div
          class="flex items-center gap-3 cursor-pointer"
          @click="ev.expanded = !ev.expanded"
        >
          <span class="text-[var(--text-3)]">{{ fmtTime(ev.timestamp) }}</span>
          <NTag size="tiny" :bordered="false" type="info">{{ ev.name }}</NTag>
          <span class="opacity-60">{{ ev.expanded ? '▾' : '▸' }}</span>
        </div>
        <pre
          v-if="ev.expanded"
          class="mt-1 p-2 rounded bg-[var(--bg-elevate)] overflow-x-auto"
          style="font-size: 11px"
        ><code>{{ fmtPayload(ev.payload) }}</code></pre>
      </div>
    </div>
  </div>
</template>
