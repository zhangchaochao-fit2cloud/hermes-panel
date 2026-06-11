<script setup lang="ts">
/**
 * Inline context-usage meter shown in the composer footer.
 *
 * Filename stays "ContextRing.vue" so existing imports (Composer.vue,
 * ComposerFooter.vue) keep working, but the visual is no longer a ring — it
 * is a horizontal bar + textual readout + click-to-open popover.
 *
 * Backwards compatible: callers that only pass `used`/`limit` still work.
 * Optional props (`model`, `input`, `output`, `cache`, `cost`) light up
 * richer popover content when supplied. If both `limit` and `model` are
 * given, the explicit `limit` wins.
 */
import { computed } from 'vue';
import { NPopover, NButton } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';
import { inferContextLimit } from '@/data/model-limits';

const props = withDefaults(defineProps<{
  used: number;
  /** Explicit context window. When omitted, derived from `model`. */
  limit?: number;
  /** Optional model id used to infer a default `limit`. */
  model?: string | null;
  /** Input/output/cache breakdown for the popover. */
  input?: number;
  output?: number;
  cache?: number;
  /** Estimated USD cost; renders a Cost line in the popover when set. */
  cost?: number;
  /** Session ID for compression requests. */
  sessionId?: string | null;
}>(), {
  limit: undefined,
  model: null,
  input: undefined,
  output: undefined,
  cache: undefined,
  cost: undefined,
  sessionId: null,
});

const emit = defineEmits<{
  (e: 'compressed', result: { savedTokens: number; savedCost: number }): void;
}>();

const { t } = useI18n();

/** Resolved limit: explicit prop wins over the model-inferred default. */
const resolvedLimit = computed<number>(() =>
  typeof props.limit === 'number' && props.limit > 0
    ? props.limit
    : inferContextLimit(props.model),
);

const pct = computed(() =>
  Math.min(100, (props.used / Math.max(1, resolvedLimit.value)) * 100),
);

/** Theme-aware color tokens at the four pressure thresholds. */
const barColor = computed(() => {
  if (pct.value >= 95) return 'var(--color-error)';
  if (pct.value >= 50) return 'var(--color-warning)';
  return 'var(--color-success)';
});

/** Compact display: 12345 → "12.3K", 1234567 → "1.2M". */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtFull(n: number): string {
  return n.toLocaleString('en-US');
}

const pctLabel = computed(() => pct.value.toFixed(1));
const modelLabel = computed(() => props.model || t('chat.context.modelFallback'));

const needsCompression = computed(() => pct.value >= 70);

const compacting = computed(() => false);

async function handleCompress(): Promise<void> {
  if (!props.sessionId || compacting.value) return;
  try {
    const result = await bffFetch(`/api/sessions/${props.sessionId}/compress`, {
      method: 'POST',
      body: JSON.stringify({ modelLimit: resolvedLimit.value }),
    }) as { savedTokens: number; savingsPercent: number; compressedCount: number };

    const estimatedCost = props.cost ?? 0;
    const savedCost = estimatedCost > 0 && result.savingsPercent > 0
      ? (estimatedCost * result.savingsPercent) / 100
      : 0;

    emit('compressed', { savedTokens: result.savedTokens, savedCost });
  } catch {
    // silently fail — compression is non-critical
  }
}
</script>

<template>
  <NPopover trigger="click" placement="top-end" :width="300">
    <template #trigger>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-[var(--bg-elevate)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border)]"
        :aria-label="t('chat.context.title')"
      >
        <!-- Bar -->
        <span
          class="relative inline-block h-2 rounded-full overflow-hidden bg-[var(--border)]"
          style="width: 120px;"
        >
          <span
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            :style="{ width: `${pct}%`, background: barColor }"
          />
        </span>
        <!-- Readout -->
        <span class="font-mono whitespace-nowrap text-[var(--text-2)]">
          {{ fmtCompact(used) }} / {{ fmtCompact(resolvedLimit) }}
        </span>
        <span class="font-mono whitespace-nowrap tabular-nums" :style="{ color: barColor }">
          {{ pctLabel }}%
        </span>
      </button>
    </template>

    <!-- Popover content -->
    <div class="min-w-[260px] flex flex-col gap-2">
      <div class="text-xs text-[var(--text-3)] font-medium uppercase tracking-wider">{{ t('chat.context.title') }}</div>

      <!-- Big total -->
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-semibold font-mono" :style="{ color: barColor }">
          {{ fmtFull(used) }}
        </span>
        <span class="text-xs text-[var(--text-3)]">{{ t('chat.context.tokens') }}</span>
      </div>

      <!-- Limit -->
      <div class="text-xs">
        <span class="opacity-60">{{ t('chat.context.limit') }}:</span>
        <span class="font-mono ml-1">{{ fmtFull(resolvedLimit) }}</span>
      </div>

      <!-- Breakdown: only render if at least one figure is provided -->
      <div
        v-if="input != null || output != null || cache != null"
        class="text-xs flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2"
      >
        <span v-if="input != null">
          <span class="opacity-60">{{ t('chat.context.input') }}:</span>
          <span class="font-mono ml-1">{{ fmtFull(input) }}</span>
        </span>
        <span v-if="output != null">
          <span class="opacity-60">{{ t('chat.context.output') }}:</span>
          <span class="font-mono ml-1">{{ fmtFull(output) }}</span>
        </span>
        <span v-if="cache != null">
          <span class="opacity-60">{{ t('chat.context.cache') }}:</span>
          <span class="font-mono ml-1">{{ fmtFull(cache) }}</span>
        </span>
      </div>

      <!-- Cost (optional) -->
      <div v-if="cost != null" class="text-xs">
        <span class="opacity-60">{{ t('chat.context.cost') }}:</span>
        <span class="font-mono ml-1">${{ cost.toFixed(4) }}</span>
      </div>

      <!-- Compression alert -->
      <div
        v-if="needsCompression && sessionId"
        class="border-t border-[color-mix(in_srgb,var(--color-warning)_30%,var(--border))] pt-2 mt-1"
      >
        <p class="text-xs text-[var(--color-warning)] mb-2">
          {{ pct >= 95 ? t('chat.context.compression.almostFull') : t('chat.context.compression.highUsage') }}
        </p>
        <NButton
          size="tiny"
          type="warning"
          :loading="compacting"
          :disabled="compacting"
          block
          @click="handleCompress"
        >
          {{ compacting ? t('chat.context.compression.compressing') : t('chat.context.compression.compress') }}
        </NButton>
      </div>

      <!-- Model hint -->
      <div class="text-[10px] opacity-50 border-t border-[var(--border)] pt-1 mt-1">
        {{ t('chat.context.modelHint', { model: modelLabel }) }}
      </div>
    </div>
  </NPopover>
</template>
