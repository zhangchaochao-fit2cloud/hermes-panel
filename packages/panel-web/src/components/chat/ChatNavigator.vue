<script setup lang="ts">
/**
 * Right-side mini-map for the chat scroller.
 *
 * Renders a vertical track of evenly spaced marks, one per user prompt.
 * Clicking jumps to that prompt. Hovering expands a compact prompt outline.
 *
 * A "scroll to bottom" pill appears at the bottom of the viewport when
 * the user has scrolled up past the latest reply.
 */
import {
  computed, nextTick, onBeforeUnmount, onMounted, ref, watch,
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

const MAX_VISIBLE_PROMPTS = 10;
const TRACK_GAP_PX = 32;
const TRACK_PADDING_PX = 18;

// 视口高度响应式 — ResizeObserver 只看 scroller，视口本身变化（如 devtools
// 弹出、外部窗口缩放）需要单独监听 window.resize 才能让 trackStyle 重算。
const viewportHeight = ref<number>(typeof window !== 'undefined' ? window.innerHeight : 800);

const trackRef = ref<HTMLDivElement | null>(null);
const listRef = ref<HTMLDivElement | null>(null);
const hoverIndex = ref<number | null>(null);
const expanded = ref(false);

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

const atTop = computed(() => {
  if (!hasOverflow.value) return true;
  return scrollTop.value < 32;
});

// Dots: each user prompt becomes a mark in the quick history.
interface Dot {
  id: string;
  label: string;
  detail: string;
}
const dots = ref<Dot[]>([]);

function recomputeDots(): void {
  const s = props.scroller;
  if (!s) { dots.value = []; return; }
  const totalH = s.scrollHeight;
  if (totalH <= 0) { dots.value = []; return; }
  const out: Dot[] = [];
  for (const m of props.messages) {
    if (m.role !== 'user') continue;
    const el = document.querySelector<HTMLElement>(`[data-msg-id="${cssEscape(m.id)}"]`);
    if (!el) continue;
    out.push({
      id: m.id,
      label: messageLabel(m),
      detail: messageDetail(m),
    });
  }
  dots.value = out;
}

function messageLabel(message: ChatMessage): string {
  const raw = message.content || message.reasoning || message.toolCalls?.[0]?.preview || message.role;
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[#>*_\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return message.role;
  const chars = Array.from(cleaned);
  return chars.length > 36 ? `${chars.slice(0, 36).join('')}...` : cleaned;
}

function messageDetail(message: ChatMessage): string {
  const raw = message.content || message.reasoning || message.toolCalls?.[0]?.preview || '';
  return raw.replace(/\s+/g, ' ').trim();
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
  requestAnimationFrame(() => {
    recomputeDots();
    onScroll();
  });
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

function onWindowResize(): void {
  viewportHeight.value = window.innerHeight;
}

onMounted(() => {
  if (props.scroller) bindScroller();
  window.addEventListener('resize', onWindowResize, { passive: true });
});
onBeforeUnmount(() => {
  unbindScroller();
  window.removeEventListener('resize', onWindowResize);
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

// 回到开头 — 顶部箭头按钮调用。
function scrollToTop(): void {
  const s = props.scroller;
  if (!s) return;
  s.scrollTo({ top: 0, behavior: 'smooth' });
}

interface VisibleDot {
  dot: Dot;
  index: number;
}

const visibleDots = computed<VisibleDot[]>(() => {
  const total = dots.value.length;
  if (total <= MAX_VISIBLE_PROMPTS) {
    return dots.value.map((dot, index) => ({ dot, index }));
  }
  const active = activeIndex.value >= 0 ? activeIndex.value : 0;
  const half = Math.floor(MAX_VISIBLE_PROMPTS / 2);
  const start = Math.max(0, Math.min(total - MAX_VISIBLE_PROMPTS, active - half));
  return dots.value
    .slice(start, start + MAX_VISIBLE_PROMPTS)
    .map((dot, offset) => ({ dot, index: start + offset }));
});

function equalTop(index: number, total: number): number {
  if (total <= 1) return 50;
  const inset = total >= MAX_VISIBLE_PROMPTS ? 5 : 8;
  return inset + (index / (total - 1)) * (100 - inset * 2);
}

function dotStyle(visibleIndex: number, globalIndex: number): Record<string, string> {
  const h = hoverIndex.value;
  const distance = h === null ? Number.POSITIVE_INFINITY : Math.abs(globalIndex - h);
  const scale = distance === 0 ? 1.24 : distance === 1 ? 1.12 : distance === 2 ? 1.04 : 1;
  const curve = distance === 0 ? -6 : distance === 1 ? -3 : distance === 2 ? -1.5 : 0;
  return {
    top: `calc(${equalTop(visibleIndex, visibleDots.value.length)}% - 3px)`,
    '--dot-scale': String(scale),
    '--dot-curve-x': `${curve}px`,
  };
}

const trackStyle = computed(() => {
  const total = Math.min(dots.value.length, MAX_VISIBLE_PROMPTS);
  const desired = Math.max(72, TRACK_PADDING_PX * 2 + Math.max(0, total - 1) * TRACK_GAP_PX);
  // 三道约束：scroller 0.72、视口 0.72、绝对上限 520px、下限 160px。
  // 矮屏时取较小者，避免 track 超出 chat 区域；同时下限确保不会塌成几像素。
  // viewportHeight 是 reactive ref —— window resize 时 computed 会重算。
  const scrollerMax = clientHeight.value > 0 ? clientHeight.value * 0.72 : 520;
  const winMax = viewportHeight.value * 0.72;
  const max = Math.max(160, Math.min(520, scrollerMax, winMax));
  return { height: `${Math.min(max, desired)}px` };
});

const activeIndex = computed(() => {
  const s = props.scroller;
  if (!s || dots.value.length === 0) return -1;
  const anchor = scrollTop.value + clientHeight.value * 0.38;
  let active = 0;
  dots.value.forEach((dot, index) => {
    const el = document.querySelector<HTMLElement>(`[data-msg-id="${cssEscape(dot.id)}"]`);
    if (el && el.offsetTop <= anchor) active = index;
  });
  return active;
});

watch([activeIndex, expanded, scrollTop], () => {
  if (!expanded.value || activeIndex.value < 0) return;
  syncPanelToActive();
});

function syncPanelToActive(): void {
  nextTick(() => {
    const panel = listRef.value;
    const item = panel?.querySelector<HTMLElement>(`[data-nav-index="${activeIndex.value}"]`);
    if (!panel || !item) return;
    const itemTop = item.offsetTop;
    const target = itemTop - panel.clientHeight * 0.45 + item.clientHeight / 2;
    const max = panel.scrollHeight - panel.clientHeight;
    panel.scrollTop = Math.max(0, Math.min(max, target));
  });
}

function onPanelWheel(e: WheelEvent): void {
  const panel = listRef.value;
  if (!panel || !expanded.value) return;
  const max = panel.scrollHeight - panel.clientHeight;
  if (max <= 0) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const next = Math.max(0, Math.min(max, panel.scrollTop + e.deltaY));
  panel.scrollTop = next;
  e.preventDefault();
  e.stopPropagation();
}

function onTrackPointerMove(e: PointerEvent): void {
  const track = trackRef.value;
  const total = visibleDots.value.length;
  if (!track || total === 0) return;
  const rect = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
  const visibleIndex = total <= 1 ? 0 : Math.round(ratio * (total - 1));
  hoverIndex.value = visibleDots.value[visibleIndex]?.index ?? null;
}

function onTrackPointerLeave(): void {
  hoverIndex.value = null;
}

function onNavigatorEnter(): void {
  expanded.value = true;
  syncPanelToActive();
}

function onNavigatorLeave(): void {
  expanded.value = false;
  hoverIndex.value = null;
}

function onNavigatorFocusOut(e: FocusEvent): void {
  const next = e.relatedTarget;
  if (next instanceof Node && (e.currentTarget as HTMLElement).contains(next)) return;
  onNavigatorLeave();
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
    <div
      class="chat-navigator-shell pointer-events-auto mr-5"
      :class="{ 'is-expanded': expanded, 'opacity-0': !hasOverflow }"
      @pointerenter="onNavigatorEnter"
      @pointerleave="onNavigatorLeave"
      @focusin="onNavigatorEnter"
      @focusout="onNavigatorFocusOut"
      @keydown.esc="onNavigatorLeave"
    >
      <div
        ref="trackRef"
        class="chat-navigator-track w-5 rounded-full cursor-pointer relative"
        :style="trackStyle"
        @click="onTrackClick"
        @pointermove="onTrackPointerMove"
        @pointerleave="onTrackPointerLeave"
      >
        <div class="chat-navigator-rail absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rounded-full" />
        <div
          class="chat-navigator-indicator absolute left-1/2 w-[5px] -translate-x-1/2 rounded-full cursor-grab active:cursor-grabbing"
          :style="indicatorStyle"
          @pointerdown="onIndicatorPointerDown"
          @pointermove="onIndicatorPointerMove"
          @pointerup="onIndicatorPointerUp"
          @click.stop
        />

        <button
          v-for="(entry, visibleIndex) in visibleDots"
          :key="entry.dot.id"
          type="button"
          class="chat-navigator-dot absolute left-1/2 h-[5px] w-[5px] rounded-full"
          :class="{ 'is-active': entry.index === activeIndex }"
          :style="dotStyle(visibleIndex, entry.index)"
          :title="entry.dot.label"
          :aria-label="t('chat.navigator.jumpToPrompt', { label: entry.dot.label })"
          @click.stop="jumpTo(entry.dot.id)"
        />
      </div>

      <div
        ref="listRef"
        class="chat-navigator-panel"
        :aria-hidden="!expanded"
        @wheel="onPanelWheel"
        @touchmove.stop
        @click.stop
      >
        <button
          v-for="(dot, index) in dots"
          :key="dot.id"
          type="button"
          class="chat-navigator-item"
          :class="{ 'is-active': index === activeIndex }"
          :data-nav-index="index"
          :title="dot.label"
          :aria-label="t('chat.navigator.jumpToPrompt', { label: dot.label })"
          :tabindex="expanded ? 0 : -1"
          @click="jumpTo(dot.id)"
          @pointerenter="hoverIndex = index"
        >
          <span class="chat-navigator-label">{{ dot.label }}</span>
          <span class="chat-navigator-mark" />
        </button>
      </div>
    </div>

    <!-- 浮动箭头：回到开头 ↑ / 回到底部 ↓ —— 纯图标圆形按钮，垂直堆叠 -->
    <div
      v-if="hasOverflow"
      class="chat-navigator-jumps pointer-events-none absolute right-8 bottom-3 flex flex-col gap-2"
    >
      <button
        v-if="!atTop"
        type="button"
        class="chat-navigator-jump pointer-events-auto inline-flex items-center justify-center h-9 w-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-2)] text-[var(--text-1)] hover:bg-[var(--bg-elevate)] cursor-pointer transition-colors"
        :title="t('chat.navigator.jumpTop')"
        :aria-label="t('chat.navigator.jumpTop')"
        @click="scrollToTop"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 13V3M3 8l5-5 5 5" />
        </svg>
      </button>
      <button
        v-if="!atBottom"
        type="button"
        class="chat-navigator-jump pointer-events-auto inline-flex items-center justify-center h-9 w-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-2)] text-[var(--text-1)] hover:bg-[var(--bg-elevate)] cursor-pointer transition-colors"
        :title="t('chat.navigator.jumpBottom')"
        :aria-label="t('chat.navigator.jumpBottom')"
        @click="scrollToBottom"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 3v10M3 8l5 5 5-5" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-navigator-shell {
  --navigator-panel-bg: color-mix(in srgb, var(--bg-card) 94%, transparent);
  --navigator-panel-border: color-mix(in srgb, var(--border) 62%, transparent);
  --navigator-panel-shadow:
    0 18px 42px rgba(15, 23, 42, 0.12),
    0 2px 10px rgba(15, 23, 42, 0.06);
  --navigator-item-hover-bg: color-mix(in srgb, var(--bg-elevate) 66%, transparent);
  --navigator-panel-backdrop: none;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  transition: opacity 180ms var(--ease, ease);
}

@media (max-width: 900px) {
  .chat-navigator {
    display: none;
  }
}

.chat-navigator-track {
  z-index: 2;
  opacity: 0.62;
  transition:
    opacity 180ms var(--ease, ease),
    transform 220ms var(--ease, ease),
    filter 220ms var(--ease, ease);
}

.chat-navigator-shell:hover .chat-navigator-track {
  opacity: 0.88;
}

.chat-navigator-shell.is-expanded .chat-navigator-track {
  opacity: 0.82;
  transform: translateX(1px) scale(0.99);
  filter: none;
}

.chat-navigator-rail {
  opacity: 0.7;
  background:
    linear-gradient(
      180deg,
      transparent,
      color-mix(in srgb, var(--border) 54%, transparent) 14%,
      color-mix(in srgb, var(--border) 48%, transparent) 86%,
      transparent
    );
}

/* Active indicator gets a soft brand glow on hover/drag. */
.chat-navigator-indicator {
  opacity: 0.72;
  pointer-events: auto;
  background: color-mix(in srgb, var(--text-3) 48%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--bg-card) 78%, transparent);
  transition:
    background-color 180ms var(--ease, ease),
    box-shadow 180ms var(--ease, ease),
    width 180ms var(--ease, ease);
}

.chat-navigator-indicator:hover,
.chat-navigator-indicator:active {
  width: 7px;
  background: color-mix(in srgb, var(--brand-500) 74%, var(--text-3));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-500) 18%, transparent);
}

.chat-navigator-dot {
  transform: translateX(calc(-50% + var(--dot-curve-x, 0px))) scale(var(--dot-scale, 1));
  transform-origin: center;
  background: color-mix(in srgb, var(--text-3) 50%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--bg-card) 66%, transparent);
  transition:
    transform 180ms cubic-bezier(.2, .8, .2, 1),
    width 180ms var(--ease, ease),
    height 180ms var(--ease, ease),
    background-color 180ms var(--ease, ease),
    opacity 180ms var(--ease, ease);
}

.chat-navigator-dot.is-active {
  width: 7px;
  height: 7px;
  background: color-mix(in srgb, var(--brand-500) 76%, var(--text-3));
  opacity: 0.95;
}

.chat-navigator-dot:hover,
.chat-navigator-dot:focus-visible {
  background: color-mix(in srgb, var(--brand-600) 82%, var(--text-2));
  outline: none;
}

.chat-navigator-panel {
  position: absolute;
  right: 22px;
  top: 50%;
  width: min(264px, calc(100vw - 72px));
  /* 关键：高度永远不超过视口可用空间。
     32px 上下安全 margin（让 panel 不贴顶贴底），68vh 是软上限，
     calc(10 * 30px + 24px) 是内容理想上限。 */
  height: min(calc(10 * 30px + 24px), calc(100vh - 32px), 68vh);
  max-height: calc(100vh - 32px);
  overflow-y: hidden;
  overscroll-behavior: contain;
  padding: 12px 5px 12px 14px;
  border: 1px solid var(--navigator-panel-border);
  border-radius: 16px;
  background: var(--navigator-panel-bg);
  box-shadow: var(--navigator-panel-shadow);
  -webkit-backdrop-filter: var(--navigator-panel-backdrop);
  backdrop-filter: var(--navigator-panel-backdrop);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(8px) scale(0.985);
  transform-origin: right center;
  scrollbar-width: none;
  transition:
    opacity 180ms var(--ease, ease),
    transform 220ms cubic-bezier(.2, .8, .2, 1);
}

.chat-navigator-shell.is-expanded .chat-navigator-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(0) scale(1);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-3) 36%, transparent) transparent;
}

