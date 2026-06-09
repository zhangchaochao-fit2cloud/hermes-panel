<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NInput, NTag, NSpin } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useSandboxStore } from '@/stores/sandbox';
import TerminalOutput from '@/components/sandbox/TerminalOutput.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';
import FeatureTaskBridge from '@/components/shared/FeatureTaskBridge.vue';

const { t } = useI18n();
const sandbox = useSandboxStore();

const command = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  void checkSandboxAvailability();
});

async function checkSandboxAvailability(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await sandbox.checkAvailable();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function handleCreate(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await sandbox.create();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function handleDestroy(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await sandbox.destroy();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function handleRun(): Promise<void> {
  const cmd = command.value.trim();
  if (!cmd) return;
  command.value = '';
  await sandbox.run(cmd);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey && !sandbox.executing) {
    e.preventDefault();
    handleRun();
  }
}
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="max-w-5xl mx-auto px-6 py-6">
      <!-- Header -->
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold mb-1">{{ t('sandbox.title') }}</h1>
          <p class="text-sm text-[var(--text-3)]">{{ t('sandbox.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <NTag :type="sandbox.available ? 'success' : 'error'" size="small">
            {{ sandbox.available ? t('sandbox.dockerAvailable') : t('sandbox.dockerUnavailable') }}
          </NTag>
          <NButton
            v-if="!sandbox.sandboxId"
            type="primary"
            size="small"
            :disabled="!sandbox.available || loading"
            @click="handleCreate"
          >
            {{ t('sandbox.create') }}
          </NButton>
          <NButton
            v-else
            type="error"
            size="small"
            :disabled="loading || sandbox.executing"
            @click="handleDestroy"
          >
            {{ t('sandbox.destroy') }}
          </NButton>
        </div>
      </header>

      <FeatureTaskBridge
        class="mb-5"
        icon="sandbox"
        :eyebrow="t('sandbox.taskBridge.eyebrow')"
        :title="t('sandbox.taskBridge.title')"
        :description="t('sandbox.taskBridge.desc')"
        :example="t('sandbox.taskBridge.example')"
        :prompt="t('sandbox.taskBridge.prompt')"
        :action-label="t('sandbox.taskBridge.action')"
        :secondary-label="t('sandbox.taskBridge.secondary')"
        secondary-to="/developer#logs"
      />

      <ErrorBanner
        v-if="error"
        class="mb-4"
        :message="`${t('sandbox.loadFailed')}: ${error}`"
        :retry-label="t('common.retry')"
        @retry="checkSandboxAvailability"
      />

      <!-- Status bar -->
      <div v-if="sandbox.sandboxId" class="mb-3 flex items-center gap-3 text-sm text-[var(--text-3)]">
        <span>{{ t('sandbox.id') }}: <code class="text-[var(--text-2)]">{{ sandbox.sandboxId }}</code></span>
        <NTag :type="sandbox.running ? 'success' : 'default'" size="tiny">
          {{ sandbox.running ? t('sandbox.running') : t('sandbox.stopped') }}
        </NTag>
      </div>

      <!-- Terminal output -->
      <TerminalOutput :lines="sandbox.output">
        <template #empty>
          <div v-if="loading">
            <NSpin size="small" />
          </div>
          <div v-else-if="!sandbox.sandboxId">
            <p class="mb-2">{{ t('sandbox.noSandbox') }}</p>
            <NButton
              type="primary"
              size="small"
              :disabled="!sandbox.available"
              @click="handleCreate"
            >
              {{ t('sandbox.create') }}
            </NButton>
          </div>
          <div v-else>
            <p>{{ t('sandbox.ready') }}</p>
          </div>
        </template>
      </TerminalOutput>

      <!-- Command input -->
      <div v-if="sandbox.sandboxId" class="mt-3 flex items-center gap-2">
        <NInput
          v-model:value="command"
          :placeholder="t('sandbox.commandPlaceholder')"
          :disabled="sandbox.executing"
          class="flex-1 font-mono"
          @keydown="handleKeydown"
        />
        <NButton
          type="primary"
          :loading="sandbox.executing"
          :disabled="!command.trim() || sandbox.executing"
          @click="handleRun"
        >
          {{ t('sandbox.run') }}
        </NButton>
      </div>

      <!-- Unavailable reason -->
      <div v-if="!sandbox.available && sandbox.unavailableReason" class="mt-3 text-sm text-[var(--text-3)]">
        {{ t('sandbox.unavailableReason') }}: {{ sandbox.unavailableReason }}
      </div>
    </div>
  </div>
</template>
