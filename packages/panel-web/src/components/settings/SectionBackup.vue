<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton, NCheckbox, useDialog, useMessage } from 'naive-ui';
import { useBackupStore } from '@/stores/backup';
import { exportPanelPrefs, importPanelPrefs } from '@/composables/usePanelPrefsBackup';
import { triggerDownload } from '@/utils/download';

const { t } = useI18n();
const dialog = useDialog();
const message = useMessage();

const prefsFileInputRef = ref<HTMLInputElement | null>(null);

function onExportPrefs(): void {
  const data = exportPanelPrefs();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `hermes-panel-prefs-${new Date().toISOString().slice(0, 10)}.json`);
  message.success(t('settings.backup.prefsExportSuccess', { n: Object.keys(data.panel).length }));
}

function onPickPrefsFile(): void {
  prefsFileInputRef.value?.click();
}

async function onPrefsFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const text = await file.text();
  dialog.warning({
    title: t('settings.backup.prefsImportConfirmTitle'),
    content: t('settings.backup.prefsImportConfirmContent'),
    positiveText: t('settings.backup.prefsImportConfirmYes'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      const r = importPanelPrefs(text, { merge: false });
      if (!r.ok) {
        message.error(t(`settings.backup.prefsImportError.${r.reason ?? 'invalid_json'}`));
        return;
      }
      message.success(t('settings.backup.prefsImportSuccess', { n: r.imported }));
      // 重新加载让所有 store 重新读 localStorage
      setTimeout(() => location.reload(), 800);
    },
  });
}

const store = useBackupStore();
const { downloading, uploading } = storeToRefs(store);

const fileInputRef = ref<HTMLInputElement | null>(null);
const pickedFile = ref<File | null>(null);
const forceOverwrite = ref(false);

const pickedSummary = computed(() => {
  if (!pickedFile.value) return '';
  const kb = pickedFile.value.size / 1024;
  if (kb < 1024) return `${pickedFile.value.name} (${kb.toFixed(1)} KB)`;
  return `${pickedFile.value.name} (${(kb / 1024).toFixed(1)} MB)`;
});

async function onCreateBackup(): Promise<void> {
  const r = await store.downloadBackup();
  if (r.ok) {
    message.success(t('settings.backup.downloadSuccess'));
  } else {
    message.error(`${t('settings.backup.downloadFailed')}: ${r.error ?? ''}`);
  }
}

function onPickFile(): void {
  fileInputRef.value?.click();
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  pickedFile.value = file;
  // Reset the input so re-picking the same file fires `change` again.
  input.value = '';
}

function clearPickedFile(): void {
  pickedFile.value = null;
  forceOverwrite.value = false;
}

async function runRestore(): Promise<void> {
  if (!pickedFile.value) return;
  const file = pickedFile.value;
  const force = forceOverwrite.value;
  const r = await store.uploadRestore(file, force);
  if (r.ok) {
    message.success(t('settings.backup.restoreSuccess'));
    clearPickedFile();
  } else {
    message.error(`${t('settings.backup.restoreFailed')}: ${r.error ?? ''}`);
  }
}

function onRestoreClick(): void {
  if (!pickedFile.value) return;
  // First confirmation — destructive warning.
  dialog.warning({
    title: t('settings.backup.restoreConfirmTitle'),
    content: t('settings.backup.restoreConfirmContent'),
    positiveText: t('settings.backup.restoreConfirmYes'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      // Second confirmation — extra friction because this overwrites ~/.hermes.
      dialog.error({
        title: t('settings.backup.restoreFinalTitle'),
        content: forceOverwrite.value
          ? t('settings.backup.restoreFinalContentForce')
          : t('settings.backup.restoreFinalContent'),
        positiveText: t('settings.backup.restoreFinalYes'),
        negativeText: t('common.cancel'),
        onPositiveClick: () => {
          void runRestore();
        },
      });
    },
  });
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.backup.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.backup.desc') }}</p>

    <div class="space-y-6">
      <!-- Create backup -->
      <div class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-sm font-medium">{{ t('settings.backup.create') }}</div>
            <div class="text-xs opacity-70 mt-1">{{ t('settings.backup.createDesc') }}</div>
          </div>
          <NButton
            type="primary"
            :loading="downloading"
            :disabled="downloading"
            @click="onCreateBackup"
          >
            {{ downloading ? t('settings.backup.downloading') : t('settings.backup.createBtn') }}
          </NButton>
        </div>
      </div>

      <!-- Restore -->
      <div class="restore-zone rounded-lg p-5 space-y-4">
        <div>
          <div class="text-sm font-medium">{{ t('settings.backup.restore') }}</div>
          <div class="text-xs opacity-70 mt-1">{{ t('settings.backup.restoreDesc') }}</div>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <input
            ref="fileInputRef"
            type="file"
            accept=".zip,application/zip"
            class="hidden"
            @change="onFileChange"
          >
          <NButton size="small" :disabled="uploading" @click="onPickFile">
            {{ pickedFile ? t('settings.backup.pickAnother') : t('settings.backup.pickFile') }}
          </NButton>
          <span v-if="pickedSummary" class="text-xs font-mono opacity-80 truncate">
            {{ pickedSummary }}
          </span>
          <NButton
            v-if="pickedFile"
            size="small"
            quaternary
            :disabled="uploading"
            @click="clearPickedFile"
          >
            {{ t('common.cancel') }}
          </NButton>
        </div>

        <NCheckbox v-model:checked="forceOverwrite" :disabled="!pickedFile || uploading">
          <span class="text-xs">{{ t('settings.backup.forceLabel') }}</span>
        </NCheckbox>
        <div class="text-xs opacity-60 -mt-2 ml-6">
          {{ t('settings.backup.forceHint') }}
        </div>

        <div class="pt-2">
          <NButton
            type="error"
            :loading="uploading"
            :disabled="!pickedFile || uploading"
            @click="onRestoreClick"
          >
            {{ uploading ? t('settings.backup.restoring') : t('settings.backup.restoreBtn') }}
          </NButton>
        </div>
      </div>

      <!-- Panel preferences (localStorage) — 仅前端偏好，不动 hermes 数据 -->
      <div class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div class="text-sm font-medium mb-1">{{ t('settings.backup.prefsTitle') }}</div>
        <div class="text-xs opacity-70 mb-3">{{ t('settings.backup.prefsDesc') }}</div>
        <div class="flex items-center gap-2 flex-wrap">
          <NButton size="small" @click="onExportPrefs">
            {{ t('settings.backup.prefsExport') }}
          </NButton>
          <input
            ref="prefsFileInputRef"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="onPrefsFileChange"
          >
          <NButton size="small" @click="onPickPrefsFile">
            {{ t('settings.backup.prefsImport') }}
          </NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.restore-zone {
  border: 1px solid color-mix(in srgb, var(--color-error) 48%, var(--border));
  background: color-mix(in srgb, var(--color-error) 7%, var(--bg-card));
}
</style>
