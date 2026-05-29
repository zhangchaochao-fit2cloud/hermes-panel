<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NSelect,
  NInput,
  NButton,
  NDropdown,
  NTag,
  NEmpty,
  useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { HEADERS } from '@hermes-panel/shared';
import { getBffBaseAsync, getPanelTokenAsync } from '@/api/token';
import { useDeveloperStore, type DevHistoryEntry } from '@/stores/developer';
import { genCurl, genFetch } from '@/utils/code-templates';

const { t } = useI18n();
const message = useMessage();
const store = useDeveloperStore();
const { current, recent10 } = storeToRefs(store);

interface Preset { name: string; method: string; url: string; body?: string }
const presets: Preset[] = [
  { name: t('developer.playground.preset.listModels'), method: 'GET', url: '/api/hermes/v1/models' },
  {
    name: t('developer.playground.preset.startRun'),
    method: 'POST',
    url: '/api/hermes/v1/runs',
    body: JSON.stringify(
      { model: 'claude-sonnet-4-5', input: 'Hello from the Developer Playground', stream: true },
      null,
      2,
    ),
  },
  { name: t('developer.playground.preset.health'), method: 'GET', url: '/api/system/health' },
];

const methodOptions = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'].map(m => ({ label: m, value: m }));

// --- Headers table model -------------------------------------------------
interface HeaderRow { key: string; value: string }
const headerRows = ref<HeaderRow[]>(
  Object.entries(current.value.headers).map(([key, value]) => ({ key, value })),
);
if (headerRows.value.length === 0) headerRows.value.push({ key: '', value: '' });

function syncHeadersToStore(): void {
  const out: Record<string, string> = {};
  for (const row of headerRows.value) {
    const k = row.key.trim();
    if (!k) continue;
    out[k] = row.value;
  }
  current.value.headers = out;
}

function addHeaderRow(): void {
  headerRows.value.push({ key: '', value: '' });
}
function removeHeaderRow(idx: number): void {
  headerRows.value.splice(idx, 1);
  if (headerRows.value.length === 0) headerRows.value.push({ key: '', value: '' });
  syncHeadersToStore();
}

// --- Response state ------------------------------------------------------
const sending = ref(false);
const responseStatus = ref<number | null>(null);
const responseDuration = ref<number | null>(null);
const responseBody = ref<string>('');
const responseError = ref<string | null>(null);

const statusColor = computed<'success' | 'error' | 'warning' | 'default'>(() => {
  const s = responseStatus.value;
  if (s == null) return 'default';
  if (s >= 200 && s < 300) return 'success';
  if (s >= 400) return 'error';
  return 'warning';
});

function bodyIsJson(): boolean {
  const b = current.value.body.trim();
  if (!b) return true;
  try { JSON.parse(b); return true; } catch { return false; }
}

async function send(): Promise<void> {
  syncHeadersToStore();
  if (current.value.method !== 'GET' && current.value.body && !bodyIsJson()) {
    message.error(t('developer.playground.invalidJson'));
    return;
  }

  sending.value = true;
  responseError.value = null;
  responseBody.value = '';
  responseStatus.value = null;
  responseDuration.value = null;

  const url = `${await getBffBaseAsync()}${current.value.url}`;
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set(HEADERS.PANEL_TOKEN, await getPanelTokenAsync());
  for (const [k, v] of Object.entries(current.value.headers)) headers.set(k, v);

  const init: RequestInit = { method: current.value.method, headers };
  if (current.value.method !== 'GET' && current.value.body.trim()) {
    init.body = current.value.body;
  }

  const start = Date.now();
  let status: number | undefined;
  try {
    const res = await fetch(url, init);
    status = res.status;
    responseStatus.value = res.status;
    responseDuration.value = Date.now() - start;
    const text = await res.text();
    try {
      responseBody.value = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      responseBody.value = text;
    }
  } catch (err) {
    responseDuration.value = Date.now() - start;
    responseError.value = (err as Error).message ?? String(err);
  } finally {
    sending.value = false;
  }

  store.pushHistory({
    method: current.value.method,
    url: current.value.url,
    headers: { ...current.value.headers },
    body: current.value.body || undefined,
    timestamp: start,
    status,
    durationMs: responseDuration.value ?? undefined,
  });
}

function applyPreset(p: Preset): void {
  current.value.method = p.method;
  current.value.url = p.url;
  current.value.body = p.body ?? '';
  headerRows.value = Object.entries(current.value.headers).map(([key, value]) => ({ key, value }));
  if (headerRows.value.length === 0) headerRows.value.push({ key: '', value: '' });
}

function applyHistory(entry: DevHistoryEntry): void {
  store.loadFromHistory(entry);
  store.selectedHistoryId = entry.id;
  headerRows.value = Object.entries(entry.headers).map(([key, value]) => ({ key, value }));
  if (headerRows.value.length === 0) headerRows.value.push({ key: '', value: '' });
}

