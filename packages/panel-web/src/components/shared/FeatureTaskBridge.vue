<script setup lang="ts">
import type { CommandPaletteIconKey } from '@/commands/icons';
import { useTaskDraft } from '@/composables/useTaskDraft';
import ControlCenterIcon from './ControlCenterIcon.vue';

const props = withDefaults(defineProps<{
  icon?: CommandPaletteIconKey;
  eyebrow: string;
  title: string;
  description: string;
  example: string;
  prompt: string;
  actionLabel: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  command?: string;
}>(), {
  icon: 'chat',
});

const { openChatDraft, openRoute } = useTaskDraft();

function useInChat(): void {
  void openChatDraft(props.prompt);
}

function openSecondary(): void {
  if (!props.secondaryTo) return;
  void openRoute(props.secondaryTo);
}
</script>

<template>
  <section class="feature-task-bridge" :aria-label="title">
    <div class="bridge-icon" aria-hidden="true">
      <ControlCenterIcon :icon="icon" class="bridge-icon-svg" />
    </div>
    <div class="bridge-copy">
      <p class="bridge-eyebrow">{{ eyebrow }}</p>
      <h2 class="bridge-title">{{ title }}</h2>
      <p class="bridge-desc">{{ description }}</p>
      <p class="bridge-example">{{ example }}</p>
      <code v-if="command" class="bridge-command">{{ command }}</code>
    </div>
    <div class="bridge-actions">
      <button type="button" class="bridge-action is-primary" @click="useInChat">
        {{ actionLabel }}
      </button>
      <button
        v-if="secondaryLabel && secondaryTo"
        type="button"
        class="bridge-action"
        @click="openSecondary"
      >
        {{ secondaryLabel }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.feature-task-bridge {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 13px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--brand-500) 28%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-500) 6%, var(--bg-card));
  padding: 13px;
}

.bridge-icon {
  display: inline-flex;
  height: 38px;
  width: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--brand-500) 11%, var(--bg-elevate));
  color: var(--brand-600);
}

.bridge-icon-svg {
  height: 19px;
  width: 19px;
}

.bridge-copy {
  min-width: 0;
}

.bridge-eyebrow {
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 760;
  text-transform: uppercase;
}

.bridge-title {
  margin-top: 3px;
  color: var(--text-1);
  font-size: 15px;
  font-weight: 760;
  line-height: 1.3;
}

.bridge-desc,
.bridge-example {
  margin-top: 4px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.45;
}

.bridge-example {
  color: var(--text-3);
}

.bridge-command {
  display: inline-flex;
  margin-top: 8px;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg-elevate);
  color: var(--text-1);
  padding: 4px 7px;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bridge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.bridge-action {
  min-height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-2);
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 700;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.bridge-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 48%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--brand-600);
  transform: translateY(-1px);
}

.bridge-action.is-primary {
  border-color: color-mix(in srgb, var(--brand-500) 58%, var(--border));
  background: var(--brand-500);
  color: white;
}

@media (max-width: 720px) {
  .feature-task-bridge {
    grid-template-columns: 1fr;
  }

  .bridge-actions {
    justify-content: flex-start;
  }
}
</style>
