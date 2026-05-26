<script setup lang="ts">
/**
 * Right-side mini-map for the chat scroller.
 *
 * Renders a vertical track of dots (one per message). Each dot's vertical
 * position reflects its proportional offset inside the scroller, and its
 * color reflects the role (user vs assistant). Clicking jumps to that
 * message. Dragging the active region scrolls the conversation in sync.
 *
 * A "scroll to bottom" pill appears at the bottom of the viewport when
 * the user has scrolled up past the latest reply.
 */
import {
  computed, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import type { ChatMessage } from '@hermes-panel/shared';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  /** The scroll viewport containing the message list. */
  scroller: HTMLElement | null;
  /** Reactive list of messages so we can rebuild dots when it changes. */
  messages: ChatMessage[];
}>();

const { t } = useI18n();

const trackRef = ref<HTMLDivElement | null>(null);

// Scroll state recomputed on scroll / resize.
const scrollTop = ref(0);
const scrollHeight = ref(0);
const clientHeight = ref(0);

const hasOverflow = computed(() => scrollHeight.value > clientHeight.value + 8);

const atBottom = computed(() => {
  if (!hasOverflow.value) return true;
  // 32px slack so micro-jitter near the bottom doesn't flicker the pill.
  return scrollHeight.value - (scrollTop.value + clientHeight.value) < 32;
});

// Dots: each message becomes a dot positioned at `top: %` of the track.
interface Dot {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  top: number; // percent (0..100)
}
const dots = ref<Dot[]>([]);

function recomputeDots(): void {
  const s = props.scroller;
  if (!s) { dots.value = []; return; }
  const totalH = s.scrollHeight;
  if (totalH <= 0) { dots.value = []; return; }
  const out: Dot[] = [];
  for (const m of props.messages) {
    const el = document.querySelector<HTMLElement>(`[data-msg-id="${cssEscape(m.id)}"]`);
    if (!el) continue;
    const offsetTop = el.offsetTop;
    out.push({
      id: m.id,
      role: m.role,
      top: (offsetTop / totalH) * 100,
    });
  }
  dots.value = out;
}

function cssEscape(s: string): string {
  // Sufficient for our id format (alpha-num + underscores + dots).
  return s.replace(/(["\\])/g, '\\$1');
}

function onScroll(): void {
  const s = props.scroller;
  if (!s) return;
  scrollTop.value = s.scrollTop;
  scrollHeight.value = s.scrollHeight;
  clientHeight.value = s.clientHeight;
}

let resizeObserver: ResizeObserver | null = null;

function bindScroller(): void {
  const s = props.scroller;
  if (!s) return;
  onScroll();
  s.addEventListener('scroll', onScroll, { passive: true });
  resizeObserver = new ResizeObserver(() => {
    onScroll();
    recomputeDots();
  });
  resizeObserver.observe(s);
  // Observe the inner content too if available — gives us scrollHeight changes.
  for (const child of Array.from(s.children)) {
    resizeObserver.observe(child as Element);
  }
}

function unbindScroller(): void {
  const s = props.scroller;
  if (s) s.removeEventListener('scroll', onScroll);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

onMounted(() => {
  if (props.scroller) bindScroller();
});
onBeforeUnmount(() => {
  unbindScroller();
});
watch(() => props.scroller, (next, prev) => {
  if (prev) unbindScroller();
  if (next) bindScroller();
});
watch(() => props.messages.length, () => {
  // Wait a tick so the DOM has the new bubble.
  requestAnimationFrame(() => {
    recomputeDots();
    onScroll();
  });
});

// Click a dot → jump.
function jumpTo(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-msg-id="${cssEscape(id)}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Click anywhere on the track → scroll proportionally.
function onTrackClick(e: MouseEvent): void {
  const s = props.scroller;
  const track = trackRef.value;
  if (!s || !track) return;
  const rect = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  const max = s.scrollHeight - s.clientHeight;
  s.scrollTo({ top: max * ratio, behavior: 'smooth' });
}

// Drag the indicator → real-time scroll sync.
let dragging = false;
function onIndicatorPointerDown(e: PointerEvent): void {
  const s = props.scroller;
  const track = trackRef.value;
  if (!s || !track) return;
  dragging = true;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  e.preventDefault();
  e.stopPropagation();
}
function onIndicatorPointerMove(e: PointerEvent): void {
  if (!dragging) return;
  const s = props.scroller;
  const track = trackRef.value;
  if (!s || !track) return;
  const rect = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  const max = s.scrollHeight - s.clientHeight;
  s.scrollTop = max * ratio;
}
function onIndicatorPointerUp(e: PointerEvent): void {
  if (!dragging) return;
  dragging = false;
  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
}

function scrollToBottom(): void {
  const s = props.scroller;
  if (!s) return;
  s.scrollTo({ top: s.scrollHeight, behavior: 'smooth' });
}

// Indicator (highlight band over the visible portion of the track).
const indicatorStyle = computed(() => {
  if (!hasOverflow.value) {
    return { display: 'none' as const };
  }
  const total = scrollHeight.value;
  const vis = clientHeight.value;
  const visiblePct = (vis / total) * 100;
  const topPct = (scrollTop.value / total) * 100;
  return {
    top: `${topPct}%`,
    height: `${Math.max(8, visiblePct)}%`,
  };
});
</script>

<template>
  <div class="chat-navigator pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center">
    <!-- Track -->
    <div
      ref="trackRef"
      class="chat-navigator-track pointer-events-auto mr-3 w-[6px] h-[60%] rounded-full bg-[var(--border)]/40 hover:bg-[var(--border)]/70 transition-colors cursor-pointer relative"
      :class="{ 'opacity-0': !hasOverflow }"
      @click="onTrackClick"
    >
      <!-- Visible-region indicator -->
      <div
        class="chat-navigator-indicator absolute left-0 right-0 rounded-full bg-[var(--text-3)] hover:bg-[var(--brand-500)] cursor-grab active:cursor-grabbing"
        :style="indicatorStyle"
        @pointerdown="onIndicatorPointerDown"
        @pointermove="onIndicatorPointerMove"
        @pointerup="onIndicatorPointerUp"
        @click.stop
      />

      <!-- Per-message dots -->
      <button
        v-for="dot in dots"
        :key="dot.id"
        type="button"
        class="chat-navigator-dot absolute -left-[3px] h-[6px] w-[12px] rounded-sm transition-all hover:scale-125"
        :class="dot.role === 'user' ? 'bg-[var(--brand-500)]' : 'bg-[var(--text-3)]'"
        :style="{ top: `calc(${dot.top}% - 3px)` }"
        :title="dot.role"
        @click.stop="jumpTo(dot.id)"
      />
    </div>

    <!-- Scroll-to-bottom pill -->
    <button
      v-if="hasOverflow && !atBottom"
      type="button"
      class="chat-navigator-jump pointer-events-auto absolute right-3 bottom-3 inline-flex items-center gap-1 px-3 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-2)] text-xs text-[var(--text-1)] hover:bg-[var(--bg-elevate)] cursor-pointer transition-colors"
      @click="scrollToBottom"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3v10M3 8l5 5 5-5" />
      </svg>
      <span>{{ t('chat.navigator.jumpBottom') }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Active indicator gets a soft brand glow on hover/drag. */
.chat-navigator-indicator:hover,
.chat-navigator-indicator:active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-500) 30%, transparent);
}
</style>
