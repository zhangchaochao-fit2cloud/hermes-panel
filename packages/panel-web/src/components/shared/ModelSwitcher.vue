<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { NButton, NInput, NPopover, NSpin, useMessage } from 'naive-ui';
import { useProvidersStore, type InspectedModel, type ProviderBalance } from '@/stores/providers';
import { KNOWN_MODEL_GROUPS, findKnownModel, type KnownModel } from '@/data/known-models';

const { t } = useI18n();
const router = useRouter();
const store = useProvidersStore();
const message = useMessage();
const {
  model, providers, loading, initialized, settingModel, inspectionLoading,
  balanceLoading, activeCredentialLabel,
} = storeToRefs(store);

const popoverOpen = ref(false);
const customInput = ref('');
const search = ref('');

const allCandidates = computed(() => KNOWN_MODEL_GROUPS.flatMap(group =>
  group.models.map(m => ({
    id: m.id, label: m.label, provider: m.provider,
    baseUrl: m.baseUrl, requiresCredential: m.requiresCredential,
  })),
));

onMounted(() => {
  if (!initialized.value) void store.load({ initial: true });
});

watch(popoverOpen, v => {
  if (v) void refreshModelChecks();
  else search.value = '';
});

const currentLabel = computed(() => {
  const m = model.value;
  if (!m?.default) return t('model.switcher.unset');
  return findKnownModel(m.default)?.label ?? m.default;
});

const providerLabel = computed(() => model.value?.provider || '—');
const triggerTitle = computed(() => [
  t('model.switcher.tooltip'),
  `${providerLabel.value} · ${currentLabel.value}`,
  activeCredentialLabel.value,
].filter(Boolean).join('\n'));
const configuredFamilies = computed(() => new Set(providers.value.map(p => p.family)));
const currentBalance = computed(() => model.value?.provider ? store.balanceFor(model.value.provider) : undefined);

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
        || m.tags?.some(tag => tag.includes(q))
        || g.label.toLowerCase().includes(q),
      ),
    }))
    .filter(g => g.models.length > 0);
});

const compactGroups = computed(() => {
  if (search.value.trim()) return filteredGroups.value;
  const currentProvider = model.value?.provider ?? '';
  const preferred = filteredGroups.value.filter(group =>
    configuredFamilies.value.has(group.provider) || group.provider === currentProvider,
  );
  const source = preferred.length > 0 ? preferred : filteredGroups.value.slice(0, 3);
  return source
    .map(group => ({
      ...group,
      models: group.models.slice(0, 2),
    }))
    .filter(group => group.models.length > 0);
});

const hasResults = computed(() => compactGroups.value.some(g => g.models.length > 0));
const busy = computed(() => loading.value || settingModel.value || inspectionLoading.value);

function isCurrent(m: KnownModel): boolean {
  return model.value?.default === m.id && (!model.value.provider || model.value.provider === m.provider);
}

function inspectionOf(m: KnownModel): InspectedModel | undefined {
  return store.inspectionFor(m.provider, m.id);
}

function isBlocked(m: KnownModel): boolean {
  return inspectionOf(m)?.availability === 'missing_credentials';
}

function statusLabel(m: KnownModel): string {
  const status = inspectionOf(m)?.availability;
  if (status === 'ready') return t('model.switcher.ready');
  if (status === 'missing_credentials') return t('model.switcher.missingCredential');
  return t('model.switcher.unknownAvailability');
}

