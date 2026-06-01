<script setup lang="ts">
import type { ChatMessage, ToolCall } from '@hermes-panel/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import { categorizeTool, getToolCallFacts, type ToolCategory } from '@/utils/tool-call-facts';
import type { StreamState } from '@/stores/chat-stream';

const props = defineProps<{
  messages: ChatMessage[];
  streamState: StreamState;
  open: boolean;
}>();

const { t } = useI18n();

interface WorkspaceStatus {
  cwd: string;
  source: 'ide' | 'query' | 'env' | 'process';
  isGitRepo: boolean;
  branch: string | null;
  changeCount: number;
  lastCommit: string | null;
  githubCliAvailable: boolean;
  githubCliDetail: string | null;
}

interface ProgressStep {
  key: string;
  label: string;
  state: 'done' | 'running' | 'pending';
}

interface SubAgent {
  id: string;
  name: string;
  role: string;
  state: 'done' | 'running' | 'error';
}

interface TaskRow {
  id: string;
  title: string;
  meta: string;
  state: 'done' | 'running' | 'pending' | 'error';
}

const workspace = ref<WorkspaceStatus | null>(null);

const allToolCalls = computed<ToolCall[]>(() =>
  props.messages.flatMap(message => message.toolCalls ?? []),
);

const facts = computed(() => allToolCalls.value.map(toolCall => ({
  toolCall,
  facts: getToolCallFacts(toolCall),
})));

const runningTools = computed(() =>
  allToolCalls.value.filter(tool => tool.status === 'running' || tool.status === 'pending'),
);

const hasActiveRun = computed(() =>
  props.streamState === 'creating'
  || props.streamState === 'streaming'
  || props.streamState === 'reconnecting'
  || runningTools.value.length > 0,
);

const categoryCounts = computed<Record<ToolCategory, number>>(() => {
  const counts = {
    shell: 0,
    edit: 0,
    read: 0,
    search: 0,
    write: 0,
    skill: 0,
    memory: 0,
    other: 0,
  } satisfies Record<ToolCategory, number>;
  for (const item of facts.value) counts[item.facts.category] += 1;
  return counts;
});

const fileCount = computed(() =>
  new Set(facts.value.flatMap(item => item.facts.files)).size,
);

const progressSteps = computed<ProgressStep[]>(() => {
  const lastAssistant = [...props.messages].reverse().find(message => message.role === 'assistant');
  const completed = lastAssistant?.completed === true && !hasActiveRun.value;

  return [
    step('run', t('chat.taskPanel.steps.run'), props.streamState !== 'idle', hasActiveRun.value && allToolCalls.value.length === 0),
    step('tools', t('chat.taskPanel.steps.tools'), allToolCalls.value.some(tool => tool.status === 'done' || tool.status === 'error'), runningTools.value.length > 0),
    step('response', t('chat.taskPanel.steps.response'), completed, props.streamState === 'streaming' && runningTools.value.length === 0),
  ];
});

const summaryChips = computed(() => [
  countChip('files', t('chat.taskPanel.summary.files', { n: fileCount.value }), fileCount.value),
  countChip('search', t('chat.taskPanel.summary.searches', { n: categoryCounts.value.search }), categoryCounts.value.search),
  countChip('commands', t('chat.taskPanel.summary.commands', { n: categoryCounts.value.shell }), categoryCounts.value.shell),
  countChip('memory', t('chat.taskPanel.summary.memory', { n: categoryCounts.value.memory }), categoryCounts.value.memory),
  countChip('edits', t('chat.taskPanel.summary.edits', { n: categoryCounts.value.edit + categoryCounts.value.write }), categoryCounts.value.edit + categoryCounts.value.write),
].filter(chip => chip.count > 0));

const taskRows = computed<TaskRow[]>(() =>
  facts.value
    .slice(-10)
    .reverse()
    .map(({ toolCall, facts: toolFacts }, index) => ({
      id: toolCall.id,
      title: taskTitle(toolCall, toolFacts.category, index),
      meta: taskMeta(toolCall, toolFacts),
      state: toolCall.status,
    })),
);

