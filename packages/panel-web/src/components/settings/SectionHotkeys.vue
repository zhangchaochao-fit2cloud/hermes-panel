<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NPopconfirm } from 'naive-ui';
import {
  chordFromEvent,
  chordToDisplayTokens,
  HOTKEY_IDS,
  useHotkeysStore,
  type HotkeyId,
} from '@/stores/hotkeys';

const { t } = useI18n();
const store = useHotkeysStore();

// On mac, show ⌘. Anywhere else, show Ctrl.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modLabel = computed(() => (isMac ? '⌘' : 'Ctrl'));

/** ID of the row currently in capture mode (only one cell records at a time). */
const recording = ref<HotkeyId | null>(null);
/** Live chord shown in the recording cell as the user presses keys. */
const livePreview = ref<string>('');
const cellRefs = ref<Record<string, HTMLElement | null>>({});

interface Row { id: HotkeyId; descKey: string }

const rows: Row[] = HOTKEY_IDS.map((id) => ({
  id,
  descKey: `settings.hotkeys.${humanKeyForId(id)}`,
}));

// The existing i18n keys (preserved per the FORBIDDEN list) use snake_case
// for `new_chat` but camelCase elsewhere — keep the mapping here.
function humanKeyForId(id: HotkeyId): string {
  if (id === 'newChat') return 'new_chat';
  return id;
}

function startRecording(id: HotkeyId): void {
  recording.value = id;
  livePreview.value = '';
  // Focus the cell so the keydown handler fires.
  void nextTick(() => {
    cellRefs.value[id]?.focus();
  });
}

function stopRecording(): void {
  recording.value = null;
  livePreview.value = '';
}

function onCellKeydown(e: KeyboardEvent, id: HotkeyId): void {
  if (recording.value !== id) return;
  // Always preempt browser default during capture — otherwise mod+r reloads
  // the page mid-recording, mod+n opens a new window, etc.
  e.preventDefault();
  e.stopPropagation();

  if (e.key === 'Escape') {
    stopRecording();
    return;
  }

  const chord = chordFromEvent(e);
  if (!chord) {
    // Modifier-only press — show what's held so the user has feedback.
    const pieces: string[] = [];
    if (isMac ? e.metaKey : e.ctrlKey) pieces.push('mod');
    if (isMac && e.ctrlKey) pieces.push('ctrl');
    if (!isMac && e.metaKey) pieces.push('ctrl');
    if (e.altKey) pieces.push('alt');
    if (e.shiftKey) pieces.push('shift');
    livePreview.value = pieces.length ? pieces.join('+') + '+…' : '';
    return;
  }

  // Commit the chord and exit recording mode.
  store.setBinding(id, chord);
  stopRecording();
}

function onCellBlur(id: HotkeyId): void {
  // If the user clicked away mid-record, cancel without committing.
  if (recording.value === id) stopRecording();
}

function tokensFor(id: HotkeyId): string[] {
  if (recording.value === id) {
    if (livePreview.value) return chordToDisplayTokens(livePreview.value.replace(/\+…$/, ''));
    return [];
  }
  return chordToDisplayTokens(store.bindings[id]);
}

function hasConflict(id: HotkeyId): boolean {
  return store.conflictsFor(id).length > 0;
}

function conflictLabel(id: HotkeyId): string {
  const others = store.conflictsFor(id);
  if (others.length === 0) return '';
  const labels = others.map((o) => t(`settings.hotkeys.${humanKeyForId(o)}`));
  return t('settings.hotkeys.editor.conflictWith', { actions: labels.join(', ') });
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.hotkeys.title') }}</h3>
    <p class="text-sm opacity-60 mb-4">{{ t('settings.hotkeys.desc') }}</p>

    <div class="flex items-center justify-between mb-3">
      <p class="text-xs opacity-60">
        {{ t('settings.hotkeys.editor.modHint', { mod: modLabel }) }}
      </p>
      <NPopconfirm @positive-click="store.resetAll()">
        <template #trigger>
          <NButton size="small" tertiary>
            {{ t('settings.hotkeys.editor.resetAll') }}
          </NButton>
        </template>
        {{ t('settings.hotkeys.editor.resetAllConfirm') }}
      </NPopconfirm>
    </div>

    <div class="border border-[var(--border)] rounded-md overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-[var(--bg-elevate)]">
            <th class="text-left font-medium px-4 py-2 w-[260px]">
              {{ t('settings.hotkeys.col_keys') }}
            </th>
            <th class="text-left font-medium px-4 py-2">
              {{ t('settings.hotkeys.col_action') }}
            </th>
            <th class="text-right font-medium px-4 py-2 w-[80px]"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row.id"
            :class="idx > 0 ? 'border-t border-[var(--border)]' : ''"
          >
            <td class="px-4 py-2 align-middle">
              <div
                :ref="(el) => { cellRefs[row.id] = el as HTMLElement | null; }"
                tabindex="0"
                role="button"
                :aria-label="t('settings.hotkeys.editor.cellAria')"
                class="inline-flex flex-wrap gap-1 items-center cursor-text rounded border px-2 py-1 min-h-[30px] min-w-[200px] outline-none transition-colors"
                :class="
                  recording === row.id
                    ? 'border-[var(--brand-500)] ring-2 ring-[var(--brand-500)]/30 bg-[var(--bg-elevate)]'
                    : hasConflict(row.id)
                      ? 'hotkey-cell--conflict hover:bg-[var(--bg-elevate)]'
                      : 'border-[var(--border)] hover:bg-[var(--bg-elevate)]'
                "
                @click="startRecording(row.id)"
                @focus="recording !== row.id && startRecording(row.id)"
                @keydown="onCellKeydown($event, row.id)"
                @blur="onCellBlur(row.id)"
              >
                <template v-if="recording === row.id && tokensFor(row.id).length === 0">
                  <span class="text-xs opacity-60 font-mono">
                    {{ t('settings.hotkeys.editor.prompt') }}
                  </span>
                </template>
                <template v-else>
                  <template v-for="(k, i) in tokensFor(row.id)" :key="k + i">
                    <kbd class="px-2 py-0.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-card)] font-mono">
                      {{ k }}
                    </kbd>
                    <span
                      v-if="i < tokensFor(row.id).length - 1"
                      class="opacity-50 text-xs"
                    >+</span>
                  </template>
                  <span
                    v-if="recording === row.id"
                    class="text-xs opacity-60"
                  >…</span>
                </template>
              </div>
              <div
                v-if="hasConflict(row.id)"
                class="text-xs text-[var(--color-error)] mt-1"
              >
                {{ conflictLabel(row.id) }}
              </div>
            </td>
            <td class="px-4 py-2 opacity-80 align-middle">{{ t(row.descKey) }}</td>
            <td class="px-4 py-2 text-right align-middle">
              <NButton
                size="tiny"
                quaternary
                :title="t('settings.hotkeys.editor.reset')"
                @click="store.reset(row.id)"
              >
                {{ t('settings.hotkeys.editor.reset') }}
              </NButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.hotkey-cell--conflict {
  border-color: color-mix(in srgb, var(--color-error) 60%, var(--border));
}
</style>
