<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
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
const hotkeyHint = computed(() => {
  // e.g. "⌘+Enter to send" on mac, "Ctrl+Enter to send" elsewhere
  const tokens = chordToDisplayTokens(sendChord.value);
  return t('chat.composer.hotkeyHint', { chord: tokens.join('+') });
});

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
  <div
    class="composer-shell rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-2)] transition-all duration-200 focus-within:border-[var(--brand-500)] focus-within:shadow-[var(--shadow-3)]"
  >
    <!-- Top row: textarea + send/stop button -->
    <div class="flex items-end gap-2 px-4 pt-3 pb-2">
      <textarea
        ref="textareaRef"
        v-model="text"
        :placeholder="t('chat.composer.placeholder')"
        class="composer-textarea flex-1 resize-none outline-none bg-transparent text-sm font-sans leading-relaxed text-[var(--text-1)] placeholder:text-[var(--text-3)]"
        rows="2"
        @keydown="onKeydown"
      />
      <div class="shrink-0 self-end pb-0.5">
        <NButton
          v-if="sending"
          type="error"
          size="medium"
          @click="onStop"
        >
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
            </svg>
          </template>
          {{ t('chat.composer.stop') }}
        </NButton>
        <NButton
          v-else
          type="primary"
          size="medium"
          :disabled="!canSend"
          @click="submit"
        >
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 8L14 2L9 14L8 9L2 8Z" />
            </svg>
          </template>
          {{ t('chat.composer.send') }}
        </NButton>
      </div>
    </div>

    <!-- Bottom toolbar: speed chips · context meter · meta -->
    <div
      class="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] bg-[var(--bg-elevate)]/40 text-xs rounded-b-xl"
    >
      <!-- LEFT: thinking-speed picker (extracted reusable component) -->
      <ThinkingStrategyPicker
        :value="thinkingSpeed"
        :disabled="sending"
        @update:value="(v: 'fast' | 'auto' | 'extended') => emit('update:thinkingSpeed', v)"
      />

      <!-- spacer (left chunk → right chunk) -->
      <span class="flex-1" />

      <!-- MIDDLE-RIGHT: inline context meter (click opens breakdown) -->
      <ContextRing
        :used="session.tokenUsage.total"
        :input="session.tokenUsage.input"
        :output="session.tokenUsage.output"
        :model="model"
      />

      <!-- RIGHT: char count + hotkey hint -->
      <span
        v-if="showCharCount"
        class="font-mono text-[var(--text-3)] tabular-nums"
      >
        {{ t('chat.composer.chars', { n: charCount }) }}
      </span>
      <span
        v-if="!isMobile"
        class="text-[var(--text-3)] hidden md:inline opacity-80"
      >
        {{ hotkeyHint }}
      </span>
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
.composer-textarea {
  min-height: 64px; /* MIN_PX = 20 * 2 + 24 */
  max-height: 184px; /* MAX_PX = 20 * 8 + 24 */
  padding: 0;
  line-height: 1.4;
  /* Hide scrollbar until we explicitly toggle overflow-y in resize() */
  overflow-y: hidden;
}
</style>
