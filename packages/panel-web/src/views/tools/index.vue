<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NInput, NTabs, NTabPane, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useToolsStore } from '@/stores/tools';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import ToolCard from '@/components/tools/ToolCard.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import SkillTable from '@/components/tools/SkillTable.vue';
import SkillMarketplace from '@/components/tools/SkillMarketplace.vue';
import McpServerList from '@/components/tools/McpServerList.vue';
import PluginsList from '@/components/tools/PluginsList.vue';

const { t } = useI18n();
const store = useToolsStore();
const message = useMessage();
const { tools, loadingTools, enabledCount, totalCount } = storeToRefs(store);

const tab = ref<'tools' | 'mcp' | 'skills' | 'plugins'>('tools');
const skillsSubTab = ref<'installed' | 'marketplace'>('installed');
const search = ref('');

const filteredTools = computed(() => {
  if (!search.value.trim()) return tools.value;
  const q = search.value.trim().toLowerCase();
  return tools.value.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.label?.toLowerCase().includes(q) ?? false)
  );
});

onMounted(async () => {
  await store.loadTools();
  // Lazy-load others when their tabs are opened the first time
});

async function onTabChange(name: string): Promise<void> {
  tab.value = name as 'tools' | 'mcp' | 'skills' | 'plugins';
  if (name === 'skills' && store.skills.length === 0) await store.loadSkills();
  if (name === 'mcp' && store.mcpServers.length === 0) await store.loadMcp();
  // Plugins lazy-load themselves in PluginsList's onMounted, so nothing here.
}

async function onSkillsSubTabChange(name: string): Promise<void> {
  skillsSubTab.value = name as 'installed' | 'marketplace';
  if (name === 'marketplace' && store.availableSkills.length === 0) {
    await store.browseSkills();
  }
}

async function onToggle(name: string, enabled: boolean): Promise<void> {
  const ok = await store.toggleTool(name, enabled);
  if (ok) {
    message.success(`${enabled ? t('tools.enabled') : t('tools.disabled')} · ${name}`, { duration: 2000 });
  } else {
    message.error(`切换 ${name} 失败`, { duration: 3000 });
  }
}
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="max-w-6xl mx-auto px-6 py-6">
      <header class="mb-6">
        <h1 class="text-xl font-semibold mb-1">{{ t('tools.title') }}</h1>
        <p class="text-sm text-[var(--text-3)]">{{ t('tools.subtitle') }}</p>
      </header>

      <NTabs :value="tab" type="line" animated @update:value="onTabChange">
        <!-- 内置工具 -->
        <NTabPane name="tools" :tab="t('tools.tabs.builtin')">
          <div class="flex items-center gap-3 mb-4">
            <NInput
              v-model:value="search"
              :placeholder="t('tools.searchPlaceholder')"
              clearable
              size="small"
              class="max-w-xs"
            />
            <span class="text-xs text-[var(--text-3)]">
              {{ t('tools.enabledOf', { enabled: enabledCount, total: totalCount }) }}
            </span>
          </div>

          <div v-if="loadingTools" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ThemedSkeleton v-for="i in 6" :key="i" height="100px" />
          </div>

          <EmptyState
            v-else-if="filteredTools.length === 0"
            :title="t('tools.empty')"
            :description="t('tools.emptyHint')"
          >🔧</EmptyState>

          <div v-else class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              v-for="tool in filteredTools"
              :key="tool.name"
              :tool="tool"
              @toggle="onToggle"
            />
          </div>
        </NTabPane>

        <!-- MCP 服务 -->
        <NTabPane name="mcp" :tab="t('tools.tabs.mcp')">
          <McpServerList />
        </NTabPane>

        <!-- 技能 -->
        <NTabPane name="skills" :tab="t('tools.tabs.skills')">
          <NTabs
            :value="skillsSubTab"
            type="segment"
            size="small"
            animated
            class="mb-4"
            @update:value="onSkillsSubTabChange"
          >
            <NTabPane name="installed" :tab="t('tools.skills.tabs.installed')">
              <SkillTable />
            </NTabPane>
            <NTabPane name="marketplace" :tab="t('tools.skills.tabs.marketplace')">
              <SkillMarketplace />
            </NTabPane>
          </NTabs>
        </NTabPane>

        <!-- 插件 -->
        <NTabPane name="plugins" :tab="t('tools.tabs.plugins')">
          <PluginsList />
        </NTabPane>
      </NTabs>
    </div>
  </div>
</template>
