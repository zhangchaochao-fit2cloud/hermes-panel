import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';
import { buildTree, filterFiles, type MemoryFile, type TreeNode } from '@/utils/tree-helpers';

interface ListResponse {
  files: MemoryFile[];
  error?: string;
}

interface FileResponse {
  content: string;
  path: string;
}

export const useMemoryStore = defineStore('memory', () => {
  // ---- list ----
  const files = ref<MemoryFile[]>([]);
  const listError = ref<string | null>(null);
  const listErrorCode = ref<string | null>(null);
  const listLoading = ref(false);
  const initialized = ref(false);

  // ---- selection / content ----
  const currentPath = ref<string | null>(null);
  const currentContent = ref<string>(''); // last loaded-from-server snapshot
  const draftContent = ref<string>('');   // local editor buffer
  const loadingFile = ref(false);
  const fileError = ref<string | null>(null);

  // ---- save state ----
  const saving = ref(false);

  // ---- search ----
  const search = ref('');

  // ---- derived ----
  const dirty = computed(() => currentPath.value !== null && draftContent.value !== currentContent.value);

  const filteredFiles = computed<MemoryFile[]>(() => filterFiles(files.value, search.value));
  const tree = computed<TreeNode[]>(() => buildTree(filteredFiles.value));

  const currentFile = computed<MemoryFile | null>(() => {
    if (!currentPath.value) return null;
    return files.value.find(f => f.path === currentPath.value) ?? null;
  });

  // ---- actions ----
  async function loadList(): Promise<void> {
    listLoading.value = true;
    listError.value = null;
    listErrorCode.value = null;
    try {
      const r = await bffFetch<ListResponse>('/api/memory');
      files.value = r.files ?? [];
      if (r.error) {
        listErrorCode.value = r.error;
      }
    } catch (err) {
      const e = err as BffApiError;
      listError.value = e.message;
      listErrorCode.value = e.code;
    } finally {
      listLoading.value = false;
      initialized.value = true;
    }
  }

  async function openFile(path: string): Promise<void> {
    // No-op when re-selecting the same file (avoid wiping draft)
    if (currentPath.value === path && !fileError.value) return;
    loadingFile.value = true;
    fileError.value = null;
    try {
      const r = await bffFetch<FileResponse>(
        `/api/memory/file?path=${encodeURIComponent(path)}`,
      );
      currentPath.value = path;
      currentContent.value = r.content;
      draftContent.value = r.content;
    } catch (err) {
      fileError.value = (err as Error).message;
    } finally {
      loadingFile.value = false;
    }
  }

  async function save(): Promise<boolean> {
    if (!currentPath.value) return false;
    saving.value = true;
    try {
      await bffFetch<{ ok: true }>('/api/memory/file', {
        method: 'PUT',
        body: JSON.stringify({ path: currentPath.value, content: draftContent.value }),
      });
      currentContent.value = draftContent.value;
      // refresh list to reflect new mtime/size
      const path = currentPath.value;
      await loadList();
      // openFile would no-op since path unchanged — keep draft as-is
      // but refresh the stored mtime via filteredFiles/currentFile (already computed)
      currentPath.value = path;
      return true;
    } catch (err) {
      fileError.value = (err as Error).message;
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function createFile(path: string): Promise<{ ok: boolean; error?: string }> {
    // Reject paths that already exist (we don't want to silently overwrite a
    // real memory file via the "new" Modal).
    const exists = files.value.some(f => f.path === path);
    if (exists) return { ok: false, error: 'EXISTS' };
    try {
      await bffFetch<{ ok: true }>('/api/memory/file', {
        method: 'PUT',
        body: JSON.stringify({ path, content: '' }),
      });
      await loadList();
      await openFile(path);
      return { ok: true };
    } catch (err) {
      const e = err as BffApiError;
      return { ok: false, error: e.code ?? e.message };
    }
  }

  async function deleteFile(path: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await bffFetch<{ ok: true }>(
        `/api/memory/file?path=${encodeURIComponent(path)}`,
        { method: 'DELETE' },
      );
      // If we just deleted the currently-open file, clear selection
      if (currentPath.value === path) {
        currentPath.value = null;
        currentContent.value = '';
        draftContent.value = '';
      }
      await loadList();
      return { ok: true };
    } catch (err) {
      const e = err as BffApiError;
      return { ok: false, error: e.code ?? e.message };
    }
  }

  function setDraft(v: string): void {
    draftContent.value = v;
  }

  function discardDraft(): void {
    draftContent.value = currentContent.value;
  }

  function reset(): void {
    files.value = [];
    currentPath.value = null;
    currentContent.value = '';
    draftContent.value = '';
    search.value = '';
    initialized.value = false;
    listError.value = null;
    listErrorCode.value = null;
    fileError.value = null;
  }

  return {
    // state
    files, search,
    currentPath, currentContent, draftContent,
    listLoading, listError, listErrorCode, initialized,
    loadingFile, fileError,
    saving,
    // computed
    dirty, filteredFiles, tree, currentFile,
    // actions
    loadList, openFile, save, createFile, deleteFile, setDraft, discardDraft, reset,
  };
});
