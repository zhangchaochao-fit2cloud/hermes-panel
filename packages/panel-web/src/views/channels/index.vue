<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NTag, NModal } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { ChannelName } from '@hermes-panel/shared';
import { useChannelsStore } from '@/stores/channels';
import ChannelCard from '@/components/channels/ChannelCard.vue';
import ChannelConfigForm from '@/components/channels/ChannelConfigForm.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import CodeBlock from '@/components/shared/CodeBlock.vue';
import FeatureTaskBridge from '@/components/shared/FeatureTaskBridge.vue';

const { t } = useI18n();
const store = useChannelsStore();
const activeChannel = ref<ChannelName | null>(null);
const showConfig = ref(false);
const restartConfirm = ref(false);

onMounted(() => {
  store.fetchAll();
  store.loadPairingList();
});

function openConfig(name: ChannelName): void {
  activeChannel.value = name;
  showConfig.value = true;
}

function closeConfig(): void {
  showConfig.value = false;
  activeChannel.value = null;
}

async function handleRestart(): Promise<void> {
  restartConfirm.value = false;
  await store.restartGateway();
}
</script>

<template>
  <ViewErrorBoundary name="channels">
  <div class="channels-page px-6 py-6 max-w-[1200px] mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('channels.title') }}</h2>
        <p class="text-sm text-[var(--text-3)]">{{ t('channels.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <NTag :type="store.gatewayRunning ? 'success' : 'default'" size="small">
          Gateway {{ store.gatewayRunning ? t('channels.gatewayRunning') : t('channels.gatewayStopped') }}
        </NTag>
        <NButton
          size="small"
          :loading="store.saving === 'gateway'"
          @click="restartConfirm = true"
        >{{ t('channels.restartGateway') }}</NButton>
      </div>
    </div>

    <FeatureTaskBridge
      class="mb-5"
      icon="channels"
      :eyebrow="t('channels.taskBridge.eyebrow')"
      :title="t('channels.taskBridge.title')"
      :description="t('channels.taskBridge.desc')"
      :example="t('channels.taskBridge.example')"
      :prompt="t('channels.taskBridge.prompt')"
      :action-label="t('channels.taskBridge.action')"
      :secondary-label="t('channels.taskBridge.secondary')"
      secondary-to="/developer#logs"
      command="hermes pairing list"
    />

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <span class="text-sm text-[var(--text-3)]">{{ t('channels.loading') }}</span>
    </div>

    <!-- Error -->
    <ErrorBanner
      v-else-if="store.error"
      :message="store.error"
      :retry-label="t('channels.retry')"
      @retry="store.fetchAll()"
    />

    <!-- First-time setup hint -->
    <div v-if="!store.loading && !store.error && store.channels.length > 0 && store.enabledCount === 0"
      class="mb-6 p-4 rounded-xl border border-[color-mix(in_srgb,var(--brand-500)_20%,var(--border))] bg-[color-mix(in_srgb,var(--brand-500)_4%,var(--bg-card))]"
    >
      <p class="text-sm font-medium text-[var(--brand-600)] mb-1">{{ t('channels.setupHint.title') }}</p>
      <p class="text-xs text-[var(--text-3)]">{{ t('channels.setupHint.desc') }}</p>
    </div>

    <section
      v-if="!store.loading"
      class="mb-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
            {{ t('channels.pairing.eyebrow') }}
          </p>
          <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
            {{ t('channels.pairing.title') }}
          </h3>
          <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
            {{ t('channels.pairing.desc') }}
          </p>
        </div>
        <NButton size="small" quaternary :loading="store.pairingLoading" @click="store.loadPairingList()">
          {{ t('channels.pairing.refresh') }}
        </NButton>
      </div>

      <ErrorBanner
        v-if="store.pairingError"
        class="mt-3"
        :message="`${t('channels.pairing.errorPrefix')} ${store.pairingError}`"
        :retry-label="t('channels.pairing.refresh')"
        surface="inline"
        @retry="store.loadPairingList()"
      />

      <CodeBlock
        v-if="store.pairingList?.stdout"
        class="mt-3"
        :code="store.pairingList.stdout.trimEnd()"
        :lang="store.pairingList.source"
        max-height="220px"
      />
      <div
        v-else-if="!store.pairingLoading && !store.pairingError"
        class="mt-3 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-3)]"
      >
        {{ t('channels.pairing.empty') }}
      </div>
    </section>

    <!-- Channel Grid -->
    <div v-if="!store.loading && !store.error" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <ChannelCard
        v-for="ch in store.channels"
        :key="ch.name"
        :channel="ch"
        :saving="store.saving === ch.name"
        @configure="openConfig"
      />
    </div>

    <!-- Enabled channels summary -->
    <div v-if="store.enabledCount > 0" class="mt-6 p-4 rounded-xl border border-[color-mix(in_srgb,var(--brand-500)_15%,var(--border))] bg-[color-mix(in_srgb,var(--brand-500)_3%,var(--bg-card))]">
      <p class="text-sm text-[var(--text-2)]">
        {{ t('channels.enabledSummary', { count: store.enabledCount }) }}
        {{ t('channels.restartNote') }}
      </p>
    </div>

    <!-- Config Drawer -->
    <ChannelConfigForm
      v-if="activeChannel"
      :name="activeChannel"
      :visible="showConfig"
      @close="closeConfig"
    />

    <!-- Restart Confirm Modal -->
    <NModal :show="restartConfirm" @update:show="restartConfirm = $event">
      <div class="bg-[var(--bg-card)] rounded-xl p-6 max-w-[360px] mx-auto">
        <h4 class="text-sm font-semibold text-[var(--text-1)] mb-2">{{ t('channels.restartConfirmTitle') }}</h4>
        <p class="text-xs text-[var(--text-3)] mb-4">{{ t('channels.restartConfirmDesc') }}</p>
        <div class="flex gap-3 justify-end">
          <NButton size="small" @click="restartConfirm = false">{{ t('channels.cancel') }}</NButton>
          <NButton size="small" type="primary" :loading="store.saving === 'gateway'" @click="handleRestart">{{ t('channels.confirmRestart') }}</NButton>
        </div>
      </div>
    </NModal>
  </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.channels-page {
  min-height: calc(100vh - 140px);
}
</style>
