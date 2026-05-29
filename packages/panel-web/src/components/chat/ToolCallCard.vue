<script setup lang="ts">
/**
 * Codex-style tool-call card.
 *
 * Each call collapses to a single semantic summary row so the user sees
 * "what the agent did" without the noise of raw JSON. The user can still
 * expand the card to inspect inputs / outputs verbatim.
 *
 * Summary rendering is driven off a heuristic match on tool.name + the
 * shape of `input`. Unknown tools fall back to a generic `name(arg)`
 * line. We never throw on weird inputs — every helper tolerates missing
 * fields.
 */
import type { ToolCall } from '@hermes-panel/shared';
import { NButton, NTooltip, useMessage } from 'naive-ui';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  categorizeTool,
  getToolEditSummary,
  getToolCallFacts,
  pickToolString,
  shortPath,
  type EditFileChange,
  type ToolCategory,
} from '@/utils/tool-call-facts';

const props = defineProps<{ toolCall: ToolCall }>();
const { t } = useI18n();
const message = useMessage();

const status = computed(() => props.toolCall.status);
const statusLabel = computed(() => t(`chat.toolCall.${status.value}`));
const durationMs = computed(() =>
  props.toolCall.completedAt ? props.toolCall.completedAt - props.toolCall.startedAt : null,
);

// ─────────────────────────────────────────────────────────────────────
// Summary categorisation
// ─────────────────────────────────────────────────────────────────────

const name = computed(() => props.toolCall.name);
const category = computed<ToolCategory>(() => categorizeTool(name.value));
const facts = computed(() => getToolCallFacts(props.toolCall));
const editSummary = computed(() => getToolEditSummary(props.toolCall));
const primaryEditFile = computed(() => editSummary.value?.files[0] ?? null);

/**
 * The visible summary text, computed from category + input. Returned in
 * two parts: a small leading label (e.g. "$" / "edit") and the
 * informative body. Both render in `<code>` blocks for the shell case.
 */
interface Summary {
  /** Small prefix shown in opacity-60 before the body. */
  prefix?: string;
  /** The main one-line body, rendered in mono when monoBody=true. */
  body: string;
  monoBody?: boolean;
}

const summary = computed<Summary>(() => {
  const cat = category.value;
  if (cat === 'shell') {
    const cmd = pickToolString(props.toolCall, 'command', 'cmd', 'shell', 'script')
      ?? props.toolCall.preview
      ?? '';
    return { prefix: '$', body: cmd || name.value, monoBody: true };
  }
  if (cat === 'edit' || cat === 'write') {
    const path = primaryEditFile.value?.path ?? pickToolString(props.toolCall, 'path', 'file_path', 'filename', 'file');
    if (path) {
      return {
        prefix: t(cat === 'edit' ? 'chat.toolCall.editPrefix' : 'chat.toolCall.writePrefix'),
        body: shortPath(path),
        monoBody: true,
      };
    }
  }
  if (cat === 'read') {
    const path = pickToolString(props.toolCall, 'path', 'file_path', 'filename', 'file');
    if (path) {
      return { prefix: t('chat.toolCall.readPrefix'), body: shortPath(path), monoBody: true };
    }
  }
  if (cat === 'search') {
    const q = pickToolString(props.toolCall, 'pattern', 'query', 'q', 'regex', 'search');
    if (q) return { prefix: t('chat.toolCall.searchPrefix'), body: q, monoBody: true };
  }
  if (cat === 'skill') {
    const skill = facts.value.skills[0] ?? pickToolString(props.toolCall, 'name');
    return {
      prefix: t('chat.toolCall.skillPrefix'),
      body: skill ?? props.toolCall.preview ?? name.value,
      monoBody: true,
    };
  }
  // Generic fallback: show preview if available, else "name(first-arg)".
  if (props.toolCall.preview) {
    return { body: props.toolCall.preview };
  }
  const firstArg = Object.entries(props.toolCall.input ?? {})[0];
  if (firstArg && typeof firstArg[1] === 'string' && (firstArg[1] as string).length < 80) {
    return { body: `${name.value} · ${firstArg[1] as string}` };
  }
  return { body: name.value, monoBody: true };
});

