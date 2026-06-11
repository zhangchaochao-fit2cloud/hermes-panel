import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';

export interface TemplateItem {
  id: string;
  title: string;
  content: string;
  author?: string;
  category: string;
  tags: string[];
  downloads?: number;
  rating?: number;
  source?: string;
  createdAt?: number;
  updatedAt?: number;
}

export const useTemplateMarketStore = defineStore('templateMarket', () => {
  const builtin = ref<TemplateItem[]>([]);
  const community = ref<TemplateItem[]>([]);
  const user = ref<TemplateItem[]>([]);
  const loading = ref(false);
  const categories = ref<string[]>([]);

  async function fetchAll(q?: string, category?: string): Promise<void> {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      const qs = params.toString();
      const [b, c, u] = await Promise.all([
        bffFetch<TemplateItem[]>(`/api/templates${qs ? '?' + qs : ''}`),
        bffFetch<TemplateItem[]>(`/api/templates/community${qs ? '?' + qs : ''}`),
        bffFetch<TemplateItem[]>('/api/templates/user'),
      ]);
      builtin.value = b;
      community.value = c;
      user.value = u;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCategories(): Promise<void> {
    categories.value = await bffFetch<string[]>('/api/templates/categories');
  }

  async function create(data: { title: string; content: string; category?: string; tags?: string[] }): Promise<TemplateItem> {
    const tpl = await bffFetch<TemplateItem>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    user.value.unshift(tpl);
    return tpl;
  }

  async function update(id: string, data: { title?: string; content?: string; category?: string; tags?: string[] }): Promise<TemplateItem> {
    const tpl = await bffFetch<TemplateItem>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const idx = user.value.findIndex(t => t.id === id);
    if (idx !== -1) user.value[idx] = tpl;
    return tpl;
  }

  async function remove(id: string): Promise<void> {
    await bffFetch(`/api/templates/${id}`, { method: 'DELETE' });
    user.value = user.value.filter(t => t.id !== id);
  }

  async function fork(id: string): Promise<TemplateItem> {
    const tpl = await bffFetch<TemplateItem>(`/api/templates/${id}/fork`, { method: 'POST' });
    user.value.unshift(tpl);
    return tpl;
  }

  return { builtin, community, user, loading, categories, fetchAll, fetchCategories, create, update, remove, fork };
});
