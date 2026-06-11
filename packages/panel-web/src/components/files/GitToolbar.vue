<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { NButton, NInput, NTooltip, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useGitStore } from '@/stores/git';

const { t } = useI18n();
const message = useMessage();
const gitStore = useGitStore();
const { status, loading, operationLoading } = storeToRefs(gitStore);

const showCommitInput = ref(false);
const commitMessage = ref('');

const emit = defineEmits<{
  'show-diff': [];
}>();

onMounted(() => {
  void gitStore.fetchStatus();
});

watch(status, (s) => {
  if (!s.isGitRepo) showCommitInput.value = false;
});

async function doCommit(): Promise<void> {
  const msg = commitMessage.value.trim();
  if (!msg) return;
  try {
    await gitStore.commit(msg);
    commitMessage.value = '';
    showCommitInput.value = false;
    message.success(t('files.git.commitSuccess'));
  } catch {
    message.error(t('files.git.operationFailed'));
  }
}

async function doPush(): Promise<void> {
  try {
    const output = await gitStore.push();
    message.success(output || t('files.git.pushSuccess'));
  } catch {
    message.error(t('files.git.operationFailed'));
  }
}

async function doPull(): Promise<void> {
  try {
    const output = await gitStore.pull();
    message.success(output || t('files.git.pullSuccess'));
  } catch {
    message.error(t('files.git.operationFailed'));
  }
}
</script>

<template>
  <div
    v-if="status.isGitRepo"
    class="flex items-center gap-2 px-3 h-9 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0"
  >
    <div class="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
      <span class="opacity-60">⎇</span>
      <span v-if="loading" class="italic opacity-50">{{ t('common.loading') }}</span>
      <span v-else>{{ status.branch ?? 'detached' }}</span>
      <span
        v-if="status.changeCount > 0"
        class="text-[10px] bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full"
      >
        {{ status.changeCount }}
      </span>
    </div>

    <span class="opacity-20">|</span>

    <NTooltip>
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          :disabled="operationLoading"
          @click="showCommitInput = !showCommitInput"
        >
          {{ t('files.git.commit') }}
        </NButton>
      </template>
      {{ t('files.git.commitTooltip') }}
    </NTooltip>

    <NTooltip>
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          :loading="operationLoading"
          @click="doPush"
        >
          {{ t('files.git.push') }}
        </NButton>
      </template>
      {{ t('files.git.pushTooltip') }}
    </NTooltip>

    <NTooltip>
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          :loading="operationLoading"
          @click="doPull"
        >
          {{ t('files.git.pull') }}
        </NButton>
      </template>
      {{ t('files.git.pullTooltip') }}
    </NTooltip>

    <NTooltip>
      <template #trigger>
        <NButton
          size="tiny"
          quaternary
          @click="emit('show-diff')"
        >
          {{ t('files.git.diff') }}
        </NButton>
      </template>
      {{ t('files.git.diffTooltip') }}
    </NTooltip>

    <div
      v-if="status.lastCommit"
      class="ml-auto text-[10px] text-[var(--text-3)] truncate max-w-[200px]"
      :title="status.lastCommit"
    >
      {{ status.lastCommit }}
    </div>

    <div
      v-if="showCommitInput"
      class="absolute top-full left-0 right-0 z-30 border-b border-[var(--border)] bg-[var(--bg-card)] p-2"
    >
      <div class="flex items-center gap-2">
        <NInput
          v-model:value="commitMessage"
          :placeholder="t('files.git.commitMessagePlaceholder')"
          size="small"
          class="flex-1"
          @keydown.enter="doCommit"
        />
        <NButton
          size="small"
          type="primary"
          :disabled="!commitMessage.trim() || operationLoading"
          :loading="operationLoading"
          @click="doCommit"
        >
          {{ t('files.git.commitConfirm') }}
        </NButton>
        <NButton
          size="small"
          quaternary
          @click="showCommitInput = false"
        >
          {{ t('common.cancel') }}
        </NButton>
      </div>
    </div>
  </div>
</template>
