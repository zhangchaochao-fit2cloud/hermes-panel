<script setup lang="ts">
import { computed } from 'vue';
import type { FileEntry } from '@/utils/files-tree';

const props = defineProps<{
  node: FileEntry;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
}>();

const emit = defineEmits<{
  toggle: [path: string];
  select: [path: string];
}>();

const indent = computed(() => `${8 + props.depth * 14}px`);
const isOpen = computed(() => props.node.type === 'directory' && props.expanded.has(props.node.path));
const isSelected = computed(() => props.node.type === 'file' && props.selected === props.node.path);

function onClick(): void {
  if (props.node.type === 'directory') {
    emit('toggle', props.node.path);
  } else {
    emit('select', props.node.path);
  }
}
</script>

<template>
  <div>
    <button
      class="w-full flex items-center gap-1 px-2 py-[3px] text-xs transition-colors text-left rounded-sm border-l-2"
      :class="
        isSelected
          ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)]'
          : 'border-transparent hover:bg-[var(--bg-elevate)]'
      "
      :style="{ paddingLeft: indent }"
      @click="onClick"
    >
      <span v-if="node.type === 'directory'" class="inline-block w-3 text-[var(--text-3)] shrink-0">
        {{ isOpen ? '▾' : '▸' }}
      </span>
      <span v-else class="inline-block w-3 shrink-0" />
      <span v-if="node.type === 'directory'" class="shrink-0 text-[var(--text-3)]">📁</span>
      <span v-else class="shrink-0 text-[var(--text-3)]">📄</span>
      <span class="truncate">{{ node.name }}</span>
    </button>

    <template v-if="node.type === 'directory' && isOpen && node.children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :expanded="expanded"
        :selected="selected"
        @toggle="(p: string) => emit('toggle', p)"
        @select="(p: string) => emit('select', p)"
      />
    </template>
  </div>
</template>
