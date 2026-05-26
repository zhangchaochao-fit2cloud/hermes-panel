import { promises as fsp } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

/**
 * Single-session export.
 *
 * Hermes' `sessions export` writes to a positional OUTPUT argument; passing `-`
 * streams JSONL to stdout. For a single session this is short enough to load
 * as a string (no tmpfile needed).
 */
export async function exportOne(sessionId: string): Promise<string> {
  if (!sessionId) {
    throw new HermesCliError('BAD_REQUEST', 'sessionId is required');
  }
  const result = await runHermesCli(
    ['sessions', 'export', '-', '--session-id', sessionId],
    { timeoutMs: 30_000 },
  );
  return result.stdout;
}

export interface ExportFilteredOptions {
  source?: string;
}

/**
 * All-or-filtered export.
 *
 * Hermes writes to a positional OUTPUT path; for the filtered/all case we
 * route through a tmpfile in os.tmpdir(), read it back, and unlink. The
 * filename uses crypto.randomBytes to avoid collisions across concurrent
 * requests.
 */
export async function exportFiltered(opts: ExportFilteredOptions = {}): Promise<string> {
  const suffix = randomBytes(8).toString('hex');
  const tmpPath = path.join(os.tmpdir(), `hermes-export-${suffix}.jsonl`);
  const args = ['sessions', 'export', tmpPath];
  if (opts.source) {
    args.push('--source', opts.source);
  }
  try {
    await runHermesCli(args, { timeoutMs: 30_000 });
    return await fsp.readFile(tmpPath, 'utf-8');
  } finally {
    // Best-effort cleanup. If the CLI never created the file (e.g. it threw
    // before writing), unlink will ENOENT — that's fine.
    try {
      await fsp.unlink(tmpPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        logger.warn({ err, tmpPath }, 'failed to remove tmpfile after export');
      }
    }
  }
}