function statusClass(m: KnownModel): string {
  const status = inspectionOf(m)?.availability;
  if (status === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
  if (status === 'missing_credentials') return 'border-amber-500/30 bg-amber-500/10 text-amber-600';
  return 'border-[var(--border)] bg-[var(--bg-elevate)] text-[var(--text-3)]';
}

function priceLabel(m: KnownModel): string {
  if (m.requiresCredential === false) return t('model.switcher.freeLocal');
  const pricing = inspectionOf(m)?.pricing;
  if (!pricing) return t('model.switcher.priceUnknown');
  return t('model.switcher.pricePerMillion', {
    input: pricing.inputPerMillion.toFixed(pricing.inputPerMillion < 1 ? 2 : 1),
    output: pricing.outputPerMillion.toFixed(pricing.outputPerMillion < 1 ? 2 : 1),
  });
}

function balanceText(balance?: ProviderBalance): string {
  if (!balance) return t('model.switcher.balanceUnknown');
  if (balance.status === 'available' && typeof balance.remaining === 'number') {
    return t('model.switcher.balanceAvailable', { value: balance.remaining.toFixed(2) });
  }
  if (balance.status === 'unsupported') return t('model.switcher.balanceUnsupported');
  if (balance.status === 'unavailable') return t('model.switcher.balanceUnavailable');
  return t('model.switcher.balanceUnknown');
}

async function refreshModelChecks(): Promise<void> {
  if (initialized.value) await store.load();
  else await store.load({ initial: true });
  await Promise.all([
    store.inspectModels(allCandidates.value),
    model.value?.provider ? store.loadProviderBalance(model.value.provider) : Promise.resolve(),
  ]);
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
  if (r.restartedGateway) message.info(t('model.switcher.gatewayRestarted'), { duration: 3500 });
  else if (r.restartError) message.warning(t('model.switcher.gatewayRestartFailed'), { duration: 6000, closable: true });
}

async function pickModel(m: KnownModel): Promise<void> {
  if (isCurrent(m)) {
    popoverOpen.value = false;
    return;
  }
  if (isBlocked(m)) {
    addCredentialForBlockedModel();
    return;
  }
  const r = await store.setModel({ name: m.id, provider: m.provider, baseUrl: m.baseUrl });
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

function addCredentialForBlockedModel(): void {
  message.warning(t('model.switcher.missingCredentialWarning'));
  manageProviders();
}

function shortHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}
</script>

<template>
  <NPopover v-model:show="popoverOpen" placement="bottom-end" trigger="click" :width="520" raw :show-arrow="false" style="--n-padding: 0">
    <template #trigger>
      <button
        class="h-8 w-[248px] px-2.5 inline-grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] text-xs font-medium text-[var(--text-2)] hover:text-[var(--brand-600)] hover:border-[var(--brand-500)] transition-colors"
        :title="triggerTitle"
      >
        <span class="model-trigger-provider max-w-[72px] truncate whitespace-nowrap rounded px-1.5 py-0.5 bg-[var(--bg-card)] text-[10px] uppercase text-[var(--text-3)]">
          {{ providerLabel }}
        </span>
        <span class="model-trigger-name min-w-0 truncate whitespace-nowrap font-mono text-[var(--text-1)]">
          {{ currentLabel }}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" class="flex-shrink-0 opacity-60">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </template>

    <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden">
      <div class="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-[var(--text-1)]">{{ t('model.switcher.title') }}</div>
          <div class="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
            <span class="font-mono truncate">{{ currentLabel }}</span>
            <span>·</span>
            <span>{{ providerLabel }}</span>
          </div>
        </div>
        <div class="provider-balance-panel max-w-[180px] rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] px-2.5 py-1 text-right">
          <div class="truncate text-[11px] font-medium text-[var(--text-2)]">{{ balanceText(currentBalance) }}</div>
          <NSpin v-if="balanceLoading" :size="10" class="ml-1 inline-flex" />
        </div>
      </div>

      <div class="px-3 py-2 border-b border-[var(--border)]">
        <NInput v-model:value="search" size="small" clearable :placeholder="t('model.switcher.searchPlaceholder')">
          <template #prefix>
            <svg class="h-3.5 w-3.5 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </template>
        </NInput>
      </div>

      <div class="max-h-[320px] overflow-auto px-2 py-1.5">
        <div v-if="!hasResults" class="px-4 py-8 text-center text-xs text-[var(--text-3)]">{{ t('model.switcher.noMatch') }}</div>
        <template v-for="g in compactGroups" :key="g.provider">
          <div class="px-2 pt-3 first:pt-1.5 pb-1 flex items-center gap-2 sticky top-0 bg-[var(--bg-card)] z-[1]">
            <span class="h-3 w-1 rounded-sm bg-[var(--brand-500)] opacity-60" aria-hidden="true" />
            <span class="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-2)]">{{ g.label }}</span>
            <span v-if="configuredFamilies.has(g.provider)" class="h-1.5 w-1.5 rounded-full status-dot-success flex-shrink-0" :title="t('model.switcher.providerConfigured')" />
            <span class="ml-auto text-[10px] text-[var(--text-3)] tabular-nums">{{ g.models.length }}</span>
          </div>
          <button v-for="m in g.models" :key="m.id" class="model-row relative w-full pl-3 pr-3 py-2 my-0.5 rounded-lg border flex items-start justify-between gap-3 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60" :class="isCurrent(m) ? 'bg-[var(--brand-500)]/8 border-[var(--brand-500)]/60' : 'border-transparent hover:bg-[var(--bg-elevate)] hover:border-[var(--border)] hover:shadow-[var(--shadow-1)]'" :disabled="settingModel" @click="pickModel(m)">
            <span v-if="isCurrent(m)" class="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--brand-500)]" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm truncate leading-snug" :class="isCurrent(m) ? 'text-[var(--brand-600)] font-semibold' : 'text-[var(--text-1)] font-medium'">{{ m.label }}</span>
                <span v-if="isCurrent(m)" class="text-[10px] font-medium text-[var(--brand-600)]">{{ t('model.switcher.current') }}</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 min-w-0">
                <span class="text-[10px] text-[var(--text-3)] font-mono truncate">{{ m.id }}</span>
                <span v-if="m.baseUrl" class="text-[10px] text-[var(--text-3)] opacity-70 truncate flex-shrink-0" :title="m.baseUrl">· {{ shortHost(m.baseUrl) }}</span>
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span class="model-health-chip inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="statusClass(m)">{{ statusLabel(m) }}</span>
                <span class="model-price-pill inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-0.5 text-[10px] text-[var(--text-2)]">{{ priceLabel(m) }}</span>
                <span v-for="tag in m.tags?.slice(0, 2) ?? []" :key="tag" class="model-tag-pill inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-3)]">
                  {{ t(`model.switcher.tag.${tag}`) }}
                </span>
                <span v-if="search.trim() && inspectionOf(m)?.contextLength" class="inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-3)]">
                  {{ t('model.switcher.contextWindow', { value: inspectionOf(m)?.contextLength }) }}
                </span>
              </div>
            </div>
          </button>
        </template>
      </div>

      <div class="border-t border-[var(--border)] px-3 py-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <div class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">{{ t('model.switcher.customLabel') }}</div>
          <NSpin v-if="busy" :size="14" />
        </div>
        <div class="flex gap-2">
          <NInput v-model:value="customInput" :placeholder="t('model.switcher.customPlaceholder')" size="small" @keyup.enter="applyCustom" />
          <NButton size="small" type="primary" :loading="settingModel" :disabled="!customInput.trim()" @click="applyCustom">{{ t('model.switcher.apply') }}</NButton>
        </div>
        <div class="text-[10px] text-[var(--text-3)]">{{ t('model.switcher.customHint') }}</div>
      </div>

      <button class="w-full px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-elevate)] flex items-center justify-between border-t border-[var(--border)]" @click="manageProviders">
        <span>{{ t('model.switcher.manage') }}</span>
        <span class="text-[var(--text-3)]">→</span>
      </button>
    </div>
  </NPopover>
</template>
