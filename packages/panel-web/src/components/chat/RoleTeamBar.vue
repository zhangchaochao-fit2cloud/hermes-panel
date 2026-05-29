<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NPopover } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useWorkspacesStore } from '@/stores/workspaces';
import { teamFor, type RoleDef } from '@/data/roles';

const { t } = useI18n();
const store = useWorkspacesStore();
const { activeId } = storeToRefs(store);

const team = computed<RoleDef[]>(() => activeId.value ? teamFor(activeId.value) : []);
const workspaceName = computed(() => store.activeWorkspace?.name ?? t('chat.team.defaultWorkspace'));
const expanded = ref(false);
const activeRoleId = ref<string | null>(null);

const emit = defineEmits<{
  (e: 'mention', role: RoleDef): void;
}>();

function summon(role: RoleDef): void {
  activeRoleId.value = role.id;
  emit('mention', role);
}
</script>

<template>
  <div
    v-if="team.length > 0"
    class="team-bar mb-2"
  >
    <div class="flex items-center gap-2 min-w-0">
      <div class="team-summary">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM10.5 8.5a2.2 2.2 0 1 0 0-4.4" />
          <path d="M1.8 14a3.8 3.8 0 0 1 7.4 0M8.8 14a3.2 3.2 0 0 1 5.4-2.4" />
        </svg>
        <span class="truncate">{{ workspaceName }}</span>
        <span class="team-count">{{ team.length }}</span>
      </div>
      <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto team-scroll">
        <NPopover
          v-for="role in (expanded ? team : team.slice(0, 5))"
          :key="role.id"
          trigger="hover"
          :delay="400"
        >
          <template #trigger>
            <button
              class="team-role"
              :class="{ 'is-active': activeRoleId === role.id }"
              :title="t('chat.team.summon', { id: role.id })"
              @click="summon(role)"
            >
              <span>{{ role.icon }}</span>
              <span class="font-medium">{{ role.name }}</span>
              <span class="role-id">@{{ role.id }}</span>
            </button>
          </template>
          <div class="max-w-xs">
            <div class="font-medium mb-1">{{ role.icon }} {{ role.name }}</div>
            <div class="text-xs opacity-70 mb-2">{{ role.description }}</div>
            <div class="text-[11px] opacity-60 border-t border-[var(--border)] pt-1 mt-1">
              {{ role.promptPrefix }}
            </div>
          </div>
        </NPopover>
      </div>
      <button
        v-if="team.length > 5"
        class="team-more"
        @click="expanded = !expanded"
      >
        {{ expanded ? t('chat.team.collapse') : t('chat.team.more', { n: team.length - 5 }) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.team-bar {
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--bg-card) 78%, transparent);
  padding: 7px;
  font-size: 12px;
}
.team-summary {
  display: inline-flex;
  min-width: 0;
  max-width: 148px;
  height: 28px;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 0 8px;
  color: var(--text-2);
  background: color-mix(in srgb, var(--bg-elevate) 74%, transparent);
}
.team-count {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
  color: var(--brand-600);
  font-size: 10px;
  font-weight: 700;
}
.team-scroll {
  scrollbar-width: none;
}
.team-scroll::-webkit-scrollbar {
  display: none;
}
.team-role {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0 9px;
  color: var(--text-2);
  white-space: nowrap;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.team-role:hover,
.team-role.is-active {
  border-color: color-mix(in srgb, var(--brand-500) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
  color: var(--text-1);
  transform: translateY(-1px);
}
.role-id {
  color: var(--text-3);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
}
.team-more {
  flex-shrink: 0;
  height: 28px;
  border-radius: 999px;
  padding: 0 8px;
  color: var(--text-3);
}
.team-more:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
</style>
