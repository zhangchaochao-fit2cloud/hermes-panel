<script setup lang="ts">
import type { CliCommandCoverage, CliCommandGroup } from '@hermes-panel/shared';
import { useI18n } from 'vue-i18n';

defineProps<{
  query: string;
  coverageFilter: CliCommandCoverage | 'all';
  groupFilter: CliCommandGroup | 'all';
  coverages: CliCommandCoverage[];
  groups: CliCommandGroup[];
}>();

const emit = defineEmits<{
  (e: 'update:query', value: string): void;
  (e: 'update:coverageFilter', value: CliCommandCoverage | 'all'): void;
  (e: 'update:groupFilter', value: CliCommandGroup | 'all'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="cli-filters rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
    <label class="min-w-0 flex-1">
      <span class="sr-only">{{ t('developer.cliParity.search') }}</span>
      <input
        class="cli-search"
        type="search"
        :value="query"
        :placeholder="t('developer.cliParity.search')"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      >
    </label>

    <div class="filter-row">
      <span class="filter-label">{{ t('developer.cliParity.coverageLabel') }}</span>
      <button
        type="button"
        class="filter-chip"
        :class="coverageFilter === 'all' ? 'is-active' : ''"
        @click="emit('update:coverageFilter', 'all')"
      >
        {{ t('developer.cliParity.coverage.all') }}
      </button>
      <button
        v-for="coverage in coverages"
        :key="coverage"
        type="button"
        class="filter-chip"
        :class="coverageFilter === coverage ? 'is-active' : ''"
        @click="emit('update:coverageFilter', coverage)"
      >
        {{ t(`developer.cliParity.coverage.${coverage}`) }}
      </button>
    </div>

    <div class="filter-row">
      <span class="filter-label">{{ t('developer.cliParity.groupLabel') }}</span>
      <button
        type="button"
        class="filter-chip"
        :class="groupFilter === 'all' ? 'is-active' : ''"
        @click="emit('update:groupFilter', 'all')"
      >
        {{ t('developer.cliParity.groups.all') }}
      </button>
      <button
        v-for="group in groups"
        :key="group"
        type="button"
        class="filter-chip"
        :class="groupFilter === group ? 'is-active' : ''"
        @click="emit('update:groupFilter', group)"
      >
        {{ t(`developer.cliParity.groups.${group}`) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.cli-filters {
  display: grid;
  gap: 12px;
}

.cli-search {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-1);
  font-size: 13px;
  line-height: 20px;
  outline: none;
  padding: 8px 10px;
}

.cli-search:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-500) 18%, transparent);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter-label {
  min-width: 70px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 18px;
}

.filter-chip {
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-2);
  font-size: 12px;
  line-height: 18px;
  padding: 6px 10px;
}

.filter-chip.is-active {
  border-color: color-mix(in srgb, var(--brand-500) 52%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-elevate));
  color: var(--brand-600);
}
</style>
