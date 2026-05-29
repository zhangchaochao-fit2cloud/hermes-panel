<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NInput, NDropdown, useDialog, useMessage,
} from 'naive-ui';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import type { DropdownOption } from 'naive-ui';
import { useSessionsStore } from '@/stores/sessions';
import { useSessionStore } from '@/stores/session';
import { useCronStore } from '@/stores/cron';
import { useBreakpoint } from '@/composables/use-breakpoint';
import { usePinnedSessions } from '@/composables/usePinnedSessions';
import { displaySessionTitle } from '@/utils/session-title';

const props = defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:collapsed', v: boolean): void;
  (e: 'select', id: string): void;
  (e: 'selectAggregate', jobId: string): void;
  (e: 'new'): void;
}>();

const { t } = useI18n();
const sessions = useSessionsStore();
const session = useSessionStore();
const dialog = useDialog();
const message = useMessage();

const { items, loading, initialized, search: storeSearch, refreshing } = storeToRefs(sessions);
const { isMobile } = useBreakpoint();

// 搜索绑到 store — 后端 /api/sessions?search=... 已支持标题 + 消息全文 LIKE。
// debounce 300ms，避免每个按键发请求。空字符串立即清空（不 debounce）。
const search = storeSearch;
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, (q) => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!q.trim()) {
    void sessions.load();
    return;
  }
  searchTimer = setTimeout(() => {
    void sessions.load();
  }, 300);
});

// 后端已经按 search 过滤，前端不再二次过滤。fallback: 还是用 items。
const filtered = computed(() => items.value);

// 置顶 / pin 状态 — 提到 grouped/menuOptions 之前，避免 TDZ
const { pinned: pinnedIds, isPinned, toggle: togglePin } = usePinnedSessions();

// Group items by source for the drawer. Same ordering policy as the Sessions
// view: cli first, cron last (chattiest, easiest to ignore once collapsed).
const SOURCE_ORDER = ['cli', 'api_server', 'cron', 'unknown'] as const;
const SOURCE_META: Record<string, { icon: string; labelKey: string }> = {
  pinned:     { icon: '📌', labelKey: 'chat.sidebar.pinnedGroup' },
  cli:        { icon: '💬', labelKey: 'sessions.source.cli' },
  cron:       { icon: '⏰', labelKey: 'sessions.source.cron' },
  api_server: { icon: '🔌', labelKey: 'sessions.source.api_server' },
  unknown:    { icon: '❔', labelKey: 'sessions.source.unknown' },
};

