<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { NModal, NInput, NScrollbar } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppearanceStore, type ThemeMode } from '@/stores/appearance';
import { useHotkeysStore } from '@/stores/hotkeys';
import { setLocale } from '@/locales';
import { bffFetch } from '@/api/bff';

interface Action {
  id: string;
  group: string;       // category bucket
  icon: string;
  label: string;
  hint?: string;       // right-aligned hint or shortcut
  run: () => void | Promise<void>;
}

interface SessionRow {
  id: string; title: string; updatedAt: number;
}

const router = useRouter();
const { t } = useI18n();
const appearance = useAppearanceStore();
const hotkeys = useHotkeysStore();
const { mode: themeMode } = storeToRefs(appearance);

const open = ref(false);
const query = ref('');
const recentSessions = ref<SessionRow[]>([]);
const selectedIndex = ref(0);
const inputRef = ref<InstanceType<typeof NInput> | null>(null);

const allActions = computed<Action[]>(() => {
  const items: Action[] = [
    // Navigation
    { id: 'nav-dashboard', group: t('controlCenter.group.nav'), icon: '📊', label: t('nav.dashboard'), hint: '/dashboard', run: () => { void router.push('/dashboard'); } },
    { id: 'nav-chat', group: t('controlCenter.group.nav'), icon: '💬', label: t('nav.chat'), hint: '/chat', run: () => { void router.push('/chat'); } },
    { id: 'nav-sessions', group: t('controlCenter.group.nav'), icon: '📜', label: t('nav.sessions'), hint: '/sessions', run: () => { void router.push('/sessions'); } },
    { id: 'nav-tools', group: t('controlCenter.group.nav'), icon: '🛠', label: t('nav.tools'), hint: '/tools', run: () => { void router.push('/tools'); } },
    { id: 'nav-settings', group: t('controlCenter.group.nav'), icon: '⚙️', label: t('nav.settings'), hint: '/settings', run: () => { void router.push('/settings'); } },
    // Actions
    { id: 'new-chat', group: t('controlCenter.group.action'), icon: '✨', label: t('controlCenter.action.newChat'), hint: '⌘N', run: () => { void router.push('/chat'); } },
    { id: 'refresh', group: t('controlCenter.group.action'), icon: '🔄', label: t('controlCenter.action.refresh'), hint: '⌘R', run: () => location.reload() },
    // Appearance
    { id: 'theme-light', group: t('controlCenter.group.theme'), icon: '☀️', label: t('controlCenter.action.themeLight'), run: () => appearance.setMode('light' as ThemeMode) },
    { id: 'theme-dark', group: t('controlCenter.group.theme'), icon: '🌙', label: t('controlCenter.action.themeDark'), run: () => appearance.setMode('dark' as ThemeMode) },
    { id: 'theme-auto', group: t('controlCenter.group.theme'), icon: '🌗', label: t('controlCenter.action.themeAuto'), run: () => appearance.setMode('auto' as ThemeMode) },
    // Locale
    { id: 'locale-zh', group: t('controlCenter.group.locale'), icon: '🇨🇳', label: '中文（简体）', run: () => setLocale('zh-CN') },
    { id: 'locale-en', group: t('controlCenter.group.locale'), icon: '🇺🇸', label: 'English (US)', run: () => setLocale('en-US') },
  ];

  for (const s of recentSessions.value.slice(0, 8)) {
    items.push({
      id: `sess-${s.id}`,
      group: t('controlCenter.group.recent'),
      icon: '💬',
      label: s.title || s.id.slice(0, 12),
      hint: relTime(s.updatedAt),
      run: () => { void router.push(`/chat?resume=${s.id}`); },
    });
  }
  return items;
});

const filtered = computed<Action[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allActions.value;
  return allActions.value.filter(a =>
    a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q),
  );
});

