import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { bffFetch } from '@/api/bff';

export interface CronJob {
  id: string;
  name: string;
  active: boolean;
  schedule: string;
  repeat: string;
  nextRun?: string;
  lastRun?: string;
  lastResult?: string;
  deliver?: string;
  prompt?: string;
}

type CronAction = 'pause' | 'resume' | 'run' | 'remove';

export const useCronStore = defineStore('cron', () => {
  const jobs = ref<CronJob[]>([]);
  const loading = ref(false);
  const refreshing = ref(false);
  const initialized = ref(false);
  const error = ref<string | null>(null);

  const total = computed(() => jobs.value.length);
  const activeCount = computed(() => jobs.value.filter(j => j.active).length);
  /** Earliest upcoming nextRun across all active jobs (unix ms) or null. */
  const earliestNextRun = computed<number | null>(() => {
    let best: number | null = null;
    for (const j of jobs.value) {
      if (!j.active || !j.nextRun) continue;
      const t = Date.parse(j.nextRun);
      if (!Number.isFinite(t)) continue;
      if (best === null || t < best) best = t;
    }
    return best;
  });

  async function load(opts: { initial?: boolean } = {}): Promise<void> {
    if (opts.initial) loading.value = true;
    else refreshing.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{ jobs: CronJob[]; error?: string }>('/api/cron');
      jobs.value = r.jobs ?? [];
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
      refreshing.value = false;
      initialized.value = true;
    }
  }

  async function act(id: string, action: CronAction): Promise<boolean> {
    try {
      await bffFetch(`/api/cron/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    }
  }

  async function pause(id: string): Promise<boolean> {
    const job = jobs.value.find(j => j.id === id);
    const prev = job?.active;
    if (job) job.active = false;
    const ok = await act(id, 'pause');
    if (!ok && job && typeof prev === 'boolean') job.active = prev;
    else void load();
    return ok;
  }

  async function resume(id: string): Promise<boolean> {
    const job = jobs.value.find(j => j.id === id);
    const prev = job?.active;
    if (job) job.active = true;
    const ok = await act(id, 'resume');
    if (!ok && job && typeof prev === 'boolean') job.active = prev;
    else void load();
    return ok;
  }

  async function runNow(id: string): Promise<boolean> {
    const ok = await act(id, 'run');
    if (ok) void load();
    return ok;
  }

  async function remove(id: string): Promise<boolean> {
    const ok = await act(id, 'remove');
    if (ok) {
      jobs.value = jobs.value.filter(j => j.id !== id);
    }
    return ok;
  }

  return {
    jobs, loading, refreshing, initialized, error,
    total, activeCount, earliestNextRun,
    load, pause, resume, runNow, remove,
  };
});
