<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton, NModal, NSelect, useMessage } from 'naive-ui';
import { useProvidersStore, type ProviderCliCommandResult } from '@/stores/providers';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';

const { t } = useI18n();
const store = useProvidersStore();
const message = useMessage();
const { providerLoginLoading, providerLogoutLoading } = storeToRefs(store);

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

const authProviderInput = ref('openai');
const authCommandResult = ref<ProviderCliCommandResult | null>(null);
const logoutConfirm = ref(false);

const providerOptions = computed(() => knownProviders.map(p => ({ label: p, value: p })));
const authCommandProvider = computed(() => authProviderInput.value.trim() || 'openai');
const authCommandExamples = computed(() => [
  `hermes login ${authCommandProvider.value}`,
  `hermes logout ${authCommandProvider.value}`,
]);

async function runProviderLogin(): Promise<void> {
  authCommandResult.value = null;
  const r = await store.loginProvider(authCommandProvider.value);
  authCommandResult.value = r;
  if (r.ok) message.success(t('settings.providers.loginSuccess'));
  else message.error(`${t('settings.providers.loginFailed')}: ${r.error ?? ''}`);
}

async function runProviderLogout(): Promise<void> {
  logoutConfirm.value = false;
  authCommandResult.value = null;
  const r = await store.logoutProvider(authCommandProvider.value);
  authCommandResult.value = r;
  if (r.ok) message.success(t('settings.providers.logoutSuccess'));
  else message.error(`${t('settings.providers.logoutFailed')}: ${r.error ?? ''}`);
}
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('settings.providers.authEyebrow') }}
        </p>
        <h4 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ t('settings.providers.authTitle') }}
        </h4>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ t('settings.providers.authDesc') }}
        </p>
      </div>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
        <NSelect
          v-model:value="authProviderInput"
          :options="providerOptions"
          :placeholder="t('settings.providers.providerPlaceholder')"
          filterable
          tag
          size="small"
        />
        <div class="flex gap-2">
          <NButton
            size="small"
            type="primary"
            ghost
            :loading="providerLoginLoading"
            :disabled="providerLogoutLoading"
            @click="runProviderLogin"
          >
            {{ t('settings.providers.loginCommand') }}
          </NButton>
          <NButton
            size="small"
            ghost
            type="warning"
            :loading="providerLogoutLoading"
            :disabled="providerLoginLoading"
            @click="logoutConfirm = true"
          >
            {{ t('settings.providers.logoutCommand') }}
          </NButton>
        </div>
      </div>
    </div>

    <div class="mt-3 flex flex-col gap-2">
      <div
        v-for="command in authCommandExamples"
        :key="command"
        class="rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2"
      >
        <code class="text-xs text-[var(--text-1)]">{{ command }}</code>
      </div>
    </div>

    <ErrorBanner
      v-if="authCommandResult && !authCommandResult.ok"
      class="mt-3"
      :message="`${t('settings.providers.authErrorPrefix')} ${authCommandResult.error ?? ''}`"
      surface="inline"
    />
    <div
      v-else-if="authCommandResult"
      class="mt-3 rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-3 py-2"
    >
      <p class="mb-1 text-xs font-semibold text-[var(--text-2)]">{{ authCommandResult.source }}</p>
      <pre class="max-h-[180px] overflow-auto whitespace-pre-wrap text-xs text-[var(--text-3)]">{{ authCommandResult.stdout || t('settings.providers.authNoOutput') }}</pre>
    </div>
  </section>

  <NModal :show="logoutConfirm" @update:show="logoutConfirm = $event">
    <div class="mx-auto max-w-[380px] rounded-xl bg-[var(--bg-card)] p-6">
      <h4 class="mb-2 text-sm font-semibold text-[var(--text-1)]">
        {{ t('settings.providers.logoutConfirmTitle') }}
      </h4>
      <p class="mb-4 text-xs leading-5 text-[var(--text-3)]">
        {{ t('settings.providers.logoutConfirmDesc', { provider: authCommandProvider }) }}
      </p>
      <div class="flex justify-end gap-2">
        <NButton size="small" @click="logoutConfirm = false">
          {{ t('common.cancel') }}
        </NButton>
        <NButton size="small" type="warning" :loading="providerLogoutLoading" @click="runProviderLogout">
          {{ t('settings.providers.confirmLogout') }}
        </NButton>
      </div>
    </div>
  </NModal>
</template>
