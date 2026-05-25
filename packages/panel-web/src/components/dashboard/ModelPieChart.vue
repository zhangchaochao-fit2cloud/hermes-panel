<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { formatCompact } from '@/utils/format-number';

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent]);

export interface ModelStatPoint {
  model: string;
  session_count: number;
  total_tokens: number;
}

const props = defineProps<{
  data: ModelStatPoint[];
  dark: boolean;
  loading?: boolean;
}>();

const PALETTE = ['#6366f1', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15'];

const total = computed(() =>
  props.data.reduce((s, m) => s + (m.total_tokens || 0), 0),
);

const items = computed(() =>
  props.data.map((m, i) => ({
    name: m.model,
    value: m.total_tokens,
    itemStyle: { color: PALETTE[i % PALETTE.length] },
  })),
);

const option = computed<EChartsOption>(() => {
  const text = props.dark ? '#a1a1aa' : '#52525b';
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: props.dark ? '#1c1c1f' : '#ffffff',
      borderColor: props.dark ? '#27272a' : '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: text },
      formatter(params: unknown): string {
        const p = params as { name: string; value: number; percent: number; color: string };
        return `
          <div style="font-size:12px;line-height:1.6">
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.name}</div>
            <div>${p.value.toLocaleString()} tok · ${p.percent.toFixed(1)}%</div>
          </div>
        `;
      },
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'middle',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: text, fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        // Half-donut: rotate so the open arc points downward
        radius: ['62%', '88%'],
        center: ['32%', '88%'],
        startAngle: 180,
        endAngle: 360,
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
        },
        data: items.value,
      },
    ],
  };
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
      <template v-else>
        <VChart
          class="h-full w-full"
          :option="option"
          :autoresize="true"
          :loading="loading"
        />
        <!-- Center label sits above the half-donut arc -->
        <div
          class="pointer-events-none absolute left-0 bottom-[8%] flex w-[64%] flex-col items-center"
        >
          <div class="text-[10px] uppercase tracking-wider text-[var(--text-3)]">
            {{ $t('dashboard.modelChart.totalLabel') }}
          </div>
          <div class="text-xl font-semibold tabular-nums">
            {{ formatCompact(total) }}
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
