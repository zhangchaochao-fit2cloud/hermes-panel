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

    <div class="danger-zone rounded-md p-5 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-sm font-medium">{{ t('settings.advanced.reset_panel') }}</div>
          <div class="text-xs opacity-70 mt-1">{{ t('settings.advanced.reset_panel_desc') }}</div>
        </div>
        <button
          class="danger-button px-3 py-1.5 text-sm rounded transition-colors flex-shrink-0"
          @click="resetPanelSettings"
        >
          {{ t('settings.advanced.reset_panel') }}
        </button>
      </div>
      <div class="danger-divider h-px" />
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-sm font-medium">{{ t('settings.advanced.clear_storage') }}</div>
          <div class="text-xs opacity-70 mt-1">{{ t('settings.advanced.clear_storage_desc') }}</div>
        </div>
        <button
          class="danger-button px-3 py-1.5 text-sm rounded transition-colors flex-shrink-0"
          @click="clearLocalStorage"
        >
          {{ t('settings.advanced.clear_storage') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.danger-zone {
  border: 1px solid color-mix(in srgb, var(--color-error) 48%, var(--border));
  background: color-mix(in srgb, var(--color-error) 7%, var(--bg-card));
}
.danger-button {
  border: 1px solid color-mix(in srgb, var(--color-error) 72%, var(--border));
  color: var(--color-error);
  background: transparent;
}
.danger-button:hover {
  background: var(--color-error);
  color: #fff;
}
.danger-divider {
  background: color-mix(in srgb, var(--color-error) 26%, transparent);
}
</style>
