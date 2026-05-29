import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface WorkspaceStatus {
  cwd: string;
  isGitRepo: boolean;
  branch: string | null;
  changeCount: number;
  lastCommit: string | null;
  githubCliAvailable: boolean;
  githubCliDetail: string | null;
}

async function run(bin: string, args: string[], timeoutMs: number = 2_000): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(bin, args, {
      timeout: timeoutMs,
      maxBuffer: 512 * 1024,
      shell: false,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function readWorkspaceStatus(): Promise<WorkspaceStatus> {
  const cwd = process.cwd();
  const gitRoot = await run('git', ['rev-parse', '--show-toplevel']);
  const isGitRepo = gitRoot !== null;
  const [branch, status, lastCommit, ghVersion] = await Promise.all([
    isGitRepo ? run('git', ['branch', '--show-current']) : Promise.resolve(null),
    isGitRepo ? run('git', ['status', '--porcelain']) : Promise.resolve(null),
    isGitRepo ? run('git', ['log', '-1', '--pretty=%h %s']) : Promise.resolve(null),
    run('gh', ['--version']),
  ]);

  return {
    cwd,
    isGitRepo,
    branch: branch || null,
    changeCount: status ? status.split(/\r?\n/).filter(Boolean).length : 0,
    lastCommit: lastCommit || null,
    githubCliAvailable: ghVersion !== null,
    githubCliDetail: ghVersion?.split(/\r?\n/)[0] ?? null,
  };
}
