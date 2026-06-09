<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import {
  computed, nextTick, onMounted, onBeforeUnmount, ref, watch,
} from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  handleMarkdownControlClick,
  hydrateMarkdownControls,
} from '@/utils/markdown-controls';
import { extractMarkdownImages, stripMarkdownImages } from '@/utils/markdown-images';
import { getToolCallFacts } from '@/utils/tool-call-facts';
import { relativeTime, absoluteTime, type Locale } from '@/utils/relative-time';
import { useTaskDraft } from '@/composables/useTaskDraft';
import ToolCallCard from './ToolCallCard.vue';

const props = defineProps<{
  message: ChatMessage;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit-save', payload: { id: string; content: string }): void;
  (e: 'add-selection', content: string): void;
  (e: 'branch', id: string): void;
  (e: 'stop'): void;
}>();

// 就地编辑 user 消息：点编辑按钮 → 切换 textarea → 保存 emit 'edit-save'
const isEditing = ref(false);
const editDraft = ref('');
const editTextareaRef = ref<HTMLTextAreaElement | null>(null);

function startEdit(): void {
  editDraft.value = props.message.content;
  isEditing.value = true;
  nextTick(() => {
    const el = editTextareaRef.value;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    autoResizeEditor();
  });
}
function cancelEdit(): void {
  isEditing.value = false;
  editDraft.value = '';
}
function saveEdit(): void {
  const v = editDraft.value.trim();
  if (!v) return;
  isEditing.value = false;
  emit('edit-save', { id: props.message.id, content: v });
  editDraft.value = '';
}
function autoResizeEditor(): void {
  const el = editTextareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 520)}px`;
}
function onEditorKey(e: KeyboardEvent): void {
  if (e.isComposing) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelEdit();
  } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    saveEdit();
  }
}

const { t, locale } = useI18n();
const toast = useMessage();
const router = useRouter();
const { storePendingTask } = useTaskDraft();
const proseRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const selectionBubble = ref<{ text: string; left: number; top: number } | null>(null);

const isUser = computed(() => props.message.role === 'user');
const isAssistant = computed(() => props.message.role === 'assistant');

type ActionIcon = 'copy' | 'edit' | 'regenerate' | 'branch';

const actionIcons: Record<ActionIcon, string[]> = {
  copy: [
    'M8 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z',
    'M10 4h8a2 2 0 0 1 2 2v8',
  ],
  edit: [
    'M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z',
    'M13.5 8.5l3 3',
  ],
  regenerate: [
    'M20 6v5h-5',
    'M4 18v-5h5',
    'M18 11a6 6 0 0 0-10.2-4.2L4 10',
    'M6 13a6 6 0 0 0 10.2 4.2L20 14',
  ],
  branch: [
    'M6 3v5a4 4 0 0 0 4 4h1',
    'M6 21v-5a4 4 0 0 1 4-4h1',
    'M11 8l4 4-4 4',
    'M6 5.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 23.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  ],
};

/**
 * Render assistant content through markdown-it; leave user content as
 * plain text. User input rendering would mean a stray "# foo" turns
 * into a giant heading — surprising and rarely intended.
 *
 * markdown-it is robust against partial input, so streaming half-formed
 * fences still render gracefully (the unclosed token shows as text).
 */
const renderedHtml = ref('');
let renderSeq = 0;

watch([() => props.message.content, isAssistant], async ([content, assistant]) => {
  const seq = ++renderSeq;
  if (!assistant) {
    renderedHtml.value = '';
    return;
  }
  const { renderMarkdown } = await import('@/utils/markdown-renderer');
  if (seq !== renderSeq) return;
  renderedHtml.value = renderMarkdown(content);
}, { immediate: true });
const userImagePreviews = computed(() =>
  isUser.value ? extractMarkdownImages(props.message.content, 4) : [],
);
const userDisplayContent = computed(() =>
  isUser.value ? stripMarkdownImages(props.message.content) || props.message.content : props.message.content,
);

const codeCopyLabels = computed(() => ({
  copy: t('common.copy'),
  copyImage: t('common.copyImage'),
  copied: t('common.copied'),
  copyFailed: t('common.copyFailed'),
}));

function refreshMarkdownCodeBlocks(): void {
  hydrateMarkdownControls(proseRef.value, codeCopyLabels.value);
}

onMounted(() => {
  refreshMarkdownCodeBlocks();
});

watch([renderedHtml, locale], async () => {
  await nextTick();
  refreshMarkdownCodeBlocks();
});

function onMarkdownClick(event: MouseEvent): void {
  void handleMarkdownControlClick(event, codeCopyLabels.value);
}

/**
 * Summary label for the reasoning <details> and activity strip.
 * Always shows processing duration when available.
 */
const processingDurationMs = computed(() => {
  const completedAt = (props.message as unknown as { completedAt?: number }).completedAt;
  if (typeof completedAt === 'number' && completedAt > props.message.createdAt) {
    return completedAt - props.message.createdAt;
  }
  return activityDurationMs.value || 0;
});

const reasoningSummaryLabel = computed(() => {
  if (!props.message.completed) return t('chat.activity.processing');
  const ms = processingDurationMs.value;
  if (ms > 0) return t('chat.reasoningWithTime', { time: fmtDuration(ms) });
  return t('chat.reasoningDone');
});
const activitySummaryLabel = computed(() =>
  props.message.completed ? completedActivityLabel.value : runningActivityLabel.value,
);

const toolCalls = computed(() => props.message.toolCalls ?? []);
const activityDurationMs = computed(() => {
  const end = props.message.completedAt
    ?? Math.max(0, ...toolCalls.value.map(tc => tc.completedAt ?? 0))
    ?? 0;
  if (end > props.message.createdAt) return end - props.message.createdAt;
  if (!props.message.completed) return Date.now() - props.message.createdAt;
  return 0;
});
const runningActivityLabel = computed(() => {
  const running = toolCalls.value.filter(tc => tc.status === 'running' || tc.status === 'pending');
  const primary = running[0];
  if (primary) {
    const facts = getToolCallFacts(primary);
    const file = facts.files[0];
    const skill = facts.skills[0];
    if (facts.category === 'edit' || facts.category === 'write') {
      return file
        ? t('chat.activity.editingFile', { file })
        : t('chat.toolCall.action.running.edit');
    }
    if (facts.category === 'search') return t('chat.activity.searching');
    if (facts.category === 'shell') return t('chat.activity.runningCommand');
    if (facts.category === 'skill') {
      return skill
        ? t('chat.activity.callingSkill', { name: skill })
        : t('chat.toolCall.action.running.skill');
    }
    if (facts.category === 'memory') return t('chat.toolCall.action.running.memory');
    return t('chat.activity.running');
  }
  if (props.isStreaming || !props.message.completed) return t('chat.activity.thinking');
  return t('chat.activity.processing');
});
const completedActivityLabel = computed(() => {
  const ms = activityDurationMs.value;
  return ms > 0
    ? t('chat.activity.doneWithTime', { time: fmtDuration(ms) })
    : t('chat.activity.done');
});
const memoryReferenceCount = computed(() => {
  const citationBlock = props.message.content.match(/<oai-mem-citation>[\s\S]*?<\/oai-mem-citation>/g) ?? [];
  const citedLines = props.message.content.match(/(?:MEMORY\.md|rollout_summaries\/)[^\n]+/g) ?? [];
  const memoryTools = toolCalls.value.filter(tc => getToolCallFacts(tc).category === 'memory').length;
  return Math.max(citationBlock.length, citedLines.length) + memoryTools;
});
const activityChips = computed(() => {
  if (!toolCalls.value.length) return [];

  const facts = toolCalls.value.map(getToolCallFacts);
  const files = new Set(facts.flatMap(item => item.files));
  const skills = new Set(facts.flatMap(item => item.skills));
  const searches = facts.filter(item => item.category === 'search').length;
  const commands = facts.filter(item => item.category === 'shell').length;
  const lineCount = facts.reduce((sum, item) => sum + (item.lineCount ?? 0), 0);
  const chips: string[] = [t('chat.activity.toolCount', { n: toolCalls.value.length })];

  const firstSkill = Array.from(skills)[0];
  if (firstSkill) {
    chips.push(t('chat.activity.skill', { name: firstSkill }));
  }
  if (files.size > 0) chips.push(t('chat.activity.exploredFiles', { n: files.size }));
  if (searches > 0) chips.push(t('chat.activity.searchCount', { n: searches }));
  if (commands > 0) chips.push(t('chat.activity.commandCount', { n: commands }));
  if (memoryReferenceCount.value > 0) chips.push(t('chat.activity.memoryReferences', { n: memoryReferenceCount.value }));
  if (lineCount > 0) chips.push(t('chat.activity.lineCount', { n: lineCount }));

  return chips.slice(0, 6);
});
const hasActivityStrip = computed(() => activityChips.value.length > 0);
const hasSkillToolCalls = computed(() =>
  toolCalls.value.some(tc => getToolCallFacts(tc).category === 'skill'),
);
const shouldGroupToolCalls = computed(() =>
  toolCalls.value.length > 0
  && (props.message.completed || hasSkillToolCalls.value || toolCalls.value.length > 1),
);
const toolCallGroupOpen = computed(() =>
  !props.message.completed && !hasSkillToolCalls.value,
);
const toolDetailsLabel = computed(() =>
  t('chat.activity.details', { n: toolCalls.value.length }),
);
const shouldShowLiveStatus = computed(() =>
  isAssistant.value
  && !props.message.completed
  && !props.message.reasoning
  && toolCalls.value.length === 0,
);

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}
// Treat truthy `edited` as the marker. Field isn't on ChatMessage yet — soft read.
const isEdited = computed(
  () => (props.message as unknown as { edited?: boolean }).edited === true,
);

const tokenTotal = computed(() => props.message.tokenUsage?.total);
const tokenBreakdownTitle = computed(() => {
  const u = props.message.tokenUsage;
  if (!u) return undefined;
  const parts: string[] = [];
  if (u.input) parts.push(t('chat.message.inputTokens', { n: u.input }));
  if (u.output) parts.push(t('chat.message.outputTokens', { n: u.output }));
  return parts.length ? parts.join(' · ') : undefined;
});

/**
 * Cost (USD) — surfaced in the footer when the run came back with a
 * cost estimate. We format inside the component so locales can wrap the
 * number with their preferred prefix ("$" / "估算 $" / "~$" / etc.).
 */
const costLabel = computed(() => {
  const cost = props.message.tokenUsage?.cost;
  if (typeof cost !== 'number' || !Number.isFinite(cost)) return null;
  return t('chat.message.cost', { value: cost.toFixed(4) });
});

/**
 * Duration — soft-read `completedAt` because ChatMessage doesn't carry
 * it in the shared type yet. The orchestrator may stamp it later; until
 * then this stays a no-op when the field is absent (same pattern as
 * `edited` above).
 */
const userRelativeTime = computed(() =>
  relativeTime(props.message.createdAt, locale.value as Locale),
);
function fmtAbsoluteTime(ts: number): string {
  return absoluteTime(ts);
}

const durationLabel = computed(() => {
  const completedAt = (props.message as unknown as { completedAt?: number }).completedAt;
  if (typeof completedAt !== 'number') return null;
  const startedAt = props.message.createdAt;
  if (typeof startedAt !== 'number') return null;
  const ms = completedAt - startedAt;
  if (!(ms > 0)) return null;
  return t('chat.message.duration', { n: (ms / 1000).toFixed(1) });
});

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}


async function copyContent(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content);
    toast.success(t('chat.message.copied'));
  } catch {
    // Clipboard API can reject in non-secure contexts; stay silent on hover toolbar.
  }
}

function onBranch(): void {
  emit('branch', props.message.id);
}

function scheduleSelectionCapture(): void {
  setTimeout(captureSelection, 0);
}

function captureSelection(): void {
  const root = rootRef.value;
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() ?? '';
  if (!root || !selection || !selectedText || selection.rangeCount === 0) {
    selectionBubble.value = null;
    return;
  }
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  if (!anchor || !focus || !root.contains(anchor) || !root.contains(focus)) {
    selectionBubble.value = null;
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    selectionBubble.value = null;
    return;
  }
  selectionBubble.value = {
    text: selectedText,
    left: Math.min(window.innerWidth - 100, Math.max(100, rect.left + rect.width / 2)),
    top: Math.max(12, rect.top - 42),
  };
}

function addSelectionToComposer(): void {
  const selected = selectionBubble.value?.text.trim();
  if (!selected) return;
  emit('add-selection', selected);
  selectionBubble.value = null;
  window.getSelection()?.removeAllRanges();
}

// 把 user prompt 安排为定时任务：通过 sessionStorage 携带 prompt 到 /cron 页，
// 那边 mount 时检查并打开 CreateJobModal 预填。
function scheduleAsCron(): void {
  storePendingTask('cron', props.message.content);
  void router.push('/cron');
}

// ─── Context menu ───
const ctxMenu = ref<{ x: number; y: number } | null>(null);
function onCtx(e: MouseEvent): void { e.preventDefault(); ctxMenu.value = { x: e.clientX, y: e.clientY }; }
function closeCtx(): void { ctxMenu.value = null; }
function ctxCopy(): void { copyContent(); closeCtx(); }
function ctxEdit(): void { startEdit(); closeCtx(); }
function ctxQuote(): void { emit('add-selection', `> ${props.message.content.replace(/\n/g, '\n> ')}\n\n`); closeCtx(); }
function ctxBranch(): void { emit('branch', props.message.id); closeCtx(); }
onMounted(() => { document.addEventListener('click', closeCtx); });
onBeforeUnmount(() => { document.removeEventListener('click', closeCtx); });

</script>

<template>
  <!--
    Codex-style layout: user messages render as a compact chip in the
    top-right; assistant messages render as bare prose (no card, no
    border, no shadow) that flows down the conversation column. Tool
    calls and reasoning blocks render inline between assistant
    paragraphs. The "conversation" feels like one long document
    instead of alternating chat bubbles.
  -->
  <div
    ref="rootRef"
    class="group relative w-full message-enter cv-auto"
    :class="isUser ? ['message--user mb-3 flex', isEditing ? 'justify-center' : 'justify-end'] : 'message--assistant mb-6'"
    :data-msg-id="message.id"
    @mouseup="scheduleSelectionCapture"
    @keyup="scheduleSelectionCapture"
    @contextmenu="onCtx"
  >
    <!-- User branch: pill bubble (chip-like) anchored right -->
    <div
      v-if="isUser"
      class="message-user-wrap relative"
      :class="isEditing ? 'is-editing' : 'max-w-[min(82%,760px)]'"
    >
      <!-- 阅读模式 -->
      <div v-if="!isEditing" class="user-message-chip" @dblclick="startEdit">
        <div
          v-if="userImagePreviews.length"
          class="user-message-images"
          :class="{ 'mb-2': userDisplayContent }"
        >
          <img
            v-for="image in userImagePreviews"
            :key="image.src"
            class="user-message-image"
            :src="image.src"
            :alt="image.alt"
            loading="lazy"
            decoding="async"
          >
        </div>
        <div v-if="userDisplayContent" class="whitespace-pre-wrap text-[14px] font-normal leading-[1.55]">{{ userDisplayContent }}</div>
        <div
          v-if="isEdited"
          class="mt-1 text-[11px] opacity-50 italic"
        >{{ t('chat.message.edited') }}</div>
      </div>
      <!-- hover 显示相对时间，不抢戏 -->
      <div
        v-if="!isEditing"
        class="user-message-meta"
        :title="fmtAbsoluteTime(message.createdAt)"
      >
        <span class="user-message-time">{{ userRelativeTime }}</span>
        <div class="user-message-actions">
          <button type="button" class="user-message-action" :title="t('chat.message.copy')" :aria-label="t('chat.message.copy')" @click="copyContent">
            <svg class="message-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="path in actionIcons.copy" :key="path" :d="path" />
            </svg>
            <span>{{ t('chat.message.copy') }}</span>
          </button>
          <button type="button" class="user-message-action" :title="t('chat.message.edit')" :aria-label="t('chat.message.edit')" @click="startEdit">
            <svg class="message-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="path in actionIcons.edit" :key="path" :d="path" />
            </svg>
            <span>{{ t('chat.message.edit') }}</span>
          </button>
          <button type="button" class="user-message-action" :title="t('chat.message.branch')" :aria-label="t('chat.message.branch')" @click="onBranch">
            <svg class="message-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="path in actionIcons.branch" :key="path" :d="path" />
            </svg>
            <span>{{ t('chat.message.branch') }}</span>
          </button>
          <button type="button" class="user-message-action user-message-action--icon" :title="t('chat.message.scheduleCron')" :aria-label="t('chat.message.scheduleCron')" @click="scheduleAsCron">
            <svg class="message-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 编辑模式：textarea + 保存/取消 -->
      <div v-else class="message-edit-card">
        <textarea
          ref="editTextareaRef"
          v-model="editDraft"
          class="message-edit-textarea"
          rows="6"
          @input="autoResizeEditor"
          @keydown="onEditorKey"
        />
        <div class="message-edit-actions">
          <button
            type="button"
            class="message-edit-button"
            @click="cancelEdit"
          >{{ t('common.cancel') }}</button>
          <button
            type="button"
            class="message-edit-button is-primary"
            :disabled="!editDraft.trim()"
            @click="saveEdit"
          >{{ t('chat.message.saveAndResend') }}</button>
        </div>
      </div>
    </div>

    <!-- Assistant branch: bare prose, no card. 不展示 hover toolbar —
         agent 回复用户只看不操作，复制由文本选中走系统粘贴板，反馈/分支
         等高级操作走右键或后续菜单。 -->
    <div v-else class="assistant-flow relative max-w-[min(920px,100%)]">
      <!-- reasoning (collapsed by default — Codex "已处理 ▾" style)
           完成后 summary 默认弱显示（opacity 0.4），hover assistant 块才完全可见，
           避免每条消息都显眼一个"已处理"。 -->
      <details v-if="message.reasoning" class="mb-3 reasoning-block" :class="message.completed ? 'reasoning-block--completed' : ''">
        <summary
          class="reasoning-summary cursor-pointer inline-flex max-w-full items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-2)] select-none list-none"
        >
          <span class="flex-shrink-0">{{ activityChips.length ? activitySummaryLabel : reasoningSummaryLabel }}</span>
          <span v-if="activityChips.length" class="activity-chips">
            <span
              v-for="chip in activityChips"
              :key="chip"
              class="activity-chip"
            >{{ chip }}</span>
          </span>
          <svg class="reasoning-chev w-3 h-3 transition-transform" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <div class="reasoning-detail mt-2 whitespace-pre-wrap">{{ message.reasoning }}</div>
      </details>

      <div
        v-else-if="hasActivityStrip"
        class="mb-3 activity-strip"
        :class="message.completed ? 'activity-strip--completed' : ''"
      >
        <span class="activity-strip__label">{{ activitySummaryLabel }}</span>
        <span class="activity-chips">
          <span
            v-for="chip in activityChips"
            :key="chip"
            class="activity-chip"
          >{{ chip }}</span>
        </span>
      </div>
      <div
        v-else-if="shouldShowLiveStatus"
        class="mb-3 activity-strip activity-strip--live"
      >
        <span class="live-dot" aria-hidden="true" />
        <span class="activity-strip__label">{{ runningActivityLabel }}</span>
      </div>

      <!-- tool calls (inline between paragraphs, grouped when completed/noisy) -->
      <details
        v-if="shouldGroupToolCalls"
        class="mb-3 tool-call-group"
        :open="toolCallGroupOpen"
      >
        <summary class="tool-call-group__summary">
          <span>{{ toolDetailsLabel }}</span>
          <span class="activity-chips">
            <span
              v-for="chip in activityChips"
              :key="chip"
              class="activity-chip"
            >{{ chip }}</span>
          </span>
          <svg class="tool-call-group__chev w-3 h-3 transition-transform" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <div class="mt-2 space-y-2">
          <ToolCallCard
            v-for="tc in message.toolCalls"
            :key="tc.id"
            :tool-call="tc"
          />
        </div>
      </details>
      <div v-else-if="message.toolCalls?.length" class="mb-3 space-y-2">
        <ToolCallCard
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool-call="tc"
        />
      </div>

      <!-- prose content -->
      <div ref="proseRef" class="prose-md assistant-prose" @click="onMarkdownClick">
        <!-- eslint-disable vue/no-v-html -->
        <div v-html="renderedHtml" />
        <!-- eslint-enable vue/no-v-html -->
        <span
          v-if="!message.completed"
          class="cursor-blink inline-block w-[2px] h-[1em] align-middle bg-current opacity-70 ml-0.5"
        />
      </div>

      <!-- 流式中显眼"停止"按钮 — 在 in-flight assistant 消息底部 -->
      <button
        v-if="isStreaming"
        type="button"
        class="message-stop-button mt-2 inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-elevate)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
        @click="emit('stop')"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="7" height="7" rx="1.5" />
        </svg>
        <span>{{ t('chat.composer.stop') }}</span>
      </button>

      <div
        v-if="selectionBubble"
        class="selection-add-popover"
        :style="{ left: `${selectionBubble.left}px`, top: `${selectionBubble.top}px` }"
        @mousedown.prevent
      >
        <button type="button" @click="addSelectionToComposer">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span>{{ t('chat.selection.addToComposer') }}</span>
        </button>
      </div>

      <!-- footer (time + tokens + cost + duration) — small, low-weight, only when completed -->
      <div
        v-if="message.completed && (message.tokenUsage || true)"
        class="message-footer mt-2"
      >
        <div class="message-footer-meta">
          <span>{{ fmtTime(message.createdAt) }}</span>
          <template v-if="tokenTotal != null">
            <span>·</span>
            <span :title="tokenBreakdownTitle">{{ t('chat.message.tokens', { n: tokenTotal }) }}</span>
          </template>
          <template v-if="costLabel">
            <span>·</span>
            <span>{{ costLabel }}</span>
          </template>
          <template v-if="durationLabel">
            <span>·</span>
            <span>{{ durationLabel }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Context menu -->
  <Teleport to="body">
    <div
      v-if="ctxMenu"
      class="ctx-menu"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
      @click.stop
    >
      <button v-if="isUser" class="ctx-item" @click="ctxEdit">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>{{ t('chat.message.edit') }}</span>
      </button>
      <button class="ctx-item" @click="ctxCopy">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>{{ t('chat.message.copy') }}</span>
      </button>
      <button class="ctx-item" @click="ctxQuote">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 5h3v6H3V5zm7 0h3v6h-3V5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        <span>{{ t('chat.message.quote') }}</span>
      </button>
      <button class="ctx-item" @click="ctxBranch">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2v4a3 3 0 0 0 3 3h1m-1 7v-4a3 3 0 0 1 3-3h1m-3-4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>{{ t('chat.message.branch') }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/* content-visibility 让浏览器跳过远离视口消息的布局 + 渲染 — 长会话 500+ 条
   时滚动从明显掉帧变 60fps。contain-intrinsic-size 是 fallback 占位高度，
   实际高度会在元素进入视口后被测量并替换。
   注意：必须在 root（不是子元素）上用；scoped 在 Vue 编译后会加 hash 属性，
   不影响匹配。 */
.cv-auto {
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;
}
.assistant-flow {
  position: relative;
  padding: 2px 0 2px 14px;
  color: var(--text-1);
}
.assistant-flow::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-500) 34%, transparent);
  /* 一直显示但弱化 — 给 assistant prose 一个视觉锚，hover 时加强 */
  opacity: 0.55;
  transform: scaleY(0.95);
  transform-origin: center;
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.message--assistant:hover .assistant-flow::before,
.message--assistant:focus-within .assistant-flow::before {
  opacity: 0.42;
  transform: scaleY(1);
}
.assistant-prose {
  max-width: 100%;
  font-size: 14px;
  line-height: 1.72;
}
.message-user-wrap {
  transition: transform var(--dur-fast) var(--ease);
}
.message-user-wrap.is-editing {
  width: min(100%, 940px);
  max-width: min(100%, 940px);
}
.message--user:hover .message-user-wrap {
  transform: translateY(-1px);
}
.user-message-chip,
.message-edit-card {
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  border-radius: 16px 16px 6px 16px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--bg-card) 68%, transparent),
      color-mix(in srgb, var(--bg-elevate) 84%, transparent)
    );
  color: var(--text-1);
  padding: 10px 14px;
  box-shadow:
    0 8px 24px color-mix(in srgb, var(--text-1) 5%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--bg-card) 95%, transparent);
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.user-message-chip {
  border-color: color-mix(in srgb, var(--brand-500) 0%, var(--border));
}
.message--user:hover .user-message-chip {
  border-color: color-mix(in srgb, var(--brand-500) 22%, var(--border));
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--text-1) 7%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--bg-card) 90%, transparent);
}
.user-message-images {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 6px;
  max-width: 360px;
}
.user-message-image {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 11px;
  background: var(--md-image-bg);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border) 86%, transparent),
    var(--shadow-1);
}
.message-edit-card {
  box-sizing: border-box;
  width: 100%;
  border-color: color-mix(in srgb, var(--brand-500) 28%, var(--border));
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 96%, transparent), color-mix(in srgb, var(--bg-elevate) 68%, transparent)),
    var(--bg-card);
  padding: 12px;
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--text-1) 9%, transparent),
    0 0 0 3px color-mix(in srgb, var(--brand-500) 5%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--bg-card) 95%, transparent);
}
.message-edit-textarea {
  display: block;
  width: 100%;
  min-height: 220px;
  max-height: 520px;
  resize: none;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-page) 58%, transparent);
  color: var(--text-1);
  font: inherit;
  font-size: 14px;
  line-height: 1.65;
  outline: none;
  padding: 12px 13px;
  scrollbar-color: color-mix(in srgb, var(--text-3) 44%, transparent) transparent;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.message-edit-textarea:focus {
  border-color: color-mix(in srgb, var(--brand-500) 44%, var(--border));
  background: color-mix(in srgb, var(--bg-page) 72%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-500) 9%, transparent);
}
.message-edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.message-edit-button {
  display: inline-flex;
  min-width: 72px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-elevate) 58%, transparent);
  color: var(--text-2);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 0 12px;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.message-edit-button:hover,
.message-edit-button:focus-visible {
  border-color: color-mix(in srgb, var(--border) 80%, transparent);
  background: color-mix(in srgb, var(--bg-elevate) 88%, transparent);
  color: var(--text-1);
  outline: none;
  transform: translateY(-1px);
}
.message-edit-button.is-primary {
  border-color: color-mix(in srgb, var(--brand-500) 22%, transparent);
  background: var(--brand-500);
  color: white;
}
.message-edit-button.is-primary:hover,
.message-edit-button.is-primary:focus-visible {
  border-color: color-mix(in srgb, var(--brand-600) 36%, transparent);
  background: var(--brand-600);
  color: white;
}
.message-edit-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
  transform: none;
}
.user-message-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 5px;
  color: var(--text-3);
  font-size: 10px;
  opacity: 0.72;
  transition: opacity var(--dur-fast) var(--ease);
}
.message--user:hover .user-message-meta,
.message--user:focus-within .user-message-meta {
  opacity: 1;
}
.user-message-time {
  flex: 0 0 auto;
}
.user-message-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 72%, transparent);
  padding: 2px;
  opacity: 0.58;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.message--user:hover .user-message-actions,
.message--user:focus-within .user-message-actions {
  border-color: color-mix(in srgb, var(--brand-500) 20%, var(--border));
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  opacity: 1;
}
.user-message-action {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 0 7px;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.user-message-action:hover {
  background: color-mix(in srgb, var(--brand-500) 9%, transparent);
  color: var(--brand-600);
  transform: translateY(-1px);
}
.user-message-action--icon {
  width: 24px;
  justify-content: center;
  padding: 0;
}
@media (max-width: 640px) {
  .user-message-action span {
    display: none;
  }

  .user-message-action {
    width: 24px;
    justify-content: center;
    padding: 0;
  }
}
.message-action-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.reasoning-block summary::-webkit-details-marker {
  display: none;
}
.reasoning-block[open] .reasoning-chev {
  transform: rotate(180deg);
}
.reasoning-summary {
  min-height: 26px;
  border-radius: 999px;
  padding: 2px 8px 2px 7px;
  line-height: 1.45;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.reasoning-summary:hover {
  background: color-mix(in srgb, var(--bg-elevate) 58%, transparent);
}
/* 完成态的 reasoning summary 默认弱显示，hover assistant 块才完整可见 —
   避免每条消息都显眼一个"已处理"标签。 */
.reasoning-block--completed > summary {
  opacity: 0.35;
  transition: opacity 0.18s ease;
}
.assistant-flow:hover .reasoning-block--completed > summary,
.reasoning-block--completed[open] > summary {
  opacity: 1;
}
.activity-strip--completed {
  opacity: 0.35;
  transition: opacity 0.18s ease;
}
.assistant-flow:hover .activity-strip--completed {
  opacity: 1;
}
.reasoning-detail {
  border-left: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.65;
  margin-left: 8px;
  padding: 8px 0 8px 12px;
}
.activity-strip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 58%, transparent);
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
  transition:
    opacity var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.activity-strip--live {
  border-style: dashed;
  background: color-mix(in srgb, var(--bg-card) 72%, transparent);
}
.activity-strip__label {
  flex-shrink: 0;
  color: var(--text-2);
  font-weight: 500;
}
.live-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--brand-500);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-500) 14%, transparent);
  animation: live-dot-pulse 1.2s ease-in-out infinite;
}
@keyframes live-dot-pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.86);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .live-dot {
    animation: none;
  }
}
.activity-chips {
  display: inline-flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.activity-chip {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-elevate) 52%, transparent);
  color: color-mix(in srgb, var(--text-2) 76%, transparent);
  padding: 1px 7px;
}
.activity-chip + .activity-chip::before {
  content: none;
}
.tool-call-group {
  color: var(--text-3);
}
.tool-call-group__summary {
  display: inline-flex;
  max-width: 100%;
  cursor: pointer;
  list-style: none;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 54%, transparent);
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.45;
  user-select: none;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.tool-call-group__summary:hover {
  border-color: color-mix(in srgb, var(--brand-500) 24%, var(--border));
  background: color-mix(in srgb, var(--bg-elevate) 64%, transparent);
  color: var(--text-2);
}
.tool-call-group__summary::-webkit-details-marker {
  display: none;
}
.tool-call-group[open] .tool-call-group__chev {
  transform: rotate(180deg);
}
.selection-add-popover {
  position: fixed;
  z-index: 80;
  transform: translateX(-50%);
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 96%, transparent);
  box-shadow:
    0 16px 42px color-mix(in srgb, black 13%, transparent),
    0 1px 0 color-mix(in srgb, white 35%, transparent) inset;
  backdrop-filter: blur(12px);
}
.selection-add-popover button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-1);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 0 12px;
}
.selection-add-popover button:hover {
  color: var(--brand-600);
}
.message-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-3);
  font-size: 11px;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.message--assistant:hover .message-footer,
.message--assistant:focus-within .message-footer {
  opacity: 1;
  transform: translateY(0);
}
.message-footer span {
  white-space: nowrap;
}
.message-footer-meta {
  display: inline-flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.assistant-message-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 72%, transparent);
  padding: 2px;
}
.assistant-message-action {
  display: inline-flex;
  height: 24px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 0 7px;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.assistant-message-action:hover {
  background: color-mix(in srgb, var(--brand-500) 9%, transparent);
  color: var(--brand-600);
  transform: translateY(-1px);
}
.quality-score {
  color: var(--text-3);
}
.quality-score--good {
  color: var(--color-success);
  font-weight: 500;
}
.quality-score--warn,
.risk-score {
  color: var(--color-warning);
  font-weight: 500;
}

/* ─── Context menu ─── */
.ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 140px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 10px;
  background: var(--bg-card);
  box-shadow: var(--shadow-3);
  backdrop-filter: blur(12px);
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  transition: background var(--dur-fast);
}
.ctx-item:hover {
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
  color: var(--text-1);
}
.ctx-item svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
