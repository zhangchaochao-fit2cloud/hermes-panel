import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { getPanelHome } from './hermes-home.js';

const FILE_NAME = 'pinned-sessions.json';
const MAX_PINNED = 50;

export interface PinnedSessionsState {
  ids: string[];
  updatedAt: number;
}

function filePath(): string {
  return join(getPanelHome(), FILE_NAME);
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_PINNED) break;
  }
  return ids;
}

export async function readPinnedSessions(): Promise<string[]> {
  try {
    const raw = await fsp.readFile(filePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PinnedSessionsState>;
    return normalizeIds(parsed.ids);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    return [];
  }
}

export async function writePinnedSessions(ids: string[]): Promise<string[]> {
  const normalized = normalizeIds(ids);
  const dir = getPanelHome();
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  const state: PinnedSessionsState = {
    ids: normalized,
    updatedAt: Date.now(),
  };
  const path = filePath();
  const tmp = `${path}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fsp.rename(tmp, path);
  return normalized;
}
