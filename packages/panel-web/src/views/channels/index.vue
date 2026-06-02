<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NTag, NModal } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { ChannelName } from '@hermes-panel/shared';
import { useChannelsStore } from '@/stores/channels';
import ChannelCard from '@/components/channels/ChannelCard.vue';
import ChannelConfigForm from '@/components/channels/ChannelConfigForm.vue';

const { t } = useI18n();
const store = useChannelsStore();
const activeChannel = ref<ChannelName | null>(null);
const showConfig = ref(false);
const restartConfirm = ref(false);

onMounted(() => {
  store.fetchAll();
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

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <span class="text-sm text-[var(--text-3)]">{{ t('channels.loading') }}</span>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="py-20 text-center">
      <p class="text-sm text-[var(--text-3)] mb-3">{{ store.error }}</p>
      <NButton size="small" @click="store.fetchAll()">{{ t('channels.retry') }}</NButton>
    </div>

    <!-- Channel Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
</template>

<style scoped>
.channels-page {
  min-height: calc(100vh - 140px);
}
</style>
