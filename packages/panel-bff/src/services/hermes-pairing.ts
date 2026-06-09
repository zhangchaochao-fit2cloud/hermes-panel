import { logger } from '../lib/logger.js';
import { HermesCliError, runHermesCli } from './hermes-cli.js';

export interface PairingListReport {
  source: string;
  generatedAt: number;
  stdout: string;
  stderr?: string;
  error?: string;
}

export async function listPairings(): Promise<PairingListReport> {
  const generatedAt = Date.now();
  try {
    const { stdout, stderr } = await runHermesCli(['pairing', 'list'], { timeoutMs: 8_000 });
    return {
      source: 'hermes pairing list',
      generatedAt,
      stdout,
      ...(stderr ? { stderr } : {}),
    };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes pairing list failed');
    return {
      source: 'hermes pairing list',
      generatedAt,
      stdout: '',
      error: code,
    };
  }
}
