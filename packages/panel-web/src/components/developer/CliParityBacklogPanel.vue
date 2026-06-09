<script setup lang="ts">
import type { CliCommandCoverage, CliCommandGroup } from '@hermes-panel/shared';
import CliParityGapGuidance from './CliParityGapGuidance.vue';

interface BacklogCommand {
  command: string;
  description: string;
  displayDescription?: string;
  group: CliCommandGroup;
  coverage: CliCommandCoverage;
  route?: string;
  example: string;
}

defineProps<{
  commands: BacklogCommand[];
  backlogCount: number;
}>();

defineEmits<{
  copyExample: [command: BacklogCommand];
  copyPlan: [];
  focusCommand: [command: BacklogCommand];
  filterCoverage: [coverage: CliCommandCoverage];
}>();
</script>

<template>
  <section
    class="cli-backlog rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
  >
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ $t('developer.cliParity.backlogEyebrow', { n: backlogCount }) }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ commands.length > 0 ? $t('developer.cliParity.backlogTitle') : $t('developer.cliParity.backlogEmptyTitle') }}
        </h3>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ commands.length > 0 ? $t('developer.cliParity.backlogDesc') : $t('developer.cliParity.backlogEmptyDesc') }}
        </p>
      </div>
      <div
        v-if="commands.length > 0"
        class="backlog-actions"
      >
        <button
          type="button"
          class="reload-button"
          @click="$emit('copyPlan')"
        >
          {{ $t('developer.cliParity.copyBacklogPlan') }}
        </button>
        <button
          type="button"
          class="reload-button"
          @click="$emit('filterCoverage', 'partial')"
        >
          {{ $t('developer.cliParity.coverage.partial') }}
        </button>
        <button
          type="button"
          class="reload-button"
          @click="$emit('filterCoverage', 'missing')"
        >
          {{ $t('developer.cliParity.coverage.missing') }}
        </button>
      </div>
    </div>

    <div
      v-if="commands.length > 0"
      class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3"
    >
      <article
        v-for="cmd in commands"
        :key="cmd.command"
        class="backlog-item"
      >
        <div class="flex flex-wrap items-center gap-2">
          <code>hermes {{ cmd.command }}</code>
          <span>{{ $t(`developer.cliParity.coverage.${cmd.coverage}`) }}</span>
        </div>
        <p class="mt-2 text-xs leading-5 text-[var(--text-3)]">
          {{ cmd.displayDescription || cmd.description }}
        </p>
        <pre class="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-xs text-[var(--text-2)]">{{ cmd.example }}</pre>
        <CliParityGapGuidance :cmd="cmd" />
        <div class="backlog-card-actions">
          <button
            type="button"
            class="backlog-action"
            @click="$emit('copyExample', cmd)"
          >
            {{ $t('developer.cliParity.copyExample') }}
          </button>
          <button
            type="button"
            class="backlog-action"
            @click="$emit('focusCommand', cmd)"
          >
            {{ $t('developer.cliParity.focusCommand') }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.backlog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.backlog-item {
  min-width: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 10px;
}

.backlog-item code {
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-1);
  font-size: 12px;
  padding: 3px 7px;
}

.backlog-item span {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-500) 36%, var(--border));
  color: var(--brand-600);
  font-size: 11px;
  line-height: 16px;
  padding: 2px 7px;
}

.backlog-card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.backlog-action,
.reload-button {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 34%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-card));
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 5px 8px;
}

.backlog-action {
  width: 100%;
}

.backlog-action:hover,
.reload-button:hover {
  background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card));
}
</style>
