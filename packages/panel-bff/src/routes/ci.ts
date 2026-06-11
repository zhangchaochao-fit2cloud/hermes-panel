import Router from '@koa/router';

export const ciRouter = new Router();

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw Object.assign(new Error('GITHUB_TOKEN is not configured'), {
      code: 'GITHUB_TOKEN_MISSING',
    });
  }
  return token;
}

async function githubFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = getToken();
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'hermes-panel',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const msg = (body as { message?: string })?.message ?? res.statusText;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return res.json();
}

ciRouter.get('/ci/workflows', async ctx => {
  const { owner, repo } = ctx.query as { owner?: string; repo?: string };
  if (!owner || !repo) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'owner and repo query params are required' } };
    return;
  }
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/actions/workflows`) as { workflows?: unknown[] };
    ctx.body = data.workflows ?? [];
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'CI_WORKFLOWS_FAILED', message: e.message } };
  }
});

ciRouter.get('/ci/runs', async ctx => {
  const { owner, repo } = ctx.query as { owner?: string; repo?: string };
  if (!owner || !repo) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'owner and repo query params are required' } };
    return;
  }
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/actions/runs?per_page=30`) as { workflow_runs?: unknown[] };
    ctx.body = data.workflow_runs ?? [];
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'CI_RUNS_FAILED', message: e.message } };
  }
});

ciRouter.post('/ci/runs/:id/rerun', async ctx => {
  const { id } = ctx.params;
  try {
    await githubFetch(`/actions/runs/${id}/rerun`, { method: 'POST' });
    ctx.body = { ok: true };
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'CI_RERUN_FAILED', message: e.message } };
  }
});
