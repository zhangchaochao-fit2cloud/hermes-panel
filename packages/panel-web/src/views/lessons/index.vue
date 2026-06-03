<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NTag, NPopconfirm, NProgress, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import EmptyState from '@/components/shared/EmptyState.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import { useI18n } from 'vue-i18n';

interface Lesson {
  id: string;
  trigger: string;
  lesson: string;
  context?: string;
  tags?: string[];
  confidence?: number;
  usedCount?: number;
  successCount?: number;
  createdAt?: number;
}

const msg = useMessage();
const { t } = useI18n();
const lessons = ref<Lesson[]>([]);
const loading = ref(false);

onMounted(async () => { await fetchLessons(); });

async function fetchLessons(): Promise<void> {
  loading.value = true;
  try { lessons.value = await bffFetch<Lesson[]>('/api/lessons'); }
  finally { loading.value = false; }
}

async function handleDelete(id: string): Promise<void> {
  await bffFetch(`/api/lessons/${id}`, { method: 'DELETE' });
  await fetchLessons();
  msg.success(t('lessons.delete'));
}
</script>

<template>
  <ViewErrorBoundary name="lessons">
  <div class="lessons-page px-6 py-6 max-w-[1400px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('lessons.title') }}</h2>
        <p class="text-sm text-[var(--text-3)]">{{ t('lessons.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NButton
          quaternary
          :loading="loading"
          :disabled="loading"
          :aria-label="t('common.refresh')"
          @click="fetchLessons"
        >
          {{ t('common.refresh') }}
        </NButton>
        <NButton type="primary" tag="a" href="#/chat">{{ t('lessons.add') }}</NButton>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ThemedSkeleton v-for="i in 6" :key="i" height="160px" rounded="lg" />
    </div>
    <div v-else-if="lessons.length === 0" class="py-16">
      <EmptyState :title="t('lessons.emptyTitle')" :description="t('lessons.emptyDescription')" icon="🧠" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="l in lessons"
        :key="l.id"
        class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow"
      >
        <div class="mb-2">
          <span class="text-xs font-semibold text-[var(--text-3)]">{{ t('lessons.trigger') }}</span>
          <p class="text-sm text-[var(--text-1)] font-medium line-clamp-1">{{ l.trigger }}</p>
        </div>
        <div class="mb-3">
          <span class="text-xs font-semibold text-[var(--text-3)]">{{ t('lessons.lesson') }}</span>
          <p class="text-sm text-[var(--text-2)] line-clamp-3">{{ l.lesson }}</p>
        </div>

        <!-- Tags -->
        <div v-if="l.tags?.length" class="flex flex-wrap gap-1 mb-3">
          <NTag v-for="tag in l.tags" :key="tag" size="tiny" :bordered="false">{{ tag }}</NTag>
        </div>

        <!-- Confidence -->
        <div v-if="l.confidence != null" class="mb-3">
          <div class="flex justify-between text-[10px] text-[var(--text-3)] mb-1">
            <span>{{ t('lessons.confidence') }}</span>
            <span>{{ Math.round(l.confidence * 100) }}%</span>
          </div>
          <NProgress
            :percentage="Math.round(l.confidence * 100)"
            :height="4"
            :border-radius="2"
            :show-indicator="false"
          />
        </div>

        <!-- Stats + Delete -->
        <div class="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div class="flex gap-3 text-xs text-[var(--text-3)]">
            <span>{{ t('lessons.used', { n: l.usedCount ?? 0 }) }}</span>
            <span>{{ t('lessons.success', { n: l.successCount ?? 0 }) }}</span>
          </div>
          <NPopconfirm @positive-click="handleDelete(l.id)">
            <template #trigger>
              <NButton size="tiny" type="error" quaternary>{{ t('lessons.delete') }}</NButton>
            </template>
            {{ t('lessons.deleteConfirm') }}
          </NPopconfirm>
        </div>
      </div>
    </div>
  </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.lessons-page { min-height: calc(100vh - 140px); }
</style>
