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

type Category = 'shell' | 'edit' | 'read' | 'search' | 'write' | 'other';

const name = computed(() => props.toolCall.name);

const category = computed<Category>(() => {
  const n = name.value.toLowerCase();
  if (/^(bash|shell|exec|cmd|run_command|run_shell)/.test(n)) return 'shell';
  if (/^(edit|patch|apply_diff|str_replace|multi_edit)/.test(n)) return 'edit';
  if (/^(write|create_file|put_file)/.test(n)) return 'write';
  if (/^(read|view|cat|open)/.test(n)) return 'read';
  if (/^(search|grep|rg|find_files|glob)/.test(n)) return 'search';
  return 'other';
});

/** Pluck a string field from the input bag, ignoring nullish or empty. */
function pickString(...keys: string[]): string | null {
  const obj = (props.toolCall.input ?? {}) as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return null;
}

/** Short relative path: home → ~, trim to last 60 chars. */
function shortPath(p: string): string {
  const home = '/Users/';
  let s = p;
  if (s.startsWith(home)) {
    const slash = s.indexOf('/', home.length);
    s = '~' + (slash >= 0 ? s.slice(slash) : '');
  }
  return s.length > 60 ? '…' + s.slice(-58) : s;
}

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
    const cmd = pickString('command', 'cmd', 'shell', 'script')
      ?? props.toolCall.preview
      ?? '';
    return { prefix: '$', body: cmd || name.value, monoBody: true };
  }
  if (cat === 'edit' || cat === 'write') {
    const path = pickString('path', 'file_path', 'filename', 'file');
    if (path) {
      return {
        prefix: t(cat === 'edit' ? 'chat.toolCall.editPrefix' : 'chat.toolCall.writePrefix'),
        body: shortPath(path),
        monoBody: true,
      };
    }
  }
  if (cat === 'read') {
    const path = pickString('path', 'file_path', 'filename', 'file');
    if (path) {
      return { prefix: t('chat.toolCall.readPrefix'), body: shortPath(path), monoBody: true };
    }
  }
  if (cat === 'search') {
    const q = pickString('pattern', 'query', 'q', 'regex', 'search');
    if (q) return { prefix: t('chat.toolCall.searchPrefix'), body: q, monoBody: true };
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
    class="tool-call rounded-lg border border-[var(--border)] bg-[var(--bg-elevate)] text-xs transition-colors hover:border-[var(--text-3)]"
  >
    <summary class="cursor-pointer flex items-center gap-2 px-3 py-2 select-none rounded-lg">
      <!-- Status icon -->
      <span class="flex-shrink-0 inline-flex items-center justify-center w-4 h-4">
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
          class="w-4 h-4 text-emerald-500"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg
          v-else-if="status === 'error'"
          class="w-4 h-4 text-red-500"
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
      <span
        v-if="summary.prefix"
        class="text-[var(--text-3)] flex-shrink-0"
        :class="summary.monoBody ? 'font-mono' : ''"
      >{{ summary.prefix }}</span>
      <span
        class="min-w-0 flex-1 truncate text-[var(--text-1)]"
        :class="summary.monoBody ? 'font-mono' : ''"
        :title="summary.body"
      >{{ summary.body }}</span>

      <!-- Duration / status -->
      <span class="opacity-60 ml-auto flex-shrink-0 tabular-nums text-[var(--text-3)]">
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
    <div class="px-3 pb-3 pt-1 space-y-3 border-t border-[var(--border)]">
      <div class="text-[10px] font-mono text-[var(--text-3)] uppercase tracking-wider">
        {{ name }}
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
          <pre class="tool-pre bg-[var(--bg-card)] p-2 rounded font-mono whitespace-pre-wrap break-words">{{ inputText }}</pre>
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
          <pre class="tool-pre bg-[var(--bg-card)] p-2 rounded font-mono whitespace-pre-wrap break-words">{{ outputText }}</pre>
        </div>
      </div>

      <div v-if="toolCall.errorMessage" class="text-red-600 font-mono text-[11px]">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>

<style scoped>
.tool-call[open] > summary .tool-call__chev {
  transform: rotate(180deg);
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
  font-size: 11px;
  line-height: 1.5;
}
</style>
