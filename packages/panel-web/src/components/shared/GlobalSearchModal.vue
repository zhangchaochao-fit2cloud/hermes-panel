<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { NModal, NInput, NScrollbar, NSpin, NEmpty } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { bffFetch } from '@/api/bff';

interface SearchResult {
  id: number;
  session_id: string;
  role: string;
  snippet: string;
  timestamp: number;
  session_title: string | null;
}

const router = useRouter();
const { t } = useI18n();

const open = ref(false);
const query = ref('');
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const selectedIndex = ref(0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleKeydown(e: KeyboardEvent): void {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

watch(open, (v) => {
  if (!v) { query.value = ''; results.value = []; selectedIndex.value = 0; }
});

watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  const trimmed = q.trim();
  if (trimmed.length < 2) { results.value = []; loading.value = false; return; }
  loading.value = true;
  debounceTimer = setTimeout(() => void doSearch(trimmed), 300);
});

async function doSearch(q: string): Promise<void> {
  try {
    const data = await bffFetch<{ results: SearchResult[] }>(
      `/api/search/messages?q=${encodeURIComponent(q)}&limit=30`,
      { silent: true },
    );
    results.value = data.results;
    selectedIndex.value = 0;
  } catch {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function openSession(sessionId: string): void {
  open.value = false;
  void router.push(`/chat?resume=${sessionId}`);
}

function handleResultKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
  } else if (e.key === 'Enter' && results.value.length > 0) {
    e.preventDefault();
    openSession(results.value[selectedIndex.value].session_id);
  }
}

function highlightSnippet(text: string): string {
  const q = query.value.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="search-highlight">$1</mark>',
  );
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

const roleIcon: Record<string, string> = {
  user: '👤',
  assistant: '🤖',
  system: '⚙️',
  tool: '🔧',
};

const statusText = computed(() => {
  const trimmed = query.value.trim();
  if (trimmed.length > 0 && trimmed.length < 2) return t('search.minChars');
  if (!loading.value && trimmed.length >= 2 && results.value.length === 0) return t('search.noResults');
  if (results.value.length > 0) return t('search.resultCount', { count: results.value.length });
  return '';
});
</script>

<template>
  <NModal
    v-model:show="open"
    preset="card"
    :title="t('search.title')"
    :bordered="false"
    :auto-focus="true"
    style="width: 640px; max-width: 90vw;"
    @after-enter="() => {}"
  >
    <div class="global-search" @keydown="handleResultKeydown">
      <NInput
        v-model:value="query"
        :placeholder="t('search.placeholder')"
        clearable
        size="large"
        autofocus
      />
      <div v-if="statusText" class="search-status">{{ statusText }}</div>
      <NSpin :show="loading" size="small">
        <NScrollbar style="max-height: 400px;" class="search-results">
          <NEmpty v-if="!loading && query.trim().length >= 2 && results.length === 0" />
          <div
            v-for="(item, idx) in results"
            :key="item.id"
            class="search-result-item"
            :class="{ active: idx === selectedIndex }"
            @click="openSession(item.session_id)"
            @mouseenter="selectedIndex = idx"
          >
            <div class="result-header">
              <span class="result-role">{{ roleIcon[item.role] || '💬' }}</span>
              <span class="result-session">{{ item.session_title || item.session_id }}</span>
              <span class="result-time">{{ formatTime(item.timestamp) }}</span>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="result-snippet" v-html="highlightSnippet(item.snippet)" />
          </div>
        </NScrollbar>
      </NSpin>
    </div>
  </NModal>
</template>

<style scoped>
.global-search {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search-status {
  font-size: 12px;
  color: var(--text-secondary, #888);
}
.search-results {
  margin-top: 4px;
}
.search-result-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-result-item:hover,
.search-result-item.active {
  background: var(--hover-color, rgba(128, 128, 128, 0.08));
}
.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.result-role {
  font-size: 14px;
}
.result-session {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-time {
  font-size: 11px;
  color: var(--text-secondary, #999);
  white-space: nowrap;
}
.result-snippet {
  font-size: 12px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
:deep(.search-highlight) {
  background: var(--color-primary-alpha, rgba(64, 128, 255, 0.2));
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
