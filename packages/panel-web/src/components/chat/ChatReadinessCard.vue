<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { NButton, NTag, useMessage } from 'naive-ui';
import { useProvidersStore, type DiscoveredModel } from '@/stores/providers';
import { useExecutionMode } from '@/composables/useExecutionMode';
import ChatConversationGuide from './ChatConversationGuide.vue';

const props = defineProps<{ chatModel: string }>();
const emit = defineEmits<{ (e: 'pick-prompt', prompt: string): void }>();

interface ConversationGuideAction {
  key: string;
  route?: string;
  promptKey?: string;
}

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const providersStore = useProvidersStore();
const {
  model, providers, initialized, activeCredentialLabel,
  discoveredModels, discoveryLoading, discoveryError,
} = storeToRefs(providersStore);
const { modeLabel } = useExecutionMode();

onMounted(() => {
  if (!initialized.value) void providersStore.load({ initial: true });
  void providersStore.discoverModels();
});

const currentModelName = computed(() => model.value?.default || props.chatModel || t('model.switcher.unset'));
const currentProviderName = computed(() => model.value?.provider || t('chat.readiness.providerUnset'));
const currentModelDiscovered = computed(() => !!model.value?.default && discoveredModels.value.some(item => item.id === model.value?.default));
const modelReady = computed(() =>
  !!model.value?.default && (
    currentModelDiscovered.value
    || !!model.value.hasApiKey
    || !!model.value.activeCredential
    || providers.value.some(provider => provider.family === model.value?.provider)
  )
);
const runtimeModels = computed(() => discoveredModels.value.slice(0, 3));
const runtimeStatus = computed(() => {
  if (discoveryLoading.value) return t('chat.readiness.runtimeLoading');
  if (runtimeModels.value.length > 0) return t('chat.readiness.runtimeReady', { n: discoveredModels.value.length });
  if (discoveryError.value) return t('chat.readiness.runtimeFallback');
  return t('chat.readiness.runtimeEmpty');
});

const setupPath = computed(() => [
  {
    id: 'local',
    status: modelReady.value ? 'ok' : 'action',
    title: t('chat.readiness.path.local.title'),
    body: t('chat.readiness.path.local.body'),
    action: t('chat.readiness.tryLocal'),
    handler: useLocalPrompt,
  },
  {
    id: 'provider',
    status: modelReady.value ? 'ok' : 'action',
    title: t('chat.readiness.path.provider.title'),
    body: t('chat.readiness.path.provider.body'),
    action: t('chat.readiness.configureModel'),
    handler: openProviders,
  },
  {
    id: 'test',
    status: 'ok',
    title: t('chat.readiness.path.test.title'),
    body: t('chat.readiness.path.test.body'),
    action: t('chat.readiness.testPrompt'),
    handler: useModelCheckPrompt,
  },
]);

const steps = computed(() => [
  {
    id: 'model',
    status: modelReady.value ? 'ok' : 'action',
    title: t('chat.readiness.modelTitle'),
    body: modelReady.value
      ? t('chat.readiness.modelReady', { model: currentModelName.value, provider: currentProviderName.value })
      : t('chat.readiness.modelMissing'),
  },
  {
    id: 'mode',
    status: 'ok',
    title: t('chat.readiness.modeTitle'),
    body: t('chat.readiness.modeReady', { mode: modeLabel.value }),
  },
  {
    id: 'prompt',
    status: 'ok',
    title: t('chat.readiness.promptTitle'),
    body: t('chat.readiness.promptReady'),
  },
]);

const conversationActions: ConversationGuideAction[] = [
  { key: 'direct', promptKey: 'chat.readiness.modelCheckPrompt' },
  { key: 'room', route: '/chat-room' },
  { key: 'channel', route: '/channels' },
];

function openProviders(): void {
  void router.push({ path: '/settings', hash: '#providers' });
}

function useLocalPrompt(): void {
  emit('pick-prompt', t('chat.readiness.localPrompt'));
}

function useModelCheckPrompt(): void {
  emit('pick-prompt', t('chat.readiness.modelCheckPrompt'));
}

function selectConversation(action: ConversationGuideAction): void {
  if (action.promptKey) {
    emit('pick-prompt', t(action.promptKey));
    return;
  }
  if (action.route) void router.push(action.route);
}

