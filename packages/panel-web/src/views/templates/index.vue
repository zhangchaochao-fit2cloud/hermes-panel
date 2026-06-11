<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { NButton, NInput, NSelect, NSpin, useMessage } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTemplateMarketStore } from '@/stores/template-market';
import TemplateCard from '@/components/templates/TemplateCard.vue';
import TemplateEditor from '@/components/templates/TemplateEditor.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import ErrorBanner from '@/components/shared/ErrorBanner.vue';

const { t } = useI18n();
const msg = useMessage();
const router = useRouter();
const store = useTemplateMarketStore();

const search = ref('');
const categoryFilter = ref<string | null>(null);
const activeTab = ref<'builtin' | 'community' | 'mine'>('builtin');
const editorOpen = ref(false);
const editingId = ref<string | undefined>();
const editingTitle = ref('');
const editingContent = ref('');
const editingCategory = ref('');
const editingTags = ref<string[]>([]);

const tabs = computed(() => [
  { key: 'builtin' as const, label: t('templates.tabBuiltin') },
  { key: 'community' as const, label: t('templates.tabCommunity') },
  { key: 'mine' as const, label: t('templates.tabMine') },
]);

const categoryOptions = computed(() => {
  const cats = [...new Set([
    ...store.builtin.map(t => t.category),
    ...store.community.map(t => t.category),
  ])];
  return cats.map(c => ({ label: c, value: c }));
});

const displayList = computed(() => {
  switch (activeTab.value) {
    case 'builtin': return store.builtin;
    case 'community': return store.community;
    case 'mine': return store.user;
    default: return [];
  }
});

const filteredList = computed(() => {
  let list = displayList.value;
  if (categoryFilter.value) list = list.filter(t => t.category === categoryFilter.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.includes(q)),
    );
  }
  return list;
});

onMounted(async () => {
  await Promise.all([store.fetchAll(), store.fetchCategories()]);
});

async function handleSearch(): Promise<void> {
  await store.fetchAll(search.value || undefined, categoryFilter.value ?? undefined);
}

function handleUse(content: string): void {
  navigator.clipboard.writeText(content).then(() => {
    msg.success(t('templates.copied'));
  }).catch(() => {
    msg.info(t('templates.copyManual'));
  });
}

async function handleFork(id: string): Promise<void> {
  try {
    await store.fork(id);
    msg.success(t('templates.forked'));
    activeTab.value = 'mine';
  } catch (err) {
    msg.error(t('templates.forkFailed'));
  }
}

function handleEdit(id: string): void {
  const tpl = store.user.find(t => t.id === id);
  if (!tpl) return;
  editingId.value = tpl.id;
  editingTitle.value = tpl.title;
  editingContent.value = tpl.content;
  editingCategory.value = tpl.category;
  editingTags.value = [...tpl.tags];
  editorOpen.value = true;
}

async function handleDelete(id: string): Promise<void> {
  try {
    await store.remove(id);
    msg.success(t('templates.deleted'));
  } catch {
    msg.error(t('templates.deleteFailed'));
  }
}

function openCreate(): void {
  editingId.value = undefined;
  editingTitle.value = '';
  editingContent.value = '';
  editingCategory.value = 'custom';
  editingTags.value = [];
  editorOpen.value = true;
}

async function handleSave(data: { title: string; content: string; category: string; tags: string[] }): Promise<void> {
  try {
    if (editingId.value) {
      await store.update(editingId.value, data);
      msg.success(t('templates.updated'));
    } else {
      await store.create(data);
      msg.success(t('templates.created'));
      activeTab.value = 'mine';
    }
  } catch {
    msg.error(t('templates.saveFailed'));
  }
}
</script>

<template>
  <ViewErrorBoundary name="templates">
    <div class="templates-page px-6 py-6 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">{{ t('templates.title') }}</h2>
          <p class="text-sm text-[var(--text-3)]">{{ t('templates.subtitle') }}</p>
        </div>
        <NButton type="primary" @click="openCreate">{{ t('templates.create') }}</NButton>
      </div>

      <div class="flex items-center gap-3 mb-5">
        <NInput
          v-model:value="search"
          :placeholder="t('templates.searchPlaceholder')"
          class="max-w-xs"
          clearable
          @keydown.enter="handleSearch"
        />
        <NSelect
          v-model:value="categoryFilter"
          :options="categoryOptions"
          :placeholder="t('templates.allCategories')"
          class="max-w-[200px]"
          clearable
          @update:value="handleSearch"
        />
      </div>

      <div class="flex gap-1 mb-5 border-b border-[var(--border)]">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-2 text-sm font-medium transition-colors -mb-px"
          :class="activeTab === tab.key
            ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
            : 'text-[var(--text-3)] hover:text-[var(--text-1)]'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.key === 'mine' && store.user.length" class="ml-1 text-xs opacity-60">({{ store.user.length }})</span>
        </button>
      </div>

      <div v-if="store.loading" class="py-16 flex justify-center">
        <NSpin size="large" />
      </div>
      <div v-else-if="filteredList.length === 0" class="py-16">
        <EmptyState :title="t('templates.emptyTitle')" :description="t('templates.emptyDescription')" icon="📋" />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TemplateCard
          v-for="tpl in filteredList"
          :key="tpl.id"
          v-bind="tpl"
          :is-user="activeTab === 'mine'"
          @use="handleUse"
          @fork="handleFork"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <TemplateEditor
        v-model:open="editorOpen"
        :template-id="editingId"
        :initial-title="editingTitle"
        :initial-content="editingContent"
        :initial-category="editingCategory"
        :initial-tags="editingTags"
        @save="handleSave"
      />
    </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.templates-page { min-height: calc(100vh - 140px); }
</style>
