<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  NPopover, NInput, NButton, NDivider, NSpin, useMessage,
} from 'naive-ui';
import { useProvidersStore } from '@/stores/providers';
import { KNOWN_MODEL_GROUPS, findKnownModel, type KnownModel } from '@/data/known-models';

const { t } = useI18n();
const router = useRouter();
const store = useProvidersStore();
const message = useMessage();
const { model, providers, loading, initialized, settingModel } = storeToRefs(store);

const popoverOpen = ref(false);
const customInput = ref('');
const search = ref('');

onMounted(() => {
  if (!initialized.value) void store.load({ initial: true });
});

// When the popover opens, refresh state so we reflect any out-of-band changes.
watch(popoverOpen, v => {
  if (v && initialized.value) void store.load();
  if (!v) search.value = '';
});

const currentLabel = computed(() => {
  const m = model.value;
  if (!m?.default) return t('model.switcher.unset');
  const known = findKnownModel(m.default);
  return known?.label ?? m.default;
});

const providerLabel = computed(() => model.value?.provider || '—');

/** Providers we have credentials for — used to surface "available" groups first. */
const configuredFamilies = computed(() => new Set(providers.value.map(p => p.family)));

const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase();
  const sorted = [...KNOWN_MODEL_GROUPS].sort((a, b) => {
    const aHas = configuredFamilies.value.has(a.provider) ? 0 : 1;
    const bHas = configuredFamilies.value.has(b.provider) ? 0 : 1;
    return aHas - bHas;
  });
  if (!q) return sorted;
  return sorted
    .map(g => ({
      ...g,
      models: g.models.filter(m =>
        m.id.toLowerCase().includes(q)
        || m.label.toLowerCase().includes(q)
        || g.label.toLowerCase().includes(q),
      ),
    }))
    .filter(g => g.models.length > 0);
});

const hasResults = computed(() => filteredGroups.value.some(g => g.models.length > 0));

function isCurrent(m: KnownModel): boolean {
  return model.value?.default === m.id;
}

function notifyResult(
  r: { ok: boolean; error?: string; restartedGateway?: boolean; restartError?: string },
  label: string,
): void {
  if (!r.ok) {
    message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
    return;
  }
  message.success(t('model.switcher.switched', { name: label }));
  if (r.restartedGateway) {
    message.info(t('model.switcher.gatewayRestarted'), { duration: 3500 });
  } else if (r.restartError) {
    message.warning(t('model.switcher.gatewayRestartFailed'), { duration: 6000, closable: true });
  }
}

async function pickModel(m: KnownModel): Promise<void> {
  if (isCurrent(m)) {
    popoverOpen.value = false;
    return;
  }
  const r = await store.setModel({
    name: m.id,
    provider: m.provider,
    baseUrl: m.baseUrl,
  });
  notifyResult(r, m.label);
  if (r.ok) popoverOpen.value = false;
}

async function applyCustom(): Promise<void> {
  const name = customInput.value.trim();
  if (!name) return;
  const r = await store.setModel({ name });
  notifyResult(r, name);
  if (r.ok) {
    customInput.value = '';
    popoverOpen.value = false;
  }
}

function manageProviders(): void {
  popoverOpen.value = false;
  void router.push({ path: '/settings', hash: '#providers' });
}

/** "https://api.deepseek.com/v1" → "api.deepseek.com" */
function shortHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}
</script>

