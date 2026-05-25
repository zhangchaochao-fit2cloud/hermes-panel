/**
 * Tree helpers for the memory file browser.
 *
 * Converts flat file lists (paths like "USER.md", "projects/cmdb.md") returned
 * by the BFF into a nested tree structure suitable for hierarchical rendering.
 *
 * Notes:
 * - We use forward-slash paths (BFF normalizes via Node's path.relative which on
 *   Windows would produce backslashes; the tree helper accepts either).
 * - File nodes carry their original MemoryFile payload so callers can render
 *   size / mtime / preview tooltips without a second lookup.
 * - Directory nodes carry an aggregate mtime (max of descendant files) so the
 *   tree can sort folders by recency alongside files.
 */

export interface MemoryFile {
  path: string;
  size: number;
  mtime: number;
  preview?: string;
}

export type TreeNode = FileNode | DirNode;

export interface FileNode {
  kind: 'file';
  /** Display name (last segment of the path). */
  name: string;
  /** Full relative path identifier — stable, used as v-for key. */
  path: string;
  file: MemoryFile;
}

export interface DirNode {
  kind: 'dir';
  /** Display name (last segment of the path). */
  name: string;
  /** Full relative path identifier (also used as expand-key). */
  path: string;
  /** Max mtime among descendants — drives "newest first" sort. */
  mtime: number;
  children: TreeNode[];
}

const SEP_RE = /[/\\]/;

/**
 * Build a nested tree from a flat list of memory files.
 * Children are sorted: directories first, then by mtime desc, then name asc.
 */
export function buildTree(files: MemoryFile[]): TreeNode[] {
  // We accumulate dir aggregates in a flat map keyed by full path. Each dir
  // owns a children map (path -> node) so we can attach descendants in any
  // order without re-walking.
  interface DirShell {
    kind: 'dir';
    name: string;
    path: string;
    mtime: number;
    children: Map<string, TreeNode | DirShell>;
  }
  const root: DirShell = {
    kind: 'dir',
    name: '',
    path: '',
    mtime: 0,
    children: new Map(),
  };

  for (const f of files) {
    const parts = f.path.split(SEP_RE).filter(Boolean);
    if (parts.length === 0) continue;

    let cur: DirShell = root;
    // Walk all directory segments
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      const dirPath = parts.slice(0, i + 1).join('/');
      let child = cur.children.get(segment);
      if (!child || child.kind !== 'dir') {
        const next: DirShell = {
          kind: 'dir',
          name: segment,
          path: dirPath,
          mtime: 0,
          children: new Map(),
        };
        cur.children.set(segment, next);
        child = next;
      }
      // Update mtime on the way down — directory recency = max of files inside.
      if (f.mtime > (child as DirShell).mtime) (child as DirShell).mtime = f.mtime;
      cur = child as DirShell;
    }

    const leafName = parts[parts.length - 1];
    const fileNode: FileNode = {
      kind: 'file',
      name: leafName,
      path: f.path,
      file: f,
    };
    cur.children.set(leafName, fileNode);
  }

  // Convert shells to final TreeNode arrays with stable sort
  function finalize(shell: DirShell): TreeNode[] {
    const arr: TreeNode[] = [];
    for (const c of shell.children.values()) {
      if ((c as DirShell).kind === 'dir' && (c as DirShell).children instanceof Map) {
        const ds = c as DirShell;
        arr.push({
          kind: 'dir',
          name: ds.name,
          path: ds.path,
          mtime: ds.mtime,
          children: finalize(ds),
        });
      } else {
        arr.push(c as TreeNode);
      }
    }
    arr.sort((a, b) => {
      // Directories first
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      const am = a.kind === 'dir' ? a.mtime : a.file.mtime;
      const bm = b.kind === 'dir' ? b.mtime : b.file.mtime;
      if (am !== bm) return bm - am; // newer first
      return a.name.localeCompare(b.name);
    });
    return arr;
  }

  return finalize(root);
}

/** Case-insensitive substring matcher across path + preview. */
export function matchesQuery(file: MemoryFile, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (file.path.toLowerCase().includes(q)) return true;
  if (file.preview && file.preview.toLowerCase().includes(q)) return true;
  return false;
}

/** Filter flat list by query (case-insensitive over path + preview). */
export function filterFiles(files: MemoryFile[], query: string): MemoryFile[] {
  const q = query.trim();
  if (!q) return files;
  return files.filter(f => matchesQuery(f, q));
}

/** Pretty-print a byte count (B / KB / MB). */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Walk the tree depth-first, yielding every node — useful for tests / lookups. */
export function* walkTree(nodes: TreeNode[]): Generator<TreeNode> {
  for (const n of nodes) {
    yield n;
    if (n.kind === 'dir') yield* walkTree(n.children);
  }
}
