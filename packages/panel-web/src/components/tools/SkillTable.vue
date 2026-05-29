<script setup lang="ts">
import { ref, computed } from 'vue';
import { NInput, NTag } from 'naive-ui';
import { useToolsStore } from '@/stores/tools';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const tools = useToolsStore();
const { skillCategories, skills } = storeToRefs(tools);

const search = ref('');
const filteredCategories = computed(() => {
  if (!search.value.trim()) return skillCategories.value;
  const q = search.value.trim().toLowerCase();
  return skillCategories.value
    .map(([cat, list]): [string, typeof list] => [
      cat,
      list.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    ])
    .filter(([, list]) => list.length > 0);
});

const trustColor = (trust: string): 'success' | 'info' | 'warning' | 'default' => {
  if (trust === 'builtin') return 'success';
  if (trust === 'verified') return 'info';
  if (trust === 'local') return 'warning';
  return 'default';
};
</script>

<template>
  <div>
    <div class="mb-4 flex items-center gap-3">
      <NInput
        v-model:value="search"
        :placeholder="t('tools.marketplace.searchPlaceholder')"
        clearable
        size="small"
        class="max-w-xs"
      />
      <span class="text-xs text-[var(--text-3)]">{{ t('tools.marketplace.totalCount', { n: skills.length }) }}</span>
    </div>

    <div v-if="filteredCategories.length === 0" class="py-12 text-center text-sm text-[var(--text-3)]">
      {{ t('tools.marketplace.empty') }}
    </div>

    <div v-for="[cat, list] in filteredCategories" :key="cat" class="mb-6">
      <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)] mb-2">
        {{ cat }} · {{ list.length }}
      </h3>
      <div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="s in list"
          :key="`${cat}-${s.name}`"
          class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono truncate">{{ s.name }}</span>
            <NTag size="tiny" :type="trustColor(s.trust)" :bordered="false">
              {{ s.trust }}
            </NTag>
          </div>
          <div class="text-xs text-[var(--text-3)]">{{ t('tools.marketplace.sourceLabel') }}: {{ s.source }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
