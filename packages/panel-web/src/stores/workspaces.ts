import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';
import { BUILT_IN_WORKSPACES, type WorkspaceTemplate } from '@/data/workspaces';

/**
 * Hermes profile descriptor as returned by `GET /api/profiles`.
 * The set of optional fields is intentionally loose so the store does not
 * fight the BFF when extra metadata appears (e.g. gateway, alias).
 */
export interface ProfileInfo {
  name: string;
  current: boolean;
  model?: string;
  gateway?: string;
  alias?: string;
}

const ACTIVE_WORKSPACE_KEY = 'panel.activeWorkspace';

function readActiveWorkspace(): string | null {
  const v = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  if (!v) return null;
  // Guard against stale values pointing at workspaces that no longer exist.
  if (!BUILT_IN_WORKSPACES.some(w => w.id === v)) return null;
  return v;
}

export const useWorkspacesStore = defineStore('workspaces', () => {
  /** All built-in workspace templates (static data). */
  const templates = ref<readonly WorkspaceTemplate[]>(BUILT_IN_WORKSPACES);

  /** Currently active workspace id (persisted to localStorage). */
  const activeId = ref<string | null>(readActiveWorkspace());

  /** Hermes profiles loaded from the BFF. */
  const profiles = ref<ProfileInfo[]>([]);
  const loadingProfiles = ref(false);
  const switchingProfile = ref<string | null>(null);
  const error = ref<string | null>(null);

  const currentProfile = computed<ProfileInfo | null>(
    () => profiles.value.find(p => p.current) ?? null,
  );

  const activeWorkspace = computed<WorkspaceTemplate | null>(() =>
    activeId.value ? templates.value.find(w => w.id === activeId.value) ?? null : null,
  );

  function activate(id: string): void {
    if (!templates.value.some(w => w.id === id)) return;
    activeId.value = id;
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  }

  function deactivate(): void {
    activeId.value = null;
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }

  async function loadProfiles(): Promise<void> {
    loadingProfiles.value = true;
    error.value = null;
    try {
      const r = await bffFetch<{ profiles: ProfileInfo[] }>('/api/profiles');
      profiles.value = r.profiles;
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to load profiles';
    } finally {
      loadingProfiles.value = false;
    }
  }

  async function useProfile(name: string): Promise<boolean> {
    switchingProfile.value = name;
    error.value = null;
    try {
      await bffFetch<{ ok: boolean }>(
        `/api/profiles/${encodeURIComponent(name)}/use`,
        { method: 'POST' },
      );
      // Refresh to pick up the new `current` flag from authoritative source.
      await loadProfiles();
      return true;
    } catch (err) {
      error.value = (err as Error).message ?? 'failed to switch profile';
      return false;
    } finally {
      switchingProfile.value = null;
    }
  }

  return {
    // state
    templates,
    activeId,
    profiles,
    loadingProfiles,
    switchingProfile,
    error,
    // computed
    currentProfile,
    activeWorkspace,
    // actions
    activate,
    deactivate,
    loadProfiles,
    useProfile,
  };
});
