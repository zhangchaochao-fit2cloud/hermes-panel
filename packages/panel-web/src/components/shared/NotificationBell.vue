<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { NPopover, NButton, NScrollbar, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, type NotificationEvent } from '@/stores/notifications';

const { t } = useI18n();
const router = useRouter();
const store = useNotificationsStore();
const message = useMessage();
const { unreadCount, recent } = storeToRefs(store);

let pollHandle: ReturnType<typeof setInterval> | null = null;

async function refresh(emitToast = false): Promise<void> {
  try {
    const fresh = await store.refresh();
    if (emitToast && fresh.length > 0) {
      for (const ev of fresh.slice(0, 3)) {
        message.info(`🔔 ${ev.title}`, { duration: 5000 });
      }
    }
  } catch {
    // Silent — topbar status badge will surface BFF connectivity issues
  }
}

onMounted(async () => {
  // First load: don't toast (might be stale state on app open)
  await refresh(false);
  pollHandle = setInterval(() => refresh(true), 15_000);
});

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle);
});

function fmtTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(ts).toLocaleDateString();
}

function iconFor(type: string): string {
  if (type === 'session.new') return '💬';
  if (type === 'cron.completed') return '⏰';
  if (type === 'hermes.health') return '⚡';
  return '🔔';
}

async function onClickEvent(ev: NotificationEvent): Promise<void> {
  await store.markRead(ev.id);
  if (ev.type === 'session.new' && ev.context?.sessionId) {
    router.push(`/chat?resume=${ev.context.sessionId}`);
  }
}

const tooltip = computed(() =>
  unreadCount.value > 0 ? `${unreadCount.value} 条未读通知` : '通知中心',
);
</script>

<template>
  <NPopover trigger="click" placement="bottom-end" :width="380" raw>
    <template #trigger>
      <button
        class="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[var(--bg-elevate)] transition-colors"
        :title="tooltip"
      >
        <span class="text-lg">🔔</span>
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </template>

    <div class="border border-[var(--border)] rounded-md bg-[var(--bg-card)] shadow-[var(--shadow-3)] overflow-hidden">
      <header class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 class="text-sm font-semibold">{{ t('notifications.title') }}</h3>
        <NButton
          v-if="unreadCount > 0"
          size="tiny"
          quaternary
          @click="store.markAllRead()"
        >
          {{ t('notifications.markAllRead') }}
        </NButton>
      </header>

      <NScrollbar style="max-height: 420px">
        <div v-if="recent.length === 0" class="px-4 py-12 text-center">
          <div class="text-4xl mb-2 opacity-40">📭</div>
          <p class="text-sm text-[var(--text-3)]">{{ t('notifications.empty') }}</p>
        </div>

        <ul v-else class="divide-y divide-[var(--border)]">
          <li
            v-for="ev in recent"
            :key="ev.id"
            class="px-4 py-3 hover:bg-[var(--bg-elevate)] cursor-pointer transition-colors"
            :class="{ 'bg-[var(--brand-500)]/5': !ev.read }"
            @click="onClickEvent(ev)"
          >
            <div class="flex gap-3">
              <div class="text-lg shrink-0">{{ iconFor(ev.type) }}</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <p class="font-medium text-sm truncate">{{ ev.title }}</p>
                  <span v-if="!ev.read" class="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)] shrink-0" />
                </div>
                <p v-if="ev.body" class="text-xs text-[var(--text-3)] truncate mt-0.5">
                  {{ ev.body }}
                </p>
                <p class="text-[11px] text-[var(--text-3)] mt-1">{{ fmtTime(ev.ts) }}</p>
              </div>
            </div>
          </li>
        </ul>
      </NScrollbar>
    </div>
  </NPopover>
</template>
