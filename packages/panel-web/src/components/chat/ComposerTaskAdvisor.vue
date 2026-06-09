<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ComposerTaskAction, ComposerTaskActionPayload } from './ComposerTaskActions.vue';

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

const icons: Record<ComposerTaskAction, string> = {
  goal: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  cron: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  room: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87',
  tools: 'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z',
  model: 'M12 3v18M3 8h18M5 16h14M7 3l-2 5 2 5m10-10 2 5-2 5',
};

const normalizedDraft = computed(() => props.draft.trim().toLowerCase());

const candidates = computed<AdvisorCandidate[]>(() => {
  const text = normalizedDraft.value;
  if (text.length < 8) return [];

  const next: AdvisorCandidate[] = [];
  function add(action: ComposerTaskAction, score: number): void {
    next.push({ action, score, icon: icons[action] });
  }

  if (/(免费|本地|模型|渠道|provider|openrouter|ollama|deepseek|api\s*key|apikey|余额|成本|free|local|model|provider|credential)/i.test(text)) {
    add('model', 100);
  }
  if (/(每天|每周|每月|定时|周期|重复|提醒|监控|daily|weekly|monthly|schedule|recurring|every\s+(day|week|month))/i.test(text)) {
    add('cron', 92);
  }
  if (/(长期|持续|分阶段|里程碑|目标|计划|优化|重构|完善|追踪|long[-\s]?running|roadmap|milestone|plan|refactor|optimi[sz]e|improve)/i.test(text) || text.length > 180) {
    add('goal', 84);
  }
  if (/(前端|后端|架构|产品|设计|评审|审查|角色|团队|协作|frontend|backend|architect|product|design|review|team|roles?)/i.test(text)) {
    add('room', 76);
  }
  if (/(工具|记忆|经验|文件|代码|仓库|文档|搜索|读取|mcp|tool|memory|lesson|file|codebase|repo|docs|search|scan|read)/i.test(text)) {
    add('tools', 68);
  }

  const seen = new Set<ComposerTaskAction>();
  return next
    .sort((a, b) => b.score - a.score)
    .filter(item => {
      if (seen.has(item.action)) return false;
      seen.add(item.action);
      return true;
    })
    .slice(0, 2);
});

function promptFor(action: ComposerTaskAction): string {
  const base = props.draft.trim() || t(`chat.composer.taskActions.examples.${action}`);
  if (action === 'tools') return t('chat.composer.taskActions.toolPrompt', { prompt: base });
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
