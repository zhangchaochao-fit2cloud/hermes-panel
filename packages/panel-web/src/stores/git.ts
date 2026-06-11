import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';

export interface GitStatus {
  isGitRepo: boolean;
  branch: string | null;
  changeCount: number;
  lastCommit: string | null;
}

export const useGitStore = defineStore('git', () => {
  const status = ref<GitStatus>({
    isGitRepo: false,
    branch: null,
    changeCount: 0,
    lastCommit: null,
  });
  const loading = ref(false);
  const operationLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchStatus(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<GitStatus>('/api/git/status');
      status.value = r;
    } catch (err) {
      const e = err as BffApiError;
      error.value = e.message;
      status.value = { isGitRepo: false, branch: null, changeCount: 0, lastCommit: null };
    } finally {
      loading.value = false;
    }
  }

  async function commit(message: string, files?: string[]): Promise<string> {
    operationLoading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{ ok: boolean; output: string }>('/api/git/commit', {
        method: 'POST',
        body: JSON.stringify({ message, files }),
      });
      await fetchStatus();
      return r.output;
    } catch (err) {
      const e = err as BffApiError;
      error.value = e.message;
      throw err;
    } finally {
      operationLoading.value = false;
    }
  }

  async function push(): Promise<string> {
    operationLoading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{ ok: boolean; output: string }>('/api/git/push', {
        method: 'POST',
      });
      return r.output;
    } catch (err) {
      const e = err as BffApiError;
      error.value = e.message;
      throw err;
    } finally {
      operationLoading.value = false;
    }
  }

  async function pull(): Promise<string> {
    operationLoading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{ ok: boolean; output: string }>('/api/git/pull', {
        method: 'POST',
      });
      await fetchStatus();
      return r.output;
    } catch (err) {
      const e = err as BffApiError;
      error.value = e.message;
      throw err;
    } finally {
      operationLoading.value = false;
    }
  }

  async function fetchDiff(filePath?: string): Promise<string> {
    const params = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
    const r = await bffFetch<{ diff: string }>(`/api/git/diff${params}`);
    return r.diff;
  }

  return {
    status, loading, operationLoading, error,
    fetchStatus, commit, push, pull, fetchDiff,
  };
});
