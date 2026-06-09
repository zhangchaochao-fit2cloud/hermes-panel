<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

export type ComposerTaskAction = 'goal' | 'cron' | 'room' | 'tools' | 'model';

export interface ComposerTaskActionPayload {
  action: ComposerTaskAction;
  prompt: string;
}

interface ActionItem {
  key: ComposerTaskAction;
  icon: string;
}

const props = defineProps<{
  draft: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [payload: ComposerTaskActionPayload];
}>();

const { t } = useI18n();
const open = ref(false);

const actions: ActionItem[] = [
  { key: 'goal', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z' },
  { key: 'cron', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2' },
  { key: 'room', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87' },
  { key: 'tools', icon: 'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z' },
  { key: 'model', icon: 'M12 3v18M3 8h18M5 16h14M7 3l-2 5 2 5m10-10 2 5-2 5' },
];

const hasDraft = computed(() => props.draft.trim().length > 0);

function promptFor(action: ComposerTaskAction): string {
  const base = props.draft.trim() || t(`chat.composer.taskActions.examples.${action}`);
  if (action === 'tools') {
    return t('chat.composer.taskActions.toolPrompt', { prompt: base });
  }
  return base;
}

function select(action: ComposerTaskAction): void {
  emit('select', { action, prompt: promptFor(action) });
  open.value = false;
}
</script>

<template>
  <div class="task-actions" @keydown.esc="open = false">
    <button
      type="button"
      class="task-actions-trigger"
      :class="{ 'has-draft': hasDraft }"
      :title="t('chat.composer.taskActions.title')"
      :aria-label="t('chat.composer.taskActions.title')"
      :aria-expanded="open"
      :disabled="disabled"
      @click="open = !open"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M8 3v10M3 8h10" />
      </svg>
      <span>{{ t('chat.composer.taskActions.button') }}</span>
    </button>

    <div v-if="open" class="task-actions-menu" role="menu">
      <p class="task-actions-heading">{{ t('chat.composer.taskActions.heading') }}</p>
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="task-action-row"
        role="menuitem"
        @click="select(action.key)"
      >
        <span class="task-action-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="action.icon" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="task-action-title">{{ t(`chat.composer.taskActions.${action.key}.title`) }}</span>
          <span class="task-action-desc">{{ t(`chat.composer.taskActions.${action.key}.desc`) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-actions {
  position: relative;
}

.task-actions-trigger {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elevate);
  color: var(--text-2);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 650;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.task-actions-trigger:hover,
.task-actions-trigger.has-draft {
  border-color: color-mix(in srgb, var(--brand-500) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-elevate));
  color: var(--text-1);
}

.task-actions-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.task-actions-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 30;
  width: min(330px, 86vw);
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
  box-shadow: var(--shadow-3);
  padding: 8px;
}

.task-actions-heading {
  padding: 4px 7px 7px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.task-action-row {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  border-radius: 8px;
  padding: 9px;
  text-align: left;
  transition: background 0.16s ease;
}

.task-action-row:hover {
  background: var(--bg-elevate);
}

.task-action-icon {
  display: inline-flex;
  height: 28px;
  width: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-500) 9%, var(--bg-elevate));
  color: var(--brand-600);
}

.task-action-icon svg {
  height: 15px;
  width: 15px;
}

.task-action-title,
.task-action-desc {
  display: block;
}

.task-action-title {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
}

.task-action-desc {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.4;
}
</style>
