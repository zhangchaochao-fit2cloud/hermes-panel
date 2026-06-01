<script setup lang="ts">
import { ref, computed } from 'vue';
import { NInput } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import FileTreeNode from './FileTreeNode.vue';
import type { FileEntry } from '@/utils/files-tree';

const props = defineProps<{
  tree: FileEntry[];
  selected: string | null;
  search: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [path: string];
  'update:search': [v: string];
}>();

const { t } = useI18n();
const expanded = ref<Set<string>>(new Set());

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

function walkAndFilter(nodes: FileEntry[], query: string): FileEntry[] {
  const q = query.toLowerCase();
  const out: FileEntry[] = [];
  for (const n of nodes) {
    if (n.name.toLowerCase().includes(q)) {
      out.push(n);
    } else if (n.type === 'directory' && n.children) {
      const filtered = walkAndFilter(n.children, q);
      if (filtered.length > 0) {
        out.push({ ...n, children: filtered });
      }
    }
  }
  return out;
}

const filteredTree = computed(() => {
  const q = props.search.trim();
  if (!q) return props.tree;
  return walkAndFilter(props.tree, q);
});
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="px-3 pt-3 pb-2 border-b border-[var(--border)]">
      <NInput
        v-model:value="searchValue"
        :placeholder="t('files.searchPlaceholder')"
        size="small"
        clearable
      />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto py-1">
      <div v-if="loading" class="px-3 py-6 text-xs text-[var(--text-3)] text-center">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="filteredTree.length === 0" class="px-3 py-6 text-xs text-[var(--text-3)] text-center">
        {{ search ? t('files.noMatch') : t('files.emptyTree') }}
      </div>
      <FileTreeNode
        v-for="n in filteredTree"
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
  </div>
</template>
