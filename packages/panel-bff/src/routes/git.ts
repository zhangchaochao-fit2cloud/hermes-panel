import Router from '@koa/router';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readWorkspaceStatus } from '../services/workspace-status.js';

const execFileAsync = promisify(execFile);

const gitRouter = new Router();

async function runGit(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const status = await readWorkspaceStatus(cwd ?? undefined);
  const { stdout, stderr } = await execFileAsync('git', args, {
    cwd: status.cwd,
    timeout: 10_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

gitRouter.get('/git/status', async ctx => {
  try {
    const status = await readWorkspaceStatus(
      typeof ctx.query.cwd === 'string' ? ctx.query.cwd : undefined,
    );
    if (!status.isGitRepo) {
      ctx.body = { isGitRepo: false, branch: null, changeCount: 0, lastCommit: null };
      return;
    }
    ctx.body = {
      isGitRepo: true,
      branch: status.branch,
      changeCount: status.changeCount,
      lastCommit: status.lastCommit,
    };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

gitRouter.get('/git/diff', async ctx => {
  try {
    const filePath = (ctx.query.path as string) || null;
    const args = filePath ? ['diff', '--', filePath] : ['diff'];
    const { stdout } = await runGit(args);
    ctx.body = { diff: stdout };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

gitRouter.get('/git/diff-index', async ctx => {
  try {
    const filePath = (ctx.query.path as string) || null;
    const args = filePath ? ['diff', 'HEAD', '--', filePath] : ['diff', 'HEAD'];
    const { stdout } = await runGit(args);
    ctx.body = { diff: stdout };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

gitRouter.post('/git/commit', async ctx => {
  const body = ctx.request.body as { message?: string; files?: string[] } | undefined;
  const message = body?.message;
  if (!message) {
    ctx.status = 400;
    ctx.body = { error: { code: 'BAD_REQUEST', message: 'message required' } };
    return;
  }
  try {
    if (body.files && body.files.length > 0) {
      await runGit(['add', ...body.files]);
    } else {
      await runGit(['add', '-A']);
    }
    const { stdout, stderr } = await runGit(['commit', '-m', message]);
    ctx.body = { ok: true, output: stdout || stderr };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

gitRouter.post('/git/push', async ctx => {
  try {
    const { stdout, stderr } = await runGit(['push']);
    ctx.body = { ok: true, output: stdout || stderr };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

gitRouter.post('/git/pull', async ctx => {
  try {
    const { stdout, stderr } = await runGit(['pull']);
    ctx.body = { ok: true, output: stdout || stderr };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: { code: 'GIT_ERROR', message: err.message } };
  }
});

export { gitRouter };
