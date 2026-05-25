<script setup lang="ts">
import { computed } from 'vue';
import { NTooltip } from 'naive-ui';
import type { TreeNode } from '@/utils/tree-helpers';

const props = defineProps<{
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
}>();

const emit = defineEmits<{
  toggle: [path: string];
  select: [path: string];
}>();

const indent = computed(() => `${8 + props.depth * 12}px`);
const isOpen = computed(() => props.node.kind === 'dir' && props.expanded.has(props.node.path));
const isSelected = computed(() => props.node.kind === 'file' && props.selected === props.node.path);

function onClick(): void {
  if (props.node.kind === 'dir') emit('toggle', props.node.path);
  else emit('select', props.node.path);
}
</script>

<template>
  <div>
    <!-- Directory row -->
    <button
      v-if="node.kind === 'dir'"
      class="w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-[var(--bg-elevate)] transition-colors text-left rounded-sm"
      :style="{ paddingLeft: indent }"
      @click="onClick"
    >
      <span class="inline-block w-3 text-[var(--text-3)] flex-shrink-0">{{ isOpen ? '▾' : '▸' }}</span>
      <span class="opacity-70 flex-shrink-0">📁</span>
      <span class="truncate font-medium">{{ node.name }}</span>
      <span class="ml-auto text-[10px] opacity-50 flex-shrink-0">{{ node.children.length }}</span>
    </button>

    <!-- File row -->
    <template v-else>
      <NTooltip
        v-if="node.file.preview"
        trigger="hover"
        placement="right"
        :delay="300"
        :style="{ maxWidth: '360px' }"
      >
        <template #trigger>
          <button
            class="w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors text-left rounded-sm border-l-2"
            :class="
              isSelected
                ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)]'
                : 'border-transparent hover:bg-[var(--bg-elevate)]'
            "
            :style="{ paddingLeft: indent }"
            @click="onClick"
          >
            <span class="inline-block w-3 flex-shrink-0" />
            <span class="opacity-70 flex-shrink-0">📄</span>
            <span class="truncate font-mono">{{ node.name }}</span>
          </button>
        </template>
        <div
          class="text-[11px] font-mono whitespace-pre-wrap leading-relaxed"
          style="max-height: 200px; overflow: hidden;"
        >{{ node.file.preview }}</div>
      </NTooltip>
      <button
        v-else
        class="w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors text-left rounded-sm border-l-2"
        :class="
          isSelected
            ? 'bg-[var(--brand-500)]/10 text-[var(--brand-600)] border-[var(--brand-500)]'
            : 'border-transparent hover:bg-[var(--bg-elevate)]'
        "
        :style="{ paddingLeft: indent }"
        @click="onClick"
      >
        <span class="inline-block w-3 flex-shrink-0" />
        <span class="opacity-70 flex-shrink-0">📄</span>
        <span class="truncate font-mono">{{ node.name }}</span>
      </button>
    </template>

    <!-- Children -->
    <div v-if="node.kind === 'dir' && isOpen">
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
    </div>
  </div>
</template>
