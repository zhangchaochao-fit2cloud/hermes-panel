<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput, NSpin, NButton } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  path: string | null;
  content: string;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  'update:content': [v: string];
  save: [];
}>();

const { t } = useI18n();

const value = computed({
  get: () => props.content,
  set: (v: string) => emit('update:content', v),
});

const charCount = computed(() => props.content.length);
const lineCount = computed(() => {
  if (!props.content) return 0;
  return props.content.split('\n').length;
});

// Break path into breadcrumb segments
const segments = computed<string[]>(() => {
  if (!props.path) return [];
  return props.path.split(/[/\\]/).filter(Boolean);
});

// Ctrl/Cmd+S handler on the textarea wrapper. NInput passes through keydown.
const wrapperRef = ref<HTMLElement | null>(null);
function onKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (!props.saving && props.dirty) emit('save');
  }
}
</script>

<template>
  <div ref="wrapperRef" class="h-full flex flex-col bg-[var(--bg-page)]" @keydown="onKeydown">
    <!-- Header: breadcrumb + meta -->
    <div class="flex items-center justify-between gap-4 px-5 h-12 border-b border-[var(--border)] bg-[var(--bg-card)] flex-shrink-0">
      <div v-if="path" class="flex items-center gap-1 text-sm font-mono min-w-0 overflow-hidden">
        <template v-for="(seg, idx) in segments" :key="idx">
          <span v-if="idx > 0" class="opacity-50 mx-1 flex-shrink-0">/</span>
          <span
            :class="[
              'truncate',
              idx === segments.length - 1 ? 'font-semibold text-[var(--text-1)]' : 'text-[var(--text-2)]',
            ]"
          >{{ seg }}</span>
        </template>
      </div>
      <div v-else class="text-sm text-[var(--text-3)]">
        {{ t('memory.noSelection') }}
      </div>

      <div class="flex items-center gap-3 text-xs text-[var(--text-3)] flex-shrink-0">
        <span v-if="path">
          {{ t('memory.lines', { n: lineCount }) }} · {{ t('memory.chars', { n: charCount }) }}
        </span>
        <span v-if="dirty && path" class="text-amber-500">
          ● {{ t('memory.unsaved') }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 min-h-0 relative">
      <!-- Loading overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-page)]/60"
      >
        <NSpin size="medium" />
      </div>

      <!-- Empty placeholder -->
      <div
        v-if="!path && !loading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
      >
        <div class="text-4xl opacity-40">📝</div>
        <p class="text-sm text-[var(--text-3)] max-w-sm">
          {{ t('memory.selectHint') }}
        </p>
      </div>

      <!-- Editor -->
      <NInput
        v-if="path"
        v-model:value="value"
        type="textarea"
        :placeholder="t('memory.editorPlaceholder')"
        class="memory-editor h-full"
        :autosize="false"
        :input-props="{ spellcheck: false }"
      />

      <!-- Error banner -->
      <div
        v-if="error"
        class="absolute bottom-0 left-0 right-0 px-4 py-2 text-xs bg-red-500/10 text-red-600 border-t border-red-500/30"
      >
        {{ error }}
      </div>
    </div>

    <!-- Footer status -->
    <div
      v-if="path"
      class="h-9 border-t border-[var(--border)] bg-[var(--bg-card)] px-5 flex items-center justify-between text-xs text-[var(--text-3)] flex-shrink-0"
    >
      <span>
        <span v-if="saving">{{ t('memory.savingNow') }}</span>
        <span v-else-if="dirty">{{ t('memory.unsavedHint') }}</span>
        <span v-else>{{ t('memory.synced') }}</span>
      </span>
      <NButton
        size="tiny"
        type="primary"
        :disabled="!dirty || saving"
        :loading="saving"
        @click="emit('save')"
      >
        {{ t('common.save') }} <span class="ml-2 opacity-70 text-[10px]">⌘S</span>
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.memory-editor :deep(.n-input__textarea-el),
.memory-editor :deep(.n-input__textarea-mirror) {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
  tab-size: 2;
}
.memory-editor :deep(.n-input) {
  height: 100%;
}
.memory-editor :deep(.n-input-wrapper) {
  padding: 16px 20px;
}
.memory-editor :deep(.n-input__textarea) {
  height: 100%;
}
.memory-editor :deep(.n-input__textarea-el) {
  height: 100% !important;
  resize: none;
}
</style>
