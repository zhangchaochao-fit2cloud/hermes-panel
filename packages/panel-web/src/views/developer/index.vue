<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { NTabs, NTabPane } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ApiPlayground from '@/components/developer/ApiPlayground.vue';
import SSEInspector from '@/components/developer/SSEInspector.vue';
import CodeGen from '@/components/developer/CodeGen.vue';
import WebhookTester from '@/components/developer/WebhookTester.vue';
import LogsViewer from '@/components/developer/LogsViewer.vue';
import DoctorPanel from '@/components/developer/DoctorPanel.vue';
import CliParityPanel from '@/components/developer/CliParityPanel.vue';
import FeatureTaskBridge from '@/components/shared/FeatureTaskBridge.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const VALID_TABS = ['cli-parity', 'playground', 'sse', 'codegen', 'webhook', 'logs', 'doctor'] as const;
type DevTab = (typeof VALID_TABS)[number];

function tabFromHash(hash: string): DevTab | null {
  const key = hash.replace(/^#/, '');
  return (VALID_TABS as readonly string[]).includes(key) ? (key as DevTab) : null;
}

const tab = ref<DevTab>(tabFromHash(route.hash) ?? 'cli-parity');

function setDeveloperTab(value: string): void {
  const next = (VALID_TABS as readonly string[]).includes(value) ? (value as DevTab) : null;
  if (!next) return;
  tab.value = next;
  if (route.hash !== `#${next}`) {
    void router.replace({ hash: `#${next}` });
  }
}

onMounted(() => {
  const fromHash = tabFromHash(route.hash);
  if (fromHash) tab.value = fromHash;
});

watch(() => route.hash, h => {
  const next = tabFromHash(h);
  if (next) tab.value = next;
});
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="max-w-7xl mx-auto px-6 py-6">
      <header class="mb-4">
        <h1 class="text-xl font-semibold mb-1">{{ t('developer.title') }}</h1>
        <p class="text-sm text-[var(--text-3)]">{{ t('developer.subtitle') }}</p>
      </header>

      <FeatureTaskBridge
        class="mb-5"
        icon="developer"
        :eyebrow="t('developer.taskBridge.eyebrow')"
        :title="t('developer.taskBridge.title')"
        :description="t('developer.taskBridge.desc')"
        :example="t('developer.taskBridge.example')"
        :prompt="t('developer.taskBridge.prompt')"
        :action-label="t('developer.taskBridge.action')"
        :secondary-label="t('developer.taskBridge.secondary')"
        secondary-to="/developer#doctor"
        command="hermes doctor"
      />

      <NTabs :value="tab" type="line" animated @update:value="setDeveloperTab">
        <NTabPane name="cli-parity" :tab="t('developer.tabs.cliParity')">
          <CliParityPanel />
        </NTabPane>
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
        <NTabPane name="logs" :tab="t('developer.tabs.logs')">
          <LogsViewer />
        </NTabPane>
        <NTabPane name="doctor" :tab="t('developer.tabs.doctor')">
          <DoctorPanel />
        </NTabPane>
      </NTabs>
    </div>
  </div>
</template>
