<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

export interface ModelStatPoint {
  model: string;
  session_count: number;
  total_tokens: number;
}

defineProps<{
  data: ModelStatPoint[];
  dark: boolean;
  loading?: boolean;
}>();

const ModelPieChartInner = defineAsyncComponent({
  loader: () => import('./ModelPieChartInner.vue'),
  suspensible: false,
});
</script>

<template>
  <section
    class="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-1)]"
  >
    <header class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-semibold">{{ $t('dashboard.modelChart.title') }}</h2>
      <span class="text-xs text-[var(--text-3)]">{{ $t('dashboard.modelChart.subtitle') }}</span>
    </header>

    <div class="relative min-h-[240px] flex-1">
      <div
        v-if="!loading && data.length === 0"
        class="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-3)]"
      >
        {{ $t('dashboard.empty') }}
      </div>
      <ModelPieChartInner
        v-else
        :data="data"
        :dark="dark"
        :loading="loading"
      />
      <ThemedSkeleton
        v-if="loading"
        class="pointer-events-none absolute inset-0"
        :rows="4"
      />
    </div>
  </section>
</template>