async function useRuntimeModel(item: DiscoveredModel): Promise<void> {
  const r = await providersStore.setModel({ name: item.id });
  if (r.ok) {
    message.success(t('chat.readiness.runtimeApplied', { model: item.label || item.id }));
    return;
  }
  message.error(`${t('model.switcher.failed')}: ${r.error ?? ''}`);
}
</script>

<template>
  <section class="chat-readiness-card mt-5 w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left shadow-[var(--shadow-1)]">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('chat.readiness.eyebrow') }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ t('chat.readiness.title') }}
        </h3>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ t('chat.readiness.desc') }}
        </p>
      </div>
      <NTag size="small" :type="modelReady ? 'success' : 'warning'" :bordered="false">
        {{ modelReady ? t('chat.readiness.ready') : t('chat.readiness.needsSetup') }}
      </NTag>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-3">
      <div
        v-for="step in steps"
        :key="step.id"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span
            class="h-2 w-2 flex-shrink-0 rounded-full"
            :class="step.status === 'ok' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'"
            aria-hidden="true"
          />
          <p class="truncate text-xs font-semibold text-[var(--text-1)]">{{ step.title }}</p>
        </div>
        <p class="mt-1 line-clamp-3 text-[11px] leading-4 text-[var(--text-3)]">
          {{ step.body }}
        </p>
      </div>
    </div>

    <ChatConversationGuide :actions="conversationActions" @select="selectConversation" />

    <div class="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] p-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-[var(--text-1)]">
            {{ t('chat.readiness.pathTitle') }}
          </p>
          <p class="mt-0.5 text-[11px] leading-4 text-[var(--text-3)]">
            {{ t('chat.readiness.pathDesc') }}
          </p>
        </div>
      </div>
      <div class="mt-3 grid gap-2 md:grid-cols-3">
        <button
          v-for="(item, index) in setupPath"
          :key="item.id"
          type="button"
          class="readiness-path-step"
          @click="item.handler"
        >
          <span
            class="readiness-path-index"
            :class="item.status === 'ok' ? 'is-ok' : 'is-action'"
          >
            {{ index + 1 }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-semibold text-[var(--text-1)]">{{ item.title }}</span>
            <span class="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-[var(--text-3)]">{{ item.body }}</span>
            <span class="mt-1 block text-[11px] font-medium text-[var(--brand-600)]">{{ item.action }}</span>
          </span>
        </button>
      </div>
    </div>

    <div class="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-elevate)] p-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-[var(--text-1)]">{{ t('chat.readiness.runtimeTitle') }}</p>
          <p class="mt-0.5 text-[11px] leading-4 text-[var(--text-3)]">{{ runtimeStatus }}</p>
        </div>
        <NButton size="tiny" quaternary :loading="discoveryLoading" @click="providersStore.discoverModels()">
          {{ t('common.retry') }}
        </NButton>
      </div>
      <div v-if="runtimeModels.length > 0" class="mt-3 flex flex-wrap gap-2">
        <NButton
          v-for="item in runtimeModels"
          :key="item.id"
          size="tiny"
          ghost
          type="primary"
          :disabled="model?.default === item.id"
          @click="useRuntimeModel(item)"
        >{{ model?.default === item.id ? t('chat.readiness.runtimeCurrent') : item.label || item.id }}</NButton>
      </div>
      <p v-else class="mt-3 text-[11px] leading-4 text-[var(--text-3)]">{{ t('chat.readiness.runtimeHint') }}</p>
    </div>

    <p v-if="activeCredentialLabel" class="mt-3 truncate text-[11px] text-[var(--text-3)]">
      {{ t('chat.readiness.credential', { credential: activeCredentialLabel }) }}
    </p>
  </section>
</template>

<style scoped>
.readiness-path-step {
  display: flex;
  min-width: 0;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 10px;
  text-align: left;
  transition:
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}

.readiness-path-step:hover {
  border-color: var(--brand-500);
  background: var(--bg-elevate);
}

.readiness-path-index {
  display: inline-flex;
  height: 22px;
  width: 22px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.readiness-path-index.is-ok {
  background: color-mix(in srgb, var(--color-success) 14%, var(--bg-card));
  color: var(--color-success);
}

.readiness-path-index.is-action {
  background: color-mix(in srgb, var(--color-warning) 14%, var(--bg-card));
  color: var(--color-warning);
}

@media (max-width: 520px) {
  .readiness-path-step {
    gap: 8px;
  }
}
</style>
