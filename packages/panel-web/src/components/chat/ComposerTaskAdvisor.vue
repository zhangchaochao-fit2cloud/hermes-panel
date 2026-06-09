<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  composerTaskActions,
  isInlineComposerTaskAction,
  type ComposerTaskAction,
} from '@/data/task-capability-actions';
import type { ComposerTaskActionPayload } from './ComposerTaskActions.vue';

interface AdvisorCandidate {
  action: ComposerTaskAction;
  icon: string;
  score: number;
}

const props = defineProps<{
  draft: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [payload: ComposerTaskActionPayload];
}>();

const { t } = useI18n();

const normalizedDraft = computed(() => props.draft.trim().toLowerCase());

const candidates = computed<AdvisorCandidate[]>(() => {
  const text = normalizedDraft.value;
  if (text.length < 8) return [];

  const next: AdvisorCandidate[] = composerTaskActions
    .filter(action => action.keywords.test(text) || (action.key === 'goal' && text.length > 180))
    .map(action => ({ action: action.key, score: action.score, icon: action.icon }));

  return next
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
});

function promptFor(action: ComposerTaskAction): string {
  const base = props.draft.trim() || t(`chat.composer.taskActions.examples.${action}`);
  if (isInlineComposerTaskAction(action)) return t(`chat.composer.taskActions.prompts.${action}`, { prompt: base });
  return base;
}

function select(action: ComposerTaskAction): void {
  emit('select', { action, prompt: promptFor(action) });
}
</script>

<template>
  <section v-if="candidates.length > 0" class="task-advisor" :aria-label="t('chat.composer.taskAdvisor.ariaLabel')">
    <div class="task-advisor-copy">
      <span class="task-advisor-label">{{ t('chat.composer.taskAdvisor.label') }}</span>
      <span>{{ t('chat.composer.taskAdvisor.desc') }}</span>
    </div>
    <div class="task-advisor-actions">
      <button
        v-for="candidate in candidates"
        :key="candidate.action"
        type="button"
        class="task-advisor-action"
        :disabled="disabled"
        @click="select(candidate.action)"
      >
        <span class="task-advisor-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="candidate.icon" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="task-advisor-title">{{ t(`chat.composer.taskActions.${candidate.action}.title`) }}</span>
          <span class="task-advisor-desc">{{ t(`chat.composer.taskActions.${candidate.action}.desc`) }}</span>
        </span>
        <span class="task-advisor-cta">{{ t('chat.composer.taskAdvisor.use') }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.task-advisor {
  margin: 8px 12px 0;
  border: 1px solid color-mix(in srgb, var(--brand-500) 24%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--brand-500) 6%, var(--bg-elevate));
  padding: 8px;
}

.task-advisor-copy {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  padding: 0 2px 7px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.4;
}

.task-advisor-label {
  color: var(--brand-600);
  font-weight: 750;
}

.task-advisor-actions {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.task-advisor-action {
  display: grid;
  min-height: 58px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
  padding: 8px;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.task-advisor-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 48%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-card));
  transform: translateY(-1px);
}

.task-advisor-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.task-advisor-icon {
  display: inline-flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-elevate));
  color: var(--brand-600);
}

.task-advisor-icon svg {
  height: 16px;
  width: 16px;
}

.task-advisor-title,
.task-advisor-desc {
  display: block;
}

.task-advisor-title {
  overflow: hidden;
  color: var(--text-1);
  font-size: 12px;
  font-weight: 750;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-advisor-desc {
  margin-top: 2px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.35;
}

.task-advisor-cta {
  border-radius: 999px;
  background: var(--brand-500);
  color: white;
  padding: 4px 7px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .task-advisor-actions {
    grid-template-columns: 1fr;
  }
}
</style>
