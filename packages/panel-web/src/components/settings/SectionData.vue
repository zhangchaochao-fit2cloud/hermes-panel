<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NSelect, NProgress, useMessage } from 'naive-ui';

const { t } = useI18n();
const message = useMessage();

const exportFormat = ref<'json' | 'csv'>('json');
const cleanRange = ref('30');

const storageUsed = ref(12.5);
const storageTotal = ref(50);

function exportData(): void {
  message.success(t('settings.data.export.success', { format: exportFormat.value.toUpperCase() }));
}

function cleanData(): void {
  message.success(t('settings.data.clean.success', { days: cleanRange.value }));
}

function openMigrationWizard(): void {
  message.info(t('settings.data.migration.starting'));
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.data.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.data.desc') }}</p>

    <div class="space-y-8">
      <div>
        <div class="text-sm font-medium mb-3">{{ t('settings.data.export.label') }}</div>
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="exportFormat"
            :options="[
              { label: 'JSON', value: 'json' },
              { label: 'CSV', value: 'csv' },
            ]"
            size="small"
            :style="{ width: '120px' }"
          />
          <NButton size="small" @click="exportData">
            {{ t('settings.data.export.button') }}
          </NButton>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-3">{{ t('settings.data.clean.label') }}</div>
        <div class="flex items-center gap-3">
          <NSelect
            v-model:value="cleanRange"
            :options="[
              { label: t('settings.data.clean.7days'), value: '7' },
              { label: t('settings.data.clean.30days'), value: '30' },
              { label: t('settings.data.clean.90days'), value: '90' },
              { label: t('settings.data.clean.all'), value: 'all' },
            ]"
            size="small"
            :style="{ width: '140px' }"
          />
          <NButton size="small" @click="cleanData">
            {{ t('settings.data.clean.button') }}
          </NButton>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-3">{{ t('settings.data.storage.label') }}</div>
        <div class="max-w-md">
          <NProgress
            type="line"
            :percentage="Math.round((storageUsed / storageTotal) * 100)"
            :indicator-text-color="'var(--text-2)'"
          />
          <div class="text-xs opacity-70 mt-1">
            {{ t('settings.data.storage.used', { used: storageUsed, total: storageTotal }) }}
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-1">{{ t('settings.data.migration.label') }}</div>
        <div class="text-xs opacity-70 mb-3">{{ t('settings.data.migration.desc') }}</div>
        <NButton size="small" @click="openMigrationWizard">
          {{ t('settings.data.migration.button') }}
        </NButton>
      </div>
    </div>
  </div>
</template>
