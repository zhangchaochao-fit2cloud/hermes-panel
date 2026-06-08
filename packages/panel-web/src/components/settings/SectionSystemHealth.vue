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
import { NButton, useMessage } from 'naive-ui';
import { useSystemStore } from '@/stores/system';
import { bffFetch } from '@/api/bff';
import { ref } from 'vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';

const { t } = useI18n();
const system = useSystemStore();
const message = useMessage();
const { health, hermesApiBase } = storeToRefs(system);
const apiKeyExists = ref<boolean | null>(null);
const setupCommand = 'hermes setup';

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

const setupSteps = computed(() => [
  {
    key: 'doctor',
    title: t('settings.systemHealth.setup.steps.doctor.title'),
    desc: t('settings.systemHealth.setup.steps.doctor.desc'),
    href: '#/developer#doctor',
  },
  {
    key: 'providers',
    title: t('settings.systemHealth.setup.steps.providers.title'),
    desc: t('settings.systemHealth.setup.steps.providers.desc'),
    href: '#/settings#providers',
  },
  {
    key: 'gateway',
    title: t('settings.systemHealth.setup.steps.gateway.title'),
    desc: t('settings.systemHealth.setup.steps.gateway.desc'),
    href: '#/settings#system-health',
  },
]);

async function onRefresh(): Promise<void> {
  await Promise.all([system.refresh(), refreshKeyState()]);
}

async function copySetupCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(setupCommand);
    message.success(t('settings.systemHealth.setup.copied'));
  } catch {
    message.error(t('common.copyFailed'));
  }
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

    <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
            {{ t('settings.systemHealth.setup.eyebrow') }}
          </p>
          <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
            {{ t('settings.systemHealth.setup.title') }}
          </h4>
          <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
            {{ t('settings.systemHealth.setup.desc') }}
          </p>
        </div>
        <NButton size="small" quaternary @click="copySetupCommand">
          {{ t('settings.systemHealth.setup.copy') }}
        </NButton>
      </div>

      <div class="mt-3 flex min-w-0 flex-col gap-2 rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2">
        <code class="truncate text-xs text-[var(--text-1)]">{{ setupCommand }}</code>
        <p class="text-xs text-[var(--text-3)]">
          {{ t('settings.systemHealth.setup.commandHint') }}
        </p>
      </div>

      <ErrorBanner
        v-if="system.error"
        class="mt-3"
        :message="`${t('settings.systemHealth.setup.errorPrefix')} ${system.error}`"
        :retry-label="t('common.retry')"
        surface="inline"
        @retry="onRefresh"
      />

      <div class="mt-3 grid gap-2 md:grid-cols-3">
        <a
          v-for="step in setupSteps"
          :key="step.key"
          class="rounded border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 transition-colors hover:bg-[var(--bg-elevate)]"
          :href="step.href"
        >
          <div class="text-xs font-semibold text-[var(--text-1)]">{{ step.title }}</div>
          <div class="mt-1 text-xs leading-5 text-[var(--text-3)]">{{ step.desc }}</div>
        </a>
      </div>
    </section>

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
