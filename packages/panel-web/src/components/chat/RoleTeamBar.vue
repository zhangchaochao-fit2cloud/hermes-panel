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
const expanded = ref(false);

const emit = defineEmits<{
  (e: 'mention', role: RoleDef): void;
}>();

function summon(role: RoleDef): void {
  emit('mention', role);
}
</script>

<template>
  <div
    v-if="team.length > 0"
    class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 mb-2 text-xs"
  >
    <div class="flex items-center gap-2">
      <span class="opacity-60 shrink-0">{{ t('chat.team.label') }}</span>
      <div class="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
        <NPopover
          v-for="role in (expanded ? team : team.slice(0, 5))"
          :key="role.id"
          trigger="hover"
          :delay="400"
        >
          <template #trigger>
            <button
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-[var(--brand-500)] hover:bg-[var(--brand-500)]/5 transition-colors whitespace-nowrap"
              :title="t('chat.team.summon', { id: role.id })"
              @click="summon(role)"
            >
              <span>{{ role.icon }}</span>
              <span class="font-medium">{{ role.name }}</span>
              <span class="opacity-50 font-mono text-[10px]">@{{ role.id }}</span>
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
        class="text-xs opacity-60 hover:opacity-100 shrink-0"
        @click="expanded = !expanded"
      >
        {{ expanded ? t('chat.team.collapse') : t('chat.team.more', { n: team.length - 5 }) }}
      </button>
    </div>
  </div>
</template>
