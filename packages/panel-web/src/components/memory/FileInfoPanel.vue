<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NTooltip, useDialog, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { MemoryFile } from '@/utils/tree-helpers';
import { formatSize } from '@/utils/tree-helpers';
import { relativeTime, absoluteTime, type Locale } from '@/utils/relative-time';

const props = defineProps<{
  file: MemoryFile | null;
  draftContent: string;
  saving: boolean;
  dirty: boolean;
}>();

const emit = defineEmits<{
  save: [];
  delete: [path: string];
}>();

const dialog = useDialog();

const { t, locale } = useI18n();
const message = useMessage();

const relMtime = computed(() => {
  if (!props.file) return '-';
  return relativeTime(props.file.mtime, locale.value as Locale);
});

const absMtime = computed(() => {
  if (!props.file) return '-';
  return absoluteTime(props.file.mtime);
});

const sizeText = computed(() => {
  if (!props.file) return '-';
  // Show *current draft* size if dirty so users see real-time growth
  if (props.dirty) {
    return `${formatSize(new Blob([props.draftContent]).size)} (${t('memory.unsaved')})`;
  }
  return formatSize(props.file.size);
});

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.draftContent);
    message.success(t('memory.copied'));
  } catch (err) {
    message.error(`${t('memory.copyFailed')}: ${(err as Error).message}`);
  }
}

function confirmDelete(): void {
  if (!props.file) return;
  const path = props.file.path;
  dialog.error({
    title: t('memory.deleteConfirmTitle'),
    content: t('memory.deleteConfirmContent', { path }),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      emit('delete', path);
    },
  });
}
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-card)]">
    <div class="px-4 pt-4 pb-2 text-xs uppercase tracking-wide text-[var(--text-3)]">
      {{ t('memory.infoTitle') }}
    </div>

    <div v-if="!file" class="px-4 py-6 text-xs text-[var(--text-3)]">
      {{ t('memory.noSelection') }}
    </div>

    <template v-else>
      <!-- Metadata -->
      <dl class="px-4 py-2 text-xs space-y-2.5">
        <div>
          <dt class="text-[var(--text-3)] mb-0.5">{{ t('memory.fieldPath') }}</dt>
          <dd class="font-mono break-all text-[var(--text-1)]">{{ file.path }}</dd>
        </div>
        <div>
          <dt class="text-[var(--text-3)] mb-0.5">{{ t('memory.fieldSize') }}</dt>
          <dd class="text-[var(--text-1)]">{{ sizeText }}</dd>
        </div>
        <div>
          <dt class="text-[var(--text-3)] mb-0.5">{{ t('memory.fieldMtime') }}</dt>
          <dd class="text-[var(--text-1)]">
            <NTooltip trigger="hover" placement="left">
              <template #trigger>
                <span class="cursor-help underline decoration-dotted underline-offset-2">
                  {{ relMtime }}
                </span>
              </template>
              {{ absMtime }}
            </NTooltip>
          </dd>
        </div>
      </dl>

      <div class="border-t border-[var(--border)] mx-4 my-2" />

      <!-- Actions -->
      <div class="px-4 pt-1 pb-4 space-y-2">
        <div class="text-xs text-[var(--text-3)] mb-1">{{ t('memory.actions') }}</div>

        <NButton
          block
          type="primary"
          :loading="saving"
          :disabled="!dirty || saving"
          @click="emit('save')"
        >
          {{ t('common.save') }}
        </NButton>

        <NButton block @click="copy">
          {{ t('memory.copy') }}
        </NButton>

        <NButton block type="error" ghost @click="confirmDelete">
          {{ t('common.delete') }}
        </NButton>
      </div>
    </template>
  </div>
</template>
