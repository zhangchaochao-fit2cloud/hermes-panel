/**
 * Thin wrappers around `hermes backup` and `hermes import`.
 *
 * Backup zips can be large (whole ~/.hermes), so we let `hermes backup`
 * write to a tempfile via `-o <path>` and let the route stream it back.
 * Cleanup of the tempfile is the caller's responsibility — we just hand
 * over the path.
 *
 * Restore is destructive: the route writes the uploaded bytes to a
 * tempfile, then we shell out to `hermes import`. `--force` overwrites
 * conflicting files in ~/.hermes.
 */

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runHermesCli, HermesCliError } from './hermes-cli.js';

const BACKUP_TIMEOUT_MS = 5 * 60_000;   // 5 min — full hermes home zip
const IMPORT_TIMEOUT_MS = 5 * 60_000;   // 5 min — restore of same size

export interface CreateBackupResult {
  /** Absolute path to the produced .zip on disk. Caller must unlink. */
  path: string;
}

export async function createBackup(): Promise<CreateBackupResult> {
  const dir = await mkdtemp(join(tmpdir(), 'hermes-backup-'));
  const file = join(dir, `hermes-backup-${Date.now()}.zip`);
  await runHermesCli(['backup', '-o', file], { timeoutMs: BACKUP_TIMEOUT_MS });
  return { path: file };
}

export interface RestoreBackupResult {
  ok: boolean;
  error?: string;
}

export async function restoreBackup(filePath: string, force: boolean): Promise<RestoreBackupResult> {
  const args = ['import', filePath];
  if (force) args.push('-f');
  try {
    await runHermesCli(args, { timeoutMs: IMPORT_TIMEOUT_MS });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
