<script setup lang="ts">
import { NButton, NModal, NCard, NTag, NSpin, useMessage } from 'naive-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePluginsStore } from '@/stores/plugins';
import type { PluginMarketItem } from './PluginCard.vue';

const { t } = useI18n();
const store = usePluginsStore();
const message = useMessage();

const props = defineProps<{
  show: boolean;
  plugin: PluginMarketItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'installed'): void;
}>();

const installing = ref(false);

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

async function handleInstall(): Promise<void> {
  if (!props.plugin || installing.value) return;
  installing.value = true;
  const result = await store.install(props.plugin.source);
  installing.value = false;
  if (result.ok) {
    message.success(t('plugins.market.installSuccess', { name: props.plugin.name }));
    emit('installed');
    emit('update:show', false);
  } else {
    const reason = result.message || result.error || '';
    message.error(`${t('plugins.market.installFailed', { name: props.plugin.name })}${reason ? ` (${reason})` : ''}`);
  }
}

function handleClose(): void {
  if (installing.value) return;
  emit('update:show', false);
}
</script>

<template>
  <NModal :show="show" :mask-closable="!installing" @update:show="emit('update:show', $event)">
    <NCard
      v-if="plugin"
      :title="plugin.name"
      style="width: 560px; max-width: 90vw"
      :bordered="false"
      size="huge"
    >
      <template #header-extra>
        <NTag size="tiny" :bordered="false">
          v{{ plugin.version }}
        </NTag>
      </template>

      <div class="flex flex-col gap-4">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-lg bg-[var(--bg-3)] flex items-center justify-center text-xl flex-shrink-0">
            {{ plugin.icon }}
          </div>
          <div class="flex-1">
            <div class="text-sm text-[var(--text-2)] mb-1">{{ plugin.description }}</div>
            <div class="flex items-center gap-3 text-xs text-[var(--text-3)]">
              <span>{{ t('plugins.market.author') }}: {{ plugin.author }}</span>
              <NTag size="tiny" :bordered="false">{{ plugin.category }}</NTag>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-lg bg-[var(--bg-3)] p-3">
            <div class="text-lg font-medium">{{ formatNumber(plugin.installs) }}</div>
            <div class="text-xs text-[var(--text-3)]">{{ t('plugins.market.installs') }}</div>
          </div>
          <div class="rounded-lg bg-[var(--bg-3)] p-3">
            <div class="text-lg font-medium">★ {{ plugin.rating.toFixed(1) }}</div>
            <div class="text-xs text-[var(--text-3)]">{{ t('plugins.market.rating') }}</div>
          </div>
          <div class="rounded-lg bg-[var(--bg-3)] p-3">
            <div class="text-lg font-medium">v{{ plugin.version }}</div>
            <div class="text-xs text-[var(--text-3)]">{{ t('plugins.market.version') }}</div>
          </div>
        </div>

        <div class="text-xs text-[var(--text-3)]">
          <span class="font-medium">{{ t('plugins.market.source') }}:</span> {{ plugin.source }}
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton :disabled="installing" @click="handleClose">
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            v-if="!plugin.installed"
            type="primary"
            :loading="installing"
            :disabled="plugin.installed"
            @click="handleInstall"
          >
            {{ t('plugins.market.install') }}
          </NButton>
          <NTag v-else size="medium" type="success" :bordered="false">
            {{ t('plugins.market.installed') }}
          </NTag>
        </div>
      </template>
    </NCard>
  </NModal>
</template>
