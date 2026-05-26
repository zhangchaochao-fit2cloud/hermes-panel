<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NInput, NSkeleton, NDropdown, useDialog, useMessage,
} from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { useSessionsStore } from '@/stores/sessions';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:collapsed', v: boolean): void;
  (e: 'select', id: string): void;
  (e: 'new'): void;
}>();

const { t } = useI18n();
const sessions = useSessionsStore();
const session = useSessionStore();
const dialog = useDialog();
const message = useMessage();

const { items, loading, initialized } = storeToRefs(sessions);

const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter(s => (s.title ?? '').toLowerCase().includes(q));
});

// Group items by source for the drawer. Same ordering policy as the Sessions
// view: cli first, cron last (chattiest, easiest to ignore once collapsed).
const SOURCE_ORDER = ['cli', 'api_server', 'cron', 'unknown'] as const;
const SOURCE_META: Record<string, { icon: string; labelKey: string }> = {
  cli:        { icon: '💬', labelKey: 'sessions.source.cli' },
  cron:       { icon: '⏰', labelKey: 'sessions.source.cron' },
  api_server: { icon: '🔌', labelKey: 'sessions.source.api_server' },
  unknown:    { icon: '❔', labelKey: 'sessions.source.unknown' },
};

const grouped = computed<{ source: string; items: typeof filtered.value }[]>(() => {
  const map = new Map<string, typeof filtered.value>();
  for (const s of filtered.value) {
    const key = s.source ?? 'unknown';
    const bucket = map.get(key) ?? [];
    bucket.push(s);
    map.set(key, bucket);
  }
  const out: { source: string; items: typeof filtered.value }[] = [];
  for (const src of SOURCE_ORDER) {
    const list = map.get(src);
    if (list && list.length > 0) out.push({ source: src, items: list });
  }
  // Surface any unexpected source not in the canonical order
  for (const [k, v] of map) {
    if (!(SOURCE_ORDER as readonly string[]).includes(k)) out.push({ source: k, items: v });
  }
  return out;
});

// Collapsed state per source in this drawer, persisted to localStorage.
// Default cron to collapsed because it's typically dozens of short runs.
const COLLAPSED_KEY = 'panel.chat.sidebar.groupCollapsed';
function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { cron: true };
}
const groupCollapsed = ref<Record<string, boolean>>(readCollapsed());
function toggleSource(src: string): void {
  groupCollapsed.value = { ...groupCollapsed.value, [src]: !groupCollapsed.value[src] };
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(groupCollapsed.value));
}

onMounted(() => {
  if (!initialized.value) void sessions.load({ initial: true });
});

function isCurrent(id: string): boolean {
  return session.sessionId === id;
}

const menuOptions = (id: string): DropdownOption[] => [
  { label: t('sessions.action.rename'), key: 'rename' },
  { label: t('chat.sidebar.copyId'), key: 'copyId' },
  {
    label: t('sessions.action.delete'),
    key: 'delete',
    props: { style: 'color: var(--n-color-error, #d03050)' },
  } as DropdownOption & { props: Record<string, string> },
].map(o => ({ ...o, key: `${o.key}:${id}` }));

const openMenuId = ref<string | null>(null);

function onMenuSelect(key: string): void {
  const [action, id] = key.split(':');
  openMenuId.value = null;
  if (action === 'rename') void handleRename(id);
  else if (action === 'delete') handleDelete(id);
  else if (action === 'copyId') {
    void navigator.clipboard.writeText(id);
    message.success(t('chat.sidebar.idCopied'));
  }
}

function handleRename(id: string): void {
  const item = items.value.find(s => s.id === id);
  if (!item) return;
  const inputRef = ref(item.title ?? '');
  dialog.create({
    title: t('sessions.rename.title'),
    content: () =>
      h(NInput, {
        value: inputRef.value,
        autofocus: true,
        placeholder: t('sessions.rename.placeholder'),
        'onUpdate:value': (v: string) => { inputRef.value = v; },
      }),
    positiveText: t('sessions.rename.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const next = inputRef.value.trim();
      if (!next) {
        message.warning(t('sessions.rename.empty'));
        return false;
      }
      if (next === (item.title ?? '')) return true;
      try {
        await sessions.rename(id, next);
        message.success(t('sessions.rename.success'));
      } catch (err) {
        message.error(`${t('sessions.rename.failed')}: ${(err as Error).message}`);
        return false;
      }
      return true;
    },
  });
}

function handleDelete(id: string): void {
  const item = items.value.find(s => s.id === id);
  if (!item) return;
  const { restore, snapshot } = sessions.removeLocal(id);
  // Optimistic: if we're currently viewing this session, clear it
  if (isCurrent(id)) {
    session.reset();
    emit('new');
  }
  void sessions.deleteRemote(id).then(() => {
    if (!snapshot) return;
    message.success(t('sessions.delete.removed', { title: snapshot.title }), { duration: 3000 });
  }).catch(err => {
    restore();
    message.error(`${t('sessions.delete.failed')}: ${(err as Error).message}`);
  });
}

function fmtTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return t('common.justNow');
  if (diff < 3_600_000) return t('common.minutesAgo', { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t('common.hoursAgo', { n: Math.floor(diff / 3_600_000) });
  if (diff < 7 * 86_400_000) return t('common.daysAgo', { n: Math.floor(diff / 86_400_000) });
  return new Date(ts).toLocaleDateString();
}
</script>

<template>
  <aside
    class="flex flex-col h-full bg-[var(--bg-card)] border-r border-[var(--border)] transition-[width] duration-200 overflow-hidden flex-shrink-0"
    :class="props.collapsed ? 'w-[44px]' : 'w-[260px]'"
  >
    <!-- Header: toggle + new -->
    <div class="h-12 flex items-center px-2 gap-1 flex-shrink-0 border-b border-[var(--border)]">
      <button
        class="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-elevate)] transition-colors flex-shrink-0"
        :title="props.collapsed ? t('chat.sidebar.expand') : t('chat.sidebar.collapse')"
        @click="emit('update:collapsed', !props.collapsed)"
      >
        <svg v-if="props.collapsed" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 3L10 8L5 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M11 3L6 8L11 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <template v-if="!props.collapsed">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)] flex-1 truncate">
          {{ t('chat.sidebar.title') }}
        </span>
        <button
          class="h-8 px-2 rounded-md text-xs font-medium text-[var(--brand-600)] hover:bg-[var(--brand-500)]/10 transition-colors flex-shrink-0"
          :title="t('chat.sidebar.newChat')"
          @click="emit('new')"
        >
          + {{ t('chat.sidebar.new') }}
        </button>
      </template>
    </div>

    <template v-if="!props.collapsed">
      <!-- Search -->
      <div class="px-2 py-2 flex-shrink-0">
        <NInput
          v-model:value="search"
          size="small"
          clearable
          :placeholder="t('chat.sidebar.searchPlaceholder')"
        />
      </div>

      <!-- List -->
      <div class="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
        <div v-if="loading && !initialized" class="space-y-1 px-1">
          <NSkeleton v-for="i in 6" :key="i" :height="42" />
        </div>
        <div
          v-else-if="filtered.length === 0"
          class="px-3 py-6 text-xs text-[var(--text-3)] text-center"
        >
          {{ search.trim() ? t('chat.sidebar.noMatch') : t('chat.sidebar.empty') }}
        </div>
        <div v-else>
          <template v-for="g in grouped" :key="g.source">
            <!-- Group header -->
            <button
              class="w-full px-2 py-1 mt-1 first:mt-0 flex items-center gap-1.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              :aria-expanded="!groupCollapsed[g.source]"
              @click="toggleSource(g.source)"
            >
              <span
                class="inline-block w-2 transition-transform text-[8px]"
                :class="groupCollapsed[g.source] ? '' : 'rotate-90'"
              >▶</span>
              <span class="text-[11px]">{{ SOURCE_META[g.source]?.icon ?? '❔' }}</span>
              <span class="font-semibold">{{ t(SOURCE_META[g.source]?.labelKey ?? 'sessions.source.unknown') }}</span>
              <span class="ml-auto opacity-70">{{ g.items.length }}</span>
            </button>
            <ul v-show="!groupCollapsed[g.source]" class="space-y-0.5 mb-1">
              <li
                v-for="s in g.items"
                :key="s.id"
                class="group relative"
              >
                <button
                  class="w-full text-left px-2 py-1.5 rounded-md flex items-start gap-2 hover:bg-[var(--bg-elevate)] transition-colors"
                  :class="isCurrent(s.id) ? 'bg-[var(--bg-elevate)]' : ''"
                  @click="emit('select', s.id)"
                >
                  <span
                    v-if="isCurrent(s.id)"
                    class="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] flex-shrink-0"
                  />
                  <span v-else class="mt-1.5 h-1.5 w-1.5 flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <div
                      class="text-sm truncate"
                      :class="isCurrent(s.id) ? 'text-[var(--text-1)] font-medium' : 'text-[var(--text-2)]'"
                    >
                      {{ s.title || t('sessions.empty.title') }}
                    </div>
                    <div class="text-[10px] text-[var(--text-3)] mt-0.5 flex items-center gap-1.5">
                      <span class="font-mono opacity-70">{{ s.id.slice(0, 8) }}</span>
                      <span>·</span>
                      <span>{{ fmtTime(s.updatedAt) }}</span>
                    </div>
                  </div>
                </button>
                <!-- "..." button -->
                <NDropdown
                  :options="menuOptions(s.id)"
                  :show="openMenuId === s.id"
                  placement="bottom-end"
                  @select="onMenuSelect"
                  @clickoutside="openMenuId = null"
                >
                  <button
                    class="absolute right-1 top-1.5 h-6 w-6 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--border)] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] transition-opacity"
                    :title="t('chat.sidebar.more')"
                    @click.stop="openMenuId = openMenuId === s.id ? null : s.id"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="3" cy="8" r="1.4" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="13" cy="8" r="1.4" />
                    </svg>
                  </button>
                </NDropdown>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </template>
  </aside>
</template>
