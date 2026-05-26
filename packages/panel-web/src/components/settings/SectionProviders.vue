<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NButton, NTag, NSkeleton, NModal, NCard, NForm, NFormItem,
  NInput, NSelect, useMessage,
} from 'naive-ui';
import { useProvidersStore, type ProviderInfo } from '@/stores/providers';

const { t } = useI18n();
const store = useProvidersStore();
const message = useMessage();
const { providers, model, loading, initialized, addingCredential } = storeToRefs(store);

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

const selectedProvider = computed({
  get: () => addingFor.value,
  set: v => { addingFor.value = v; },
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
      <NSkeleton :height="64" />
      <NSkeleton :height="64" />
    </div>

    <div v-else-if="providers.length === 0" class="mt-4 text-sm text-[var(--text-3)]">
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
            <NInput :value="selectedProvider ?? ''" disabled />
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
