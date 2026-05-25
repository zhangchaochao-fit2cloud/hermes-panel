import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { bffFetch } from '@/api/bff';

export interface ToolInfo {
  name: string;
  enabled: boolean;
  icon?: string;
  label?: string;
  source: 'builtin' | 'mcp';
  server?: string;
}

export interface SkillInfo {
  name: string;
  category: string;
  source: string;
  trust: string;
}

export interface McpServer { name: string; configured: boolean }

export interface AvailableSkill {
  name: string;
  category?: string;
  description?: string;
  source?: string;
  installed?: boolean;
}

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<ToolInfo[]>([]);
  const skills = ref<SkillInfo[]>([]);
  const mcpServers = ref<McpServer[]>([]);
  const availableSkills = ref<AvailableSkill[]>([]);
  const availableTotal = ref(0);

  const loadingTools = ref(false);
  const loadingSkills = ref(false);
  const loadingMcp = ref(false);
  const loadingBrowse = ref(false);
  const installingSkills = ref<Set<string>>(new Set());

  const error = ref<string | null>(null);

  const enabledCount = computed(() => tools.value.filter(t => t.enabled).length);
  const totalCount = computed(() => tools.value.length);
  const skillCategories = computed(() => {
    const map = new Map<string, SkillInfo[]>();
    for (const s of skills.value) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  });

  async function loadTools(): Promise<void> {
    loadingTools.value = true;
    try {
      const r = await bffFetch<{ tools: ToolInfo[]; error?: string }>('/api/tools');
      tools.value = r.tools;
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loadingTools.value = false;
    }
  }

  async function loadSkills(): Promise<void> {
    loadingSkills.value = true;
    try {
      const r = await bffFetch<{ skills: SkillInfo[]; error?: string }>('/api/skills');
      skills.value = r.skills;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loadingSkills.value = false;
    }
  }

  async function loadMcp(): Promise<void> {
    loadingMcp.value = true;
    try {
      const r = await bffFetch<{ servers: McpServer[]; error?: string }>('/api/mcp');
      mcpServers.value = r.servers;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loadingMcp.value = false;
    }
  }

  async function browseSkills(search?: string, page = 1, pageSize = 30): Promise<void> {
    loadingBrowse.value = true;
    try {
      const params = new URLSearchParams();
      if (search?.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const r = await bffFetch<{ skills: AvailableSkill[]; total: number; error?: string }>(
        `/api/skills/browse?${params.toString()}`,
      );
      availableSkills.value = r.skills;
      availableTotal.value = r.total;
      if (r.error) error.value = r.error;
    } catch (err) {
      error.value = (err as Error).message;
      availableSkills.value = [];
      availableTotal.value = 0;
    } finally {
      loadingBrowse.value = false;
    }
  }

  async function installSkill(name: string): Promise<boolean> {
    installingSkills.value = new Set(installingSkills.value).add(name);
    try {
      await bffFetch(`/api/skills/${encodeURIComponent(name)}/install`, { method: 'POST' });
      // Reflect installed state in the cached browse list, if present
      const found = availableSkills.value.find(s => s.name === name);
      if (found) found.installed = true;
      // Refresh installed list so the "已安装" tab is up to date
      await loadSkills();
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      const next = new Set(installingSkills.value);
      next.delete(name);
      installingSkills.value = next;
    }
  }

  async function uninstallSkill(name: string): Promise<boolean> {
    installingSkills.value = new Set(installingSkills.value).add(name);
    try {
      await bffFetch(`/api/skills/${encodeURIComponent(name)}`, { method: 'DELETE' });
      const found = availableSkills.value.find(s => s.name === name);
      if (found) found.installed = false;
      await loadSkills();
      return true;
    } catch (err) {
      error.value = (err as Error).message;
      return false;
    } finally {
      const next = new Set(installingSkills.value);
      next.delete(name);
      installingSkills.value = next;
    }
  }

  async function toggleTool(name: string, enabled: boolean): Promise<boolean> {
    // Optimistic update
    const tool = tools.value.find(t => t.name === name);
    if (tool) tool.enabled = enabled;
    try {
      await bffFetch(`/api/tools/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      return true;
    } catch (err) {
      // Revert on error
      if (tool) tool.enabled = !enabled;
      error.value = (err as Error).message;
      return false;
    }
  }

  return {
    tools, skills, mcpServers, availableSkills, availableTotal,
    loadingTools, loadingSkills, loadingMcp, loadingBrowse, installingSkills,
    error,
    enabledCount, totalCount, skillCategories,
    loadTools, loadSkills, loadMcp, toggleTool,
    browseSkills, installSkill, uninstallSkill,
  };
});
