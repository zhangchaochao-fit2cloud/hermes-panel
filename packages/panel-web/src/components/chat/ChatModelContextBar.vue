<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useProvidersStore } from '@/stores/providers';
import ModelSwitcher from '@/components/shared/ModelSwitcher.vue';

const props = defineProps<{ model: string }>();
const emit = defineEmits<{
  (e: 'update:model', value: string): void;
  (e: 'pick-prompt', prompt: string): void;
}>();

const { t } = useI18n();
const router = useRouter();
const providersStore = useProvidersStore();
const {
  model: providerModel,
  providers,
  initialized,
  activeCredentialLabel,
  discoveredModels,
  discoveryLoading,
  discoveryError,
} = storeToRefs(providersStore);

onMounted(() => {
  if (!initialized.value) void providersStore.load({ initial: true });
});

watch(
  () => providerModel.value?.default,
  next => {
    if (next && next !== props.model) emit('update:model', next);
  },
);

const currentModel = computed(() => providerModel.value?.default || props.model || t('model.switcher.unset'));
const currentProvider = computed(() => providerModel.value?.provider || t('chat.modelContext.providerFallback'));
const configuredFamilies = computed(() => new Set(providers.value.map(provider => provider.family)));
const currentDiscovered = computed(() => discoveredModels.value.some(item => item.id === currentModel.value));
const localEndpoint = computed(() => {
  const url = providerModel.value?.baseUrl ?? '';
  return /localhost|127\.0\.0\.1|::1/.test(url);
});
const sourceKey = computed(() => {
  if (currentDiscovered.value) return 'runtime';
  if (localEndpoint.value || providerModel.value?.provider === 'custom') return 'local';
  if (activeCredentialLabel.value || providerModel.value?.hasApiKey || configuredFamilies.value.has(providerModel.value?.provider ?? '')) return 'credential';
  return 'missing';
});
const runtimeLabel = computed(() => {
  if (discoveryLoading.value) return t('chat.modelContext.runtimeChecking');
  if (discoveredModels.value.length > 0) return t('chat.modelContext.runtimeReady', { n: discoveredModels.value.length });
  if (discoveryError.value) return t('chat.modelContext.runtimeFallback');
  return t('chat.modelContext.runtimeUnknown');
});
const sourceClass = computed(() => {
  if (sourceKey.value === 'runtime') return 'is-runtime';
  if (sourceKey.value === 'local') return 'is-local';
  if (sourceKey.value === 'credential') return 'is-credential';
  return 'is-missing';
});

function openProviders(): void {
  void router.push({ path: '/settings', hash: '#providers' });
}

function checkModel(): void {
  emit('pick-prompt', t('chat.modelContext.checkPrompt'));
}
</script>

<template>
  <section class="chat-model-context-bar">
    <div class="min-w-0 flex-1">
      <p class="model-context-label">{{ t('chat.modelContext.label') }}</p>
      <div class="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <span class="model-context-name">{{ currentModel }}</span>
        <span class="model-context-provider">{{ currentProvider }}</span>
        <span class="model-context-source" :class="sourceClass">
          {{ t(`chat.modelContext.source.${sourceKey}`) }}
        </span>
      </div>
      <p class="mt-1 truncate text-[11px] text-[var(--text-3)]">
        {{ activeCredentialLabel || runtimeLabel }}
      </p>
    </div>

    <div class="model-context-actions">
      <ModelSwitcher />
      <button type="button" class="model-context-button" @click="checkModel">
        {{ t('chat.modelContext.check') }}
      </button>
      <button type="button" class="model-context-button" @click="openProviders">
        {{ t('chat.modelContext.setup') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.chat-model-context-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
  padding: 10px;
}

.model-context-label {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
}

.model-context-name,
.model-context-provider,
.model-context-source,
.model-context-button {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevate);
  font-size: 11px;
  line-height: 1;
}

.model-context-name {
  max-width: min(300px, 42vw);
  overflow: hidden;
  padding: 5px 8px;
  color: var(--text-1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-context-provider,
.model-context-source,
.model-context-button {
  padding: 5px 8px;
  color: var(--text-2);
  font-weight: 650;
}

.model-context-source.is-runtime,
.model-context-source.is-local {
  border-color: color-mix(in srgb, var(--color-success) 36%, var(--border));
  color: var(--color-success);
}

.model-context-source.is-credential {
  border-color: color-mix(in srgb, var(--brand-500) 35%, var(--border));
  color: var(--brand-600);
}

.model-context-source.is-missing {
  border-color: color-mix(in srgb, var(--color-warning) 42%, var(--border));
  color: var(--color-warning);
}

.model-context-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.model-context-button {
  height: 32px;
  cursor: pointer;
}

.model-context-button:hover {
  border-color: color-mix(in srgb, var(--brand-500) 44%, var(--border));
  color: var(--brand-600);
}

@media (max-width: 900px) {
  .chat-model-context-bar,
  .model-context-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
