<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NSwitch, NSelect, NTimePicker, NButton, NDataTable, NEmpty } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';

const { t } = useI18n();

const desktopEnabled = ref(true);
const soundEnabled = ref(false);
const triggerOnTaskComplete = ref(true);
const triggerOnError = ref(true);
const triggerOnNewMessage = ref(false);
const dndEnabled = ref(false);
const dndStart = ref(132000000);
const dndEnd = ref(28800000);

const historyData = ref<Array<{ id: number; time: string; type: string; message: string }>>([]);

const historyColumns: DataTableColumns<{ id: number; time: string; type: string; message: string }> = [
  { title: t('settings.notifications.history.time'), key: 'time', width: 160 },
  { title: t('settings.notifications.history.type'), key: 'type', width: 100 },
  { title: t('settings.notifications.history.message'), key: 'message' },
];
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-1">{{ t('settings.notifications.title') }}</h3>
    <p class="text-sm opacity-60 mb-6">{{ t('settings.notifications.desc') }}</p>

    <div class="space-y-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">{{ t('settings.notifications.desktop.label') }}</div>
            <div class="text-xs opacity-70 mt-0.5">{{ t('settings.notifications.desktop.hint') }}</div>
          </div>
          <NSwitch v-model:value="desktopEnabled" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">{{ t('settings.notifications.sound.label') }}</div>
            <div class="text-xs opacity-70 mt-0.5">{{ t('settings.notifications.sound.hint') }}</div>
          </div>
          <NSwitch v-model:value="soundEnabled" />
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-3">{{ t('settings.notifications.triggers.label') }}</div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">{{ t('settings.notifications.triggers.taskComplete') }}</span>
            <NSwitch v-model:value="triggerOnTaskComplete" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">{{ t('settings.notifications.triggers.onError') }}</span>
            <NSwitch v-model:value="triggerOnError" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">{{ t('settings.notifications.triggers.newMessage') }}</span>
            <NSwitch v-model:value="triggerOnNewMessage" />
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-sm font-medium">{{ t('settings.notifications.dnd.label') }}</div>
            <div class="text-xs opacity-70 mt-0.5">{{ t('settings.notifications.dnd.hint') }}</div>
          </div>
          <NSwitch v-model:value="dndEnabled" />
        </div>
        <div v-if="dndEnabled" class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-70">{{ t('settings.notifications.dnd.from') }}</span>
            <NTimePicker
              v-model:value="dndStart"
              size="small"
              format="HH:mm"
              :style="{ width: '100px' }"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-70">{{ t('settings.notifications.dnd.to') }}</span>
            <NTimePicker
              v-model:value="dndEnd"
              size="small"
              format="HH:mm"
              :style="{ width: '100px' }"
            />
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-medium mb-3">{{ t('settings.notifications.history.label') }}</div>
        <NDataTable
          v-if="historyData.length > 0"
          :columns="historyColumns"
          :data="historyData"
          :bordered="false"
          size="small"
        />
        <NEmpty v-else :description="t('settings.notifications.history.empty')" />
      </div>
    </div>
  </div>
</template>
