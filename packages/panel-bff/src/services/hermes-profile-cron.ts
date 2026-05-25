import { runHermesCli, HermesCliError } from './hermes-cli.js';
import { logger } from '../lib/logger.js';

export interface Profile {
  name: string;
  current: boolean;
  model?: string;
  gateway?: string;        // running / stopped
  alias?: string;
}

/**
 * Parse `hermes profile list` table. Header row uses spaces, content rows
 * start with optional ◆ marker (current profile).
 */
export async function listProfiles(): Promise<{ profiles: Profile[]; error?: string }> {
  try {
    const { stdout } = await runHermesCli(['profile', 'list'], { timeoutMs: 8_000 });
    const profiles: Profile[] = [];
    for (const raw of stdout.split('\n')) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      // Skip header & divider lines
      if (/^\s*Profile\b/i.test(line)) continue;
      if (/^[\s─━=]+$/.test(line)) continue;
      // ◆default         deepseek-v4-flash            running      —
      const m = line.match(/^\s*([◆●●*]?)\s*(\S+)\s+(\S.*?)\s{2,}(\S+)\s+(\S+)\s*$/);
      if (m) {
        const [, marker, name, model, gateway, alias] = m;
        profiles.push({
          name,
          current: !!marker.trim(),
          model: model.trim() === '—' ? undefined : model.trim(),
          gateway: gateway.trim(),
          alias: alias.trim() === '—' ? undefined : alias.trim(),
        });
      }
    }
    return { profiles };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes profile list failed');
    return { profiles: [], error: code };
  }
}

export interface CronJob {
  id: string;
  name: string;
  active: boolean;
  schedule: string;
  repeat: string;
  nextRun?: string;
  lastRun?: string;
  lastResult?: string;     // ok / failed
  deliver?: string;
  prompt?: string;
}

/**
 * Parse `hermes cron list`. Output uses indented blocks per job.
 */
export async function listCron(): Promise<{ jobs: CronJob[]; error?: string }> {
  try {
    const { stdout } = await runHermesCli(['cron', 'list'], { timeoutMs: 8_000 });
    const jobs: CronJob[] = [];
    let current: Partial<CronJob> | null = null;

    for (const raw of stdout.split('\n')) {
      const line = raw.trimEnd();
      // Job header: "  abc123 [active]"
      const head = line.match(/^\s{2}([a-f0-9]+)\s+\[(\S+)\]/);
      if (head) {
        if (current?.id) jobs.push(current as CronJob);
        current = {
          id: head[1],
          active: head[2] === 'active',
          name: '',
          schedule: '',
          repeat: '',
        };
        continue;
      }
      if (!current) continue;
      const kv = line.match(/^\s{4,}(\S[^:]*):\s+(.+)$/);
      if (!kv) continue;
      const key = kv[1].trim().toLowerCase();
      const val = kv[2].trim();
      switch (key) {
        case 'name': current.name = val; break;
        case 'schedule': current.schedule = val; break;
        case 'repeat': current.repeat = val; break;
        case 'next run': current.nextRun = val; break;
        case 'last run': {
          // "2026-05-26T00:07:36.897047+08:00  ok"
          const m = val.match(/^(\S+)\s+(\S+)$/);
          if (m) {
            current.lastRun = m[1];
            current.lastResult = m[2];
          } else {
            current.lastRun = val;
          }
          break;
        }
        case 'deliver': current.deliver = val; break;
        case 'prompt': current.prompt = val; break;
      }
    }
    if (current?.id) jobs.push(current as CronJob);
    return { jobs };
  } catch (err) {
    const code = err instanceof HermesCliError ? err.code : 'UNKNOWN';
    logger.warn({ err, code }, 'hermes cron list failed');
    return { jobs: [], error: code };
  }
}

export async function cronAction(id: string, action: 'pause' | 'resume' | 'run' | 'remove'): Promise<{ ok: boolean; error?: string }> {
  try {
    await runHermesCli(['cron', action, id], { timeoutMs: 10_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}

export async function profileUse(name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runHermesCli(['profile', 'use', name], { timeoutMs: 10_000 });
    return { ok: true };
  } catch (err) {
    if (err instanceof HermesCliError) return { ok: false, error: err.code };
    throw err;
  }
}
