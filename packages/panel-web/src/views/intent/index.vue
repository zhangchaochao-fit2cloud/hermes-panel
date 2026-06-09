<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NInput, NSpin, NTag, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import FeatureTaskBridge from '@/components/shared/FeatureTaskBridge.vue';
import { useI18n } from 'vue-i18n';

interface ClassifiedIntent {
  id: string;
  type: string;
  title: string;
  description: string;
  complexity: string;
  estimatedTokens: number;
  estimatedCostUsd: number;
  suggestedRoles: string[];
  source: { platform: string; eventType: string; url?: string; author?: string };
}

interface PipelineConfig {
  enabled: boolean;
  autoCreateGoal: string[];
  requireApproval: string[];
  ignore: string[];
  notifyChannel: string;
}

const msg = useMessage();
const { t } = useI18n();
const payload = ref('');
const result = ref<ClassifiedIntent | null>(null);
const config = ref<PipelineConfig | null>(null);
const classifying = ref(false);
const error = ref<string | null>(null);
const lastErrorAction = ref<'config' | 'classify'>('config');

const samplePayload = JSON.stringify(
  { event: 'issues', action: 'opened', issue: { title: 'App crashes on login', body: 'Steps to reproduce...' } },
  null,
  2,
);

onMounted(() => {
  payload.value = samplePayload;
  void loadConfig();
});

async function loadConfig(): Promise<void> {
  error.value = null;
  try {
    config.value = await bffFetch<PipelineConfig>('/api/intent/config');
  } catch (err) {
    lastErrorAction.value = 'config';
    error.value = err instanceof Error ? err.message : String(err);
  }
}

async function classify(): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse(payload.value);
  } catch {
    msg.error(t('intentPipeline.invalidPayload'));
    return;
  }
  classifying.value = true;
  error.value = null;
  try {
    result.value = await bffFetch<ClassifiedIntent>('/api/intent/classify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    lastErrorAction.value = 'classify';
    error.value = err instanceof Error ? err.message : String(err);
    msg.error(t('intentPipeline.classifyFailed'));
  } finally {
    classifying.value = false;
  }
}

function retryLastError(): void {
  if (lastErrorAction.value === 'classify') {
    void classify();
    return;
  }
  void loadConfig();
}
</script>

<template>
  <ViewErrorBoundary name="intent">
    <div class="intent-page px-6 py-6 max-w-[1400px] mx-auto">
      <div class="mb-6">
        <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('intentPipeline.title') }}</h2>
        <p class="text-sm text-[var(--text-3)]">{{ t('intentPipeline.subtitle') }}</p>
      </div>

      <FeatureTaskBridge
        class="mb-5"
        icon="intent"
        :eyebrow="t('intentPipeline.taskBridge.eyebrow')"
        :title="t('intentPipeline.taskBridge.title')"
        :description="t('intentPipeline.taskBridge.desc')"
        :example="t('intentPipeline.taskBridge.example')"
        :prompt="t('intentPipeline.taskBridge.prompt')"
        :action-label="t('intentPipeline.taskBridge.action')"
        :secondary-label="t('intentPipeline.taskBridge.secondary')"
        secondary-to="/goals"
      />

      <ErrorBanner
        v-if="error"
        class="mb-4"
        :message="`${t('intentPipeline.loadFailed')}: ${error}`"
        :retry-label="t('common.retry')"
        @retry="retryLastError"
      />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Tester -->
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <NInput
            v-model:value="payload"
            type="textarea"
            :placeholder="t('intentPipeline.payloadPlaceholder')"
            :autosize="{ minRows: 8, maxRows: 16 }"
            class="font-mono text-xs mb-3"
          />
          <NButton type="primary" :loading="classifying" :disabled="classifying" @click="classify">
            {{ t('intentPipeline.classify') }}
          </NButton>

          <NSpin v-if="classifying" size="small" class="flex justify-center py-8" />
          <div v-else-if="result" class="mt-5">
            <h3 class="text-sm font-semibold text-[var(--text-1)] mb-3">{{ t('intentPipeline.resultTitle') }}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-[var(--text-3)]">{{ t('intentPipeline.type') }}</span>
                <NTag size="tiny" type="primary">{{ result.type }}</NTag>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[var(--text-3)]">{{ t('intentPipeline.complexity') }}</span>
                <span class="text-[var(--text-1)]">{{ result.complexity }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[var(--text-3)]">{{ t('intentPipeline.estimatedCost') }}</span>
                <span class="text-[var(--text-1)]">${{ result.estimatedCostUsd }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[var(--text-3)]">{{ t('intentPipeline.suggestedRoles') }}</span>
                <div class="flex flex-wrap gap-1 justify-end">
                  <NTag v-for="r in result.suggestedRoles" :key="r" size="tiny" :bordered="false">{{ r }}</NTag>
                </div>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[var(--text-3)]">{{ t('intentPipeline.source') }}</span>
                <span class="text-[var(--text-2)] truncate text-right">{{ result.source.platform }} · {{ result.source.eventType }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Config -->
        <div class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h3 class="text-sm font-semibold text-[var(--text-1)] mb-4">{{ t('intentPipeline.configTitle') }}</h3>
          <div v-if="config" class="space-y-4 text-sm">
            <div>
              <div class="text-xs font-semibold text-[var(--text-3)] mb-1.5">{{ t('intentPipeline.autoCreate') }}</div>
              <div class="flex flex-wrap gap-1">
                <NTag v-for="x in config.autoCreateGoal" :key="x" size="tiny" type="success" :bordered="false">{{ x }}</NTag>
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold text-[var(--text-3)] mb-1.5">{{ t('intentPipeline.requireApproval') }}</div>
              <div class="flex flex-wrap gap-1">
                <NTag v-for="x in config.requireApproval" :key="x" size="tiny" type="warning" :bordered="false">{{ x }}</NTag>
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold text-[var(--text-3)] mb-1.5">{{ t('intentPipeline.ignore') }}</div>
              <div class="flex flex-wrap gap-1">
                <NTag v-for="x in config.ignore" :key="x" size="tiny" :bordered="false">{{ x }}</NTag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.intent-page { min-height: calc(100vh - 140px); }
</style>
