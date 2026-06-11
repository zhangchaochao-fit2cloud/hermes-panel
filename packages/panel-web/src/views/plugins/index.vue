<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { NInput, NButton, NTag, NSpin, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { usePluginMarketStore } from '@/stores/plugin-market';
import { usePluginsStore } from '@/stores/plugins';
import PluginCard, { type PluginMarketItem } from '@/components/plugins/PluginCard.vue';
import PluginDetail from '@/components/plugins/PluginDetail.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import InstallPluginModal from '@/components/tools/InstallPluginModal.vue';

const { t } = useI18n();
const msg = useMessage();
const marketStore = usePluginMarketStore();
const pluginsStore = usePluginsStore();

const search = ref('');
const activeCategory = ref('all');
const detailOpen = ref(false);
const selectedPlugin = ref<PluginMarketItem | null>(null);
const installModalOpen = ref(false);

const categoryLabels: Record<string, string> = {
  all: 'plugins.market.categories.all',
  'ai-model': 'plugins.market.categories.aiModel',
  tool: 'plugins.market.categories.tool',
  theme: 'plugins.market.categories.theme',
  other: 'plugins.market.categories.other',
};

const filteredPlugins = computed(() => {
  let list = marketStore.plugins;
  if (activeCategory.value !== 'all') {
    list = list.filter(p => p.category === activeCategory.value);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
    );
  }
  return list;
});

onMounted(async () => {
  if (pluginsStore.initialized) {
    for (const p of pluginsStore.plugins) {
      marketStore.markInstalled(p.name);
    }
  }
  await Promise.all([
    marketStore.fetchMarketplace(),
    pluginsStore.initialized ? Promise.resolve() : pluginsStore.load(),
  ]);
  for (const p of pluginsStore.plugins) {
    marketStore.markInstalled(p.name);
  }
});

function handleCategoryClick(cat: string): void {
  activeCategory.value = cat;
}

function handleViewDetail(plugin: PluginMarketItem): void {
  selectedPlugin.value = plugin;
  detailOpen.value = true;
}

function handleInstallFromCard(name: string): void {
  const plugin = marketStore.plugins.find(p => p.name === name);
  if (plugin) {
    selectedPlugin.value = plugin;
    installModalOpen.value = true;
  }
}

async function handleInstalled(): Promise<void> {
  if (selectedPlugin.value) {
    marketStore.markInstalled(selectedPlugin.value.name);
  }
}
</script>

<template>
  <ViewErrorBoundary name="plugin-market">
    <div class="plugin-market-page px-6 py-6 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('plugins.market.title') }}</h2>
          <p class="text-sm text-[var(--text-3)]">{{ t('plugins.market.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3 mb-5">
        <NInput
          v-model:value="search"
          :placeholder="t('plugins.market.searchPlaceholder')"
          class="max-w-xs"
          clearable
        />
        <div class="flex-1" />
        <span class="text-xs text-[var(--text-3)]">
          {{ t('plugins.market.totalCount', { n: marketStore.totalPlugins }) }}
        </span>
      </div>

      <div class="flex gap-2 mb-5 border-b border-[var(--border)] overflow-x-auto">
        <button
          v-for="cat in marketStore.categories"
          :key="cat"
          class="px-4 py-2 text-sm font-medium transition-colors -mb-px whitespace-nowrap"
          :class="activeCategory === cat
            ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
            : 'text-[var(--text-3)] hover:text-[var(--text-1)]'"
          @click="handleCategoryClick(cat)"
        >
          {{ cat === 'all' ? t(categoryLabels.all) : cat }}
        </button>
      </div>

      <div v-if="marketStore.loading" class="py-16 flex justify-center">
        <NSpin size="large" />
      </div>
      <div v-else-if="filteredPlugins.length === 0" class="py-16">
        <EmptyState
          icon="📦"
          :title="t('plugins.market.emptyTitle')"
          :subtitle="t('plugins.market.emptyDescription')"
        />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <PluginCard
          v-for="plugin in filteredPlugins"
          :key="plugin.name"
          :plugin="plugin"
          @install="handleInstallFromCard"
          @view="handleViewDetail"
        />
      </div>

      <PluginDetail
        v-model:show="detailOpen"
        :plugin="selectedPlugin"
        @installed="handleInstalled"
      />

      <InstallPluginModal v-model:show="installModalOpen" @installed="handleInstalled" />
    </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.plugin-market-page { min-height: calc(100vh - 140px); }
</style>
