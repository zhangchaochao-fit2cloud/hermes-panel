<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { SessionSummary } from '@hermes-panel/shared';
import { formatCompact } from '@/utils/format-number';

defineProps<{
  sessions: SessionSummary[];
  loading?: boolean;
}>();

const router = useRouter();
const { locale } = useI18n();

function openSession(id: string): void {
  void router.push({ path: '/chat', query: { resume: id } });
}

function fmtRelative(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);
  const zh = locale.value === 'zh-CN';
  if (min < 1)   return zh ? '刚刚' : 'just now';
  if (min < 60)  return zh ? `${min} 分钟前` : `${min}m ago`;
  if (hour < 24) return zh ? `${hour} 小时前` : `${hour}h ago`;
  if (day < 30)  return zh ? `${day} 天前` : `${day}d ago`;
  return new Date(ts).toLocaleDateString(zh ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <section
    class="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-1)]"
  >
    <header class="flex items-center justify-between px-5 py-4">
      <h2 class="text-sm font-semibold">{{ $t('dashboard.recentSessions.title') }}</h2>
      <span class="text-xs text-[var(--text-3)]">{{ $t('dashboard.recentSessions.subtitle') }}</span>
    </header>

    <div v-if="loading && sessions.length === 0" class="px-5 pb-5 text-sm text-[var(--text-3)]">
      {{ $t('dashboard.loading') }}
    </div>
    <div v-else-if="sessions.length === 0" class="px-5 pb-5 text-sm text-[var(--text-3)]">
      {{ $t('dashboard.empty') }}
    </div>

    <ul v-else class="divide-y divide-[var(--border)]">
      <li
        v-for="s in sessions"
        :key="s.id"
        class="group flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg-elevate)]"
        :title="s.id"
        @click="openSession(s.id)"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">
            {{ s.title || $t('dashboard.recentSessions.untitled') }}
          </div>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-3)]">
            <span class="truncate">{{ s.model || 'unknown' }}</span>
            <span>·</span>
            <span>{{ s.messageCount }} {{ $t('dashboard.recentSessions.messages') }}</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm tabular-nums">{{ formatCompact(s.tokenTotal) }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ fmtRelative(s.updatedAt) }}</div>
        </div>
        <span
          class="text-[var(--text-3)] opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >›</span>
      </li>
    </ul>
  </section>
</template>
