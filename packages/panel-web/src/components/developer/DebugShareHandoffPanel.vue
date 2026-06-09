<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import CodeBlock from '@/components/shared/CodeBlock.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import EmptyState from '@/components/shared/EmptyState.vue';

interface DumpReport {
  source: string;
  generatedAt: number;
  stdout: string;
  stderr?: string;
  error?: string;
}

const { t, locale } = useI18n();
const message = useMessage();

const dump = ref<DumpReport | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const shareCommand = 'hermes debug share';
const helpCommand = 'hermes debug share --help';
const dumpOutput = computed(() => dump.value?.stdout.trimEnd() ?? '');
const generatedAtLabel = computed(() => {
  if (!dump.value) return '';
  return new Date(dump.value.generatedAt).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

async function loadDump(): Promise<void> {
  loading.value = true;
  error.value = null;
  dump.value = null;
  try {
    const data = await bffFetch<DumpReport>('/api/system/dump');
    dump.value = data;
    error.value = data.error ?? null;
  } catch (err) {
    error.value = (err as Error).message ?? String(err);
  } finally {
    loading.value = false;
  }
}

async function copyText(value: string, messageKey: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    message.success(t(messageKey));
  } catch {
    message.error(t('common.copyFailed'));
  }
}
</script>

<template>
  <section class="debug-share">
    <div class="debug-share-head">
      <div class="min-w-0">
        <p class="eyebrow">
          {{ t('developer.logs.debugShare.eyebrow') }}
        </p>
        <h3>{{ t('developer.logs.debugShare.title') }}</h3>
        <p class="desc">
          {{ t('developer.logs.debugShare.desc') }}
        </p>
      </div>
      <div class="debug-actions">
        <NButton
          size="small"
          :loading="loading"
          @click="loadDump"
        >
          {{ t('developer.logs.debugShare.preview') }}
        </NButton>
        <NButton
          size="small"
          tertiary
          @click="copyText(shareCommand, 'developer.logs.debugShare.copiedShare')"
        >
          {{ t('developer.logs.debugShare.copyShare') }}
        </NButton>
        <NButton
          size="small"
          tertiary
          @click="copyText(helpCommand, 'developer.logs.debugShare.copiedHelp')"
        >
          {{ t('developer.logs.debugShare.copyHelp') }}
        </NButton>
      </div>
    </div>

    <div class="risk-row">
      <span>{{ t('developer.logs.debugShare.risk') }}</span>
      <code>{{ shareCommand }}</code>
      <code>{{ helpCommand }}</code>
    </div>

    <ol class="checklist">
      <li>{{ t('developer.logs.debugShare.checkPreview') }}</li>
      <li>{{ t('developer.logs.debugShare.checkSecrets') }}</li>
      <li>{{ t('developer.logs.debugShare.checkRun') }}</li>
    </ol>

    <ErrorBanner
      v-if="error"
      class="mt-3"
      :message="`${t('developer.logs.debugShare.errorPrefix')} ${error}`"
      :retry-label="t('developer.logs.debugShare.preview')"
      surface="inline"
      @retry="loadDump"
    />

    <div
      v-if="loading && !dump"
      class="preview-state"
    >
      {{ t('developer.logs.debugShare.loading') }}
    </div>

    <template v-else-if="dump">
      <p class="preview-meta">
        {{ dump.source }}
        <span v-if="generatedAtLabel">
          - {{ t('developer.logs.debugShare.generatedAt', { time: generatedAtLabel }) }}
        </span>
      </p>
      <CodeBlock
        v-if="dumpOutput"
        class="mt-2"
        :code="dumpOutput"
        :lang="dump.source"
        max-height="260px"
      />
      <CodeBlock
        v-if="dump.stderr"
        class="mt-2"
        :code="dump.stderr.trimEnd()"
        lang="stderr"
        max-height="140px"
        tone="warning"
      />
      <EmptyState
        v-if="!dumpOutput && !dump.stderr && !error"
        class="mt-2"
        icon="·"
        :title="t('developer.logs.debugShare.empty')"
      />
    </template>
  </section>
</template>

<style scoped>
.debug-share {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-warning) 28%, var(--border));
  background: color-mix(in srgb, var(--color-warning) 6%, var(--bg-card));
  padding: 14px;
}

.debug-share-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  color: var(--color-warning);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h3 {
  margin-top: 4px;
  color: var(--text-1);
  font-size: 15px;
  font-weight: 700;
}

.desc {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 18px;
}

.debug-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.risk-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 16px;
}

.risk-row code {
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-2);
  padding: 2px 6px;
}

.checklist {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 18px;
}

.preview-state {
  margin-top: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-3);
  font-size: 12px;
  line-height: 18px;
  padding: 12px;
  text-align: center;
}

.preview-meta {
  margin-top: 12px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 16px;
}

@media (max-width: 760px) {
  .debug-actions {
    width: 100%;
  }
}
</style>
