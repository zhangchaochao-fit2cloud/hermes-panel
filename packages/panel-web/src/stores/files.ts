import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch, BffApiError } from '@/api/bff';
import type { FileEntry } from '@/utils/files-tree';

interface ReadResponse {
  path: string;
  content: string;
  size: number;
  language: string;
}

interface TreeResponse {
  tree: FileEntry[];
  error?: string;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  size: number;
}

export const useFilesStore = defineStore('files', () => {
  const fileTree = ref<FileEntry[]>([]);
  const openTabs = ref<OpenTab[]>([]);
  const activePath = ref<string | null>(null);
  const treeLoading = ref(false);
  const treeError = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);

  const activeTab = computed<OpenTab | null>(() => {
    if (!activePath.value) return null;
    return openTabs.value.find(t => t.path === activePath.value) ?? null;
  });

  const currentContent = computed(() => activeTab.value?.content ?? '');
  const currentLanguage = computed(() => activeTab.value?.language ?? 'plaintext');

  const dirty = computed(() => {
    const tab = activeTab.value;
    return tab ? tab.content !== tab.originalContent : false;
  });

  const dirtyPaths = computed(() => {
    const s = new Set<string>();
    for (const t of openTabs.value) {
      if (t.content !== t.originalContent) s.add(t.path);
    }
    return s;
  });

  async function loadTree(dirPath?: string): Promise<void> {
    treeLoading.value = true;
    treeError.value = null;
    try {
      const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
      const r = await bffFetch<TreeResponse>(`/api/files/tree${params}`);
      fileTree.value = r.tree ?? [];
      if (r.error) treeError.value = r.error;
    } catch (err) {
      const e = err as BffApiError;
      treeError.value = e.message;
      fileTree.value = [];
    } finally {
      treeLoading.value = false;
    }
  }

  async function openFile(path: string): Promise<void> {
    const existing = openTabs.value.find(t => t.path === path);
    if (existing) {
      activePath.value = path;
      return;
    }

    try {
      const r = await bffFetch<ReadResponse>(
        `/api/files/read?path=${encodeURIComponent(path)}`,
      );
      const name = path.split('/').pop() ?? path;
      openTabs.value.push({
        path,
        name,
        content: r.content,
        originalContent: r.content,
        language: r.language,
        size: r.size,
      });
      activePath.value = path;
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }

  function closeTab(path: string): void {
    const idx = openTabs.value.findIndex(t => t.path === path);
    if (idx === -1) return;
    openTabs.value.splice(idx, 1);

    if (activePath.value === path) {
      if (openTabs.value.length > 0) {
        const next = Math.min(idx, openTabs.value.length - 1);
        activePath.value = openTabs.value[next].path;
      } else {
        activePath.value = null;
      }
    }
  }

  async function saveFile(path: string): Promise<boolean> {
    const tab = openTabs.value.find(t => t.path === path);
    if (!tab || tab.content === tab.originalContent) return true;

    saving.value = true;
    saveError.value = null;
    try {
      await bffFetch<{ ok: true }>('/api/files/write', {
        method: 'PUT',
        body: JSON.stringify({ path, content: tab.content }),
      });
      tab.originalContent = tab.content;
      // Refresh tree to reflect updated mtime/size
      await loadTree();
      return true;
    } catch (err) {
      const e = err as BffApiError;
      saveError.value = e.message;
      return false;
    } finally {
      saving.value = false;
    }
  }

  function updateContent(path: string, content: string): void {
    const tab = openTabs.value.find(t => t.path === path);
    if (tab) tab.content = content;
  }

  function reset(): void {
    fileTree.value = [];
    openTabs.value = [];
    activePath.value = null;
    treeLoading.value = false;
    treeError.value = null;
    saveError.value = null;
  }

  return {
    fileTree, openTabs, activePath, treeLoading, treeError,
    saving, saveError,
    activeTab, currentContent, currentLanguage, dirty, dirtyPaths,
    loadTree, openFile, closeTab, saveFile, updateContent, reset,
  };
});
