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
import ControlCenterActionRow from './ControlCenterActionRow.vue';
import ControlCenterIcon from './ControlCenterIcon.vue';
import {
  PANEL_COMMANDS,
  createRecentSessionCommand,
  type CommandAction,
} from '@/commands/registry';
import type { CommandPaletteIconKey } from '@/commands/icons';

interface Action {
  id: string;
  group: string;
  icon: CommandPaletteIconKey;
  label: string;
  hint?: string;
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

const groups = computed<Array<{ name: string; items: Action[] }>>(() => {
  const map = new Map<string, Action[]>();
  for (const a of filtered.value) {
    const arr = map.get(a.group) ?? [];
    arr.push(a);
    map.set(a.group, arr);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
});

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
  if (e.isComposing) return;
  if (hotkeys.matches(e, 'search')) {
    e.preventDefault();
    show();
    return;
  }
  if (hotkeys.matches(e, 'newChat')) {
    e.preventDefault();
    void router.push('/chat');
    return;
  }
  if (hotkeys.matches(e, 'refresh')) {
    e.preventDefault();
    location.reload();
  }
}

function onExternalOpen(): void {
  show();
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
  window.addEventListener('panel:open-control-center', onExternalOpen);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('panel:open-control-center', onExternalOpen);
});

defineExpose({ show, hide });

void themeMode;
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
            <ControlCenterIcon
              icon="search"
              class="h-4 w-4 text-[var(--text-3)]"
            />
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
              <ControlCenterActionRow
                v-for="item in g.items"
                :key="item.id"
                :icon="item.icon"
                :label="item.label"
                :hint="item.hint"
                :selected="flatItems.indexOf(item) === selectedIndex"
                @run="runItem(item)"
                @select="selectedIndex = flatItems.indexOf(item)"
              />
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
