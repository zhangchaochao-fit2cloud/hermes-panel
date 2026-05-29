<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NDrawer,
  NDrawerContent,
  NButton,
  NTag,
  NCollapse,
  NCollapseItem,
  NEmpty,
  useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { WorkspaceTemplate } from '@/data/workspaces';
import { teamFor, type RoleDef } from '@/data/roles';

const { t } = useI18n();

const props = defineProps<{
  show: boolean;
  workspace: WorkspaceTemplate | null;
  active: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'activate', id: string): void;
}>();

const message = useMessage();

const accent = computed(() => props.workspace?.color ?? 'var(--brand-500)');
const iconBgStyle = computed(() => ({
  background: `${accent.value}1a`,
  color: accent.value,
}));

const roles = computed<RoleDef[]>(() =>
  props.workspace ? teamFor(props.workspace.id) : [],
);

// Toggle for the role-template accordion. Start collapsed to keep the drawer
// scannable; user clicks the button to reveal it.
const showRoleTemplates = ref(false);

async function copyPrompt(role: RoleDef): Promise<void> {
  try {
    await navigator.clipboard.writeText(role.promptPrefix);
    message.success(t('workspaces.drawer.copySuccess', { name: role.name }));
  } catch {
    message.error(t('workspaces.drawer.copyFailed'));
  }
}
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
                {{ t('workspaces.card.enabled') }}
              </NTag>
            </div>
            <p class="text-sm text-[var(--text-2)]">{{ workspace.description }}</p>
          </div>
        </div>

        <!-- Roles -->
        <section>
          <div class="flex items-baseline justify-between mb-2">
            <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)]">
              {{ t('workspaces.drawer.recommendedRoles', { n: roles.length || workspace.roles }) }}
            </h3>
            <button
              v-if="roles.length > 0"
              type="button"
              class="text-xs text-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
              @click="showRoleTemplates = !showRoleTemplates"
            >
              {{ showRoleTemplates ? t('workspaces.drawer.hidePrompts') : t('workspaces.drawer.showPrompts') }}
            </button>
          </div>

          <!-- Compact list when collapsed: just icon + name + description -->
          <div
            v-if="!showRoleTemplates && roles.length > 0"
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-elevate)] p-3 text-sm space-y-1.5"
          >
            <div
              v-for="role in roles"
              :key="role.id"
              class="flex items-start gap-2"
            >
              <span class="text-base leading-5 flex-shrink-0">{{ role.icon }}</span>
              <div class="flex-1 min-w-0">
                <span class="font-medium text-[var(--text-1)]">{{ role.name }}</span>
                <span
                  v-if="role.description"
                  class="text-[var(--text-3)] ml-1"
                >· {{ role.description }}</span>
              </div>
              <code
                class="text-[11px] font-mono text-[var(--text-3)] flex-shrink-0"
              >@{{ role.id }}</code>
            </div>
          </div>

          <!-- Expanded accordion: each role's full prompt prefix + copy -->
          <div
            v-else-if="showRoleTemplates && roles.length > 0"
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
          >
            <NCollapse arrow-placement="right" :default-expanded-names="[]">
              <NCollapseItem
                v-for="role in roles"
                :key="role.id"
                :name="role.id"
              >
                <template #header>
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="text-base flex-shrink-0">{{ role.icon }}</span>
                    <span class="font-medium text-[var(--text-1)]">{{ role.name }}</span>
                    <span
                      v-if="role.description"
                      class="text-xs text-[var(--text-3)] truncate"
                    >· {{ role.description }}</span>
                    <code
                      class="ml-auto text-[11px] font-mono text-[var(--text-3)] flex-shrink-0"
                    >@{{ role.id }}</code>
                  </div>
                </template>
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] uppercase tracking-wide text-[var(--text-3)]">
                      Prompt prefix
                    </span>
                    <NButton
                      size="tiny"
                      tertiary
                      @click.stop="copyPrompt(role)"
                    >
                      {{ t('common.copy') }}
                    </NButton>
                  </div>
                  <pre
                    class="whitespace-pre-wrap break-words text-xs text-[var(--text-2)] bg-[var(--bg-elevate)] p-3 rounded font-mono leading-relaxed border border-[var(--border)]"
                  >{{ role.promptPrefix }}</pre>
                  <p class="text-[11px] text-[var(--text-3)]">
                    {{ t('workspaces.drawer.summonPrefix') }}
                    <code class="font-mono text-[var(--text-2)]">@{{ role.id }} </code>
                    {{ t('workspaces.drawer.summonSuffix') }}
                  </p>
                </div>
              </NCollapseItem>
            </NCollapse>
          </div>

          <!-- Fallback when no roles are defined for this workspace -->
          <div
            v-else
            class="rounded-lg border border-[var(--border)] bg-[var(--bg-elevate)] p-3 text-sm"
          >
            <NEmpty
              size="small"
              :description="t('workspaces.drawer.noRoleTemplates')"
            />
          </div>
        </section>

        <!-- Suggested tools -->
        <section>
          <h3 class="text-xs uppercase tracking-wide text-[var(--text-3)] mb-2">
            {{ t('workspaces.drawer.suggestedTools') }}
          </h3>
          <div v-if="workspace.suggestedTools.length === 0" class="text-sm text-[var(--text-3)]">
            {{ t('workspaces.drawer.noSuggestions') }}
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
            {{ t('workspaces.drawer.suggestedSkills') }}
          </h3>
          <div v-if="workspace.suggestedSkills.length === 0" class="text-sm text-[var(--text-3)]">
            {{ t('workspaces.drawer.noSuggestions') }}
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
            {{ active ? t('workspaces.drawer.alreadyActive') : t('workspaces.drawer.activateNow') }}
          </NButton>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
