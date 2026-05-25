<script setup lang="ts">
import { NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="py-16 flex flex-col items-center text-center gap-3 text-[var(--text-3)]">
    <NTag type="info" size="small" :bordered="false">v0.2</NTag>
    <h2 class="text-lg font-semibold text-[var(--text-1)]">
      {{ t('developer.webhook.title') }}
    </h2>
    <p class="max-w-md text-sm">
      {{ t('developer.webhook.description') }}
    </p>
    <ul class="text-xs space-y-1 mt-2">
      <li>· {{ t('developer.webhook.feature1') }}</li>
      <li>· {{ t('developer.webhook.feature2') }}</li>
      <li>· {{ t('developer.webhook.feature3') }}</li>
    </ul>
  </div>
</template>
