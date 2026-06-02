<script setup lang="ts">
/**
 * Template Marketplace modal — browse community-shared prompt templates
 * and import them into the local prompt-templates store.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NModal, NCard, NButton, NInput, NTag, useMessage } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import { usePromptTemplatesStore } from '@/stores/prompt-templates';

interface MarketTemplate {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
}

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>();

const { t } = useI18n();
const message = useMessage();
const store = usePromptTemplatesStore();

const templates = ref<MarketTemplate[]>([]);
const categories = ref<string[]>([]);
const loading = ref(false);
const search = ref('');
const activeCategory = ref('');
const importedIds = ref<Set<string>>(new Set());

async function fetchTemplates(): Promise<void> {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (activeCategory.value) params.set('category', activeCategory.value);
    if (search.value.trim()) params.set('q', search.value.trim());
    const qs = params.toString();
    templates.value = await bffFetch<MarketTemplate[]>(`/api/template-market${qs ? '?' + qs : ''}`);
  } catch { templates.value = []; }
  finally { loading.value = false; }
}

async function fetchCategories(): Promise<void> {
  try { categories.value = await bffFetch<string[]>('/api/template-market/categories'); }
  catch { categories.value = []; }
}

function isImported(id: string): boolean {
  return importedIds.value.has(id) || store.all.some(t => t.id === `market_${id}`);
}

function doImport(tpl: MarketTemplate): void {
  store.add(tpl.title, tpl.content);
  importedIds.value.add(tpl.id);
  message.success(t('promptTemplates.added'));
}

const filtered = computed(() => templates.value);

watch(() => props.show, (v) => {
  if (v) { fetchCategories(); fetchTemplates(); }
});

watch([search, activeCategory], () => { fetchTemplates(); });
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)">
    <NCard
      :title="t('promptTemplates.marketplace')"
      style="width: min(640px, 92vw); max-height: 80vh; display: flex; flex-direction: column;"
      :bordered="false"
      closable
      @close="emit('update:show', false)"
    >
      <!-- Search -->
      <div class="mb-3">
        <NInput
          v-model:value="search"
          :placeholder="t('promptTemplates.searchMarket')"
          clearable
          size="small"
        />
      </div>

      <!-- Category filter -->
      <div class="flex flex-wrap gap-1.5 mb-3">
        <NTag
          :type="activeCategory === '' ? 'primary' : 'default'"
          size="small"
          class="cursor-pointer"
          @click="activeCategory = ''"
        >
          {{ t('promptTemplates.allCategories') }}
        </NTag>
        <NTag
          v-for="cat in categories"
          :key="cat"
          :type="activeCategory === cat ? 'primary' : 'default'"
          size="small"
          class="cursor-pointer"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </NTag>
      </div>

      <!-- Template list -->
      <div class="flex-1 overflow-y-auto min-h-0" style="max-height: 50vh;">
        <div v-if="loading" class="text-center py-8 text-[var(--text-3)]">
          {{ t('common.loading') }}
        </div>
        <div v-else-if="filtered.length === 0" class="text-center py-8 text-[var(--text-3)]">
          {{ t('promptTemplates.noMarketResults') }}
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="tpl in filtered"
            :key="tpl.id"
            class="border border-[var(--border)] rounded-lg p-3 hover:bg-[var(--bg-elevate)] transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-[var(--text-1)] truncate">{{ tpl.title }}</div>
                <div class="text-xs text-[var(--text-3)] mt-0.5">
                  {{ t('promptTemplates.author') }}: {{ tpl.author }}
                  · {{ t('promptTemplates.downloads', { n: tpl.downloads }) }}
                  · {{ t('promptTemplates.rating', { n: tpl.rating }) }}
                </div>
              </div>
              <NButton
                v-if="isImported(tpl.id)"
                size="tiny"
                disabled
              >
                {{ t('promptTemplates.imported') }}
              </NButton>
              <NButton
                v-else
                size="tiny"
                type="primary"
                @click="doImport(tpl)"
              >
                {{ t('promptTemplates.import') }}
              </NButton>
            </div>
            <div class="text-xs text-[var(--text-2)] mt-1.5 line-clamp-2">{{ tpl.content }}</div>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <NTag v-for="tag in tpl.tags" :key="tag" size="tiny" :bordered="false">{{ tag }}</NTag>
            </div>
          </div>
        </div>
      </div>
    </NCard>
  </NModal>
</template>
