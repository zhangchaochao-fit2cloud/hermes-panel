<script setup lang="ts">
/**
 * 系统健康状态 — 集中展示 Hermes API / BFF / API key 三个关键依赖的状态，
 * 出问题时给一行 actionable 提示，让用户不用翻 README 就能知道怎么修。
 *
 * 状态分三档：
 *   - ok        ✓ 绿  — 运行中
 *   - warn      △ 黄  — 可用但有问题（如 key 未设置）
 *   - error     ✗ 红  — 不可用
 */
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
import { useSystemStore } from '@/stores/system';
import { bffFetch } from '@/api/bff';
import { ref } from 'vue';

const { t } = useI18n();
const system = useSystemStore();
const { health, hermesApiBase } = storeToRefs(system);
const apiKeyExists = ref<boolean | null>(null);

async function refreshKeyState(): Promise<void> {
  try {
    const r = await bffFetch<{ exists: boolean }>('/api/secrets/hermes-api-key/exists', { silent: true });
    apiKeyExists.value = r.exists;
  } catch {
    apiKeyExists.value = null;
  }
}

onMounted(() => {
  void system.refresh();
  void refreshKeyState();
});

type Severity = 'ok' | 'warn' | 'error';

interface CheckRow {
  key: string;
  label: string;
  status: Severity;
  detail: string;
  hint?: string;
}

const rows = computed<CheckRow[]>(() => {
  const list: CheckRow[] = [];
  // Hermes gateway
  const h = health.value?.hermes;
  if (!h) {
    list.push({
      key: 'hermes',
      label: t('settings.systemHealth.hermes.label'),
      status: 'error',
      detail: t('settings.systemHealth.unknown'),
      hint: t('settings.systemHealth.hermes.hintUnreachable'),
    });
  } else if (h.running) {
    list.push({
      key: 'hermes',
      label: t('settings.systemHealth.hermes.label'),
      status: 'ok',
      detail: t('settings.systemHealth.hermes.runningAt', {
        version: h.version || '—',
        base: hermesApiBase.value || h.apiBase || '',
      }),
    });
  } else {
    list.push({
      key: 'hermes',
      label: t('settings.systemHealth.hermes.label'),
      status: 'error',
      detail: h.error || t('settings.systemHealth.hermes.notRunning'),
      hint: t('settings.systemHealth.hermes.hintNotRunning'),
    });
  }
  // BFF
  const b = health.value?.bff;
  if (!b) {
    list.push({
      key: 'bff',
      label: t('settings.systemHealth.bff.label'),
      status: 'error',
      detail: t('settings.systemHealth.unknown'),
      hint: t('settings.systemHealth.bff.hint'),
    });
  } else {
    list.push({
      key: 'bff',
      label: t('settings.systemHealth.bff.label'),
      status: 'ok',
      detail: t('settings.systemHealth.bff.runningAt', { version: b.version }),
    });
  }
  // API key
  if (apiKeyExists.value === null) {
    list.push({
      key: 'apiKey',
      label: t('settings.systemHealth.apiKey.label'),
      status: 'warn',
      detail: t('settings.systemHealth.unknown'),
    });
  } else if (apiKeyExists.value) {
    list.push({
      key: 'apiKey',
      label: t('settings.systemHealth.apiKey.label'),
      status: 'ok',
      detail: t('settings.systemHealth.apiKey.configured'),
    });
  } else {
    list.push({
      key: 'apiKey',
      label: t('settings.systemHealth.apiKey.label'),
      status: 'warn',
      detail: t('settings.systemHealth.apiKey.missing'),
      hint: t('settings.systemHealth.apiKey.hint'),
    });
  }
  return list;
});

const overall = computed<Severity>(() => {
  if (rows.value.some(r => r.status === 'error')) return 'error';
  if (rows.value.some(r => r.status === 'warn')) return 'warn';
  return 'ok';
});

async function onRefresh(): Promise<void> {
  await Promise.all([system.refresh(), refreshKeyState()]);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold flex items-center gap-2">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="{
            'bg-emerald-500': overall === 'ok',
            'bg-amber-500': overall === 'warn',
            'bg-red-500': overall === 'error',
          }"
        />
        {{ t('settings.systemHealth.title') }}
      </h3>
      <NButton size="tiny" quaternary @click="onRefresh">
        {{ t('common.refresh') }}
      </NButton>
    </div>

    <ul class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3"
      >
        <div class="flex items-start gap-2">
          <span
            class="mt-1 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
            :class="{
              'bg-emerald-500': row.status === 'ok',
              'bg-amber-500': row.status === 'warn',
              'bg-red-500': row.status === 'error',
            }"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-[var(--text-1)]">{{ row.label }}</div>
            <div class="text-xs text-[var(--text-2)] mt-0.5 break-words">{{ row.detail }}</div>
            <div
              v-if="row.hint"
              class="mt-1.5 text-xs px-2 py-1 rounded bg-[var(--bg-elevate)] border border-[var(--border)] text-[var(--text-2)]"
            >
              {{ row.hint }}
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
