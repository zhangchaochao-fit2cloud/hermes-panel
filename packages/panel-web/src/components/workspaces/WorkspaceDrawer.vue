<script setup lang="ts">
import { computed } from 'vue';
import { NDrawer, NDrawerContent, NButton, NTag } from 'naive-ui';
import type { WorkspaceTemplate } from '@/data/workspaces';

const props = defineProps<{
  show: boolean;
  workspace: WorkspaceTemplate | null;
  active: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'activate', id: string): void;
}>();

const accent = computed(() => props.workspace?.color ?? 'var(--brand-500)');
const iconBgStyle = computed(() => ({
  background: `${accent.value}1a`,
  color: accent.value,
}));
</script>

<template>
  <NDrawer
    :show="show"
    :width="440"
    placement="right"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <NDrawerContent
      :title="workspace?.name ?? ''"
      closable
      :native-scrollbar="false"
    >
      <div v-if="workspace" class="space-y-6">
        <!-- Header card -->
        <div class="flex items-start gap-3">
          <div
            class="h-14 w-14 flex-shrink-0 rounded-xl flex items-center justify-center text-3xl"
            :style="iconBgStyle"
          >
            {{ workspace.icon }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-lg font-semibold">{{ workspace.name }}</h2>
              <NTag v-if="active" size="small" type="success" :bordered="false">
                ✓ 已启用
              </NTag>
            </div>
            <p class="text-sm text-[var(--text-2)]">{{ workspace.description }}</p>
          </div>
        </div>

        <!-- Roles -->
        <section>
          <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)] mb-2">
            推荐角色 · {{ workspace.roles }}
          </h3>
          <div class="rounded-lg border border-[var(--border)] bg-[var(--bg-elevate)] p-3 text-sm">
            <p class="text-[var(--text-2)]">
              此工作环境内置 <span class="font-semibold text-[var(--text-1)]">{{ workspace.roles }}</span>
              个角色 prompt 模板。详细配置将在 v0.2 提供。
            </p>
          </div>
        </section>

        <!-- Suggested tools -->
        <section>
          <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)] mb-2">
            推荐工具
          </h3>
          <div v-if="workspace.suggestedTools.length === 0" class="text-sm text-[var(--text-3)]">
            暂无推荐
          </div>
          <div v-else class="flex flex-wrap gap-1.5">
            <NTag
              v-for="t in workspace.suggestedTools"
              :key="t"
              size="small"
              :bordered="false"
              type="info"
            >
              {{ t }}
            </NTag>
          </div>
        </section>

        <!-- Suggested skills -->
        <section>
          <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)] mb-2">
            推荐技能
          </h3>
          <div v-if="workspace.suggestedSkills.length === 0" class="text-sm text-[var(--text-3)]">
            暂无推荐
          </div>
          <div v-else class="flex flex-wrap gap-1.5">
            <NTag
              v-for="s in workspace.suggestedSkills"
              :key="s"
              size="small"
              :bordered="false"
            >
              {{ s }}
            </NTag>
          </div>
        </section>

        <!-- Actions -->
        <div class="pt-2 flex items-center gap-2">
          <NButton
            type="primary"
            :disabled="active"
            @click="emit('activate', workspace.id)"
          >
            {{ active ? '已是当前工作环境' : '立即启用' }}
          </NButton>
          <NButton disabled>查看角色 prompt 模板</NButton>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
