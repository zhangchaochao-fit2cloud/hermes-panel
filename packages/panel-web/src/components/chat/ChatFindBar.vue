<script setup lang="ts">
/**
 * Chat 内搜索浮层（⌘F / Ctrl+F）。
 *
 * 浏览器原生 Find 在 content-visibility:auto 视口外的元素上会 miss，所以
 * 自己实现一遍：扫 messages.content 字面量匹配，跳到对应 bubble。
 *
 * 行为：
 *   - ⌘F 唤起；再次 ⌘F / Esc 关闭
 *   - Enter 下一个，Shift+Enter 上一个
 *   - 命中后 scrollIntoView，并临时给 bubble 加高亮 class
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { NInput } from 'naive-ui';
import type { ChatMessage } from '@hermes-panel/shared';

const props = defineProps<{
  messages: ChatMessage[];
  scroller: HTMLElement | null;
}>();

const { t } = useI18n();
const open = ref(false);
const query = ref('');
const cursorIdx = ref(0);

const matches = computed<string[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return props.messages
    .filter(m => (m.content ?? '').toLowerCase().includes(q))
    .map(m => m.id);
});

watch(matches, () => {
  cursorIdx.value = 0;
  if (matches.value.length > 0) void scrollToCurrent();
});

async function scrollToCurrent(): Promise<void> {
  const id = matches.value[cursorIdx.value];
  if (!id) return;
  await nextTick();
  const el = document.querySelector<HTMLElement>(`[data-msg-id="${cssEscape(id)}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.add('chat-find-hit');
  setTimeout(() => el.classList.remove('chat-find-hit'), 1500);
}

function cssEscape(s: string): string {
  // 与 ChatNavigator 同款 — 避免引入额外依赖
  return s.replace(/["\\]/g, '\\$&');
}

function next(): void {
  if (matches.value.length === 0) return;
  cursorIdx.value = (cursorIdx.value + 1) % matches.value.length;
  void scrollToCurrent();
}
function prev(): void {
  if (matches.value.length === 0) return;
  cursorIdx.value = (cursorIdx.value - 1 + matches.value.length) % matches.value.length;
  void scrollToCurrent();
}

function onKey(e: KeyboardEvent): void {
  const isFind = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'f';
  if (isFind) {
    e.preventDefault();
    open.value = !open.value;
    if (open.value) {
      void nextTick(() => {
        const inp = document.querySelector<HTMLInputElement>('.chat-find-input input');
        inp?.focus();
        inp?.select();
      });
    }
    return;
  }
  if (open.value && e.key === 'Escape') {
    e.preventDefault();
    open.value = false;
  }
}

function onLocalKey(e: KeyboardEvent): void {
  if (!open.value) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) prev(); else next();
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="open"
      class="absolute top-2 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-2)]"
      @keydown="onLocalKey"
    >
      <NInput
        v-model:value="query"
        size="small"
        clearable
        :placeholder="t('chat.find.placeholder')"
        class="chat-find-input w-[200px]"
      />
      <span class="text-[10px] text-[var(--text-3)] tabular-nums whitespace-nowrap min-w-[36px] text-center">
        {{ matches.length === 0 ? '0' : `${cursorIdx + 1}/${matches.length}` }}
      </span>
      <button
        class="h-6 w-6 rounded hover:bg-[var(--bg-elevate)] text-[var(--text-3)] flex items-center justify-center"
        :title="t('chat.find.prev')"
        :disabled="matches.length === 0"
        @click="prev"
      >↑</button>
      <button
        class="h-6 w-6 rounded hover:bg-[var(--bg-elevate)] text-[var(--text-3)] flex items-center justify-center"
        :title="t('chat.find.next')"
        :disabled="matches.length === 0"
        @click="next"
      >↓</button>
      <button
        class="h-6 w-6 rounded hover:bg-[var(--bg-elevate)] text-[var(--text-3)] flex items-center justify-center"
        :title="t('common.cancel')"
        @click="open = false"
      >✕</button>
    </div>
  </Transition>
</template>

<style>
/* global — 高亮 class 加在 MessageBubble 根上 */
.chat-find-hit {
  outline: 2px solid var(--brand-500);
  outline-offset: 4px;
  border-radius: 8px;
  transition: outline 1s ease-out;
}
</style>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.15s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
