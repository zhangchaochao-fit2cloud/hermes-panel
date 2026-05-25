<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NTag } from 'naive-ui';
import type { WorkspaceTemplate } from '@/data/workspaces';

const props = defineProps<{
  workspace: WorkspaceTemplate;
  active: boolean;
}>();

const emit = defineEmits<{
  (e: 'activate', id: string): void;
  (e: 'open', id: string): void;
}>();

const ribbonStyle = computed(() => ({ background: props.workspace.color }));
const iconBgStyle = computed(() => ({
  background: `${props.workspace.color}1a`, // ~10% alpha tint
  color: props.workspace.color,
}));
</script>

<template>
  <div
    class="workspace-card group relative overflow-hidden rounded-[12px] border bg-[var(--bg-card)] shadow-[var(--shadow-1)] transition-all duration-200 hover:shadow-[var(--shadow-3)]"
    :class="active ? 'border-[color:var(--brand-500)]' : 'border-[var(--border)]'"
  >
    <!-- Left color ribbon -->
    <div
      class="absolute inset-y-0 left-0 w-[4px]"
      :style="ribbonStyle"
      aria-hidden="true"
    />

    <div class="pl-5 pr-4 py-4">
      <div class="flex items-start gap-3">
        <div
          class="h-11 w-11 flex-shrink-0 rounded-lg flex items-center justify-center text-2xl"
          :style="iconBgStyle"
        >
          {{ workspace.icon }}
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="text-base font-semibold truncate">{{ workspace.name }}</h3>
            <NTag v-if="active" size="tiny" type="success" :bordered="false">
              ✓ 已启用
            </NTag>
          </div>
          <div class="text-xs text-[var(--text-3)] mb-1">
            {{ workspace.roles }} 角色
          </div>
          <p class="text-sm text-[var(--text-2)] line-clamp-2 min-h-[2.6em]">
            {{ workspace.description }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-2">
        <NButton
          size="small"
          quaternary
          @click="emit('open', workspace.id)"
        >
          详情
        </NButton>
        <NButton
          size="small"
          :type="active ? 'default' : 'primary'"
          :disabled="active"
          @click="emit('activate', workspace.id)"
        >
          {{ active ? '当前' : '启用' }}
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-card {
  transform: translateY(0);
  transition:
    transform 200ms var(--ease, ease),
    box-shadow 200ms var(--ease, ease),
    border-color 200ms var(--ease, ease);
}
.workspace-card:hover {
  transform: translateY(-2px);
}
</style>
