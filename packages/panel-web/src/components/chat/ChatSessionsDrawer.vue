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
type SessionItem = (typeof items.value)[number];
type SessionGroup = { source: string; items: SessionItem[] };
const PINNED_VISIBLE_LIMIT = 3;
const pinnedExpanded = ref(false);

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

const grouped = computed<SessionGroup[]>(() => {
  // pinned 伪组：把固定的 sessions 顶到最上面，按 pinned 数组顺序（新固定的优先）
  const pinnedSet = new Set(pinnedIds.value);
  const pinnedItems = pinnedIds.value
    .map(id => filtered.value.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const map = new Map<string, SessionItem[]>();
  for (const s of filtered.value) {
    if (pinnedSet.has(s.id)) continue; // 已在 pinned 组
    const key = s.source ?? 'unknown';
    const bucket = map.get(key) ?? [];
    bucket.push(s);
    map.set(key, bucket);
  }
  const out: SessionGroup[] = [];
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

function visibleGroupItems(group: SessionGroup): SessionItem[] {
  if (group.source !== 'pinned') return group.items;
  return pinnedExpanded.value
    ? group.items
    : group.items.slice(0, PINNED_VISIBLE_LIMIT);
}

function hiddenPinnedCount(group: SessionGroup): number {
  if (group.source !== 'pinned' || pinnedExpanded.value) return 0;
  return Math.max(0, group.items.length - PINNED_VISIBLE_LIMIT);
}

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
    class="chat-sessions-drawer flex flex-col h-full bg-[var(--bg-card)] border-r border-[var(--border)] transition-[width,transform] duration-200 overflow-hidden flex-shrink-0"
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
    <div class="drawer-toolbar">
      <button
        type="button"
        class="drawer-icon-button"
        :title="props.collapsed ? t('chat.sidebar.expand') : t('chat.sidebar.collapse')"
        :aria-label="props.collapsed ? t('chat.sidebar.expand') : t('chat.sidebar.collapse')"
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
        <span class="drawer-title">
          {{ t('chat.sidebar.title') }}
        </span>
        <button
          type="button"
          class="drawer-new-button"
          :title="t('chat.sidebar.newChat')"
          :aria-label="t('chat.sidebar.newChat')"
          @click="emit('new')"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span>{{ t('chat.sidebar.new') }}</span>
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
              class="session-group-header"
              :aria-expanded="!groupCollapsed[g.source]"
              @click="toggleSource(g.source)"
            >
              <span
                class="session-group-chev"
                :class="groupCollapsed[g.source] ? '' : 'rotate-90'"
              >▶</span>
              <span class="session-group-title">{{ t(SOURCE_META[g.source]?.labelKey ?? 'sessions.source.unknown') }}</span>
              <span class="session-group-count">{{ g.items.length }}</span>
            </button>
            <ul v-show="!groupCollapsed[g.source]" v-if="g.source !== 'cron'" class="space-y-0.5 mb-2">
              <li
                v-for="s in visibleGroupItems(g)"
                :key="s.id"
                class="session-row group relative"
              >
                <button
                  class="session-row-main"
                  :class="isCurrent(s.id) ? 'is-current' : ''"
                  @click="emit('select', s.id)"
                >
                  <span class="session-current-dot" :class="{ 'is-visible': isCurrent(s.id) }" />
                  <span
                    class="session-row-title"
                    :class="{ 'is-current': isCurrent(s.id) }"
                    :title="displayTitle(s)"
                  >{{ displayTitle(s) }}</span>
                  <span class="session-row-time">{{ fmtTime(s.updatedAt) }}</span>
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
              <li v-if="g.source === 'pinned' && (hiddenPinnedCount(g) > 0 || pinnedExpanded)">
                <button
                  type="button"
                  class="session-pinned-more"
                  @click="pinnedExpanded = !pinnedExpanded"
                >
                  <span>{{ pinnedExpanded ? t('chat.sidebar.pinnedLess') : t('chat.sidebar.pinnedMore', { n: hiddenPinnedCount(g) }) }}</span>
                  <svg
                    class="session-pinned-more__chev"
                    :class="{ 'is-expanded': pinnedExpanded }"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
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
                  class="session-row-main"
                  @click="openCronAggregate(bucket.jobId)"
                >
                  <span class="session-current-dot" />
                  <span class="session-row-title" :title="bucket.jobName">{{ bucket.jobName }}</span>
                  <span class="session-row-time">{{ fmtTime(bucket.latest.updatedAt) }}</span>
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
.chat-sessions-drawer {
  box-shadow: 1px 0 0 color-mix(in srgb, var(--bg-elevate) 40%, transparent) inset;
}

.drawer-toolbar {
  display: flex;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  padding: 7px 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevate) 42%, transparent), transparent 84%),
    var(--bg-card);
}

