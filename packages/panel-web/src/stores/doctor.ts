import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';

export type DoctorStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface DoctorCheck {
  category?: string;
  name: string;
  status: DoctorStatus;
  message?: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  raw: string;
  error?: string;
}

export const useDoctorStore = defineStore('doctor', () => {
  const lastRun = ref<number | null>(null);
  const checks = ref<DoctorCheck[]>([]);
  const raw = ref<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const counts = computed(() => {
    let ok = 0;
    let warn = 0;
    let fail = 0;
    let info = 0;
    for (const c of checks.value) {
      if (c.status === 'ok') ok++;
      else if (c.status === 'warn') warn++;
      else if (c.status === 'fail') fail++;
      else info++;
    }
    return { ok, warn, fail, info };
  });

  const grouped = computed(() => {
    const map = new Map<string, DoctorCheck[]>();
    for (const c of checks.value) {
      const key = c.category ?? '';
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category: category || undefined,
      items,
    }));
  });

  async function run(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<DoctorReport>('/api/system/doctor');
      checks.value = r.checks ?? [];
      raw.value = r.raw ?? '';
      if (r.error) error.value = r.error;
      lastRun.value = Date.now();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  return { lastRun, checks, raw, loading, error, counts, grouped, run };
});
