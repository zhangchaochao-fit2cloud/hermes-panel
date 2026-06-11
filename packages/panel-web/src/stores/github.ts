import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
  stargazers_count: number;
  language: string | null;
}

export interface GithubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string } | null;
  created_at: string;
  labels: Array<{ name: string; color: string }>;
}

export interface CiWorkflow {
  id: number;
  name: string;
  state: string;
  path: string;
  html_url: string;
  updated_at: string;
}

export interface CiRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
}

export const useGithubStore = defineStore('github', () => {
  const repos = ref<GithubRepo[]>([]);
  const issues = ref<GithubIssue[]>([]);
  const workflows = ref<CiWorkflow[]>([]);
  const runs = ref<CiRun[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadRepos(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      repos.value = await bffFetch<GithubRepo[]>('/api/github/repos');
    } catch (err) {
      error.value = err instanceof BffApiError ? err.message : (err as Error).message;
      repos.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function loadIssues(owner: string, repo: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      issues.value = await bffFetch<GithubIssue[]>(
        `/api/github/repos/${owner}/${repo}/issues`
      );
    } catch (err) {
      error.value = err instanceof BffApiError ? err.message : (err as Error).message;
      issues.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string
  ): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      await bffFetch(`/api/github/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title, body }),
      });
      await loadIssues(owner, repo);
      return { ok: true };
    } catch (err) {
      if (err instanceof BffApiError) {
        return { ok: false, error: err.code, message: err.message };
      }
      return { ok: false, error: 'ISSUE_CREATE_FAILED', message: (err as Error).message };
    }
  }

  async function loadWorkflows(owner: string, repo: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      workflows.value = await bffFetch<CiWorkflow[]>(
        `/api/ci/workflows?owner=${owner}&repo=${repo}`
      );
    } catch (err) {
      error.value = err instanceof BffApiError ? err.message : (err as Error).message;
      workflows.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function loadRuns(owner: string, repo: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      runs.value = await bffFetch<CiRun[]>(
        `/api/ci/runs?owner=${owner}&repo=${repo}`
      );
    } catch (err) {
      error.value = err instanceof BffApiError ? err.message : (err as Error).message;
      runs.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function rerun(runId: number): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      await bffFetch(`/api/ci/runs/${runId}/rerun`, { method: 'POST' });
      return { ok: true };
    } catch (err) {
      if (err instanceof BffApiError) {
        return { ok: false, error: err.code, message: err.message };
      }
      return { ok: false, error: 'RERUN_FAILED', message: (err as Error).message };
    }
  }

  return {
    repos, issues, workflows, runs, loading, error,
    loadRepos, loadIssues, createIssue, loadWorkflows, loadRuns, rerun,
  };
});
