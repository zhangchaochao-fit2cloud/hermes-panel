import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RunOptions {
  hermesBin?: string;
  argsPrefix?: string[];
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  parsed?: unknown;
}

export class HermesCliError extends Error {
  constructor(public code: string, message: string, public detail?: unknown) {
    super(message);
    this.name = 'HermesCliError';
  }
}

export async function runHermesCli(
  args: string[],
  options: RunOptions = {}
): Promise<RunResult> {
  const bin = options.hermesBin ?? process.env.HERMES_BIN ?? 'hermes';
  const allArgs = [...(options.argsPrefix ?? []), ...args];
  const timeoutMs = options.timeoutMs ?? 15_000;

  try {
    const { stdout, stderr } = await execFileAsync(bin, allArgs, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: false,
    });
    let parsed: unknown;
    const trimmed = stdout.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { parsed = JSON.parse(trimmed); } catch { /* leave undefined */ }
    }
    return { stdout, stderr, exitCode: 0, parsed };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string; stdout?: string; stderr?: string; code?: string | number };
    if (e.code === 'ENOENT') {
      throw new HermesCliError('HERMES_CLI_NOT_FOUND', `hermes binary not found: ${bin}`);
    }
    if (e.killed && e.signal === 'SIGTERM') {
      throw new HermesCliError('HERMES_CLI_TIMEOUT', `hermes call timed out after ${timeoutMs}ms`);
    }
    throw new HermesCliError(
      'HERMES_CLI_FAILED',
      `hermes call failed: ${e.message ?? String(err)}`,
      { stderr: e.stderr ?? '', exitCode: typeof e.code === 'number' ? e.code : -1 }
    );
  }
}