const subAgents = computed<SubAgent[]>(() =>
  allToolCalls.value
    .filter(hasExplicitAgentMetadata)
    .map((tool, index) => ({
      id: tool.id,
      name: agentName(tool, index),
      role: agentRole(tool),
      state: tool.status === 'error' ? 'error' : tool.status === 'running' || tool.status === 'pending' ? 'running' : 'done',
    })),
);

const sources = computed(() => {
  const sourceSet = new Set<string>();
  for (const tool of allToolCalls.value) {
    const category = categorizeTool(tool.name);
    if (category === 'memory') sourceSet.add(t('chat.taskPanel.sources.memory'));
    if (category === 'search') sourceSet.add(t('chat.taskPanel.sources.search'));
    if (category === 'shell') sourceSet.add(t('chat.taskPanel.sources.local'));
    if (/computer|browser/i.test(tool.name)) sourceSet.add(t('chat.taskPanel.sources.computerUse'));
  }
  if (workspace.value?.isGitRepo) sourceSet.add(t('chat.taskPanel.sources.git'));
  return Array.from(sourceSet).slice(0, 6);
});

async function loadWorkspaceStatus(): Promise<void> {
  try {
    workspace.value = await bffFetch<WorkspaceStatus>('/api/workspace/status', { silent: true });
  } catch {
    workspace.value = null;
  }
}

function step(key: string, label: string, done: boolean, running: boolean): ProgressStep {
  return { key, label, state: done ? 'done' : running ? 'running' : 'pending' };
}

function countChip(key: string, label: string, count: number): { key: string; label: string; count: number } {
  return { key, label, count };
}

function taskTitle(tool: ToolCall, category: ToolCategory, index: number): string {
  const scopedTitle = pickString(tool.input ?? {}, ['title', 'task', 'description', 'objective', 'query']);
  if (scopedTitle) return compact(scopedTitle, 42);

  const actionKey = `chat.taskPanel.taskAction.${category}`;
  const action = t(actionKey);
  if (action !== actionKey) return `${action} ${index + 1}`;
  return tool.name;
}

function taskMeta(tool: ToolCall, toolFacts: ReturnType<typeof getToolCallFacts>): string {
  const parts: string[] = [];
  if (toolFacts.files.length > 0) parts.push(toolFacts.files.slice(0, 2).join(', '));
  if (toolFacts.lineCount) parts.push(t('chat.toolCall.lines', { n: toolFacts.lineCount }));
  if (toolFacts.skills.length > 0) parts.push(t('chat.activity.skill', { name: toolFacts.skills.slice(0, 2).join(', ') }));
  if (parts.length > 0) return parts.join(' · ');
  return compact(tool.preview || tool.name, 54);
}

function hasExplicitAgentMetadata(tool: ToolCall): boolean {
  if (/^(spawn_agent|subagent|multi_agent|agent_run|agent\.run)$/i.test(tool.name)) return true;
  const inputText = JSON.stringify(tool.input ?? {});
  return /"(?:agent_id|agentId|agent_name|agentName|subagent_id|subagentId|worker_id|workerId)"\s*:/.test(inputText);
}

function agentName(tool: ToolCall, index: number): string {
  const input = tool.input ?? {};
  const explicit = pickString(input, ['nickname', 'name', 'agent_name', 'agentName', 'agent_id', 'agentId', 'subagent_id', 'subagentId', 'worker_id', 'workerId']);
  if (explicit) return explicit;
  const match = (tool.preview ?? '').match(/(?:agent|worker|explorer)\s+([A-Za-z0-9_-]+)/i);
  return match?.[1] ?? t('chat.taskPanel.subAgents.fallback', { n: index + 1 });
}

function agentRole(tool: ToolCall): string {
  const explicit = pickString(tool.input ?? {}, ['agent_type', 'agentType', 'role', 'type']);
  if (explicit) return explicit;
  if (/explorer/i.test(`${tool.name} ${tool.preview ?? ''}`)) return 'explorer';
  if (/worker/i.test(`${tool.name} ${tool.preview ?? ''}`)) return 'worker';
  return 'agent';
}

