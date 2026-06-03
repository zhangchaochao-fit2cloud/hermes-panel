<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { NModal, NInput, NScrollbar } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppearanceStore } from '@/stores/appearance';
import { useHotkeysStore } from '@/stores/hotkeys';
import { setLocale } from '@/locales';
import { bffFetch } from '@/api/bff';
import { displaySessionTitle } from '@/utils/session-title';
import {
  PANEL_COMMANDS,
  createRecentSessionCommand,
  type CommandAction,
  type CommandIconKey,
} from '@/commands/registry';

interface Action {
  id: string;
  group: string;       // category bucket
  icon: IconKey;
  label: string;
  hint?: string;       // right-aligned hint or shortcut
  run: () => void | Promise<void>;
}

interface SessionRow {
  id: string; title: string; updatedAt: number;
}

type IconKey = CommandIconKey | 'search';

const iconPaths: Record<IconKey, string> = {
  dashboard: 'M3 13h7V3H3v10Zm11 8h7V3h-7v18ZM3 21h7v-5H3v5Zm11 0h7v-5h-7v5Z',
  chat: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
  sessions: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  tools: 'M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z',
  settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8c.18.6.66 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z',
  new: 'M12 5v14M5 12h14',
  refresh: 'M20 12a8 8 0 0 1-14.9 4M4 12a8 8 0 0 1 14.9-4M18 3v5h-5M6 21v-5h5',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.42-1.42M4.92 19.08l1.42-1.42m11.32 0 1.42 1.42M4.92 4.92l1.42 1.42M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  moon: 'M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z',
  auto: 'M12 3a9 9 0 1 0 9 9h-9V3Z',
  language: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15.3 15.3 0 0 1 0 20a15.3 15.3 0 0 1 0-20Z',
  workspaces: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  cron: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  memory: 'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z',
  cost: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  goals: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  lessons: 'M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z',
  sandbox: 'M4 4h16v16H4V4Zm4 5 3 3-3 3m5 0h4',
  audit: 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  proactive: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  intent: 'M4 4h16v16H4V4Zm4 4h8m-8 4h8m-8 4h5',
  channels: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Z',
  chatRoom: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  developer: 'm8 18-6-6 6-6m8 0 6 6-6 6M14 4l-4 16',
  search: 'm21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z',
};

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

function runCommandAction(action: CommandAction): void {
  if (action.type === 'route') {
    void router.push(action.to);
    return;
  }
  if (action.type === 'reload') {
    location.reload();
    return;
  }
  if (action.type === 'theme') {
    appearance.setMode(action.mode);
    return;
  }
  setLocale(action.locale);
}

const allActions = computed<Action[]>(() => {
  const items: Action[] = PANEL_COMMANDS.map((command) => ({
    id: command.id,
    group: t(command.groupKey),
    icon: command.icon,
    label: t(command.labelKey),
    hint: 'hint' in command ? command.hint : undefined,
    run: () => runCommandAction(command.action),
  }));

  for (const s of recentSessions.value.slice(0, 8)) {
    const command = createRecentSessionCommand({
      id: s.id,
      title: displaySessionTitle(s, t('sessions.untitled')),
      updatedAtHint: relTime(s.updatedAt),
    });
    items.push({
      id: command.id,
      group: t(command.groupKey),
      icon: command.icon,
      label: command.label,
      hint: command.hint,
      run: () => runCommandAction(command.action),
    });
  }
  return items;
});

function fuzzyMatch(text: string, query: string): boolean {
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

const filtered = computed<Action[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allActions.value;
  return allActions.value.filter(a =>
    fuzzyMatch(a.label.toLowerCase(), q) || fuzzyMatch(a.hint?.toLowerCase() ?? '', q),
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
  if (m < 1) return t('common.justNow');
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

async function loadRecent(): Promise<void> {
  try {
    const r = await bffFetch<Array<{ id: string; title: string; updatedAt: number }>>(
      '/api/sessions?limit=8',
      { silent: true },
    );
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
            <svg
              class="h-4 w-4 text-[var(--text-3)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="iconPaths.search" />
            </svg>
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
                <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevate)] text-[var(--text-2)]">
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path :d="iconPaths[item.icon]" />
                  </svg>
                </span>
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
