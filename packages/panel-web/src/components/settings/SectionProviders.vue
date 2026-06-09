<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NButton, NTag, NModal, NCard, NForm, NFormItem,
  NInput, NSelect, useMessage,
} from 'naive-ui';
import { useProvidersStore, type ProviderInfo } from '@/stores/providers';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import ProviderAuthCommands from './ProviderAuthCommands.vue';
import ProviderModelDiscovery from './ProviderModelDiscovery.vue';
import ProviderReadinessSummary from './ProviderReadinessSummary.vue';
import ProviderSetupWizard from './ProviderSetupWizard.vue';
import ProviderOnboardingPath from './ProviderOnboardingPath.vue';

const { t } = useI18n();
const store = useProvidersStore();
const message = useMessage();
const {
  providers,
  model,
  loading,
  initialized,
  addingCredential,
} = storeToRefs(store);

// Provider id whose "+" button is being used. null = modal closed.
const addingFor = ref<string | null>(null);

// Pre-populated provider options (matches `hermes auth add` provider arg).
const knownProviders = [
  'anthropic',
  'openai',
  'openai-codex',
  'openrouter',
  'copilot',
  'xai',
  'nous',
  'google',
  'custom',
];

const addCustomProvider = ref('');
const apiKeyInput = ref('');
const labelInput = ref('');

const providerOptions = computed(() => knownProviders.map(p => ({ label: p, value: p })));
const configExamples = computed(() => {
  const current = model.value;
  if (!current) return ['hermes config set model.default gpt-4'];

  const examples = [`hermes config set model.default ${current.default || 'gpt-4'}`];
  if (current.provider) examples.push(`hermes config set model.provider ${current.provider}`);
  if (current.baseUrl) examples.push(`hermes config set model.base_url ${current.baseUrl}`);
  return examples;
});
onMounted(() => {
  if (!initialized.value) void store.load({ initial: true });
});

function startAddFor(providerId: string): void {
  // Strip suffix like `custom:api.deepseek.com` → use family for hermes auth.
  const family = providerId.split(':')[0];
  addingFor.value = family;
  apiKeyInput.value = '';
  labelInput.value = '';
  addCustomProvider.value = '';
}

function startAddNew(): void {
  addingFor.value = '';
  apiKeyInput.value = '';
  labelInput.value = '';
  addCustomProvider.value = '';
}

const effectiveProvider = computed(() =>
  addingFor.value === '' ? addCustomProvider.value.trim() : (addingFor.value ?? ''),
);

const canSubmit = computed(() =>
  effectiveProvider.value !== '' &&
  apiKeyInput.value.trim() !== '' &&
  !addingCredential.value,
);

async function submitAdd(): Promise<void> {
  if (!canSubmit.value) return;
  const r = await store.addCredential({
    provider: effectiveProvider.value,
    apiKey: apiKeyInput.value.trim(),
    label: labelInput.value.trim() || undefined,
  });
  if (r.ok) {
    message.success(t('settings.providers.addSuccess'));
    addingFor.value = null;
  } else {
    message.error(`${t('settings.providers.addFailed')}: ${r.error ?? ''}`);
  }
}

