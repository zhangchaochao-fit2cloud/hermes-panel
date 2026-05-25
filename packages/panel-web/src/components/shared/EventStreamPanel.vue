<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useNotificationsStore, type NotificationEvent } from '@/stores/notifications';

const router = useRouter();
const store = useNotificationsStore();
const { events } = storeToRefs(store);

const expanded = ref(false);
const paused = ref(false);

let pollHandle: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void store.refresh();
  pollHandle = setInterval(() => {
    if (!paused.value) void store.refresh();
  }, 8_000);
});

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle);
});

const tail = computed(() => events.value.slice(0, 30));

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function iconFor(type: string): string {
  if (type === 'session.new') return '💬';
  if (type === 'cron.completed') return '⏰';
  if (type === 'hermes.health') return '⚡';
  return '•';
}

function onClickEvent(ev: NotificationEvent): void {
  if (ev.type === 'session.new' && ev.context?.sessionId) {
    void router.push(`/chat?resume=${ev.context.sessionId}`);
  }
}
</script>

<template>
  <aside
    class="border-t border-[var(--border)] bg-[var(--bg-card)] transition-all duration-200"
    :class="expanded ? 'h-[260px]' : 'h-[36px]'"
  >
    <!-- Header bar -->
    <header
      class="h-[36px] px-4 flex items-center gap-3 cursor-pointer text-xs select-none"
      @click="expanded = !expanded"
    >
      <span class="opacity-60">{{ expanded ? '▾' : '▸' }}</span>
      <span class="font-medium">实时事件</span>
      <span class="text-[var(--text-3)]">{{ tail.length }} 条</span>
      <span class="flex-1" />
      <button
        v-if="expanded"
        class="px-2 py-0.5 rounded hover:bg-[var(--bg-elevate)]"
        :title="paused ? '继续' : '暂停'"
        @click.stop="paused = !paused"
      >
        {{ paused ? '▶' : '⏸' }}
      </button>
      <span class="font-mono text-[var(--text-3)]" :class="paused ? '' : 'animate-pulse'">●</span>
    </header>

    <!-- Tail body -->
    <div
      v-if="expanded"
      class="h-[224px] overflow-y-auto px-4 pb-2 font-mono text-xs"
    >
      <div v-if="tail.length === 0" class="py-8 text-center text-[var(--text-3)]">
        暂无事件
      </div>
      <ul v-else>
        <li
          v-for="ev in tail"
          :key="ev.id"
          class="flex items-baseline gap-2 py-1 hover:bg-[var(--bg-elevate)] cursor-pointer rounded px-1 -mx-1"
          @click="onClickEvent(ev)"
        >
          <span class="text-[var(--text-3)] shrink-0">{{ fmtTime(ev.ts) }}</span>
          <span class="shrink-0">{{ iconFor(ev.type) }}</span>
          <span class="text-[var(--text-3)] shrink-0">{{ ev.type }}</span>
          <span class="truncate">{{ ev.title }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>
