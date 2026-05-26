import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { getHermesHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

export interface MemoryFile {
  path: string;         // relative to hermes home, e.g. "memories/USER.md"
  size: number;
  mtime: number;
  preview?: string;
}

const MEMORY_DIR = 'memories';

function memoryRoot(): string { return join(getHermesHome(), MEMORY_DIR); }

function safePath(rel: string): string | null {
  const root = memoryRoot();
  const full = join(root, rel);
  // Prevent path traversal
  if (!full.startsWith(root + '/') && full !== root) return null;
  return full;
}

export function listMemory(): { files: MemoryFile[]; error?: string } {
  const root = memoryRoot();
  if (!existsSync(root)) {
    return { files: [], error: 'MEMORY_DIR_MISSING' };
  }
  try {
    const out: MemoryFile[] = [];
    walk(root, root, out);
    out.sort((a, b) => b.mtime - a.mtime);
    return { files: out };
  } catch (err) {
    logger.warn({ err }, 'listMemory failed');
    return { files: [], error: 'READ_FAILED' };
  }
}

function walk(root: string, dir: string, out: MemoryFile[]): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(root, full, out);
    } else if (st.isFile()) {
      const rel = relative(root, full);
      let preview: string | undefined;
      if (/\.(md|markdown|txt)$/i.test(name) && st.size < 64 * 1024) {
        try {
          const text = readFileSync(full, 'utf-8');
          preview = text.slice(0, 200);
        } catch {/* ignore */}
      }
      out.push({ path: rel, size: st.size, mtime: Math.floor(st.mtimeMs), preview });
    }
  }
}

export function readMemory(rel: string): { content: string; error?: string } {
  const full = safePath(rel);
  if (!full || !existsSync(full)) return { content: '', error: 'NOT_FOUND' };
  const st = statSync(full);
  if (!st.isFile()) return { content: '', error: 'NOT_FILE' };
  if (st.size > 1024 * 1024) return { content: '', error: 'FILE_TOO_LARGE' };
  return { content: readFileSync(full, 'utf-8') };
}

export function writeMemory(rel: string, content: string): { ok: boolean; error?: string } {
  const full = safePath(rel);
  if (!full) return { ok: false, error: 'INVALID_PATH' };
  if (content.length > 1024 * 1024) return { ok: false, error: 'CONTENT_TOO_LARGE' };
  try {
    writeFileSync(full, content, 'utf-8');
    return { ok: true };
  } catch (err) {
    logger.warn({ err, rel }, 'writeMemory failed');
    return { ok: false, error: 'WRITE_FAILED' };
  }
}

export function deleteMemory(rel: string): { ok: boolean; error?: string } {
  const full = safePath(rel);
  if (!full) return { ok: false, error: 'INVALID_PATH' };
  if (!existsSync(full)) return { ok: false, error: 'NOT_FOUND' };
  const st = statSync(full);
  if (!st.isFile()) return { ok: false, error: 'NOT_FILE' };
  try {
    unlinkSync(full);
    return { ok: true };
  } catch (err) {
    logger.warn({ err, rel }, 'deleteMemory failed');
    return { ok: false, error: 'DELETE_FAILED' };
  }
}