async function copyConfigExample(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    message.success(t('settings.providers.configCopied'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

function credentialSourceTitle(p: ProviderInfo): string {
  const src = p.credentials.find(c => c.active)?.source ?? p.credentials[0]?.source;
  return src ?? '—';
}

function isCurrentProvider(p: ProviderInfo): boolean {
  return model.value?.provider === p.family;
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between mb-1">
      <div>
        <h3 class="text-lg font-semibold">{{ t('settings.providers.title') }}</h3>
        <p class="text-sm opacity-60">{{ t('settings.providers.desc') }}</p>
      </div>
      <NButton size="small" type="primary" ghost @click="startAddNew">
        + {{ t('settings.providers.addNew') }}
      </NButton>
    </div>

    <div v-if="loading && !initialized" class="mt-4 space-y-2">
      <ThemedSkeleton :repeat="2" height="64px" />
    </div>

    <template v-else>
      <ProviderOnboardingPath class="mt-4" @add-credential="startAddFor" />
      <ProviderReadinessSummary class="mt-4" @add-credential="startAddFor" />
      <ProviderSetupWizard class="mt-4" @add-credential="startAddFor" />
      <ProviderModelDiscovery class="mt-4" />

      <section class="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
              {{ t('settings.providers.configEyebrow') }}
            </p>
            <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
              {{ t('settings.providers.configTitle') }}
            </h4>
            <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
              {{ t('settings.providers.configDesc') }}
            </p>
          </div>
          <NButton size="small" quaternary :loading="loading" @click="store.load()">
            {{ t('common.retry') }}
          </NButton>
        </div>

        <ErrorBanner
          v-if="store.error"
          class="mt-3"
          :message="`${t('settings.providers.configErrorPrefix')} ${store.error}`"
          :retry-label="t('common.retry')"
          surface="inline"
          @retry="store.load()"
        />

        <div
          v-if="!model"
          class="mt-3 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-3)]"
        >
          {{ t('settings.providers.configEmpty') }}
        </div>

        <div class="mt-3 flex flex-col gap-2">
          <div
            v-for="command in configExamples"
            :key="command"
            class="flex min-w-0 flex-col gap-2 rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <code class="truncate text-xs text-[var(--text-1)]">{{ command }}</code>
            <NButton size="tiny" quaternary @click="copyConfigExample(command)">
              {{ t('settings.providers.copyConfigCommand') }}
            </NButton>
          </div>
        </div>
      </section>

      <ProviderAuthCommands class="mt-4" />

      <div v-if="providers.length === 0" class="mt-4 text-sm text-[var(--text-3)]">
        {{ t('settings.providers.empty') }}
      </div>

      <div v-else class="mt-4 space-y-2">
        <div
          v-for="p in providers"
          :key="p.id"
          class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 flex items-center gap-3"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-sm font-mono">{{ p.id }}</span>
              <NTag
                v-if="isCurrentProvider(p)"
                size="tiny"
                type="success"
                :bordered="false"
              >
                ✓ {{ t('settings.providers.currentlyActive') }}
              </NTag>
              <NTag size="tiny" :bordered="false">
                {{ t('settings.providers.credCount', { n: p.credentials.length }) }}
              </NTag>
            </div>
            <div class="mt-1 text-xs text-[var(--text-3)] font-mono truncate">
              {{ credentialSourceTitle(p) }}
            </div>
          </div>
          <NButton size="small" quaternary @click="startAddFor(p.id)">
            + {{ t('settings.providers.addCredential') }}
          </NButton>
        </div>
      </div>
    </template>

    <!-- Add credential modal -->
    <NModal
      :show="addingFor !== null"
      :mask-closable="!addingCredential"
      @update:show="(v: boolean) => { if (!v) addingFor = null; }"
    >
      <NCard
        :title="t('settings.providers.modalTitle')"
        style="width: 520px; max-width: 90vw"
        :bordered="false"
        size="huge"
      >
        <NForm label-placement="top" :show-feedback="false">
          <NFormItem
            v-if="addingFor === ''"
            :label="t('settings.providers.providerLabel')"
            required
          >
            <NSelect
              v-model:value="addCustomProvider"
              :options="providerOptions"
              :placeholder="t('settings.providers.providerPlaceholder')"
              filterable
              tag
            />
          </NFormItem>
          <NFormItem v-else :label="t('settings.providers.providerLabel')">
            <NInput :value="addingFor ?? ''" disabled />
          </NFormItem>

          <NFormItem :label="t('settings.providers.apiKeyLabel')" required>
            <NInput
              v-model:value="apiKeyInput"
              type="password"
              show-password-on="click"
              :placeholder="t('settings.providers.apiKeyPlaceholder')"
            />
          </NFormItem>

          <NFormItem :label="t('settings.providers.labelLabel')">
            <NInput
              v-model:value="labelInput"
              :placeholder="t('settings.providers.labelPlaceholder')"
            />
          </NFormItem>
        </NForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <NButton :disabled="addingCredential" @click="addingFor = null">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              :loading="addingCredential"
              :disabled="!canSubmit"
              @click="submitAdd"
            >
              {{ t('settings.providers.submit') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>