const historyOptions = computed(() => recent10.value.map(h => ({
  key: h.id,
  label: `${h.method} ${h.url}`,
})));

function onHistorySelect(key: string | number): void {
  const id = String(key);
  const entry = recent10.value.find(h => h.id === id);
  if (entry) applyHistory(entry);
}

async function copyText(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('developer.playground.copied', { what: label }));
  } catch {
    message.error(t('developer.playground.copyFailed'));
  }
}

function copyAsCurl(): void {
  syncHeadersToStore();
  copyText(genCurl({
    method: current.value.method,
    url: current.value.url,
    headers: current.value.headers,
    body: current.value.body || undefined,
  }), 'cURL');
}

function copyAsFetch(): void {
  syncHeadersToStore();
  copyText(genFetch({
    method: current.value.method,
    url: current.value.url,
    headers: current.value.headers,
    body: current.value.body || undefined,
  }), 'fetch');
}

function save(): void {
  syncHeadersToStore();
  store.pushHistory({
    method: current.value.method,
    url: current.value.url,
    headers: { ...current.value.headers },
    body: current.value.body || undefined,
    timestamp: Date.now(),
  });
  message.success(t('developer.playground.saved'));
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <!-- Left: request form -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="p in presets"
          :key="p.name"
          class="text-xs px-2 py-1 rounded-md bg-[var(--bg-elevate)] cursor-pointer hover:bg-[var(--brand-500)]/10"
          @click="applyPreset(p)"
        >
          {{ p.name }}
        </span>
      </div>

      <div class="flex gap-2">
        <NSelect
          v-model:value="current.method"
          :options="methodOptions"
          style="width: 110px"
          size="small"
        />
        <NInput
          v-model:value="current.url"
          placeholder="/api/hermes/v1/runs"
          size="small"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-[var(--text-3)]">{{ t('developer.playground.headers') }}</span>
          <NButton size="tiny" tertiary @click="addHeaderRow">+</NButton>
        </div>
        <div class="space-y-1">
          <div
            v-for="(row, idx) in headerRows"
            :key="idx"
            class="flex gap-1"
          >
            <NInput
              v-model:value="row.key"
              placeholder="Header"
              size="tiny"
              @update:value="syncHeadersToStore"
            />
            <NInput
              v-model:value="row.value"
              placeholder="value"
              size="tiny"
              @update:value="syncHeadersToStore"
            />
            <NButton size="tiny" tertiary @click="removeHeaderRow(idx)">×</NButton>
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-[var(--text-3)]">{{ t('developer.playground.body') }}</span>
          <span v-if="!bodyIsJson()" class="text-xs text-[var(--color-error,#e88080)]">
            {{ t('developer.playground.invalidJson') }}
          </span>
        </div>
        <NInput
          v-model:value="current.body"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 16 }"
          class="font-mono"
          style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;"
          placeholder='{ "model": "claude-sonnet-4-5", "input": "Hello", "stream": true }'
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <NButton type="primary" size="small" :loading="sending" @click="send">
          {{ t('developer.playground.send') }}
        </NButton>
        <NButton size="small" @click="save">{{ t('developer.playground.save') }}</NButton>
        <NButton size="small" @click="copyAsCurl">{{ t('developer.playground.copyCurl') }}</NButton>
        <NButton size="small" @click="copyAsFetch">{{ t('developer.playground.copyFetch') }}</NButton>
        <NDropdown
          v-if="historyOptions.length > 0"
          trigger="click"
          :options="historyOptions"
          size="small"
          @select="onHistorySelect"
        >
          <NButton size="small" tertiary>
            {{ t('developer.playground.history') }} ({{ recent10.length }})
          </NButton>
        </NDropdown>
      </div>
    </div>

    <!-- Right: response viewer -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-3">
        <span class="text-xs text-[var(--text-3)]">{{ t('developer.playground.response') }}</span>
        <NTag
          v-if="responseStatus !== null"
          :type="statusColor"
          size="small"
          :bordered="false"
        >
          {{ responseStatus }}
        </NTag>
        <span v-if="responseDuration !== null" class="text-xs text-[var(--text-3)]">
          {{ responseDuration }}ms
        </span>
      </div>

      <div v-if="responseError" class="text-sm text-[var(--color-error,#e88080)] p-3 rounded-md border border-[var(--color-error,#e88080)]/30 bg-[var(--color-error,#e88080)]/10">
        {{ responseError }}
      </div>

      <NEmpty
        v-else-if="responseStatus === null"
        size="small"
        :description="t('developer.playground.responseHint')"
        class="py-12"
      />

      <pre
        v-else
        class="rounded-md bg-[var(--bg-elevate)] p-3 text-xs font-mono overflow-auto"
        style="max-height: 800px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;"
      ><code>{{ responseBody }}</code></pre>
    </div>
  </div>
</template>
