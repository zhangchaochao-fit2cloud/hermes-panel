<script setup lang="ts">
defineProps<{
  tabs: { path: string; name: string; dirty: boolean }[];
  activePath: string | null;
}>();

const emit = defineEmits<{
  select: [path: string];
  close: [path: string];
}>();
</script>

<template>
  <div class="flex items-center h-9 bg-[var(--bg-card)] border-b border-[var(--border)] overflow-x-auto flex-shrink-0">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      class="group flex items-center gap-1.5 h-full px-3 text-xs border-r border-[var(--border)] whitespace-nowrap transition-colors shrink-0"
      :class="
        tab.path === activePath
          ? 'bg-[var(--bg-page)] text-[var(--text-1)] border-t-2 border-t-[var(--brand-500)]'
          : 'text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-elevate)] border-t-2 border-t-transparent'
      "
      @click="emit('select', tab.path)"
    >
      <span
        v-if="tab.dirty"
        class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
      />
      <span class="truncate max-w-[160px]">{{ tab.name }}</span>
      <button
        class="ml-1 w-4 h-4 flex items-center justify-center rounded text-[10px] leading-none text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-elevate)] opacity-0 group-hover:opacity-100"
        :class="{ 'opacity-100': tab.dirty }"
        @click.stop="emit('close', tab.path)"
      >
        ×
      </button>
    </button>
    <div v-if="tabs.length === 0" class="px-3 text-xs text-[var(--text-3)]">
      No files open
    </div>
  </div>
</template>