.drawer-icon-button,
.drawer-new-button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.drawer-icon-button {
  width: 32px;
  flex: 0 0 auto;
  background: color-mix(in srgb, var(--bg-elevate) 52%, transparent);
  color: var(--text-3);
}

.drawer-icon-button:hover,
.drawer-icon-button:focus-visible {
  border-color: color-mix(in srgb, var(--border) 76%, transparent);
  background: color-mix(in srgb, var(--bg-elevate) 90%, transparent);
  color: var(--text-1);
  outline: none;
  transform: translateY(-1px);
}

.drawer-title {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.drawer-new-button {
  flex: 0 0 auto;
  gap: 5px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 700;
}

.drawer-new-button:hover,
.drawer-new-button:focus-visible {
  border-color: color-mix(in srgb, var(--brand-500) 24%, transparent);
  background: color-mix(in srgb, var(--brand-500) 15%, var(--bg-card));
  box-shadow: 0 8px 20px color-mix(in srgb, var(--brand-500) 10%, transparent);
  color: var(--brand-600);
  outline: none;
  transform: translateY(-1px);
}

.session-group-header {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 6px 12px 5px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  text-align: left;
  transition: color var(--dur-fast) var(--ease);
}

.session-group-header:first-child {
  margin-top: 4px;
}

.session-group-header:hover {
  color: var(--text-2);
}

.session-group-chev {
  display: inline-block;
  width: 10px;
  flex: 0 0 auto;
  font-size: 8px;
  opacity: 0;
  transform-origin: center;
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.session-group-header:hover .session-group-chev,
.session-group-header:focus-visible .session-group-chev {
  opacity: 0.7;
}

.session-group-title {
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-group-count {
  flex: 0 0 auto;
  border-radius: 999px;
  color: color-mix(in srgb, var(--text-3) 80%, transparent);
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

.session-group-header:hover .session-group-count,
.session-group-header:focus-visible .session-group-count {
  opacity: 1;
}

.session-row-main {
  display: grid;
  width: 100%;
  min-height: 34px;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  padding: 5px 12px;
  text-align: left;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.session-row-main:hover {
  background: color-mix(in srgb, var(--bg-elevate) 72%, transparent);
  color: var(--text-1);
}

.session-row-main.is-current {
  background: color-mix(in srgb, var(--bg-elevate) 88%, transparent);
  color: var(--text-1);
}

.session-row:hover .session-row-main {
  transform: translateX(1px);
}

.session-current-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-500);
  opacity: 0;
}

.session-current-dot.is-visible {
  opacity: 1;
}

.session-row-title {
  min-width: 0;
  overflow: hidden;
  color: var(--text-2);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-row-title.is-current,
.session-row-main:hover .session-row-title {
  color: var(--text-1);
}

.session-row-time {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  opacity: 0.88;
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.session-row:hover .session-row-time,
.session-row:focus-within .session-row-time {
  opacity: 0;
  transform: translateX(-4px);
}

.session-row-actions {
  position: absolute;
  top: 50%;
  right: 32px;
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
  right: 8px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-3);
  opacity: 0;
  pointer-events: none;
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
  background: color-mix(in srgb, var(--bg-card) 74%, transparent);
  color: var(--text-3);
  cursor: pointer;
  backdrop-filter: blur(8px);
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
.session-pinned-more {
  display: inline-flex;
  width: calc(100% - 20px);
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 2px 10px 4px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.session-pinned-more:hover,
.session-pinned-more:focus-visible {
  background: color-mix(in srgb, var(--bg-elevate) 68%, transparent);
  color: var(--text-1);
  outline: none;
  transform: translateX(1px);
}
.session-pinned-more__chev {
  opacity: 0.72;
  transition: transform var(--dur-fast) var(--ease);
}
.session-pinned-more__chev.is-expanded {
  transform: rotate(180deg);
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
