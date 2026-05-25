<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NInput } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import FileTreeNode from './FileTreeNode.vue';
import type { TreeNode } from '@/utils/tree-helpers';

const props = defineProps<{
  tree: TreeNode[];
  selected: string | null;
  search: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [path: string];
  'update:search': [v: string];
  'new-file': [];
}>();

const { t } = useI18n();

// Track which directories are expanded by full path.
const expanded = ref<Set<string>>(new Set());

// Auto-expand all dirs while a search query is active, so deep matches appear.
watch(
  () => props.search,
  (q) => {
    if (!q.trim()) return;
    const next = new Set(expanded.value);
    function walk(nodes: TreeNode[]): void {
      for (const n of nodes) {
        if (n.kind === 'dir') {
          next.add(n.path);
          walk(n.children);
        }
      }
    }
    walk(props.tree);
    expanded.value = next;
  },
  { flush: 'post' },
);

// Auto-expand ancestors of the selected file so it's always visible.
watch(
  () => props.selected,
  (sel) => {
    if (!sel) return;
    const parts = sel.split('/').slice(0, -1);
    if (parts.length === 0) return;
    const next = new Set(expanded.value);
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      next.add(acc);
    }
    expanded.value = next;
  },
  { immediate: true },
);

function toggleDir(path: string): void {
  const next = new Set(expanded.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expanded.value = next;
}

const searchValue = computed({
  get: () => props.search,
  set: (v: string) => emit('update:search', v),
});

function selectFile(path: string): void {
  emit('select', path);
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Search -->
    <div class="px-3 pt-3 pb-2 border-b border-[var(--border)]">
      <NInput
        v-model:value="searchValue"
        :placeholder="t('memory.searchPlaceholder')"
        size="small"
        clearable
      />
    </div>

    <!-- Tree body -->
    <div class="flex-1 min-h-0 overflow-y-auto py-1">
      <div v-if="loading" class="px-3 py-6 text-xs text-[var(--text-3)] text-center">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="tree.length === 0" class="px-3 py-6 text-xs text-[var(--text-3)] text-center">
        {{ search ? t('memory.noMatch') : t('memory.emptyTree') }}
      </div>
      <FileTreeNode
        v-for="n in tree"
        v-else
        :key="n.path"
        :node="n"
        :depth="0"
        :expanded="expanded"
        :selected="selected"
        @toggle="toggleDir"
        @select="selectFile"
      />
    </div>

    <!-- New file -->
    <button
      class="h-9 border-t border-[var(--border)] flex items-center justify-center gap-2 text-xs opacity-80 hover:opacity-100 hover:bg-[var(--bg-elevate)] transition-colors"
      @click="emit('new-file')"
    >
      <span>+</span>
      <span>{{ t('memory.newFile') }}</span>
    </button>
  </div>
</template>
