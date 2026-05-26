<script setup lang="ts">
import { ref } from 'vue';
import { NTabs, NTabPane } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import ApiPlayground from '@/components/developer/ApiPlayground.vue';
import SSEInspector from '@/components/developer/SSEInspector.vue';
import CodeGen from '@/components/developer/CodeGen.vue';
import WebhookTester from '@/components/developer/WebhookTester.vue';

const { t } = useI18n();
const tab = ref<string>('playground');
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="max-w-7xl mx-auto px-6 py-6">
      <header class="mb-4">
        <h1 class="text-xl font-semibold mb-1">{{ t('developer.title') }}</h1>
        <p class="text-sm text-[var(--text-3)]">{{ t('developer.subtitle') }}</p>
      </header>

      <NTabs v-model:value="tab" type="line" animated>
        <NTabPane name="playground" :tab="t('developer.tabs.playground')">
          <ApiPlayground />
        </NTabPane>
        <NTabPane name="sse" :tab="t('developer.tabs.sse')">
          <SSEInspector />
        </NTabPane>
        <NTabPane name="codegen" :tab="t('developer.tabs.codegen')">
          <CodeGen />
        </NTabPane>
        <NTabPane name="webhook" :tab="t('developer.tabs.webhook')">
          <WebhookTester />
        </NTabPane>
      </NTabs>
    </div>
  </div>
</template>