// Group filtered items for rendering
const groups = computed<Array<{ name: string; items: Action[] }>>(() => {
  const map = new Map<string, Action[]>();
  for (const a of filtered.value) {
    const arr = map.get(a.group) ?? [];
    arr.push(a);
    map.set(a.group, arr);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
});

// Flat list for keyboard navigation
const flatItems = computed<Action[]>(() => filtered.value);

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

async function loadRecent(): Promise<void> {
  try {
    const r = await bffFetch<Array<{ id: string; title: string; updatedAt: number }>>('/api/sessions?limit=8');
    recentSessions.value = r;
  } catch {
    // Silent — if BFF is down, the action list still works without recents
  }
}

function focusInput(): void {
  nextTick(() => {
    const el = (inputRef.value as { focus?: () => void } | null)?.focus;
    if (typeof el === 'function') (inputRef.value as { focus: () => void }).focus();
  });
}

function show(): void {
  if (open.value) return;
  query.value = '';
  selectedIndex.value = 0;
  void loadRecent();
  open.value = true;
  focusInput();
}

function hide(): void {
  open.value = false;
}

async function runItem(action: Action): Promise<void> {
  hide();
  await action.run();
}

function onKeydown(e: KeyboardEvent): void {
  // Skip when the user is mid-IME composition.
  if (e.isComposing) return;
  // Global search — opens the Control Center palette.
  if (hotkeys.matches(e, 'search')) {
    e.preventDefault();
    show();
    return;
  }
  // Global new chat — route to the chat view.
  if (hotkeys.matches(e, 'newChat')) {
    e.preventDefault();
    void router.push('/chat');
    return;
  }
  // Global refresh — bypass the browser default so we go through location.reload
  // (which honors service-worker / Vite HMR state).
  if (hotkeys.matches(e, 'refresh')) {
    e.preventDefault();
    location.reload();
  }
}

function onInputKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, flatItems.value.length - 1);
    scrollSelectedIntoView();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    scrollSelectedIntoView();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = flatItems.value[selectedIndex.value];
    if (item) void runItem(item);
  } else if (e.key === 'Escape') {
    hide();
  }
}

function scrollSelectedIntoView(): void {
  nextTick(() => {
    const el = document.querySelector('[data-cc-item="selected"]');
    el?.scrollIntoView({ block: 'nearest' });
  });
}

watch(query, () => { selectedIndex.value = 0; });

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

// Expose for external trigger (e.g. a topbar button)
defineExpose({ show, hide });

void themeMode;  // touch ref so it stays reactive even though not directly bound
</script>

<template>
  <NModal
    :show="open"
    :mask-closable="true"
    :auto-focus="false"
    transform-origin="center"
    @update:show="(v: boolean) => open = v"
  >
    <div
      class="w-[640px] max-w-[90vw] max-h-[70vh] bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-3)] border border-[var(--border)] overflow-hidden flex flex-col"
    >
      <div class="px-4 py-3 border-b border-[var(--border)]">
        <NInput
          ref="inputRef"
          v-model:value="query"
          :placeholder="t('controlCenter.placeholder')"
          size="large"
          :input-props="{ autocomplete: 'off' }"
          @keydown="onInputKeydown"
        >
          <template #prefix>
            <span class="text-base opacity-60">🔍</span>
          </template>
        </NInput>
      </div>

      <NScrollbar style="max-height: 460px">
        <div v-if="filtered.length === 0" class="px-4 py-12 text-center text-sm text-[var(--text-3)]">
          {{ t('controlCenter.empty') }}
        </div>

        <template v-else>
          <div
            v-for="g in groups"
            :key="g.name"
            class="py-2"
          >
            <div class="px-4 py-1 text-[11px] uppercase tracking-wide text-[var(--text-3)]">
              {{ g.name }}
            </div>
            <ul>
              <li
                v-for="item in g.items"
                :key="item.id"
                :data-cc-item="flatItems.indexOf(item) === selectedIndex ? 'selected' : ''"
                class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors"
                :class="flatItems.indexOf(item) === selectedIndex
                  ? 'bg-[var(--brand-500)]/10'
                  : 'hover:bg-[var(--bg-elevate)]'"
                @click="runItem(item)"
                @mouseenter="selectedIndex = flatItems.indexOf(item)"
              >
                <span class="text-base shrink-0">{{ item.icon }}</span>
                <span class="text-sm flex-1 truncate">{{ item.label }}</span>
                <span v-if="item.hint" class="text-xs text-[var(--text-3)] font-mono">{{ item.hint }}</span>
              </li>
            </ul>
          </div>
        </template>
      </NScrollbar>

      <div class="px-4 py-2 border-t border-[var(--border)] text-[11px] text-[var(--text-3)] flex items-center gap-3">
        <span>↑↓ {{ t('controlCenter.hint.navigate') }}</span>
        <span>↵ {{ t('controlCenter.hint.execute') }}</span>
        <span>Esc {{ t('controlCenter.hint.close') }}</span>
        <span class="ml-auto">⌘⇧P</span>
      </div>
    </div>
  </NModal>
</template>
