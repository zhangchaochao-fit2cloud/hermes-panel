<script setup lang="ts">
/**
 * 全局快捷键 cheatsheet — ⌘? / Ctrl+? 唤起，列出 useHotkeysStore 所有绑定。
 *
 * 不直接显示按键定义在 settings 里的字符串（如 "Mod+Enter"），而是用
 * chordToDisplayTokens 转成平台对应符号（⌘ ⇧ ⌥ ⌃）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHotkeysStore, chordToDisplayTokens, HOTKEY_IDS, type HotkeyId } from '@/stores/hotkeys';

const { t } = useI18n();
const hotkeys = useHotkeysStore();
const open = ref(false);

interface Item {
  id: HotkeyId;
  label: string;
  tokens: string[];
}

const items = computed<Item[]>(() => {
  // 注意：i18n key 在 settings.hotkeys.* 里（旧名沿用），label 直接用那里
  const labels: Record<HotkeyId, string> = {
    send: t('settings.hotkeys.send'),
    newline: t('settings.hotkeys.newline'),
    search: t('settings.hotkeys.search'),
    newChat: t('settings.hotkeys.new_chat'),
    refresh: t('settings.hotkeys.refresh'),
  };
  return HOTKEY_IDS.map((id) => ({
    id,
    label: labels[id],
    tokens: chordToDisplayTokens(hotkeys.bindings[id] ?? ''),
  }));
});

// 额外的静态快捷键（panel 自带、不在 hotkeys store 里）
const extras = computed(() => [
  { label: t('hotkeysCheatsheet.extra.controlCenter'), tokens: ['⌘', '⇧', 'P'] },
  { label: t('hotkeysCheatsheet.extra.cheatsheet'), tokens: ['⌘', '?'] },
  { label: t('hotkeysCheatsheet.extra.findInChat'), tokens: ['⌘', 'F'] },
]);

function onKey(e: KeyboardEvent): void {
  // ⌘? / Ctrl+?  (= ⌘+Shift+/ 在多数键盘上)
  const isShortcut = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?';
  if (isShortcut) {
    e.preventDefault();
    open.value = !open.value;
    return;
  }
  if (open.value && e.key === 'Escape') {
    e.preventDefault();
    open.value = false;
  }
}

// 外部入口：window event 触发开 / 关，让 topbar 的 ? 按钮也能唤起。
function onExternalOpen(): void {
  open.value = !open.value;
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.addEventListener('panel:show-cheatsheet', onExternalOpen);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('panel:show-cheatsheet', onExternalOpen);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
        @click.self="open = false"
      >
        <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-[440px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
          <header class="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <span>⌨️</span>
              {{ t('hotkeysCheatsheet.title') }}
            </h2>
            <button
              class="h-6 w-6 rounded hover:bg-[var(--bg-elevate)] text-[var(--text-3)] hover:text-[var(--text-1)] flex items-center justify-center"
              :title="t('common.cancel')"
              @click="open = false"
            >
              ✕
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-1">
            <div
              v-for="it in items"
              :key="it.id"
              class="flex items-center justify-between py-1.5 text-sm"
            >
              <span class="text-[var(--text-2)]">{{ it.label }}</span>
              <kbd class="flex items-center gap-1 text-xs text-[var(--text-1)]">
                <span
                  v-for="tk in it.tokens"
                  :key="tk"
                  class="inline-block px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevate)] font-mono min-w-[24px] text-center"
                >{{ tk }}</span>
              </kbd>
            </div>
            <div class="border-t border-[var(--border)] my-2"></div>
            <div
              v-for="it in extras"
              :key="it.label"
              class="flex items-center justify-between py-1.5 text-sm"
            >
              <span class="text-[var(--text-2)]">{{ it.label }}</span>
              <kbd class="flex items-center gap-1 text-xs text-[var(--text-1)]">
                <span
                  v-for="tk in it.tokens"
                  :key="tk"
                  class="inline-block px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevate)] font-mono min-w-[24px] text-center"
                >{{ tk }}</span>
              </kbd>
            </div>
          </div>
          <footer class="px-5 py-2 text-[11px] text-[var(--text-3)] border-t border-[var(--border)]">
            {{ t('hotkeysCheatsheet.footer') }}
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
