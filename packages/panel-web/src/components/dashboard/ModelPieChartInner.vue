<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { useI18n } from 'vue-i18n';
import { formatCompact } from '@/utils/format-number';
import type { ModelStatPoint } from './ModelPieChart.vue';

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent]);

const props = defineProps<{
  data: ModelStatPoint[];
  dark: boolean;
  loading?: boolean;
}>();

const { t } = useI18n();
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
  <VChart
    class="h-full w-full"
    :option="option"
    :autoresize="true"
    :loading="loading"
  />
  <div
    class="pointer-events-none absolute left-0 bottom-[8%] flex w-[64%] flex-col items-center"
  >
    <div class="text-[10px] uppercase tracking-wider text-[var(--text-3)]">
      {{ t('dashboard.modelChart.totalLabel') }}
    </div>
    <div class="text-xl font-semibold tabular-nums">
      {{ formatCompact(total) }}
    </div>
  </div>
</template>