.chat-navigator-panel::-webkit-scrollbar {
  width: 0;
}

.chat-navigator-shell.is-expanded .chat-navigator-panel::-webkit-scrollbar {
  width: 5px;
}

.chat-navigator-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-3) 34%, transparent);
}

.chat-navigator-item {
  display: flex;
  width: 100%;
  min-height: 30px;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 3px 7px 3px 8px;
  color: color-mix(in srgb, var(--text-2) 72%, transparent);
  cursor: pointer;
  text-align: right;
  transition:
    color 160ms var(--ease, ease),
    transform 180ms cubic-bezier(.2, .8, .2, 1);
}

.chat-navigator-item:hover,
.chat-navigator-item.is-active {
  background: var(--navigator-item-hover-bg);
  color: var(--text-1);
  transform: translateX(-2px);
}

:global(:root[data-theme='dark']) .chat-navigator-shell,
:global(:root[data-theme='glass-tokyo']) .chat-navigator-shell {
  --navigator-panel-bg: color-mix(in srgb, var(--bg-elevate) 94%, transparent);
  --navigator-panel-border: color-mix(in srgb, var(--text-3) 22%, transparent);
  --navigator-panel-shadow:
    0 20px 54px rgba(0, 0, 0, 0.4),
    0 2px 14px rgba(0, 0, 0, 0.26);
  --navigator-item-hover-bg: color-mix(in srgb, var(--text-1) 7%, transparent);
}

:global(:root[data-theme^='glass-']) .chat-navigator-shell {
  --navigator-panel-bg: var(--bg-card);
  --navigator-panel-border: var(--border);
  --navigator-panel-shadow:
    0 26px 70px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --navigator-panel-backdrop: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}

.chat-navigator-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.42;
}

.chat-navigator-item.is-active .chat-navigator-label {
  font-weight: 560;
}

.chat-navigator-mark {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-3) 42%, transparent);
  transition:
    transform 160ms var(--ease, ease),
    width 160ms var(--ease, ease),
    background-color 160ms var(--ease, ease);
}

.chat-navigator-item:hover .chat-navigator-mark,
.chat-navigator-item.is-active .chat-navigator-mark {
  transform: scale(1.22);
  background: color-mix(in srgb, var(--brand-500) 74%, var(--text-1));
}

@media (prefers-reduced-motion: reduce) {
  .chat-navigator-track,
  .chat-navigator-indicator,
  .chat-navigator-dot,
  .chat-navigator-panel,
  .chat-navigator-item,
  .chat-navigator-mark {
    transition: none !important;
  }

  .chat-navigator-dot {
    transform: translateX(-50%) scale(1);
  }
}
</style>
