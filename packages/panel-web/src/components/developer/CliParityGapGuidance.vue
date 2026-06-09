<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CliCommandInventoryItem, CliCommandRisk } from '@hermes-panel/shared';

const props = defineProps<{
  cmd: CliCommandInventoryItem;
}>();

const { t, te } = useI18n();

const risk = computed<CliCommandRisk>(() => props.cmd.risk ?? 'standard');
const fallback = computed(() => props.cmd.fallback ?? `hermes ${props.cmd.command} --help`);
const nextAction = computed(() => {
  const commandKey = `developer.cliParity.nextActions.${props.cmd.command}`;
  if (te(commandKey)) return t(commandKey);
  return t(`developer.cliParity.nextActions.${props.cmd.coverage}`);
});
</script>

<template>
  <div
    v-if="cmd.coverage !== 'ready'"
    class="gap-guidance"
  >
    <div class="gap-guidance-head">
      <span class="risk-badge">
        {{ t(`developer.cliParity.risks.${risk}`) }}
      </span>
      <span class="benchmark-badge">
        {{ t(`developer.cliParity.benchmarks.${cmd.coverage}`) }}
      </span>
    </div>
    <p class="gap-action">
      {{ nextAction }}
    </p>
    <p class="fallback-line">
      <span>{{ t('developer.cliParity.officialFallback') }}</span>
      <code>{{ fallback }}</code>
    </p>
  </div>
</template>

<style scoped>
.gap-guidance {
  margin-top: 10px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-warning) 30%, var(--border));
  background: color-mix(in srgb, var(--color-warning) 8%, var(--bg-card));
  padding: 10px;
}

.gap-guidance-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.risk-badge,
.benchmark-badge {
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-2);
  font-size: 11px;
  line-height: 16px;
  padding: 2px 7px;
}

.risk-badge {
  border-color: color-mix(in srgb, var(--color-warning) 42%, var(--border));
  color: var(--color-warning);
}

.gap-action {
  margin-top: 8px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 18px;
}

.fallback-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 16px;
}

.fallback-line code {
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-2);
  padding: 2px 6px;
}
</style>