const actionLabel = computed(() => t(`chat.toolCall.action.${status.value}.${category.value}`));
const editChangeLabel = computed(() => {
  const edit = editSummary.value;
  if (!edit) return null;
  return { additions: `+${edit.additions}`, deletions: `-${edit.deletions}` };
});

const detailFacts = computed(() => {
  const parts: string[] = [];
  if (facts.value.files.length && !editSummary.value) parts.push(facts.value.files[0]);
  if (facts.value.skills.length && category.value !== 'skill') {
    parts.push(t('chat.toolCall.skillMeta', { name: facts.value.skills[0] }));
  }
  if (facts.value.lineCount != null && facts.value.lineCount > 0 && !editSummary.value) {
    parts.push(t('chat.toolCall.lines', { n: facts.value.lineCount }));
  }
  return parts;
});
const stateLine = computed(() => [actionLabel.value, ...detailFacts.value].join(' · '));

// ─────────────────────────────────────────────────────────────────────
// Raw input/output (still available on expand)
// ─────────────────────────────────────────────────────────────────────

const hasInput = computed(
  () => props.toolCall.input && Object.keys(props.toolCall.input).length > 0,
);
const inputText = computed(() => JSON.stringify(props.toolCall.input ?? {}, null, 2));
const outputText = computed(() => {
  const out = props.toolCall.output;
  if (out === undefined) return '';
  return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
});
const outputBytes = computed(() => outputText.value.length);

function lineNo(line: EditFileChange['lines'][number]): string {
  return String(line.kind === 'delete' ? line.oldLine ?? '' : line.newLine ?? '');
}

function linePrefix(kind: EditFileChange['lines'][number]['kind']): string {
  if (kind === 'add') return '+';
  if (kind === 'delete') return '-';
  return ' ';
}

function copyPatch(file: EditFileChange): void {
  void copy(file.patchText || file.lines.map(line => `${linePrefix(line.kind)}${line.content}`).join('\n'));
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('chat.message.copied'));
  } catch {
    /* clipboard may be unavailable in insecure contexts */
  }
}
</script>

