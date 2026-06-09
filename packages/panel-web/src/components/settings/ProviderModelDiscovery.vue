<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { NButton, NSpin, NTag, useMessage } from 'naive-ui';
import { useProvidersStore, type DiscoveredModel } from '@/stores/providers';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const store = useProvidersStore();
const {
  model,
  discoveredModels,
  discoveryLoading,
  discoveryError,
  discoveryCheckedAt,
  settingModel,
} = storeToRefs(store);

const visibleModels = computed(() => discoveredModels.value.slice(0, 6));
const hiddenModelCount = computed(() => Math.max(0, discoveredModels.value.length - visibleModels.value.length));
const hasModels = computed(() => discoveredModels.value.length > 0);
const checkedAtLabel = computed(() => (
  discoveryCheckedAt.value ? new Date(discoveryCheckedAt.value).toLocaleTimeString() : ''
));
const statusTone = computed(() => {
  if (discoveryLoading.value) return 'border-sky-500/25 bg-sky-500/10 text-sky-700';
  if (hasModels.value) return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
  if (discoveryError.value) return 'border-amber-500/25 bg-amber-500/10 text-amber-700';
  return 'border-[var(--border)] bg-[var(--bg-elevate)] text-[var(--text-3)]';
});
const statusText = computed(() => {
  if (discoveryLoading.value) return t('settings.providers.discovery.loading');
  if (hasModels.value) return t('settings.providers.discovery.ready', { n: discoveredModels.value.length });
  if (discoveryError.value) return t('settings.providers.discovery.fallback');
  return t('settings.providers.discovery.empty');
});

onMounted(() => {
  void store.discoverModels();
});

function isCurrent(item: DiscoveredModel): boolean {
  return model.value?.default === item.id;
}

async function useModel(item: DiscoveredModel): Promise<void> {
  const r = await store.setModel({ name: item.id });
  if (r.ok) {
    message.success(t('settings.providers.discovery.modelApplied', { name: item.label || item.id }));
    return;
  }
  message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
}

function refresh(): void {
  void store.discoverModels();
}

function openChat(): void {
  void router.push('/chat');
}
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('settings.providers.discovery.eyebrow') }}
        </p>
        <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ t('settings.providers.discovery.title') }}
        </h4>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ t('settings.providers.discovery.desc') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NButton size="small" quaternary :loading="discoveryLoading" @click="refresh">
          {{ t('common.retry') }}
        </NButton>
        <NButton size="small" ghost type="primary" @click="openChat">
          {{ t('settings.providers.discovery.testChat') }}
        </NButton>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs" :class="statusTone">
      <NSpin v-if="discoveryLoading" :size="12" />
      <span v-else class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-70" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">{{ statusText }}</span>
      <span v-if="checkedAtLabel" class="font-mono opacity-70">{{ checkedAtLabel }}</span>
    </div>

    <div v-if="hasModels" class="mt-3 grid gap-2 md:grid-cols-2">
      <button
        v-for="item in visibleModels"
        :key="item.id"
        class="flex min-w-0 items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2 text-left transition hover:border-[var(--brand-500)] hover:bg-[var(--bg-card)] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="settingModel"
        @click="useModel(item)"
      >
        <span class="min-w-0">
          <span class="block truncate text-xs font-semibold text-[var(--text-1)]">{{ item.label || item.id }}</span>
          <span class="mt-0.5 block truncate font-mono text-[11px] text-[var(--text-3)]">{{ item.id }}</span>
        </span>
        <NTag v-if="isCurrent(item)" size="tiny" type="success" :bordered="false">
          {{ t('settings.providers.discovery.current') }}
        </NTag>
        <NTag v-else size="tiny" :bordered="false">
          {{ t('settings.providers.discovery.use') }}
        </NTag>
      </button>
    </div>

    <div v-else class="mt-3 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs leading-5 text-[var(--text-3)]">
      {{ t('settings.providers.discovery.emptyHint') }}
      <code class="ml-1 rounded bg-[var(--bg-elevate)] px-1 py-0.5 text-[11px] text-[var(--text-2)]">
        hermes config set model.default &lt;model-id&gt;
      </code>
    </div>

    <div v-if="hiddenModelCount > 0" class="mt-2 text-[11px] text-[var(--text-3)]">
      {{ t('settings.providers.discovery.more', { n: hiddenModelCount }) }}
    </div>
  </section>
</template>
