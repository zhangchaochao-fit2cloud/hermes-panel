<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import { computed } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useBreakpoint } from '@/composables/use-breakpoint';
import { renderMarkdown } from '@/utils/markdown';
import ToolCallCard from './ToolCallCard.vue';

const props = defineProps<{ message: ChatMessage }>();

const emit = defineEmits<{
  (e: 'regenerate', id: string): void;
  (e: 'edit', content: string): void;
  (e: 'feedback', payload: { id: string; kind: 'up' | 'down' }): void;
}>();

const { t } = useI18n();
const toast = useMessage();
const { isMobile } = useBreakpoint();

// TODO: gate on appearance store's `showLocalMetrics` once that key lands.
// Hard-coded false for now to avoid racing another agent who's adding the key.
const showLocalMetrics = false as const;

const isUser = computed(() => props.message.role === 'user');
const isAssistant = computed(() => props.message.role === 'assistant');

/**
 * Render assistant content through markdown-it; leave user content as
 * plain text. User input rendering would mean a stray "# foo" turns
 * into a giant heading — surprising and rarely intended.
 *
 * markdown-it is robust against partial input, so streaming half-formed
 * fences still render gracefully (the unclosed token shows as text).
 */
const renderedHtml = computed(() =>
  isAssistant.value ? renderMarkdown(props.message.content) : '',
);

/**
 * Summary label for the reasoning <details>. Mirrors the Codex
 * "已处理 1m 7s" / "Thought for 1m 7s" pattern. Duration is best-effort
 * from `reasoningDurationMs` (if the stream store has it) — fall back
 * to a label without time if not available.
 */
const reasoningSummaryLabel = computed(() => {
  const ms = (props.message as unknown as { reasoningDurationMs?: number }).reasoningDurationMs;
  if (typeof ms === 'number' && ms > 0) {
    return t('chat.reasoningWithTime', { time: fmtDuration(ms) });
  }
  return t('chat.reasoningDone');
});

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
  if (u.input) parts.push(`In: ${u.input}`);
  if (u.output) parts.push(`Out: ${u.output}`);
  return parts.length ? parts.join(' · ') : undefined;
});

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function qualityColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 font-medium';
  if (score >= 60) return 'text-zinc-500';
  return 'text-orange-600 font-medium';
}

async function copyContent(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content);
    toast.success(t('chat.message.copied'));
  } catch {
    // Clipboard API can reject in non-secure contexts; stay silent on hover toolbar.
  }
}

function onRegenerate(): void {
  emit('regenerate', props.message.id);
}

function onEdit(): void {
  emit('edit', props.message.content);
}

function onFeedback(kind: 'up' | 'down'): void {
  emit('feedback', { id: props.message.id, kind });
}
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
    class="group relative w-full message-enter"
    :class="isUser ? 'message--user mb-2 flex justify-end' : 'message--assistant mb-5'"
    :data-msg-id="message.id"
  >
    <!-- User branch: pill bubble (chip-like) anchored right -->
    <div v-if="isUser" class="relative max-w-[80%]">
      <!-- hover toolbar -->
      <div
        v-if="!isMobile"
        class="absolute -top-7 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10"
      >
        <NButton quaternary size="tiny" :title="t('chat.message.copy')" :aria-label="t('chat.message.copy')" @click="copyContent">
          📋
        </NButton>
        <NButton quaternary size="tiny" :title="t('chat.message.edit')" :aria-label="t('chat.message.edit')" @click="onEdit">
          ✏️
        </NButton>
      </div>

      <div class="rounded-2xl px-4 py-2.5 bg-[var(--bg-elevate)] border border-[var(--border)] text-[var(--text-1)]">
        <div class="whitespace-pre-wrap text-[14px] font-normal leading-[1.55]">{{ message.content }}</div>
        <div
          v-if="isEdited"
          class="mt-1 text-[11px] opacity-50 italic"
        >{{ t('chat.message.edited') }}</div>
      </div>
    </div>

    <!-- Assistant branch: bare prose, no card -->
    <div v-else class="relative">
      <!-- hover toolbar (anchored to right of column so it doesn't shift on prose width) -->
      <div
        v-if="!isMobile"
        class="absolute -top-1 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10"
      >
        <NButton quaternary size="tiny" :title="t('chat.message.copy')" :aria-label="t('chat.message.copy')" @click="copyContent">
          📋
        </NButton>
        <NButton quaternary size="tiny" :title="t('chat.message.regenerate')" :aria-label="t('chat.message.regenerate')" @click="onRegenerate">
          🔄
        </NButton>
        <template v-if="message.completed">
          <NButton quaternary size="tiny" :title="t('chat.message.feedbackUp')" :aria-label="t('chat.message.feedbackUp')" @click="onFeedback('up')">
            👍
          </NButton>
          <NButton quaternary size="tiny" :title="t('chat.message.feedbackDown')" :aria-label="t('chat.message.feedbackDown')" @click="onFeedback('down')">
            👎
          </NButton>
        </template>
      </div>

      <!-- reasoning (collapsed by default — Codex "已处理 ▾" style) -->
      <details v-if="message.reasoning" class="mb-3 reasoning-block">
        <summary
          class="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-2)] select-none list-none"
        >
          <span>{{ reasoningSummaryLabel }}</span>
          <svg class="reasoning-chev w-3 h-3 transition-transform" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <div class="mt-2 text-xs text-[var(--text-2)] whitespace-pre-wrap pl-3 border-l-2 border-[var(--border)] leading-relaxed">{{ message.reasoning }}</div>
      </details>

      <!-- tool calls (inline between paragraphs) -->
      <div v-if="message.toolCalls?.length" class="mb-3 space-y-2">
        <ToolCallCard
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool-call="tc"
        />
      </div>

      <!-- prose content -->
      <div class="prose-md">
        <!-- eslint-disable vue/no-v-html -->
        <div v-html="renderedHtml" />
        <!-- eslint-enable vue/no-v-html -->
        <span
          v-if="!message.completed"
          class="cursor-blink inline-block w-[2px] h-[1em] align-middle bg-current opacity-70 ml-0.5"
        />
      </div>

      <!-- footer (time + tokens) — small, low-weight, only when completed -->
      <div
        v-if="message.completed && (message.tokenUsage || true)"
        class="mt-2 text-[11px] text-[var(--text-3)] flex items-center gap-2 flex-wrap"
      >
        <span>{{ fmtTime(message.createdAt) }}</span>
        <template v-if="tokenTotal != null">
          <span>·</span>
          <span :title="tokenBreakdownTitle">{{ tokenTotal }} tokens</span>
        </template>
        <template v-if="showLocalMetrics && message.qualityScore != null">
          <span>·</span>
          <span
            :class="qualityColorClass(message.qualityScore)"
            :title="`本地估算 · 质量 ${message.qualityScore} / 100`"
          >q={{ message.qualityScore }}</span>
          <span
            v-if="message.hallucinationRisk != null && message.hallucinationRisk > 0.3"
            class="text-orange-600 font-medium"
            :title="`本地启发式估算 · 仅供参考`"
          >⚠ 可能含幻觉 ({{ Math.round(message.hallucinationRisk * 100) }}%)</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reasoning-block summary::-webkit-details-marker {
  display: none;
}
.reasoning-block[open] .reasoning-chev {
  transform: rotate(180deg);
}
</style>
