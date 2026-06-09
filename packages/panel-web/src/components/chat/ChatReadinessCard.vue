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

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <NButton size="small" type="primary" ghost @click="openProviders">
        {{ t('chat.readiness.configureModel') }}
      </NButton>
      <NButton size="small" quaternary @click="useLocalPrompt">
        {{ t('chat.readiness.tryLocal') }}
      </NButton>
      <span v-if="loading" class="text-xs text-[var(--text-3)]">{{ t('common.loading') }}</span>
      <span v-else-if="error" class="text-xs text-[var(--color-warning)]">
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