<template>
  <NPopover
    v-model:show="popoverOpen"
    placement="bottom-end"
    trigger="click"
    :width="440"
    raw
    :show-arrow="false"
    style="--n-padding: 0"
  >
    <template #trigger>
      <button
        class="h-8 px-3 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] text-xs font-medium text-[var(--text-2)] hover:text-[var(--brand-600)] hover:border-[var(--brand-500)] transition-colors max-w-[260px]"
        :title="t('model.switcher.tooltip')"
      >
        <span class="text-[var(--text-3)] text-[10px] uppercase tracking-wider flex-shrink-0">
          {{ providerLabel }}
        </span>
        <span class="text-[var(--text-3)] flex-shrink-0">·</span>
        <span class="truncate font-mono">{{ currentLabel }}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" class="flex-shrink-0 opacity-60">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </template>

    <div class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden">
      <!-- Header: title + spinner -->
      <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div class="text-sm font-semibold text-[var(--text-1)]">
          {{ t('model.switcher.title') }}
        </div>
        <NSpin v-if="loading || settingModel" :size="14" />
      </div>

      <!-- Search box -->
      <div class="px-3 pt-3 pb-1">
        <NInput
          v-model:value="search"
          size="small"
          clearable
          :placeholder="t('model.switcher.searchPlaceholder')"
        >
          <template #prefix>
            <span class="text-[var(--text-3)]">🔍</span>
          </template>
        </NInput>
      </div>

      <!-- Model list -->
      <div class="max-h-[460px] overflow-auto px-2 pb-2">
        <div
          v-if="!hasResults"
          class="px-4 py-8 text-center text-xs text-[var(--text-3)]"
        >
          {{ t('model.switcher.noMatch') }}
        </div>
        <template v-for="g in filteredGroups" :key="g.provider">
          <!-- Group header: short brand bar + label + configured dot + count -->
          <div class="px-2 pt-4 first:pt-3 pb-1.5 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-[1]">
            <span class="h-3 w-1 rounded-sm bg-[var(--brand-500)] opacity-60" aria-hidden="true" />
            <span class="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-2)]">
              {{ g.label }}
            </span>
            <span
              v-if="configuredFamilies.has(g.provider)"
              class="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"
              :title="t('model.switcher.providerConfigured')"
            />
            <span class="ml-auto text-[10px] text-[var(--text-3)] tabular-nums">{{ g.models.length }}</span>
          </div>
          <button
            v-for="m in g.models"
            :key="m.id"
            class="model-row relative w-full pl-3 pr-3 py-2.5 my-1 rounded-lg border flex items-center justify-between gap-3 text-left transition-all duration-150 disabled:opacity-50"
            :class="isCurrent(m)
              ? 'bg-[var(--brand-500)]/8 border-[var(--brand-500)]/60'
              : 'border-transparent hover:bg-[var(--bg-elevate)] hover:border-[var(--border)] hover:shadow-[var(--shadow-1)]'"
            :disabled="settingModel"
            @click="pickModel(m)"
          >
            <!-- left bar for selected state -->
            <span
              v-if="isCurrent(m)"
              class="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--brand-500)]"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  class="text-sm truncate leading-snug"
                  :class="isCurrent(m) ? 'text-[var(--brand-600)] font-semibold' : 'text-[var(--text-1)] font-medium'"
                >
                  {{ m.label }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 min-w-0">
                <span class="text-[10px] text-[var(--text-3)] font-mono truncate">{{ m.id }}</span>
                <span
                  v-if="m.baseUrl"
                  class="text-[10px] text-[var(--text-3)] opacity-70 truncate flex-shrink-0"
                  :title="m.baseUrl"
                >
                  · {{ shortHost(m.baseUrl) }}
                </span>
              </div>
            </div>
            <span
              v-if="isCurrent(m)"
              class="flex-shrink-0 text-[10px] font-medium text-[var(--brand-600)] inline-flex items-center gap-1"
            >
              <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6.5L4.5 9L10 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ t('model.switcher.current') }}
            </span>
          </button>
        </template>
      </div>

      <NDivider style="margin: 0" />

      <div class="px-3 py-2 space-y-2">
        <div class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
          {{ t('model.switcher.customLabel') }}
        </div>
        <div class="flex gap-2">
          <NInput
            v-model:value="customInput"
            :placeholder="t('model.switcher.customPlaceholder')"
            size="small"
            @keyup.enter="applyCustom"
          />
          <NButton
            size="small"
            type="primary"
            :loading="settingModel"
            :disabled="!customInput.trim()"
            @click="applyCustom"
          >
            {{ t('model.switcher.apply') }}
          </NButton>
        </div>
        <div class="text-[10px] text-[var(--text-3)]">
          {{ t('model.switcher.customHint') }}
        </div>
      </div>

      <NDivider style="margin: 0" />

      <button
        class="w-full px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-elevate)] flex items-center justify-between"
        @click="manageProviders"
      >
        <span>{{ t('model.switcher.manage') }}</span>
        <span class="text-[var(--text-3)]">→</span>
      </button>
    </div>
  </NPopover>
</template>
