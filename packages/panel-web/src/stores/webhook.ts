import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';

export interface WebhookSubscription {
  name: string;
  events?: string;
  description?: string;
  skills?: string;
  deliver?: string;
  deliverChatId?: string;
  prompt?: string;
  secretHint?: string;
}

export interface AddWebhookInput {
  name: string;
  prompt?: string;
  events?: string;
  description?: string;
  skills?: string;
  deliver?: string;
  deliverChatId?: string;
  secret?: string;
}

export interface TestResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  message?: string;
  /** Unix ms when the test ran (UI uses this to detect freshness). */
  at: number;
}

export const useWebhookStore = defineStore('webhook', () => {
  const subscriptions = ref<WebhookSubscription[]>([]);
  const loading = ref(false);
  const refreshing = ref(false);
  const initialized = ref(false);
  const error = ref<string | null>(null);
  const disabled = ref(false);
  const raw = ref<string | null>(null);
  /** Per-subscription latest test result, keyed by name. */
  const testResults = ref<Record<string, TestResult>>({});
  /** Set of names currently mid-test. */
  const testing = ref<Set<string>>(new Set());

  const total = computed(() => subscriptions.value.length);

  async function load(opts: { initial?: boolean } = {}): Promise<void> {
    if (opts.initial) loading.value = true;
    else refreshing.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{
        subscriptions: WebhookSubscription[];
        disabled?: boolean;
        raw?: string;
        error?: string;
      }>('/api/webhooks');
      subscriptions.value = r.subscriptions ?? [];
      disabled.value = !!r.disabled;
      raw.value = r.raw ?? null;
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
      refreshing.value = false;
      initialized.value = true;
    }
  }

  async function add(input: AddWebhookInput): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      await bffFetch('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await load();
      return { ok: true };
    } catch (err) {
      if (err instanceof BffApiError) {
        return { ok: false, error: err.code, message: err.message };
      }
      const e = err as Error;
      return { ok: false, error: 'WEBHOOK_ADD_FAILED', message: e.message };
    }
  }

  async function remove(name: string): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      await bffFetch(`/api/webhooks/${encodeURIComponent(name)}`, { method: 'DELETE' });
      subscriptions.value = subscriptions.value.filter(s => s.name !== name);
      delete testResults.value[name];
      return { ok: true };
    } catch (err) {
      if (err instanceof BffApiError) {
        return { ok: false, error: err.code, message: err.message };
      }
      const e = err as Error;
      return { ok: false, error: 'WEBHOOK_REMOVE_FAILED', message: e.message };
    }
  }

  async function test(name: string, payload?: string): Promise<TestResult> {
    testing.value = new Set([...testing.value, name]);
    try {
      const r = await bffFetch<{ ok: boolean; stdout?: string; stderr?: string }>(
        `/api/webhooks/${encodeURIComponent(name)}/test`,
        {
          method: 'POST',
          body: JSON.stringify(payload && payload.trim() ? { payload } : {}),
        }
      );
      const res: TestResult = { ok: true, stdout: r.stdout, stderr: r.stderr, at: Date.now() };
      testResults.value = { ...testResults.value, [name]: res };
      return res;
    } catch (err) {
      const res: TestResult = err instanceof BffApiError
        ? { ok: false, error: err.code, message: err.message, at: Date.now() }
        : { ok: false, error: 'WEBHOOK_TEST_FAILED', message: (err as Error).message, at: Date.now() };
      testResults.value = { ...testResults.value, [name]: res };
      return res;
    } finally {
      const next = new Set(testing.value);
      next.delete(name);
      testing.value = next;
    }
  }

  function clearTestResult(name: string): void {
    if (testResults.value[name]) {
      const next = { ...testResults.value };
      delete next[name];
      testResults.value = next;
    }
  }

  return {
    subscriptions, loading, refreshing, initialized, error, disabled, raw,
    testResults, testing,
    total,
    load, add, remove, test, clearTestResult,
  };
});
