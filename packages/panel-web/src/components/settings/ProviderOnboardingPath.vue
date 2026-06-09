<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { NButton, NTag, useMessage } from 'naive-ui';
import { useProvidersStore } from '@/stores/providers';

type StepState = 'ready' | 'recommended' | 'action' | 'checking';
type PrimaryAction = 'checking' | 'useLocal' | 'addCloud' | 'discover' | 'testChat';

interface PathStep {
  key: 'local' | 'cloud' | 'runtime' | 'cli';
  state: StepState;
}

const emit = defineEmits<{ (e: 'add-credential', provider: string): void }>();

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const store = useProvidersStore();
const {
  model, providers, loading, initialized, settingModel,
  discoveryLoading, discoveredModels, discoveryError,
} = storeToRefs(store);

const configuredFamilies = computed(() => new Set(providers.value.map(p => p.family)));
const hasModel = computed(() => !!model.value?.default);
const hasCredential = computed(() => {
  const current = model.value;
  if (!current) return false;
  return !!current.baseUrl
    || current.hasApiKey
    || !!current.activeCredential
    || configuredFamilies.value.has(current.provider);
});
const isLocalPath = computed(() => {
  const current = model.value;
  if (!current) return false;
  return current.provider === 'custom' || /localhost|127\.0\.0\.1/i.test(current.baseUrl ?? '');
});
const ready = computed(() => hasModel.value && hasCredential.value);
const command = computed(() => `hermes config set model.default ${model.value?.default || 'llama3.1'}`);

const primaryAction = computed<PrimaryAction>(() => {
  if (loading.value && !initialized.value) return 'checking';
  if (!hasModel.value) return 'useLocal';
  if (!hasCredential.value) return 'addCloud';
  if (discoveredModels.value.length === 0 && !discoveryError.value) return 'discover';
  return 'testChat';
});

const steps = computed<PathStep[]>(() => [
  {
    key: 'local',
    state: isLocalPath.value ? 'ready' : !hasModel.value ? 'recommended' : 'action',
  },
  {
    key: 'cloud',
    state: configuredFamilies.value.size > 0 ? 'ready' : !hasCredential.value ? 'recommended' : 'action',
  },
  {
    key: 'runtime',
    state: discoveryLoading.value ? 'checking' : discoveredModels.value.length > 0 ? 'ready' : 'action',
  },
  {
    key: 'cli',
    state: 'ready',
  },
]);

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
    message.success(t('settings.providers.onboarding.localApplied'));
    return;
  }
  message.error(`${t('model.switcher.failed')}: ${result.error ?? ''}`);
}

function addCloudKey(): void {
  emit('add-credential', 'openrouter');
}

function discoverModels(): void {
  void store.discoverModels();
}

async function copyCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(command.value);
    message.success(t('settings.providers.configCopied'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

function openTestChat(): void {
  try {
    localStorage.setItem('panel.chat.draft.new', t('settings.providers.onboarding.testPrompt'));
  } catch {
    /* draft is optional */
  }
  void router.push({ path: '/chat', query: { new: String(Date.now()) } });
}

async function runPrimary(): Promise<void> {
  if (primaryAction.value === 'checking') {
    await store.load({ initial: true });
  } else if (primaryAction.value === 'useLocal') {
    await useLocalPreset();
  } else if (primaryAction.value === 'addCloud') {
    addCloudKey();
  } else if (primaryAction.value === 'discover') {
    discoverModels();
  } else {
    openTestChat();
  }
}

function runStep(step: PathStep): void {
  if (step.key === 'local') void useLocalPreset();
  else if (step.key === 'cloud') addCloudKey();
  else if (step.key === 'runtime') discoverModels();
  else void copyCommand();
}
</script>

<template>
  <section class="provider-onboarding">
    <div class="onboarding-copy">
      <p class="onboarding-eyebrow">{{ t('settings.providers.onboarding.eyebrow') }}</p>
      <h4 class="onboarding-title">{{ t('settings.providers.onboarding.title') }}</h4>
      <p class="onboarding-desc">{{ t('settings.providers.onboarding.desc') }}</p>
      <div class="onboarding-command">
        <span>{{ t('settings.providers.onboarding.fallback') }}</span>
        <code>{{ command }}</code>
      </div>
    </div>

    <div class="onboarding-panel">
      <div class="onboarding-status-row">
        <NTag size="small" :type="ready ? 'success' : 'warning'" :bordered="false">
          {{ ready ? t('settings.providers.onboarding.ready') : t('settings.providers.onboarding.needsAction') }}
        </NTag>
        <span class="runtime-count">
          {{ t('settings.providers.onboarding.runtimeCount', { n: discoveredModels.length }) }}
        </span>
      </div>

      <div class="onboarding-steps">
        <button
          v-for="(step, index) in steps"
          :key="step.key"
          type="button"
          class="onboarding-step"
          :class="`is-${step.state}`"
          @click="runStep(step)"
        >
          <span class="step-index">{{ index + 1 }}</span>
          <span class="step-copy">
            <span class="step-title">{{ t(`settings.providers.onboarding.steps.${step.key}.title`) }}</span>
            <span class="step-desc">{{ t(`settings.providers.onboarding.steps.${step.key}.desc`) }}</span>
          </span>
          <span class="step-state">{{ t(`settings.providers.onboarding.state.${step.state}`) }}</span>
        </button>
      </div>

      <div class="onboarding-actions">
        <NButton
          type="primary"
          size="small"
          :loading="settingModel || discoveryLoading || (loading && !initialized)"
          @click="runPrimary"
        >
          {{ t(`settings.providers.onboarding.primary.${primaryAction}`) }}
        </NButton>
        <NButton size="small" ghost :loading="discoveryLoading" @click="discoverModels">
          {{ t('settings.providers.readiness.discover') }}
        </NButton>
        <NButton size="small" quaternary @click="copyCommand">
          {{ t('settings.providers.copyConfigCommand') }}
        </NButton>
        <NButton size="small" quaternary @click="openTestChat">
          {{ t('settings.providers.readiness.testChat') }}
        </NButton>
      </div>
    </div>
  </section>
</template>

<style scoped src="./ProviderOnboardingPath.css"></style>
