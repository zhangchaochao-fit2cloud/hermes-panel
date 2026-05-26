<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { NTag } from 'naive-ui';
import type { SessionSource } from '@hermes-panel/shared';

const props = defineProps<{
  source: SessionSource;
  count: number;
  collapsed: boolean;
}>();

defineEmits<{ (e: 'toggle'): void }>();

const { t } = useI18n();

const meta = computed<{ icon: string; tone: 'info' | 'warning' | 'success' | 'default' }>(() => {
  switch (props.source) {
    case 'cli':        return { icon: '💬', tone: 'success' };
    case 'cron':       return { icon: '⏰', tone: 'warning' };
    case 'api_server': return { icon: '🔌', tone: 'info' };
    default:           return { icon: '❔', tone: 'default' };
  }
});

const label = computed(() => t(`sessions.source.${props.source}`));
</script>

<template>
  <button
    class="group w-full flex items-center gap-2 px-6 py-2.5 border-y border-[var(--border)] bg-[var(--bg-elevate)] hover:bg-[var(--brand-500)]/5 transition-colors text-left"
    :aria-expanded="!collapsed"
    @click="$emit('toggle')"
  >
    <span
      class="inline-block w-3 text-[10px] text-[var(--text-3)] transition-transform"
      :class="collapsed ? '' : 'rotate-90'"
    >▶</span>
    <span class="text-base leading-none">{{ meta.icon }}</span>
    <span class="text-sm font-semibold text-[var(--text-1)]">{{ label }}</span>
    <NTag size="tiny" :bordered="false" :type="meta.tone">
      {{ t('sessions.total', { n: count }) }}
    </NTag>
  </button>
</template>
