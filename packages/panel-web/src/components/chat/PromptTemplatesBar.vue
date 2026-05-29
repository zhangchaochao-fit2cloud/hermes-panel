<script setup lang="ts">
/**
 * Composer 上方一行 prompt 模板触发器。
 *
 * 点击按钮弹 popover：列出所有模板（内置 + 用户）。点某条 → setText 到
 * composer。底部"+ 新建"打开输入 modal。
 */
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NPopover, NButton, NInput, useDialog, useMessage } from 'naive-ui';
import { h } from 'vue';
import { usePromptTemplatesStore, type PromptTemplate } from '@/stores/prompt-templates';

const emit = defineEmits<{
  (e: 'pick', content: string): void;
}>();

const { t } = useI18n();
const store = usePromptTemplatesStore();
const { all } = storeToRefs(store);
const dialog = useDialog();
const message = useMessage();

const open = ref(false);

function onPick(tpl: PromptTemplate): void {
  emit('pick', tpl.content);
  open.value = false;
}

function onAdd(): void {
  open.value = false;
  const title = ref('');
  const content = ref('');
  dialog.create({
    title: t('promptTemplates.addTitle'),
    content: () =>
      h('div', { class: 'flex flex-col gap-2' }, [
        h(NInput, {
          value: title.value,
          placeholder: t('promptTemplates.titlePlaceholder'),
          'onUpdate:value': (v: string) => { title.value = v; },
          autofocus: true,
        }),
        h(NInput, {
          value: content.value,
          type: 'textarea',
          rows: 5,
          placeholder: t('promptTemplates.contentPlaceholder'),
          'onUpdate:value': (v: string) => { content.value = v; },
        }),
      ]),
    positiveText: t('common.save'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      if (!title.value.trim() || !content.value.trim()) {
        message.warning(t('promptTemplates.requiredFields'));
        return false;
      }
      store.add(title.value, content.value);
      message.success(t('promptTemplates.added'));
      return true;
    },
  });
}

function onRemove(tpl: PromptTemplate): void {
  if (tpl.builtin) return;
  store.remove(tpl.id);
  message.success(t('promptTemplates.removed'));
}
</script>

<template>
  <NPopover
    v-model:show="open"
    trigger="click"
    placement="top-start"
    :style="{ padding: '0', maxWidth: '320px' }"
  >
    <template #trigger>
      <button
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-elevate)] transition-colors"
        :title="t('promptTemplates.label')"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="2" width="10" height="12" rx="1.5" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
        </svg>
        <span>{{ t('promptTemplates.label') }}</span>
      </button>
    </template>
    <div class="w-[320px] max-h-[360px] flex flex-col">
      <div class="flex-1 overflow-y-auto py-1">
        <button
          v-for="tpl in all"
          :key="tpl.id"
          class="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevate)] transition-colors group"
          @click="onPick(tpl)"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-[var(--text-1)] flex-1 truncate">{{ tpl.title }}</span>
            <span
              v-if="tpl.builtin"
              class="text-[10px] text-[var(--text-3)]"
            >{{ t('promptTemplates.builtin') }}</span>
            <button
              v-else
              class="opacity-0 group-hover:opacity-60 hover:opacity-100 text-[var(--text-3)] hover:text-red-500 transition-opacity"
              :title="t('common.delete')"
              @click.stop="onRemove(tpl)"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6.5 7v5M9.5 7v5M4.5 4l.5 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-9" />
              </svg>
            </button>
          </div>
          <div class="text-[10px] text-[var(--text-3)] mt-0.5 truncate">{{ tpl.content }}</div>
        </button>
      </div>
      <div class="border-t border-[var(--border)] p-1">
        <NButton size="tiny" quaternary block @click="onAdd">
          + {{ t('promptTemplates.add') }}
        </NButton>
      </div>
    </div>
  </NPopover>
</template>