function pickString(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function shortPath(path: string): string {
  const parts = path.split('/');
  return parts.slice(-2).join('/') || path;
}

function compact(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

onMounted(() => {
  void loadWorkspaceStatus();
});

watch(() => props.open, (open) => {
  if (open) void loadWorkspaceStatus();
});
</script>

<template>
  <aside
    class="task-progress-panel"
    :class="{ 'is-open': open }"
    :aria-hidden="!open"
  >
    <section class="task-section">
      <h2>{{ t('chat.taskPanel.progress') }}</h2>
      <ol class="progress-list">
        <li
          v-for="item in progressSteps"
          :key="item.key"
          class="progress-step"
          :class="`is-${item.state}`"
        >
          <span class="progress-dot">
            <svg v-if="item.state === 'done'" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span>{{ item.label }}</span>
        </li>
      </ol>
      <div v-if="summaryChips.length" class="summary-chips">
        <span v-for="chip in summaryChips" :key="chip.key">{{ chip.label }}</span>
      </div>
    </section>

    <section class="task-section">
      <h2>{{ t('chat.taskPanel.tasks.title') }}</h2>
      <div v-if="taskRows.length" class="task-row-list">
        <div
          v-for="task in taskRows"
          :key="task.id"
          class="task-row"
          :class="`is-${task.state}`"
        >
          <span class="task-state" aria-hidden="true" />
          <span class="min-w-0">
            <strong>{{ task.title }}</strong>
            <em>{{ task.meta }}</em>
          </span>
        </div>
      </div>
      <p v-else class="empty-copy">{{ t('chat.taskPanel.tasks.empty') }}</p>
    </section>

    <section class="task-section">
      <div class="section-title-row">
        <h2>{{ t('chat.taskPanel.environment') }}</h2>
        <button type="button" class="icon-button" :title="t('common.refresh')" @click="loadWorkspaceStatus">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 7A5 5 0 0 0 4.6 3.4L3 5M3 2v3h3M3 9a5 5 0 0 0 8.4 3.6L13 11m0 3v-3h-3" />
          </svg>
        </button>
      </div>
      <div class="env-list">
        <div class="env-row">
          <span>{{ t('chat.taskPanel.env.source') }}</span>
          <strong>{{ workspace ? t(`chat.taskPanel.env.sourceValue.${workspace.source}`) : '-' }}</strong>
        </div>
        <div class="env-row">
          <span>{{ t('chat.taskPanel.env.changes') }}</span>
          <strong>{{ workspace?.changeCount ?? 0 }}</strong>
        </div>
        <div class="env-row">
          <span>{{ t('chat.taskPanel.env.local') }}</span>
          <strong>{{ workspace?.isGitRepo ? t('chat.taskPanel.env.gitRepo') : t('chat.taskPanel.env.localOnly') }}</strong>
        </div>
        <div class="env-row">
          <span>{{ t('chat.taskPanel.env.branch') }}</span>
          <strong>{{ workspace?.branch || '-' }}</strong>
        </div>
        <div class="env-row">
          <span>{{ t('chat.taskPanel.env.commit') }}</span>
          <strong>{{ workspace?.lastCommit || '-' }}</strong>
        </div>
        <div class="env-row" :class="{ 'is-muted': !workspace?.githubCliAvailable }">
          <span>GitHub CLI</span>
          <strong>{{ workspace?.githubCliAvailable ? workspace.githubCliDetail : t('chat.taskPanel.env.ghUnavailable') }}</strong>
        </div>
        <div v-if="workspace?.cwd" class="env-row">
          <span>{{ t('chat.taskPanel.env.cwd') }}</span>
          <strong>{{ shortPath(workspace.cwd) }}</strong>
        </div>
      </div>
    </section>

    <section class="task-section">
      <h2>{{ t('chat.taskPanel.subAgents.title') }}</h2>
      <div v-if="subAgents.length" class="agent-list">
        <div v-for="agent in subAgents" :key="agent.id" class="agent-row" :class="`is-${agent.state}`">
          <span class="agent-avatar" aria-hidden="true">{{ agent.role.slice(0, 1).toUpperCase() }}</span>
          <span class="min-w-0">
            <strong>{{ agent.name }}</strong>
            <em>{{ agent.role }}</em>
          </span>
        </div>
      </div>
      <p v-else class="empty-copy">{{ t('chat.taskPanel.subAgents.empty') }}</p>
    </section>

    <section class="task-section">
      <h2>{{ t('chat.taskPanel.sources.title') }}</h2>
      <div v-if="sources.length" class="source-list">
        <span v-for="source in sources" :key="source">{{ source }}</span>
      </div>
      <p v-else class="empty-copy">{{ t('chat.taskPanel.sources.empty') }}</p>
    </section>
  </aside>
</template>

<style scoped>
.task-progress-panel {
  position: absolute;
  top: 60px;
  right: 12px;
  z-index: 30;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100% - 76px);
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg-card) 96%, transparent);
  box-shadow:
    0 26px 70px color-mix(in srgb, black 13%, transparent),
    0 1px 0 color-mix(in srgb, white 34%, transparent) inset;
  opacity: 0;
  pointer-events: none;
  transform: translateX(12px) scale(0.98);
  transition:
    opacity 180ms var(--ease),
    transform 220ms cubic-bezier(.2, .8, .2, 1);
}
.task-progress-panel.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0) scale(1);
}
.task-section {
  padding: 16px 18px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}
