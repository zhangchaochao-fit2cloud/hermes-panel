import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let currentWorkspaceCwd: string | null = null;

export interface WorkspaceStatus {
  cwd: string;
  source: 'ide' | 'query' | 'env' | 'process';
  isGitRepo: boolean;
  branch: string | null;
  changeCount: number;
  lastCommit: string | null;
  githubCliAvailable: boolean;
  githubCliDetail: string | null;
}

export function setCurrentWorkspaceCwd(cwd: string | null | undefined): void {
  const resolved = resolveCwd(cwd);
  if (resolved) currentWorkspaceCwd = resolved;
}

async function run(bin: string, args: string[], cwd: string, timeoutMs: number = 2_000): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(bin, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 512 * 1024,
      shell: false,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

function resolveCwd(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    if (!existsSync(raw)) return null;
    return realpathSync(raw);
  } catch {
    return null;
  }
}

function pickWorkspaceCwd(explicit?: string | null): { cwd: string; source: WorkspaceStatus['source'] } {
  const queryCwd = resolveCwd(explicit);
  if (queryCwd) return { cwd: queryCwd, source: 'query' };
  if (currentWorkspaceCwd) return { cwd: currentWorkspaceCwd, source: 'ide' };
  const envCwd = resolveCwd(process.env.PANEL_WORKSPACE_CWD);
  if (envCwd) return { cwd: envCwd, source: 'env' };
  return { cwd: process.cwd(), source: 'process' };
}

export async function readWorkspaceStatus(explicitCwd?: string | null): Promise<WorkspaceStatus> {
  const picked = pickWorkspaceCwd(explicitCwd);
  const cwd = picked.cwd;
  const gitRoot = await run('git', ['rev-parse', '--show-toplevel'], cwd);
  const isGitRepo = gitRoot !== null;
  const [branch, status, lastCommit, ghVersion] = await Promise.all([
    isGitRepo ? run('git', ['branch', '--show-current'], cwd) : Promise.resolve(null),
    isGitRepo ? run('git', ['status', '--porcelain'], cwd) : Promise.resolve(null),
    isGitRepo ? run('git', ['log', '-1', '--pretty=%h %s'], cwd) : Promise.resolve(null),
    run('gh', ['--version'], cwd),
  ]);

  return {
    cwd,
    source: picked.source,
    isGitRepo,
    branch: branch || null,
    changeCount: status ? status.split(/\r?\n/).filter(Boolean).length : 0,
    lastCommit: lastCommit || null,
    githubCliAvailable: ghVersion !== null,
    githubCliDetail: ghVersion?.split(/\r?\n/)[0] ?? null,
  };
}
