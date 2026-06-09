<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { NButton, NTag } from 'naive-ui';
import { useProvidersStore } from '@/stores/providers';
import { useExecutionMode } from '@/composables/useExecutionMode';

const props = defineProps<{ chatModel: string }>();
const emit = defineEmits<{ (e: 'pick-prompt', prompt: string): void }>();

const { t } = useI18n();
const router = useRouter();
const providersStore = useProvidersStore();
const { model, providers, initialized, loading, error, activeCredentialLabel } = storeToRefs(providersStore);
const { modeLabel } = useExecutionMode();

onMounted(() => {
  if (!initialized.value) void providersStore.load({ initial: true });
});

const configuredProviderCount = computed(() => providers.value.length);
const currentModelName = computed(() => model.value?.default || props.chatModel || t('model.switcher.unset'));
const currentProviderName = computed(() => model.value?.provider || t('chat.readiness.providerUnset'));
const modelReady = computed(() =>
  !!model.value?.default && (
    !!model.value.hasApiKey
    || !!model.value.activeCredential
    || providers.value.some(provider => provider.family === model.value?.provider)
  )
);

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

function openProviders(): void {
  void router.push({ path: '/settings', hash: '#providers' });
}

function useLocalPrompt(): void {
  emit('pick-prompt', t('chat.readiness.localPrompt'));
}

function useModelCheckPrompt(): void {
  emit('pick-prompt', t('chat.readiness.modelCheckPrompt'));
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

    <div class="readiness-actions mt-4 flex flex-wrap items-center gap-2">
      <NButton class="readiness-action" size="small" type="primary" ghost @click="openProviders">
        {{ t('chat.readiness.configureModel') }}
      </NButton>
      <NButton class="readiness-action" size="small" quaternary @click="useLocalPrompt">
        {{ t('chat.readiness.tryLocal') }}
      </NButton>
      <span v-if="loading" class="text-xs text-[var(--text-3)]">{{ t('common.loading') }}</span>
      <span v-else-if="error" class="readiness-warning text-xs text-[var(--color-warning)]">
        {{ t('chat.readiness.stateWarning', { error }) }}
      </span>
      <span v-else class="text-xs text-[var(--text-3)]">
        {{ t('chat.readiness.providersSeen', { n: configuredProviderCount }) }}
      </span>
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
  .readiness-actions {
    align-items: stretch;
  }

  .readiness-action {
    max-width: 100%;
  }

  .readiness-warning {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .readiness-path-step {
    gap: 8px;
  }
}
</style>