const grouped = computed<{ source: string; items: typeof filtered.value }[]>(() => {
  // pinned 伪组：把固定的 sessions 顶到最上面，按 pinned 数组顺序（新固定的优先）
  const pinnedSet = new Set(pinnedIds.value);
  const pinnedItems = pinnedIds.value
    .map(id => filtered.value.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const map = new Map<string, typeof filtered.value>();
  for (const s of filtered.value) {
    if (pinnedSet.has(s.id)) continue; // 已在 pinned 组
    const key = s.source ?? 'unknown';
    const bucket = map.get(key) ?? [];
    bucket.push(s);
    map.set(key, bucket);
  }
  const out: { source: string; items: typeof filtered.value }[] = [];
  if (pinnedItems.length > 0) {
    out.push({ source: 'pinned', items: pinnedItems });
  }
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

// 同一个 cron job 会跑出多条会话（id 形如 cron_<jobid>_<yyyymmdd>_<HHMMSS>）。
// 侧边栏不展开历次执行 — 每个 cron job 只显示一行（job 名 + 最近时间），
// 点击 = 跳合并视图 /chat?cron=<jobId>（虚拟会话拼接所有 runs）。
const CRON_ID_RE = /^cron_([a-f0-9]+)_/i;
type SessionItem = (typeof items.value)[number];
interface CronJobBucket {
  jobId: string;            // hex jobid 或 '_other'
  count: number;            // 同 job 的 sessions 数量
  latest: SessionItem;      // 最新一次
  jobName: string;          // 优先 cron store 的 job.name，fallback 到 latest.title
}

// 拉 cron store 拿到 job name；首次未加载触发后台加载
const cronStore = useCronStore();
onMounted(() => {
  if (cronStore.jobs.length === 0) void cronStore.load({ initial: true });
});

function cronJobBuckets(list: SessionItem[]): CronJobBucket[] {
  const map = new Map<string, SessionItem[]>();
  for (const s of list) {
    const m = s.id.match(CRON_ID_RE);
    const key = m ? m[1] : '_other';
    const bucket = map.get(key) ?? [];
    bucket.push(s);
    map.set(key, bucket);
  }
  const out: CronJobBucket[] = [];
  for (const [jobId, bucket] of map) {
    bucket.sort((a, b) => b.updatedAt - a.updatedAt);
    const latest = bucket[0];
    const job = cronStore.jobs.find(j => j.id === jobId);
    out.push({
      jobId,
      count: bucket.length,
      latest,
      jobName: job?.name || latest.title || jobId,
    });
  }
  out.sort((a, b) => b.latest.updatedAt - a.latest.updatedAt);
  return out;
}

function openCronAggregate(jobId: string): void {
  // 跳合并视图（虚拟会话）。jobId 若是 '_other' 则用任意 latest session id 兜底
  if (jobId === '_other') return;
  emit('selectAggregate', jobId);
}

onMounted(() => {
  if (!initialized.value) void sessions.load({ initial: true });
});

function isCurrent(id: string): boolean {
  return session.sessionId === id;
}

function displayTitle(item: { id: string; title: string }): string {
  return displaySessionTitle(item, t('sessions.untitled'));
}

const menuOptions = (id: string): DropdownOption[] => [
  {
    label: isPinned(id) ? t('chat.sidebar.unpin') : t('chat.sidebar.pin'),
    key: 'togglePin',
  },
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
  else if (action === 'togglePin') togglePin(id);
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
  <!-- 移动端：折叠时完全不占位（display: none），展开时 fixed overlay + 半透明遮罩。
       桌面端：原有的折叠条/展开宽度逻辑保持。 -->
  <div
    v-if="isMobile && !props.collapsed"
    class="fixed inset-0 z-40 bg-black/30"
    @click="emit('update:collapsed', true)"
  />
  <aside
    class="flex flex-col h-full bg-[var(--bg-card)] border-r border-[var(--border)] transition-[width,transform] duration-200 overflow-hidden flex-shrink-0"
    :class="[
      isMobile
        ? props.collapsed
          ? 'hidden'
          : 'fixed left-0 top-0 z-50 w-[280px] shadow-xl'
        : props.collapsed
          ? 'w-[44px]'
          : 'w-[300px]'
    ]"
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
          :loading="refreshing"
          :placeholder="t('chat.sidebar.searchPlaceholder')"
        />
      </div>

      <!-- List -->
      <div class="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
        <div v-if="loading && !initialized" class="space-y-1 px-1">
          <ThemedSkeleton :repeat="6" height="42px" />
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
              class="w-full px-3 py-2 mt-3 first:mt-1 flex items-center gap-1.5 text-left text-[12px] font-semibold text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              :aria-expanded="!groupCollapsed[g.source]"
              @click="toggleSource(g.source)"
            >
              <span
                class="inline-block w-2 transition-transform text-[8px]"
                :class="groupCollapsed[g.source] ? '' : 'rotate-90'"
              >▶</span>
              <span class="text-[12px]">{{ SOURCE_META[g.source]?.icon ?? '❔' }}</span>
              <span class="font-semibold">{{ t(SOURCE_META[g.source]?.labelKey ?? 'sessions.source.unknown') }}</span>
              <span class="ml-auto text-[11px] opacity-70">{{ g.items.length }}</span>
            </button>
            <ul v-show="!groupCollapsed[g.source]" v-if="g.source !== 'cron'" class="space-y-0.5 mb-2">
              <li
                v-for="s in g.items"
                :key="s.id"
                class="session-row group relative"
              >
                <button
                  class="session-row-main w-full text-left pl-3 pr-24 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                  :class="isCurrent(s.id) ? 'is-current' : ''"
                  @click="emit('select', s.id)"
                >
                  <span
                    v-if="isCurrent(s.id)"
                    class="h-2 w-2 rounded-full bg-[var(--brand-500)] flex-shrink-0"
                  />
                  <span v-else class="h-2 w-2 flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <div
                      class="text-[15px] leading-5 truncate flex items-center gap-1"
                      :class="isCurrent(s.id) ? 'text-[var(--text-1)] font-medium' : 'text-[var(--text-2)]'"
                      :title="displayTitle(s)"
                    >
                      <span class="truncate">{{ displayTitle(s) }}</span>
                    </div>
                    <div class="text-[11px] text-[var(--text-3)] mt-1 flex items-center gap-1.5">
                      <span class="truncate">{{ s.model || 'unknown' }}</span>
                      <span>·</span>
                      <span>{{ fmtTime(s.updatedAt) }}</span>
                    </div>
                  </div>
                </button>
                <div class="session-row-actions">
                  <button
                    type="button"
                    class="session-action-btn"
                    :class="{ 'is-pinned': isPinned(s.id) }"
                    :title="isPinned(s.id) ? t('chat.sidebar.unpin') : t('chat.sidebar.pin')"
                    :aria-label="isPinned(s.id) ? t('chat.sidebar.unpin') : t('chat.sidebar.pin')"
                    @click.stop="togglePin(s.id)"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m9.5 1.8 4.7 4.7-2.2 1.2-2.2 4.5-1.7-1.7L4.5 14 2 11.5l3.5-3.6-1.7-1.7 4.5-2.2 1.2-2.2Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="session-action-btn"
                    :title="t('sessions.action.rename')"
                    :aria-label="t('sessions.action.rename')"
                    @click.stop="handleRename(s.id)"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M2.5 11.8V14h2.2l7-7-2.2-2.2-7 7Z" />
                      <path d="m8.8 5.5 2.2 2.2M10 4.3l1-1a1.5 1.5 0 0 1 2.1 2.1l-1 1" />
                    </svg>
                  </button>
                </div>
                <NDropdown
                  v-if="openMenuId === s.id"
                  :options="menuOptions(s.id)"
                  :show="true"
                  placement="bottom-end"
                  @select="onMenuSelect"
                  @clickoutside="openMenuId = null"
                >
                  <button
                    class="session-more-btn"
                    :title="t('chat.sidebar.more')"
                    :aria-label="t('chat.sidebar.more')"
                    @click.stop="openMenuId = null"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="3" cy="8" r="1.4" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="13" cy="8" r="1.4" />
                    </svg>
                  </button>
                </NDropdown>
                <button
                  v-else
                  class="session-more-btn"
                  :title="t('chat.sidebar.more')"
                  :aria-label="t('chat.sidebar.more')"
                  @click.stop="openMenuId = s.id"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="3" cy="8" r="1.4" />
                    <circle cx="8" cy="8" r="1.4" />
                    <circle cx="13" cy="8" r="1.4" />
                  </svg>
                </button>
              </li>
            </ul>

            <!-- cron source: 单行 per job，点击进合并视图（虚拟会话），
                 用户感受不到"这是多个 session 拼起来的"。 -->
            <ul v-show="!groupCollapsed[g.source]" v-else class="space-y-0.5 mb-2">
              <li
                v-for="bucket in cronJobBuckets(g.items)"
                :key="bucket.jobId"
                class="session-row group relative"
              >
                <button
                  class="session-row-main w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                  @click="openCronAggregate(bucket.jobId)"
                >
                  <span class="h-2 w-2 flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <div
                      class="text-[15px] leading-5 truncate text-[var(--text-2)]"
                      :title="bucket.jobName"
                    >
                      {{ bucket.jobName }}
                    </div>
                    <div class="text-[11px] text-[var(--text-3)] mt-1 flex items-center gap-1.5">
                      <span>{{ fmtTime(bucket.latest.updatedAt) }}</span>
                    </div>
                  </div>
                </button>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.session-row-main {
  color: var(--text-2);
}
.session-row-main:hover,
.session-row-main.is-current {
  background: color-mix(in srgb, var(--bg-elevate) 86%, transparent);
}
.session-row-main.is-current {
  color: var(--text-1);
}
.session-row-actions {
  position: absolute;
  top: 50%;
  right: 30px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(3px);
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.session-more-btn {
  position: absolute;
  top: 50%;
  right: 6px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-3);
  opacity: 0;
  transform: translateY(-50%) translateX(3px);
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.session-action-btn {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  color: var(--text-3);
  cursor: pointer;
}
.session-action-btn:hover,
.session-more-btn:hover {
  background: color-mix(in srgb, var(--text-1) 8%, transparent);
  color: var(--text-1);
}
.session-action-btn.is-pinned {
  color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
}
.session-row:hover .session-row-actions,
.session-row:focus-within .session-row-actions,
.session-row:hover .session-more-btn,
.session-row:focus-within .session-more-btn {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(0);
}
</style>
