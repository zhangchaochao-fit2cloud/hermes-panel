<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NInput, NModal, NTag, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const msg = useMessage();

const props = defineProps<{
  open: boolean;
  templateId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: string;
  initialTags?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void;
  (e: 'save', data: { title: string; content: string; category: string; tags: string[] }): void;
}>();

const title = ref('');
const content = ref('');
const category = ref('custom');
const tagInput = ref('');
const tags = ref<string[]>([]);

watch(() => props.open, (v) => {
  if (v) {
    title.value = props.initialTitle ?? '';
    content.value = props.initialContent ?? '';
    category.value = props.initialCategory ?? 'custom';
    tags.value = props.initialTags ? [...props.initialTags] : [];
    tagInput.value = '';
  }
});

function addTag(): void {
  const val = tagInput.value.trim();
  if (val && !tags.value.includes(val)) {
    tags.value.push(val);
    tagInput.value = '';
  }
}

function removeTag(tag: string): void {
  tags.value = tags.value.filter(t => t !== tag);
}

function handleSave(): void {
  if (!title.value.trim()) { msg.warning(t('templates.titleRequired')); return; }
  if (!content.value.trim()) { msg.warning(t('templates.contentRequired')); return; }
  emit('save', { title: title.value.trim(), content: content.value, category: category.value, tags: tags.value });
  emit('update:open', false);
}
</script>

<template>
  <NModal :show="open" :mask-closable="false" @update:show="emit('update:open', $event)">
    <div class="template-editor-modal bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 w-full max-w-2xl mx-4">
      <h3 class="text-base font-bold text-[var(--text-1)] mb-4">{{ templateId ? t('templates.editTitle') : t('templates.createTitle') }}</h3>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[var(--text-3)] mb-1">{{ t('templates.name') }}</label>
          <NInput v-model:value="title" :placeholder="t('templates.namePlaceholder')" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-3)] mb-1">{{ t('templates.category') }}</label>
          <NInput v-model:value="category" :placeholder="t('templates.categoryPlaceholder')" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-3)] mb-1">{{ t('templates.tags') }}</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <NTag v-for="tag in tags" :key="tag" size="small" closable @close="removeTag(tag)">{{ tag }}</NTag>
          </div>
          <div class="flex gap-2">
            <NInput v-model:value="tagInput" size="small" :placeholder="t('templates.tagPlaceholder')" @keydown.enter.prevent="addTag" />
            <NButton size="small" @click="addTag">{{ t('templates.addTag') }}</NButton>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--text-3)] mb-1">{{ t('templates.content') }}</label>
          <NInput
            v-model:value="content"
            type="textarea"
            :placeholder="t('templates.contentPlaceholder')"
            :autosize="{ minRows: 6, maxRows: 16 }"
            class="font-mono text-xs"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <NButton quaternary @click="emit('update:open', false)">{{ t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSave">{{ t('common.save') }}</NButton>
      </div>
    </div>
  </NModal>
</template>