<template>
  <details
    class="tool-call text-xs transition-colors"
  >
    <summary
      class="tool-call__summary cursor-pointer flex items-center gap-2 select-none"
      :title="`${stateLine} · ${summary.body}`"
    >
      <!-- Status icon -->
      <span class="tool-call__icon flex-shrink-0 inline-flex items-center justify-center w-4 h-4">
        <svg
          v-if="status === 'running'"
          class="w-4 h-4 animate-spin text-[var(--brand-500)]"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
          <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg
          v-else-if="status === 'done'"
          class="tool-status-icon tool-status-icon--done w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg
          v-else-if="status === 'error'"
          class="tool-status-icon tool-status-icon--error w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg
          v-else
          class="w-4 h-4 text-[var(--text-3)]"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
          <path d="M8 4.5V8l2.25 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>

      <!-- Semantic summary -->
      <span class="tool-call__text min-w-0 flex-1 truncate text-[var(--text-2)]">
        <span class="font-medium text-[var(--text-1)]">{{ actionLabel }}</span>
        <span v-if="summary.prefix" class="text-[var(--text-3)]"> · {{ summary.prefix }}</span>
        <span
          class="text-[var(--text-2)]"
          :class="summary.monoBody ? 'font-mono' : ''"
        > · {{ summary.body }}</span>
        <template v-if="editChangeLabel">
          <span class="tool-diff-count tool-diff-count--add"> {{ editChangeLabel.additions }}</span>
          <span class="tool-diff-count tool-diff-count--delete"> {{ editChangeLabel.deletions }}</span>
        </template>
        <span v-for="part in detailFacts" :key="part" class="text-[var(--text-3)]"> · {{ part }}</span>
      </span>

      <!-- Duration / status -->
      <span class="tool-call__meta opacity-60 ml-auto flex-shrink-0 tabular-nums text-[var(--text-3)]">
        <span v-if="durationMs != null">{{ (durationMs / 1000).toFixed(1) }}s</span>
        <span v-else>{{ statusLabel }}</span>
      </span>

      <!-- Disclosure chevron -->
      <svg
        class="tool-call__chev w-3 h-3 text-[var(--text-3)] flex-shrink-0 transition-transform"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </summary>

    <!-- Expanded detail: name + raw input + raw output -->
    <div class="tool-call__details px-3 pb-3 pt-2 space-y-3 border-t border-[var(--border)]">
      <div class="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider">
        {{ name }}
      </div>

      <div v-if="editSummary" class="edited-files">
        <div class="edited-files__title">
          <span>{{ t('chat.toolCall.editedFiles') }}</span>
          <span class="tool-diff-count tool-diff-count--add">+{{ editSummary.additions }}</span>
          <span class="tool-diff-count tool-diff-count--delete">-{{ editSummary.deletions }}</span>
        </div>
        <details
          v-for="(file, index) in editSummary.files"
          :key="file.path"
          class="edit-preview"
          :open="index === 0"
        >
          <summary class="edit-preview__summary">
            <span class="min-w-0 truncate font-mono">{{ file.path }}</span>
            <span class="tool-diff-count tool-diff-count--add">+{{ file.additions }}</span>
            <span class="tool-diff-count tool-diff-count--delete">-{{ file.deletions }}</span>
            <button
              type="button"
              class="edit-preview__copy"
              :title="t('chat.toolCall.copyPatch')"
              @click.prevent="copyPatch(file)"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="5" y="5" width="8" height="8" rx="1.5" />
                <path d="M3 11V4.5A1.5 1.5 0 0 1 4.5 3H11" />
              </svg>
            </button>
            <svg class="edit-preview__chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </summary>
          <div class="diff-view">
            <div
              v-for="(line, lineIndex) in file.lines"
              :key="`${file.path}-${lineIndex}`"
              class="diff-line"
              :class="`diff-line--${line.kind}`"
            >
              <span class="diff-line__no">{{ lineNo(line) }}</span>
              <span class="diff-line__mark">{{ linePrefix(line.kind) }}</span>
              <code>{{ line.content || ' ' }}</code>
            </div>
            <div v-if="file.truncated" class="diff-truncated">
              {{ t('chat.toolCall.diffTruncated') }}
            </div>
          </div>
        </details>
      </div>

      <div v-if="hasInput">
        <div class="flex items-center justify-between mb-1">
          <span class="opacity-60">{{ t('chat.toolCall.input') }}</span>
          <NTooltip :delay="300" trigger="hover">
            <template #trigger>
              <NButton size="tiny" quaternary @click="copy(inputText)">
                {{ t('chat.toolCall.copyInput') }}
              </NButton>
            </template>
            {{ t('chat.toolCall.copyInput') }}
          </NTooltip>
        </div>
        <div class="tool-block tool-block--sm">
          <pre class="tool-pre font-mono whitespace-pre-wrap break-words">{{ inputText }}</pre>
        </div>
      </div>

      <div v-if="toolCall.output !== undefined">
        <div class="flex items-center justify-between mb-1">
          <span class="opacity-60">
            {{ t('chat.toolCall.output') }}
            <span class="text-[var(--text-3)] ml-1 tabular-nums">· {{ outputBytes }}b</span>
          </span>
          <NTooltip :delay="300" trigger="hover">
            <template #trigger>
              <NButton size="tiny" quaternary @click="copy(outputText)">
                {{ t('chat.toolCall.copyOutput') }}
              </NButton>
            </template>
            {{ t('chat.toolCall.copyOutput') }}
          </NTooltip>
        </div>
        <div class="tool-block tool-block--lg">
          <pre class="tool-pre font-mono whitespace-pre-wrap break-words">{{ outputText }}</pre>
        </div>
      </div>

      <!--
        While running, output is not yet available. Show a "waiting"
        placeholder using the same dot animation so expanding the card
        mid-run isn't a dead-end. Suppressed once the tool actually
        produces output (the v-if above takes over).
      -->
      <div
        v-else-if="status === 'running'"
        class="text-[var(--text-3)] text-[11px] flex items-center gap-1.5"
      >
        <span>{{ t('chat.toolCall.waitingOutput') }}</span>
        <span class="tool-dots" aria-hidden="true"><span></span><span></span><span></span></span>
      </div>

      <div v-if="toolCall.errorMessage" class="tool-error-message font-mono text-[11px]">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>

