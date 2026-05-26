<script setup lang="ts">
import { computed } from 'vue';
import { NInput, NSelect, NButton, NButtonGroup, NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { SourceFilter, ViewMode, GroupBy } from '@/stores/sessions';

const props = defineProps<{
  search: string;
  source: SourceFilter;
  view: ViewMode;
  groupBy: GroupBy;
  total: number;
}>();

const emit = defineEmits<{
  (e: 'update:search', value: string): void;
  (e: 'update:source', value: SourceFilter): void;
  (e: 'update:view', value: ViewMode): void;
  (e: 'update:groupBy', value: GroupBy): void;
  (e: 'create'): void;
  (e: 'exportAll'): void;
}>();

const { t } = useI18n();

const searchModel = computed({
  get: () => props.search,
  set: v => emit('update:search', v),
});

const sourceModel = computed({
  get: () => props.source,
  set: v => emit('update:source', v as SourceFilter),
});

const sourceOptions = computed(() => [
  { label: t('sessions.source.all'), value: 'all' },
  { label: t('sessions.source.cli'), value: 'cli' },
  { label: t('sessions.source.cron'), value: 'cron' },
  { label: t('sessions.source.api_server'), value: 'api_server' },
]);

function setView(v: ViewMode): void {
  emit('update:view', v);
}

function toggleGroup(): void {
  emit('update:groupBy', props.groupBy === 'source' ? 'none' : 'source');
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]"
  >
    <!-- search -->
    <div class="w-72 max-w-full">
      <NInput
        v-model:value="searchModel"
        :placeholder="t('sessions.searchPlaceholder')"
        clearable
        size="small"
      >
        <template #prefix>
          <span class="opacity-60">🔍</span>
        </template>
      </NInput>
    </div>

    <!-- source filter -->
    <div class="w-36">
      <NSelect
        v-model:value="sourceModel"
        :options="sourceOptions"
        size="small"
      />
    </div>

    <!-- total -->
    <NTag size="small" :bordered="false" type="default">
      {{ t('sessions.total', { n: total }) }}
    </NTag>

    <div class="flex-1" />

    <!-- group toggle -->
    <NButton
      size="small"
      :type="groupBy === 'source' ? 'primary' : 'default'"
      :ghost="groupBy === 'source'"
      :title="groupBy === 'source' ? t('sessions.groupBy.grouped') : t('sessions.groupBy.none')"
      @click="toggleGroup"
    >
      <span class="mr-1">{{ groupBy === 'source' ? '▼' : '▶' }}</span>
      {{ t('sessions.groupBy.title') }}
    </NButton>

    <!-- view toggle -->
    <NButtonGroup size="small">
      <NButton
        :type="view === 'table' ? 'primary' : 'default'"
        :ghost="view === 'table'"
        @click="setView('table')"
      >
        <span class="mr-1">≡</span>{{ t('sessions.view.table') }}
      </NButton>
      <NButton
        :type="view === 'grid' ? 'primary' : 'default'"
        :ghost="view === 'grid'"
        @click="setView('grid')"
      >
        <span class="mr-1">▦</span>{{ t('sessions.view.grid') }}
      </NButton>
    </NButtonGroup>

    <!-- export filtered -->
    <NButton size="small" @click="emit('exportAll')">
      {{ t('sessions.exportAll') }}
    </NButton>

    <!-- new session -->
    <NButton size="small" type="primary" @click="emit('create')">
      + {{ t('sessions.new') }}
    </NButton>
  </div>
</template>
