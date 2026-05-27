import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { bffFetch } from '@/api/bff';

/**
 * Persistent usage store.
 *
 * The BFF owns the source of truth (~/.hermes-panel/usage.jsonl). This store
 * is a thin client cache that:
 *   - calls GET /api/usage on demand to refresh the dashboard totals;
 *   - calls POST /api/usage/record when chat-stream sees `run.completed`.
 *
 * We deliberately don't optimistically mutate the local buckets after
 * record() — instead we re-load. The roundtrip is cheap, and re-loading
 * keeps the dashboard honest if multiple panel windows append concurrently.
 */

export interface UsageBucket {
  tokens: number;
  cost: number;
  runs: number;
}

export interface UsageSummary {
  today: UsageBucket;
  thisMonth: UsageBucket;
  allTime: UsageBucket;
  byModel: Record<string, UsageBucket>;
}

export interface UsageRecordInput {
  sessionId?: string;
  model: string;
  provider?: string;
  input: number;
  output: number;
  total: number;
  ts?: number;
}

function emptyBucket(): UsageBucket {
  return { tokens: 0, cost: 0, runs: 0 };
}

export const useUsageStore = defineStore('usage', () => {
  const today      = ref<UsageBucket>(emptyBucket());
  const thisMonth  = ref<UsageBucket>(emptyBucket());
  const allTime    = ref<UsageBucket>(emptyBucket());
  const byModel    = ref<Record<string, UsageBucket>>({});
  const loading    = ref(false);
  const error      = ref<string | null>(null);

  /** Top N models by tokens — used by the breakdown popover. */
  const topModels = computed<{ model: string; tokens: number; cost: number; runs: number }[]>(() => {
    const entries = Object.entries(byModel.value)
      .map(([model, bucket]) => ({ model, ...bucket }))
      .sort((a, b) => b.tokens - a.tokens);
    return entries.slice(0, 3);
  });

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const data = await bffFetch<UsageSummary>('/api/usage');
      today.value     = data.today     ?? emptyBucket();
      thisMonth.value = data.thisMonth ?? emptyBucket();
      allTime.value   = data.allTime   ?? emptyBucket();
      byModel.value   = data.byModel   ?? {};
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to load usage';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Append one run to the ledger and refresh totals.
   * Errors are swallowed (caller is chat-stream, mid-stream — never fail the chat).
   */
  async function record(entry: UsageRecordInput): Promise<void> {
    if (!entry.model || !entry.total) return;       // nothing meaningful to log
    try {
      await bffFetch('/api/usage/record', {
        method: 'POST',
        body: JSON.stringify(entry),
        silent: true,
      });
      // Refresh after a successful POST so dashboards (if mounted) see it.
      void load();
    } catch (err) {
      console.warn('[usage] record failed:', err);
    }
  }

  return { today, thisMonth, allTime, byModel, loading, error, topModels, load, record };
});
