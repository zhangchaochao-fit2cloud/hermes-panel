<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

export interface DailyTokenPoint {
  day: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

const props = defineProps<{
  data: DailyTokenPoint[];
  dark: boolean;
  loading?: boolean;
}>();

const palette = computed(() => {
  const text = props.dark ? '#a1a1aa' : '#52525b';
  const axisLine = props.dark ? '#27272a' : '#e5e7eb';
  const splitLine = props.dark ? '#1c1c1f' : '#f1f5f9';
  return { text, axisLine, splitLine };
});

const weekdayLabel = (iso: string, locale: string = 'zh-CN'): string => {
  // iso = "2026-05-25"; treat as local date
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale, { weekday: 'short' });
};

const option = computed<EChartsOption>(() => {
  const days = props.data;
  const labels = days.map(d => weekdayLabel(d.day));
  const inputs = days.map(d => d.input_tokens);
  const outputs = days.map(d => d.output_tokens);
  const totals = days.map(d => d.total_tokens);

  return {
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: props.dark ? '#1c1c1f' : '#ffffff',
      borderColor: palette.value.axisLine,
      borderWidth: 1,
      textStyle: { color: palette.value.text },
      formatter(params: unknown): string {
        const arr = Array.isArray(params) ? params : [params];
        const head = arr[0] as { axisValueLabel?: string; dataIndex?: number };
        const idx = head.dataIndex ?? 0;
        const date = days[idx]?.day ?? '';
        const inn = inputs[idx] ?? 0;
        const out = outputs[idx] ?? 0;
        const tot = totals[idx] ?? 0;
        return `
          <div style="font-size:12px;line-height:1.6">
            <div style="opacity:.7">${date}</div>
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6366f1;margin-right:6px"></span>Input: ${inn.toLocaleString()}</div>
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22d3ee;margin-right:6px"></span>Output: ${out.toLocaleString()}</div>
            <div style="margin-top:2px;font-weight:600">Total: ${tot.toLocaleString()}</div>
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: palette.value.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: palette.value.text, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: palette.value.splitLine } },
      axisLabel: {
        color: palette.value.text,
        fontSize: 11,
        formatter(v: number): string {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
          return String(v);
        },
      },
    },
    series: [
      {
        type: 'line',
        name: 'Total',
        data: totals,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: '#6366f1' },
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.35)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0)' },
            ],
          },
        },
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
      <h2 class="text-sm font-semibold">{{ $t('dashboard.usageChart.title') }}</h2>
      <span class="text-xs text-[var(--text-3)]">{{ $t('dashboard.usageChart.subtitle') }}</span>
    </header>
    <div class="relative min-h-[240px] flex-1">
      <div
        v-if="!loading && data.length === 0"
        class="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-3)]"
      >
        {{ $t('dashboard.empty') }}
      </div>
      <VChart
        v-else
        class="h-full w-full"
        :option="option"
        :autoresize="true"
        :loading="loading"
      />
    </div>
  </section>
</template>
