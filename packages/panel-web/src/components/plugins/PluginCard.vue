<script setup lang="ts">
import { NButton, NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

export interface PluginMarketItem {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon: string;
  installs: number;
  rating: number;
  installed: boolean;
  source: string;
}

defineProps<{ plugin: PluginMarketItem }>();

const emit = defineEmits<{
  (e: 'install', name: string): void;
  (e: 'view', plugin: PluginMarketItem): void;
}>();

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const categoryColors: Record<string, string> = {
  'ai-model': 'blue',
  tool: 'green',
  theme: 'purple',
  other: 'default',
};
</script>

<template>
  <div
    class="plugin-card rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-3 cursor-pointer hover:border-[var(--color-primary)] transition-colors"
    @click="emit('view', plugin)"
  >
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-[var(--bg-3)] flex items-center justify-center text-lg flex-shrink-0">
        {{ plugin.icon }}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-medium text-sm truncate">{{ plugin.name }}</span>
          <NTag v-if="plugin.installed" size="tiny" type="success" :bordered="false">
            {{ t('plugins.market.installed') }}
          </NTag>
        </div>
        <div class="text-xs text-[var(--text-3)] line-clamp-2">{{ plugin.description }}</div>
      </div>
    </div>

    <div class="flex items-center gap-2 text-xs text-[var(--text-3)]">
      <NTag size="tiny" :bordered="false" :type="(categoryColors[plugin.category] as any) || 'default'">
        {{ plugin.category }}
      </NTag>
      <span>{{ formatNumber(plugin.installs) }} {{ t('plugins.market.installs') }}</span>
      <span>★ {{ plugin.rating.toFixed(1) }}</span>
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]">
      <span class="text-xs text-[var(--text-3)]">v{{ plugin.version }}</span>
      <NButton
        v-if="!plugin.installed"
        type="primary"
        size="tiny"
        @click.stop="emit('install', plugin.name)"
      >
        {{ t('plugins.market.install') }}
      </NButton>
      <NTag v-else size="small" type="success" :bordered="false">
        {{ t('plugins.market.installed') }}
      </NTag>
    </div>
  </div>
</template>
