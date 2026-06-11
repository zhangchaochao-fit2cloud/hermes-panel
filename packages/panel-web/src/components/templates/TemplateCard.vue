<script setup lang="ts">
import { NButton, NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  id: string;
  title: string;
  content: string;
  author?: string;
  category: string;
  tags: string[];
  downloads?: number;
  rating?: number;
  source?: string;
  isUser?: boolean;
}>();

const emit = defineEmits<{
  (e: 'use', content: string): void;
  (e: 'fork', id: string): void;
  (e: 'edit', id: string): void;
  (e: 'delete', id: string): void;
}>();
</script>

<template>
  <div class="template-card bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow flex flex-col">
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="text-sm font-bold text-[var(--text-1)] line-clamp-1">{{ title }}</h3>
      <NTag v-if="source === 'builtin'" size="tiny" type="primary" :bordered="false">{{ t('templates.builtin') }}</NTag>
      <NTag v-else-if="source === 'community'" size="tiny" type="info" :bordered="false">{{ t('templates.community') }}</NTag>
    </div>
    <p class="text-xs text-[var(--text-3)] line-clamp-2 mb-3 flex-1">{{ content }}</p>
    <div v-if="tags.length" class="flex flex-wrap gap-1 mb-3">
      <NTag v-for="tag in tags" :key="tag" size="tiny" :bordered="false">{{ tag }}</NTag>
    </div>
    <div class="flex items-center justify-between text-[10px] text-[var(--text-3)] mb-3">
      <span v-if="author">{{ author }}</span>
      <span v-if="downloads != null">{{ t('templates.downloads', { n: downloads }) }}</span>
      <span v-if="rating != null">{{ rating }} ★</span>
    </div>
    <div class="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
      <NButton size="tiny" type="primary" @click="emit('use', content)">{{ t('templates.use') }}</NButton>
      <NButton v-if="!isUser" size="tiny" quaternary @click="emit('fork', id)">{{ t('templates.fork') }}</NButton>
      <NButton v-if="isUser" size="tiny" quaternary @click="emit('edit', id)">{{ t('templates.edit') }}</NButton>
      <NButton v-if="isUser" size="tiny" type="error" quaternary @click="emit('delete', id)">{{ t('templates.delete') }}</NButton>
    </div>
  </div>
</template>
