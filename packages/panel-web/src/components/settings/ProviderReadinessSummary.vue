<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton, NTag, useMessage } from 'naive-ui';
import { useProvidersStore } from '@/stores/providers';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import { useTaskDraft } from '@/composables/useTaskDraft';

const emit = defineEmits<{ (e: 'add-credential', provider: string): void }>();

const { t } = useI18n();
const { openChatDraft } = useTaskDraft();
const message = useMessage();
const store = useProvidersStore();
const {
  model, providers, loading, initialized, settingModel,
  discoveryLoading, discoveredModels, discoveryError, activeCredentialLabel,
} = storeToRefs(store);

const configuredFamilies = computed(() => new Set(providers.value.map(p => p.family)));
const currentModel = computed(() => model.value?.default || t('settings.providers.readiness.unset'));
const currentProvider = computed(() => model.value?.provider || t('settings.providers.readiness.providerUnset'));
const hasCredential = computed(() => {
  const current = model.value;
  if (!current) return false;
  return !!current.baseUrl
    || current.hasApiKey
    || !!current.activeCredential
    || configuredFamilies.value.has(current.provider);
});
const status = computed<'checking' | 'ready' | 'action'>(() => {
  if (loading.value && !initialized.value) return 'checking';
  return model.value?.default && hasCredential.value ? 'ready' : 'action';
});
const runtimeStatus = computed(() => {
  if (discoveryLoading.value) return t('settings.providers.readiness.runtimeChecking');
  if (discoveredModels.value.length > 0) {
    return t('settings.providers.readiness.runtimeReady', { n: discoveredModels.value.length });
  }
  if (discoveryError.value) return t('settings.providers.readiness.runtimeFallback');
  return t('settings.providers.readiness.runtimeEmpty');
});
const command = computed(() => `hermes config set model.default ${model.value?.default || 'llama3.1'}`);

onMounted(() => {
  if (!initialized.value) void store.load({ initial: true });
});

async function useLocalPreset(): Promise<void> {
  const result = await store.setModel({
    name: 'llama3.1',
    provider: 'custom',
    baseUrl: 'http://localhost:11434/v1',
  });
  if (result.ok) {
    message.success(t('settings.providers.readiness.localApplied'));
    return;
  }
  message.error(`${t('model.switcher.failed')}: ${result.error ?? ''}`);
}

async function copyCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(command.value);
    message.success(t('settings.providers.configCopied'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

function addFreeCloudKey(): void {
  emit('add-credential', 'openrouter');
}

function discoverRuntimeModels(): void {
  void store.discoverModels();
}

function openTestChat(): void {
  void openChatDraft(t('settings.providers.readiness.testPrompt'));
}
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('settings.providers.readiness.eyebrow') }}
        </p>
        <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ t('settings.providers.readiness.title') }}
        </h4>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ t('settings.providers.readiness.desc') }}
        </p>
      </div>
      <NTag size="small" :type="status === 'ready' ? 'success' : status === 'checking' ? 'info' : 'warning'" :bordered="false">
        {{ t(`settings.providers.readiness.state.${status}`) }}
      </NTag>
    </div>

    <ErrorBanner
      v-if="store.error"
      class="mt-3"
      :message="`${t('settings.providers.configErrorPrefix')} ${store.error}`"
      :retry-label="t('common.retry')"
      surface="inline"
      @retry="store.load()"
    />

    <div class="mt-3 grid gap-2 md:grid-cols-3">
      <div class="rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2">
        <p class="text-[11px] font-semibold text-[var(--text-3)]">{{ t('settings.providers.readiness.currentModel') }}</p>
        <p class="mt-1 truncate font-mono text-xs text-[var(--text-1)]">{{ currentModel }}</p>
      </div>
      <div class="rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2">
        <p class="text-[11px] font-semibold text-[var(--text-3)]">{{ t('settings.providers.readiness.currentProvider') }}</p>
        <p class="mt-1 truncate font-mono text-xs text-[var(--text-1)]">{{ currentProvider }}</p>
      </div>
      <div class="rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2">
        <p class="text-[11px] font-semibold text-[var(--text-3)]">{{ t('settings.providers.readiness.credential') }}</p>
        <p class="mt-1 truncate text-xs text-[var(--text-1)]">
          {{ activeCredentialLabel || (hasCredential ? t('settings.providers.readiness.localCredential') : t('settings.providers.readiness.credentialMissing')) }}
        </p>
      </div>
    </div>

    <div class="mt-3 rounded border border-dashed border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2 text-xs leading-5 text-[var(--text-3)]">
      {{ runtimeStatus }}
      <code class="ml-1 rounded bg-[var(--bg-card)] px-1 py-0.5 text-[11px] text-[var(--text-2)]">{{ command }}</code>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <NButton size="small" type="primary" ghost :loading="discoveryLoading" @click="discoverRuntimeModels">
        {{ t('settings.providers.readiness.discover') }}
      </NButton>
      <NButton size="small" ghost :loading="settingModel" @click="useLocalPreset">
        {{ t('settings.providers.readiness.useLocal') }}
      </NButton>
      <NButton size="small" ghost @click="addFreeCloudKey">
        {{ t('settings.providers.readiness.addFreeCloud') }}
      </NButton>
      <NButton size="small" quaternary @click="copyCommand">
        {{ t('settings.providers.copyConfigCommand') }}
      </NButton>
      <NButton size="small" quaternary @click="openTestChat">
        {{ t('settings.providers.readiness.testChat') }}
      </NButton>
    </div>
  </section>
</template>
