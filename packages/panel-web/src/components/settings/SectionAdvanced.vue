<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useDialog, useMessage } from 'naive-ui';

const { t } = useI18n();
const dialog = useDialog();
const message = useMessage();

function resetPanelSettings(): void {
  dialog.warning({
    title: t('settings.advanced.reset_confirm_title'),
    content: t('settings.advanced.reset_confirm_content'),
    positiveText: t('settings.advanced.confirm'),
    negativeText: t('settings.advanced.cancel'),
    onPositiveClick: () => {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('panel.')) toRemove.push(key);
      }
      for (const key of toRemove) localStorage.removeItem(key);
      message.success(t('settings.advanced.reset_done'));
      window.setTimeout(() => window.location.reload(), 300);
    },
  });
}

function clearLocalStorage(): void {
  dialog.error({
    title: t('settings.advanced.clear_confirm_title'),
    content: t('settings.advanced.clear_confirm_content'),
    positiveText: t('settings.advanced.confirm'),
    negativeText: t('settings.advanced.cancel'),
    onPositiveClick: () => {
      localStorage.clear();
      message.success(t('settings.advanced.clear_done'));
      window.setTimeout(() => window.location.reload(), 300);
    },
  });
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.advanced.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.advanced.desc') }}</p>

    <div class="border-2 border-[#f5222d] rounded-md p-5 space-y-5 bg-[#f5222d]/5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-sm font-medium">{{ t('settings.advanced.reset_panel') }}</div>
          <div class="text-xs opacity-70 mt-1">{{ t('settings.advanced.reset_panel_desc') }}</div>
        </div>
        <button
          class="px-3 py-1.5 text-sm rounded border border-[#f5222d] text-[#f5222d] hover:bg-[#f5222d] hover:text-white transition-colors flex-shrink-0"
          @click="resetPanelSettings"
        >
          {{ t('settings.advanced.reset_panel') }}
        </button>
      </div>
      <div class="h-px bg-[#f5222d]/30" />
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-sm font-medium">{{ t('settings.advanced.clear_storage') }}</div>
          <div class="text-xs opacity-70 mt-1">{{ t('settings.advanced.clear_storage_desc') }}</div>
        </div>
        <button
          class="px-3 py-1.5 text-sm rounded border border-[#f5222d] text-[#f5222d] hover:bg-[#f5222d] hover:text-white transition-colors flex-shrink-0"
          @click="clearLocalStorage"
        >
          {{ t('settings.advanced.clear_storage') }}
        </button>
      </div>
    </div>
  </div>
</template>
