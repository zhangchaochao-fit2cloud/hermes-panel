<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useToolsStore } from '@/stores/tools';
import EmptyState from '@/components/shared/EmptyState.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

const { t } = useI18n();
const tools = useToolsStore();
const { mcpServers, loadingMcp } = storeToRefs(tools);
</script>

<template>
  <div>
    <div v-if="loadingMcp" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <ThemedSkeleton v-for="i in 3" :key="i" height="82px" />
    </div>

    <EmptyState
      v-else-if="mcpServers.length === 0"
      icon="◇"
      :title="t('tools.mcp.emptyTitle')"
      :subtitle="t('tools.mcp.emptyDescription')"
    >
      <div class="inline-block rounded-md bg-[var(--bg-elevate)] border border-[var(--border)] px-3 py-2 font-mono text-xs text-left">
        hermes mcp add &lt;name&gt; --url &lt;endpoint&gt;
      </div>
    </EmptyState>

    <div v-else class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="s in mcpServers"
        :key="s.name"
        class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <div class="font-mono font-medium text-sm mb-1">{{ s.name }}</div>
        <div class="text-xs text-[var(--text-3)]">
          {{ s.configured ? t('tools.mcp.statusConfigured') : t('tools.mcp.statusUnconfigured') }}
        </div>
      </div>
    </div>
  </div>
</template>