.task-section:last-child {
  border-bottom: 0;
}
h2 {
  margin: 0 0 12px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 700;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.icon-button {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}
.icon-button:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.progress-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.progress-step {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: start;
  gap: 8px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.45;
}
.progress-dot {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-3) 18%, transparent);
  color: var(--bg-card);
}
.progress-step.is-done .progress-dot {
  background: var(--text-3);
}
.progress-step.is-running .progress-dot {
  background: var(--brand-500);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--brand-500) 14%, transparent);
}
.progress-step.is-pending {
  color: var(--text-3);
}
.progress-step.is-pending .progress-dot {
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-3) 34%, transparent);
}
.summary-chips,
.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.summary-chips span,
.source-list span {
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--bg-elevate) 78%, transparent);
  color: var(--text-2);
  font-size: 12px;
}
.env-list,
.agent-list,
.task-row-list {
  display: grid;
  gap: 9px;
}
.env-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  color: var(--text-3);
  font-size: 13px;
}
.env-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-2);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.env-row.is-muted strong {
  color: var(--text-3);
}
.agent-row {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-2);
}
.task-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border-radius: 12px;
  padding: 8px 9px;
  background: color-mix(in srgb, var(--bg-elevate) 56%, transparent);
  color: var(--text-2);
}
.task-state {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-3) 40%, transparent);
}
.task-row.is-running .task-state,
.task-row.is-pending .task-state {
  background: var(--brand-500);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-500) 13%, transparent);
}
.task-row.is-error .task-state {
  background: var(--color-error);
}
.agent-avatar {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-500) 11%, transparent);
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 800;
}
.agent-row.is-error .agent-avatar {
  background: color-mix(in srgb, var(--color-error) 11%, transparent);
  color: var(--color-error);
}
.agent-row.is-running .agent-avatar {
  animation: pulse-agent 1.4s var(--ease) infinite;
}
.task-row strong,
.task-row em,
.agent-row strong,
.agent-row em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-row strong,
.agent-row strong {
  color: var(--text-1);
  font-size: 13px;
}
.task-row em,
.agent-row em {
  color: var(--text-3);
  font-size: 12px;
  font-style: normal;
}
.empty-copy {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}
@keyframes pulse-agent {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--brand-500) 20%, transparent); }
  50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--brand-500) 0%, transparent); }
}
@media (max-width: 900px) {
  .task-progress-panel {
    display: none;
  }
}
</style>