<style scoped>
.tool-call {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 48%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card) 34%, transparent);
}
.tool-call[open] {
  border-color: color-mix(in srgb, var(--border) 78%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--bg-elevate) 48%, transparent),
      color-mix(in srgb, var(--bg-card) 44%, transparent)
    );
  box-shadow: 0 10px 28px color-mix(in srgb, var(--text-1) 5%, transparent);
}
.tool-call:not([open]) > .tool-call__summary:hover {
  background: color-mix(in srgb, var(--bg-elevate) 56%, transparent);
}
.tool-call[open] > .tool-call__summary {
  background: color-mix(in srgb, var(--bg-elevate) 62%, transparent);
}
.tool-call[open] > summary .tool-call__chev {
  transform: rotate(180deg);
}
.tool-call__summary {
  list-style: none;
  min-height: 34px;
  border-radius: 11px;
  padding: 6px 9px;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.tool-call__summary::-webkit-details-marker {
  display: none;
}
.tool-call__icon {
  opacity: 0.9;
}
.tool-call__text {
  line-height: 1.45;
}
.tool-call__meta {
  font-size: 11px;
}
.tool-status-icon--done {
  color: var(--color-success);
}
.tool-status-icon--error,
.tool-error-message {
  color: var(--color-error);
}
.tool-diff-count {
  margin-left: 4px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.tool-diff-count--add {
  color: var(--color-success);
}
.tool-diff-count--delete {
  color: var(--color-error);
}
.edited-files {
  display: grid;
  gap: 8px;
}
.edited-files__title {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}
.edit-preview {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
}
.edit-preview__summary {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  color: var(--text-2);
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.edit-preview__summary::-webkit-details-marker {
  display: none;
}
.edit-preview[open] .edit-preview__summary {
  border-bottom: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  background: color-mix(in srgb, var(--bg-elevate) 54%, transparent);
}
.edit-preview__copy {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}
.edit-preview__copy:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.edit-preview__chev {
  flex-shrink: 0;
  color: var(--text-3);
  transition: transform 160ms var(--ease);
}
.edit-preview[open] .edit-preview__chev {
  transform: rotate(180deg);
}
.diff-view {
  max-height: 320px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.6;
}
.diff-line {
  display: grid;
  grid-template-columns: 48px 18px minmax(0, 1fr);
  min-width: 0;
}
.diff-line__no {
  padding-right: 10px;
  border-right: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  color: var(--text-3);
  text-align: right;
  user-select: none;
}
.diff-line__mark {
  text-align: center;
  user-select: none;
}
.diff-line code {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.diff-line--add {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}
.diff-line--add .diff-line__no,
.diff-line--add .diff-line__mark {
  color: var(--color-success);
}
.diff-line--delete {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}
.diff-line--delete .diff-line__no,
.diff-line--delete .diff-line__mark {
  color: var(--color-error);
}
.diff-line--context {
  color: var(--text-2);
}
.diff-truncated {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
}
.tool-block {
  position: relative;
}
.tool-block--sm .tool-pre {
  max-height: 140px;
  overflow-y: auto;
}
.tool-block--lg .tool-pre {
  max-height: 280px;
  overflow-y: auto;
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(to bottom, black calc(100% - 24px), transparent 100%);
}
.tool-pre {
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--border) 56%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card) 78%, transparent);
  padding: 9px 10px;
  font-size: 11px;
  line-height: 1.5;
}

/*
 * CSS-only 3-dot animation. Each dot fades in turn so the user sees a
 * gentle moving rhythm without any JS state. Honors prefers-reduced-motion
 * by collapsing to a static row of dots at constant 60% opacity.
 */
.tool-dots {
  display: inline-flex;
  gap: 2px;
  line-height: 0;
}
.tool-dots > span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.2;
  animation: tool-dots-blink 1.2s var(--ease) infinite;
}
.tool-dots > span:nth-child(2) { animation-delay: 0.2s; }
.tool-dots > span:nth-child(3) { animation-delay: 0.4s; }
@keyframes tool-dots-blink {
  0%, 80%, 100% { opacity: 0.2; }
  40%           { opacity: 0.9; }
}
@media (prefers-reduced-motion: reduce) {
  .tool-dots > span {
    animation: none;
    opacity: 0.6;
  }
}
</style>
