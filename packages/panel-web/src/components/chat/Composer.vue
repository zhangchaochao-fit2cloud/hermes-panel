<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ContextRing from './ContextRing.vue';
import ThinkingStrategyPicker from './ThinkingStrategyPicker.vue';
import { useHotkeysStore, chordToDisplayTokens } from '@/stores/hotkeys';
import { useSessionStore } from '@/stores/session';
import { useBreakpoint } from '@/composables/use-breakpoint';

const { t } = useI18n();
const hotkeys = useHotkeysStore();
const session = useSessionStore();
const { isMobile } = useBreakpoint();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto';
  sending: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', text: string): void;
  (e: 'stop'): void;
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto'): void;
}>();

// Suppress "unused" warning for `model` — kept on the prop signature for
// backward compatibility with parent v-model:model bindings even though the
// composer itself no longer renders a model switcher.
void props.model;
void emit;

const text = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const canSend = computed(() => text.value.trim().length > 0 && !props.sending);

/**
 * Auto-grow: starts ~2 rows, grows up to ~8, then scrolls. We measure
 * `scrollHeight` of an offscreen-shrunk textarea each tick the value changes
 * and clamp to MAX_PX. Doing it imperatively (rather than via rows="…") keeps
 * the textarea a single source of truth and avoids layout jumps from
 * row→pixel rounding.
 */
const LINE_HEIGHT_PX = 20; // matches text-sm (14px) * leading-snug; see <textarea> class
const MIN_ROWS = 2;
const MAX_ROWS = 8;
const VERTICAL_PADDING_PX = 24; // p-3 = 12px top + 12px bottom
const MIN_PX = LINE_HEIGHT_PX * MIN_ROWS + VERTICAL_PADDING_PX;
const MAX_PX = LINE_HEIGHT_PX * MAX_ROWS + VERTICAL_PADDING_PX;

function resize(): void {
  const el = textareaRef.value;
  if (!el) return;
  // Collapse first so scrollHeight reflects content height, not the previous
  // (larger) box height.
  el.style.height = 'auto';
  const next = Math.min(MAX_PX, Math.max(MIN_PX, el.scrollHeight));
  el.style.height = `${next}px`;
  // Show scrollbar only when clamped at the max.
  el.style.overflowY = el.scrollHeight > MAX_PX ? 'auto' : 'hidden';
}

watch(text, () => { void nextTick(resize); });
onMounted(() => { resize(); });

const charCount = computed(() => text.value.length);
const showCharCount = computed(() => charCount.value > 50);

const sendChord = computed(() => hotkeys.bindings.send);
const sendChordTokens = computed(() => chordToDisplayTokens(sendChord.value));

function onKeydown(e: KeyboardEvent): void {
  // Skip while IME is composing — Enter should commit the composition, not send.
  if (e.isComposing) return;
  // `newline` is the explicit no-op (default Shift+Enter inserts a newline as
  // the browser already does); only handle it if the user remapped it, so
  // that the chord doesn't accidentally trigger `send`.
  if (hotkeys.matches(e, 'newline')) {
    return;
  }
  if (hotkeys.matches(e, 'send')) {
    e.preventDefault();
    submit();
  }
}

function submit(): void {
  if (!canSend.value) return;
  emit('send', text.value.trim());
  text.value = '';
  void nextTick(resize);
}

function onStop(): void {
  emit('stop');
}

/** Prepend an @role mention so the user can keep typing the request. */
function prependMention(roleId: string): void {
  const prefix = `@${roleId} `;
  text.value = prefix + text.value.replace(/^@[\w-]+\s+/, '');
  focus();
}

/** Externally populate the composer (e.g. from VS Code draft, sample prompts). */
function setText(v: string): void {
  text.value = v;
  focus();
}

function focus(): void {
  // Wait a tick so the new value is rendered before we move the cursor
  setTimeout(() => {
    const el = textareaRef.value;
    if (!el) return;
    resize();
    el.focus();
    // Place caret at the end so the user can keep typing
    el.setSelectionRange(text.value.length, text.value.length);
  }, 0);
}

defineExpose({ prependMention, setText, focus });
</script>

