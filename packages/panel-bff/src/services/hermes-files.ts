import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { getHermesHome, getPanelHome } from './hermes-home.js';
import { logger } from '../lib/logger.js';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  children?: FileEntry[];
}

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.vue': 'vue',
  '.svelte': 'html',
  '.json': 'json',
  '.jsonc': 'jsonc',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.styl': 'stylus',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.sql': 'sql',
  '.xml': 'xml',
  '.svg': 'xml',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.pl': 'perl',
  '.lua': 'lua',
  '.r': 'r',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'protobuf',
  '.sass': 'scss',
  '.dockerfile': 'dockerfile',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.env': 'dotenv',
  '.editorconfig': 'ini',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  '.gitignore': 'plaintext',
  '.dockerignore': 'plaintext',
};

function getAllowedRoots(): string[] {
  return [
    join(getHermesHome(), 'workspaces'),
    getPanelHome(),
  ];
}

function safePath(requested: string): string | null {
  if (requested.includes('..')) return null;
  const roots = getAllowedRoots();
  for (const root of roots) {
    const full = join(root, requested);
    if (full.startsWith(root + '/') || full === root) {
      if (existsSync(full)) return full;
    }
  }
  return null;
}

function resolveWritePath(requested: string): string | null {
  if (requested.includes('..')) return null;
  const roots = getAllowedRoots();
  for (const root of roots) {
    const full = join(root, requested);
    if (full.startsWith(root + '/') || full === root) {
      return full;
    }
  }
  return null;
}

export function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [ext, lang] of Object.entries(LANGUAGE_MAP)) {
    if (lower.endsWith(ext)) return lang;
  }
  return 'plaintext';
}

export function listFiles(dirPath?: string): { tree: FileEntry[]; error?: string } {
  const roots = getAllowedRoots();

  if (dirPath) {
    const resolved = safePath(dirPath);
    if (!resolved) {
      return { tree: [], error: 'INVALID_PATH' };
    }
  }

  const root = dirPath
    ? safePath(dirPath)
    : (existsSync(roots[0]) ? roots[0] : roots[1]);
  if (!root || !existsSync(root)) {
    return { tree: [], error: 'DIR_NOT_FOUND' };
  }

  try {
    const tree = walk(root);
    return { tree };
  } catch (err) {
    logger.warn({ err }, 'listFiles failed');
    return { tree: [], error: 'READ_FAILED' };
  }
}

function walk(dir: string): FileEntry[] {
  const entries: FileEntry[] = [];
  try {
    const names = readdirSync(dir);
    for (const name of names) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }

      if (st.isDirectory()) {
        entries.push({
          name,
          path: relative(getAllowedRoots()[0], full),
          type: 'directory',
          modifiedAt: Math.floor(st.mtimeMs),
          children: walk(full),
        });
      } else if (st.isFile()) {
        entries.push({
          name,
          path: relative(getAllowedRoots()[0], full),
          type: 'file',
          size: st.size,
          modifiedAt: Math.floor(st.mtimeMs),
        });
      }
    }
  } catch { /* ignore */ }
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

export function readFile(requested: string): { path: string; content: string; size: number; language: string; error?: string } {
  const full = safePath(requested);
  if (!full) return { path: requested, content: '', size: 0, language: 'plaintext', error: 'NOT_FOUND' };
  const st = statSync(full);
  if (!st.isFile()) return { path: requested, content: '', size: 0, language: 'plaintext', error: 'NOT_FILE' };
  if (st.size > 10 * 1024 * 1024) return { path: requested, content: '', size: st.size, language: 'plaintext', error: 'FILE_TOO_LARGE' };
  const content = readFileSync(full, 'utf-8');
  const language = detectLanguage(requested);
  return { path: requested, content, size: st.size, language };
}

export function writeFileContent(requested: string, content: string): { ok: boolean; error?: string } {
  const full = resolveWritePath(requested);
  if (!full) return { ok: false, error: 'INVALID_PATH' };
  if (content.length > 10 * 1024 * 1024) return { ok: false, error: 'CONTENT_TOO_LARGE' };
  try {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf-8');
    return { ok: true };
  } catch (err) {
    logger.warn({ err, path: requested }, 'writeFile failed');
    return { ok: false, error: 'WRITE_FAILED' };
  }
}
