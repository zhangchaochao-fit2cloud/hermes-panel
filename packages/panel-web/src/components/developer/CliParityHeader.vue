<script setup lang="ts">
import type { CliCommandCoverage } from '@hermes-panel/shared';

interface CoverageTotals {
  all: number;
  ready: number;
  partial: number;
  missing: number;
}

defineProps<{
  source: string;
  generatedAtLabel: string;
  loading: boolean;
  totals: CoverageTotals;
  copyDisabled: boolean;
}>();

defineEmits<{
  copyReport: [];
  filterCoverage: [coverage: CliCommandCoverage | 'all'];
  reload: [];
}>();
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ $t('developer.cliParity.eyebrow') }}
        </p>
        <h2 class="mt-1 text-base font-semibold text-[var(--text-1)]">
          {{ $t('developer.cliParity.title') }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-3)]">
          {{ $t('developer.cliParity.desc') }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <pre class="inline-flex rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1 text-xs text-[var(--text-2)]">{{ source }}</pre>
          <span v-if="generatedAtLabel" class="text-xs text-[var(--text-3)]">
            {{ $t('developer.cliParity.lastUpdated', { time: generatedAtLabel }) }}
          </span>
          <button
            type="button"
            class="reload-button"
            :disabled="loading"
            @click="$emit('reload')"
          >
            {{ loading ? $t('developer.cliParity.loading') : $t('developer.cliParity.reload') }}
          </button>
          <button
            type="button"
            class="reload-button"
            :disabled="copyDisabled"
            @click="$emit('copyReport')"
          >
            {{ $t('developer.cliParity.copyReport') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2 text-center">
        <button class="cli-count" type="button" @click="$emit('filterCoverage', 'all')">
          <strong>{{ totals.all }}</strong>
          <span>{{ $t('developer.cliParity.coverage.all') }}</span>
        </button>
        <button class="cli-count" type="button" @click="$emit('filterCoverage', 'ready')">
          <strong>{{ totals.ready }}</strong>
          <span>{{ $t('developer.cliParity.coverage.ready') }}</span>
        </button>
        <button class="cli-count" type="button" @click="$emit('filterCoverage', 'partial')">
          <strong>{{ totals.partial }}</strong>
          <span>{{ $t('developer.cliParity.coverage.partial') }}</span>
        </button>
        <button class="cli-count" type="button" @click="$emit('filterCoverage', 'missing')">
          <strong>{{ totals.missing }}</strong>
          <span>{{ $t('developer.cliParity.coverage.missing') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cli-count {
  min-width: 72px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 9px 10px;
}

.cli-count strong,
.cli-count span {
  display: block;
}

.cli-count strong {
  color: var(--text-1);
  font-size: 18px;
  line-height: 1.1;
}

.cli-count span {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 11px;
}

.reload-button {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 36%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 4px 8px;
}

.reload-button:disabled {
  opacity: 0.62;
  cursor: wait;
}
</style>
