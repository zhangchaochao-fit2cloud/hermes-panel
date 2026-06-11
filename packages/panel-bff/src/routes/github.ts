import Router from '@koa/router';

export const githubRouter = new Router();

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

githubRouter.get('/github/repos', async ctx => {
  try {
    const repos = await githubFetch('/user/repos?sort=updated&per_page=50');
    ctx.body = repos;
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'GITHUB_REPOS_FAILED', message: e.message } };
  }
});

githubRouter.get('/github/repos/:owner/:repo/issues', async ctx => {
  const { owner, repo } = ctx.params;
  const state = (ctx.query.state as string) || 'open';
  try {
    const issues = await githubFetch(
      `/repos/${owner}/${repo}/issues?state=${state}&per_page=50`
    );
    ctx.body = issues;
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'GITHUB_ISSUES_FAILED', message: e.message } };
  }
});

githubRouter.post('/github/repos/:owner/:repo/issues', async ctx => {
  const { owner, repo } = ctx.params;
  const body = ctx.request.body as { title?: string; body?: string } | undefined;
  if (!body?.title || typeof body.title !== 'string') {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'title is required' } };
    return;
  }
  try {
    const issue = await githubFetch(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: body.title, body: body.body ?? '' }),
    });
    ctx.body = issue;
  } catch (err) {
    const e = err as Error & { status?: number };
    ctx.status = e.status ?? 502;
    ctx.body = { error: { code: 'GITHUB_ISSUE_CREATE_FAILED', message: e.message } };
  }
});
