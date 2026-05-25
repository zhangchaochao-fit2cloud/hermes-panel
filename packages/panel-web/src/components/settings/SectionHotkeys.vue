<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// On mac, show ⌘. Anywhere else, show Ctrl.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const cmd = computed(() => (isMac ? '⌘' : 'Ctrl'));

interface Hotkey { keys: string[]; descKey: string }

const hotkeys = computed<Hotkey[]>(() => [
  { keys: [cmd.value, 'Enter'], descKey: 'settings.hotkeys.send' },
  { keys: ['Shift', 'Enter'], descKey: 'settings.hotkeys.newline' },
  { keys: [cmd.value, 'K'], descKey: 'settings.hotkeys.search' },
  { keys: [cmd.value, 'N'], descKey: 'settings.hotkeys.new_chat' },
  { keys: [cmd.value, 'R'], descKey: 'settings.hotkeys.refresh' },
]);
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.hotkeys.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.hotkeys.desc') }}</p>

    <div class="border border-[var(--border)] rounded-md overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-[var(--bg-elevate)]">
            <th class="text-left font-medium px-4 py-2 w-[200px]">{{ t('settings.hotkeys.col_keys') }}</th>
            <th class="text-left font-medium px-4 py-2">{{ t('settings.hotkeys.col_action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(hk, idx) in hotkeys"
            :key="hk.descKey"
            :class="idx > 0 ? 'border-t border-[var(--border)]' : ''"
          >
            <td class="px-4 py-2">
              <span class="inline-flex gap-1 items-center">
                <template v-for="(k, i) in hk.keys" :key="k">
                  <kbd class="px-2 py-0.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-elevate)] font-mono">
                    {{ k }}
                  </kbd>
                  <span v-if="i < hk.keys.length - 1" class="opacity-50 text-xs">+</span>
                </template>
              </span>
            </td>
            <td class="px-4 py-2 opacity-80">{{ t(hk.descKey) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
