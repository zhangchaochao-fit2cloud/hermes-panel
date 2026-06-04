import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body?: string;
  ts: number;
  read: boolean;
  context?: Record<string, unknown>;
}

interface FetchResponse {
  events: NotificationEvent[];
  unreadCount: number;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const events = ref<NotificationEvent[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  const unread = computed(() => events.value.filter(e => !e.read));
  const recent = computed(() => events.value.slice(0, 50));

  async function refresh(opts: { silent?: boolean } = {}): Promise<NotificationEvent[]> {
    if (!opts.silent) loading.value = true;
    try {
      const r = await bffFetch<FetchResponse>('/api/notifications?limit=50', { silent: opts.silent });
      const known = new Set(events.value.map(e => e.id));
      const fresh = r.events.filter(e => !known.has(e.id));
      events.value = r.events;
      unreadCount.value = r.unreadCount;
      return fresh;
    } catch {
      events.value = [];
      unreadCount.value = 0;
      return [];
    } finally {
      if (!opts.silent) loading.value = false;
    }
  }

  async function markAllRead(): Promise<void> {
    await bffFetch('/api/notifications/read-all', { method: 'POST' });
    for (const e of events.value) e.read = true;
    unreadCount.value = 0;
  }

  async function markRead(id: string): Promise<void> {
    await bffFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
    const e = events.value.find(x => x.id === id);
    if (e && !e.read) {
      e.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  return { events, unreadCount, loading, unread, recent, refresh, markAllRead, markRead };
});