<template>
  <!--
    Codex-style composer: pill-rounded card, textarea on top, a single
    horizontal toolbar at the bottom (no internal divider), with a
    circular Send button anchored bottom-right.
  -->
  <div
    class="composer-shell rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 focus-within:border-[var(--text-3)]"
  >
    <!-- Textarea -->
    <div class="composer-textarea-wrap px-5 pt-4 pb-1">
      <textarea
        ref="textareaRef"
        v-model="text"
        :placeholder="t('chat.composer.placeholder')"
        class="composer-textarea block w-full resize-none outline-none bg-transparent text-[15px] font-sans"
        rows="2"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        @keydown="onKeydown"
      />
    </div>

    <!-- Bottom toolbar: + button · speed · meter · meta · send -->
    <div class="flex items-center gap-2 px-3 pb-3 pt-1">
      <!-- "+" placeholder for attachments (visual only for v0.x) -->
      <button
        type="button"
        class="composer-icon-btn cursor-pointer"
        :title="t('chat.composer.attach')"
        :aria-label="t('chat.composer.attach')"
        disabled
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>

      <!-- Thinking-speed segmented chips -->
      <ThinkingStrategyPicker
        :value="thinkingSpeed"
        :disabled="sending"
        @update:value="(v: 'fast' | 'auto' | 'extended') => emit('update:thinkingSpeed', v)"
      />

      <!-- spacer -->
      <span class="flex-1" />

      <!-- Inline context meter (click opens breakdown popover) -->
      <ContextRing
        :used="session.tokenUsage.total"
        :input="session.tokenUsage.input"
        :output="session.tokenUsage.output"
        :model="model"
      />

      <!-- Char count + hotkey hint, desktop only -->
      <span
        v-if="showCharCount"
        class="font-mono text-[var(--text-3)] tabular-nums text-xs"
      >
        {{ t('chat.composer.chars', { n: charCount }) }}
      </span>
      <span
        v-if="!isMobile"
        class="hidden md:inline-flex items-center gap-1 text-[var(--text-3)] text-xs"
      >
        <template v-for="(tok, i) in sendChordTokens" :key="`${tok}-${i}`">
          <kbd class="composer-kbd">{{ tok }}</kbd>
          <span v-if="i < sendChordTokens.length - 1" class="opacity-50">+</span>
        </template>
      </span>

      <!-- Circular Send / Stop button -->
      <button
        v-if="sending"
        type="button"
        class="composer-send-btn is-stop cursor-pointer"
        :title="t('chat.composer.stop')"
        :aria-label="t('chat.composer.stop')"
        @click="onStop"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="1.5" />
        </svg>
      </button>
      <button
        v-else
        type="button"
        class="composer-send-btn cursor-pointer"
        :disabled="!canSend"
        :title="t('chat.composer.send')"
        :aria-label="t('chat.composer.send')"
        @click="submit"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 13V3M3 8l5-5 5 5" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * Auto-grown textarea: explicit min/max so the inline style.height stays
 * within the documented bounds even if JS hasn't run yet (first paint).
 * Padding here matches VERTICAL_PADDING_PX in the script so scrollHeight
 * measurement and rendered box agree.
 */
/*
 * Wrap exists so we can paint a soft top/bottom mask once content
 * exceeds max-height: the scrolling textarea fades into the toolbar
 * instead of slamming into it with a hard edge.
 */
.composer-textarea-wrap {
  position: relative;
}

.composer-textarea {
  min-height: 52px;
  max-height: 220px;
  padding: 0;
  line-height: 1.55;
  color: var(--text-1);
  /* Use a slightly soft brand-tinted caret so the cursor stands out in
   * every theme without resorting to the OS default. */
  caret-color: var(--brand-500);
  /* Hide scrollbar until we explicitly toggle overflow-y in resize() */
  overflow-y: hidden;
  /* Word break: prevent URL-style content from blowing the toolbar out. */
  overflow-wrap: anywhere;
  word-break: break-word;
}

.composer-textarea::placeholder {
  color: var(--text-3);
  /* placeholder should slightly fade out as the user starts typing —
   * lower opacity makes it less competing for attention. */
  opacity: 0.85;
}

/* Selection color mirrors the brand so highlighted text doesn't look
 * out of place on dark / glass themes (default browser selection is a
 * jarring system blue). */
.composer-textarea::selection {
  background: color-mix(in srgb, var(--brand-500) 28%, transparent);
  color: var(--text-1);
}

/* Slim Codex-style scrollbar — only visible once the textarea exceeds
 * max-height. Hidden by default; revealed when the resize() helper
 * flips overflow-y to auto. */
.composer-textarea::-webkit-scrollbar {
  width: 6px;
}
.composer-textarea::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-3) 35%, transparent);
  border-radius: 999px;
}
.composer-textarea::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--text-3) 55%, transparent);
}
.composer-textarea::-webkit-scrollbar-track {
  background: transparent;
}
/* Firefox */
.composer-textarea {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-3) 35%, transparent) transparent;
}

.composer-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  color: var(--text-2);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
}

/* Codex-style icon button: transparent default, soft elevate hover, no
 * outer border — sits inline with text-style chips next to it. Used for
 * the leading "+" attach slot and the trailing mic placeholder. */
.composer-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-2);
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.composer-icon-btn:hover {
  background: var(--bg-elevate);
  color: var(--text-1);
}
.composer-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Round 32px send button — dark filled circle with white arrow, matching
 * the Codex-style reference. Stop variant uses the error color. */
.composer-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: 999px;
  background: var(--text-1);
  color: var(--bg-card);
  border: none;
  transition:
    background-color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.composer-send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.composer-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.composer-send-btn.is-stop {
  background: #ef4444;
  color: #ffffff;
}
</style>
