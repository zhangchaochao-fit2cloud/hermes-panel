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

onMounted(() => {
  if (!initialized.value) void store.load({ initial: true });
});

// When the popover opens, refresh state so we reflect any out-of-band changes.
watch(popoverOpen, v => {
  if (v && initialized.value) void store.load();
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

const groups = computed(() =>
  [...KNOWN_MODEL_GROUPS].sort((a, b) => {
    const aHas = configuredFamilies.value.has(a.provider) ? 0 : 1;
    const bHas = configuredFamilies.value.has(b.provider) ? 0 : 1;
    return aHas - bHas;
  }),
);

function isCurrent(m: KnownModel): boolean {
  return model.value?.default === m.id;
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
  if (r.ok) {
    message.success(t('model.switcher.switched', { name: m.label }));
    popoverOpen.value = false;
  } else {
    message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
  }
}

async function applyCustom(): Promise<void> {
  const name = customInput.value.trim();
  if (!name) return;
  const r = await store.setModel({ name });
  if (r.ok) {
    message.success(t('model.switcher.switched', { name }));
    customInput.value = '';
    popoverOpen.value = false;
  } else {
    message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
  }
}

function manageProviders(): void {
  popoverOpen.value = false;
  void router.push({ path: '/settings', hash: '#providers' });
}
</script>

<template>
  <NPopover
    v-model:show="popoverOpen"
    placement="bottom-end"
    trigger="click"
    :width="380"
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
      <div class="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div class="text-xs font-semibold text-[var(--text-1)]">
          {{ t('model.switcher.title') }}
        </div>
        <NSpin v-if="loading || settingModel" :size="14" />
      </div>

      <div class="max-h-[420px] overflow-auto px-2 py-2">
        <template v-for="g in groups" :key="g.provider">
          <div class="px-2 pt-2 pb-1 flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
              {{ g.label }}
            </span>
            <span
              v-if="configuredFamilies.has(g.provider)"
              class="h-1.5 w-1.5 rounded-full bg-emerald-500"
              :title="t('model.switcher.providerConfigured')"
            />
          </div>
          <button
            v-for="m in g.models"
            :key="m.id"
            class="w-full px-2 py-1.5 rounded-md flex items-center justify-between gap-2 text-left hover:bg-[var(--bg-elevate)] disabled:opacity-50"
            :class="isCurrent(m) ? 'bg-[var(--bg-elevate)]' : ''"
            :disabled="settingModel"
            @click="pickModel(m)"
          >
            <div class="min-w-0 flex-1">
              <div class="text-sm text-[var(--text-1)] truncate">{{ m.label }}</div>
              <div class="text-[10px] text-[var(--text-3)] font-mono truncate">{{ m.id }}</div>
            </div>
            <span
              v-if="isCurrent(m)"
              class="text-[10px] text-[var(--brand-600)] flex-shrink-0"
            >✓ {{ t('model.switcher.current') }}</span>
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
