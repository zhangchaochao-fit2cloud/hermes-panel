<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { NPopover, NButton, NScrollbar, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, type NotificationEvent } from '@/stores/notifications';
import { relativeTime, type Locale } from '@/utils/relative-time';

const { t, locale } = useI18n();
const router = useRouter();
const store = useNotificationsStore();
const message = useMessage();
const { unreadCount, recent } = storeToRefs(store);

let pollHandle: ReturnType<typeof setInterval> | null = null;

async function refresh(emitToast = false): Promise<void> {
  try {
    const fresh = await store.refresh({ silent: true });
    if (emitToast && fresh.length > 0) {
      for (const ev of fresh.slice(0, 3)) {
        message.info(ev.title, { duration: 5000 });
      }
    }
  } catch {
    // Silent — topbar status badge will surface BFF connectivity issues
  }
}

onMounted(async () => {
  await refresh(false);
  pollHandle = setInterval(() => refresh(true), 15_000);
});

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle);
});

function fmtTime(ts: number): string {
  return relativeTime(ts, locale.value as Locale);
}

// Solid stroke-only SVG icons keep the topbar consistent (everything else
// in the row is a stroke svg) and survives system font changes that mangle
// emoji glyphs in some Tauri WebViews.
const ICONS: Record<string, string> = {
  session: 'M21 12a8 8 0 0 1-12 6.9L4 21l1.1-4.1A8 8 0 1 1 21 12Z',
  cron:    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  health:  'M13 2 3 14h7l-1 8 10-12h-7l1-8Z',
  default: 'M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0',
};

function iconFor(type: string): string {
  if (type === 'session.new') return ICONS.session;
  if (type === 'cron.completed') return ICONS.cron;
  if (type === 'hermes.health') return ICONS.health;
  return ICONS.default;
}

async function onClickEvent(ev: NotificationEvent): Promise<void> {
  await store.markRead(ev.id);
  if (ev.type === 'session.new' && ev.context?.sessionId) {
    router.push(`/chat?resume=${ev.context.sessionId}`);
  }
}

const tooltip = computed(() =>
  unreadCount.value > 0
    ? t('notifications.unreadCount', { n: unreadCount.value })
    : t('notifications.title'),
);
</script>

<template>
  <NPopover trigger="click" placement="bottom-end" :width="380" raw>
    <template #trigger>
      <button
        type="button"
        class="topbar-icon-button relative"
        :title="tooltip"
        :aria-label="tooltip"
      >
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 1 0 6 0" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-[var(--bg-card)]"
          style="background: color-mix(in srgb, var(--color-error) 90%, var(--brand-700) 10%);"
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
          <svg
            class="mx-auto h-10 w-10 mb-3 opacity-40 text-[var(--text-3)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v3a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 1 0 6 0" />
          </svg>
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
              <div
                class="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-[var(--brand-600)] bg-[var(--brand-500)]/10"
                aria-hidden="true"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path :d="iconFor(ev.type)" />
                </svg>
              </div>
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
