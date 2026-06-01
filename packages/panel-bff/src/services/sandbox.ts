import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 300_000;
const CONTAINER_PREFIX = 'hermes-sandbox-';
const SANDBOX_IMAGE = 'node:22-alpine';

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SandboxError extends Error {
  constructor(
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function createSandbox(
  sessionId: string,
  workspacePath?: string,
): Promise<{ sandboxId: string }> {
  const sandboxId = `${CONTAINER_PREFIX}${sessionId}`;
  const args = [
    'run', '-d',
    '--name', sandboxId,
    '--memory=2g',
    '--cpus=1',
    '--network=none',
    '--read-only',
    '--tmpfs', '/tmp',
  ];
  if (workspacePath) {
    args.push('-v', `${workspacePath}:/workspace:rw`);
  }
  args.push(SANDBOX_IMAGE, 'tail', '-f', '/dev/null');

  try {
    await execFileAsync('docker', args, { timeout: 30_000 });
    return { sandboxId };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    if (e.code === 'ENOENT') {
      throw new SandboxError('DOCKER_NOT_FOUND', 'docker CLI not available');
    }
    throw new SandboxError('SANDBOX_CREATE_FAILED', `failed to create sandbox: ${e.message ?? String(err)}`, { stderr: e.stderr ?? '' });
  }
}

export async function runInSandbox(
  sandboxId: string,
  command: string,
  opts?: { timeoutMs?: number; env?: Record<string, string> },
): Promise<SandboxResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;
  const envArgs: string[] = [];
  if (opts?.env) {
    for (const [k, v] of Object.entries(opts.env)) {
      envArgs.push('-e', `${k}=${v}`);
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      'docker',
      ['exec', ...envArgs, sandboxId, '/bin/sh', '-c', command],
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: string | number };
    if (e.code === 'ENOENT') {
      throw new SandboxError('DOCKER_NOT_FOUND', 'docker CLI not available');
    }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: typeof e.code === 'number' ? e.code : 1,
    };
  }
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  try {
    await execFileAsync('docker', ['stop', sandboxId], { timeout: 10_000 });
  } catch {
    // container may already be stopped
  }
  try {
    await execFileAsync('docker', ['rm', '-f', sandboxId], { timeout: 10_000 });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      throw new SandboxError('DOCKER_NOT_FOUND', 'docker CLI not available');
    }
    // container may already be removed — ignore
  }
}

export async function getSandboxStatus(sandboxId: string): Promise<{ running: boolean }> {
  try {
    const { stdout } = await execFileAsync('docker', ['inspect', '--format', '{{.State.Running}}', sandboxId], { timeout: 5000 });
    return { running: stdout.trim() === 'true' };
  } catch {
    return { running: false };
  }
}
