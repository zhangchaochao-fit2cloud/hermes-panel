import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { bffFetch } from '@/api/bff';
import type { PluginMarketItem } from '@/components/plugins/PluginCard.vue';

interface MarketplaceResponse {
  plugins: Array<{
    name: string;
    description: string;
    version: string;
    author: string;
    category: string;
    icon: string;
    installs: number;
    rating: number;
    source: string;
  }>;
}

export const usePluginMarketStore = defineStore('plugin-market', () => {
  const plugins = ref<PluginMarketItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const categories = computed(() => {
    const cats = new Set(plugins.value.map(p => p.category));
    return ['all', ...Array.from(cats)];
  });

  const totalPlugins = computed(() => plugins.value.length);

  async function fetchMarketplace(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await bffFetch<MarketplaceResponse>('/api/plugin-market');
      plugins.value = r.plugins;
    } catch {
      plugins.value = getMockPlugins();
    } finally {
      loading.value = false;
    }
  }

  function getMockPlugins(): PluginMarketItem[] {
    return [
      {
        name: 'hermes-plugin-chrome-profiles',
        description: 'Manage Chrome browser profiles for automated browsing and context switching',
        version: '1.2.0',
        author: 'anpicasso',
        category: 'tool',
        icon: '🌐',
        installs: 12500,
        rating: 4.7,
        installed: false,
        source: 'anpicasso/hermes-plugin-chrome-profiles',
      },
      {
        name: 'hermes-plugin-ollama',
        description: 'Connect to local Ollama models for free inference',
        version: '2.0.1',
        author: 'hermes-ai',
        category: 'ai-model',
        icon: '🦙',
        installs: 28900,
        rating: 4.9,
        installed: false,
        source: 'hermes-ai/hermes-plugin-ollama',
      },
      {
        name: 'hermes-plugin-github',
        description: 'GitHub integration for issue tracking, PR management, and CI/CD monitoring',
        version: '1.5.3',
        author: 'hermes-ai',
        category: 'tool',
        icon: '🐙',
        installs: 45200,
        rating: 4.8,
        installed: false,
        source: 'hermes-ai/hermes-plugin-github',
      },
      {
        name: 'hermes-plugin-slack',
        description: 'Send notifications and receive commands via Slack workspace',
        version: '1.1.0',
        author: 'hermes-ai',
        category: 'tool',
        icon: '💬',
        installs: 18700,
        rating: 4.5,
        installed: false,
        source: 'hermes-ai/hermes-plugin-slack',
      },
      {
        name: 'hermes-plugin-theme-dark',
        description: 'Advanced dark theme with OLED optimization and customizable accents',
        version: '1.0.2',
        author: 'community',
        category: 'theme',
        icon: '🎨',
        installs: 9400,
        rating: 4.6,
        installed: false,
        source: 'community/hermes-plugin-theme-dark',
      },
      {
        name: 'hermes-plugin-sqlite',
        description: 'SQLite database access for local data storage and querying',
        version: '1.3.1',
        author: 'hermes-ai',
        category: 'tool',
        icon: '🗄️',
        installs: 15600,
        rating: 4.4,
        installed: false,
        source: 'hermes-ai/hermes-plugin-sqlite',
      },
      {
        name: 'hermes-plugin-canvas',
        description: 'HTML Canvas rendering for data visualization and diagram generation',
        version: '0.9.0',
        author: 'experimental',
        category: 'other',
        icon: '🖼️',
        installs: 3200,
        rating: 4.1,
        installed: false,
        source: 'experimental/hermes-plugin-canvas',
      },
      {
        name: 'hermes-plugin-openai',
        description: 'OpenAI GPT-4 and GPT-3.5 Turbo integration for enhanced reasoning',
        version: '2.1.0',
        author: 'hermes-ai',
        category: 'ai-model',
        icon: '🤖',
        installs: 52100,
        rating: 4.8,
        installed: false,
        source: 'hermes-ai/hermes-plugin-openai',
      },
    ];
  }

  function markInstalled(name: string): void {
    const p = plugins.value.find(i => i.name === name);
    if (p) p.installed = true;
  }

  function markUninstalled(name: string): void {
    const p = plugins.value.find(i => i.name === name);
    if (p) p.installed = false;
  }

  return {
    plugins,
    loading,
    error,
    categories,
    totalPlugins,
    fetchMarketplace,
    markInstalled,
    markUninstalled,
  };
});
