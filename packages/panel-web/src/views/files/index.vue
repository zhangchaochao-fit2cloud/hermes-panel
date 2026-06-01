<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { NButton, NDrawer, NDrawerContent, useMessage } from 'naive-ui';
import { useFilesStore } from '@/stores/files';
import FileTabs from '@/components/files/FileTabs.vue';
import MonacoEditor from '@/components/files/MonacoEditor.vue';
import FileTree from '@/components/files/FileTree.vue';
import EmptyState from '@/components/shared/EmptyState.vue';

const { t } = useI18n();
const store = useFilesStore();
const message = useMessage();

const {
  fileTree, openTabs, activePath, treeLoading,
  saving, activeTab, dirty, currentContent, currentLanguage,
} = storeToRefs(store);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const searchQuery = ref('');
const showConsole = ref(false);
const cursorLine = ref(1);
const cursorCol = ref(1);

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280);
function onResize(): void {
  viewportWidth.value = window.innerWidth;
}
onMounted(() => {
  window.addEventListener('resize', onResize);
  void store.loadTree();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
});

const isLg = computed(() => viewportWidth.value >= 1024);
const isMd = computed(() => viewportWidth.value >= 768);
const treeDrawerOpen = ref(false);

function onSelectFile(path: string): void {
  void store.openFile(path);
  if (!isMd.value) treeDrawerOpen.value = false;
}

function onSelectTab(path: string): void {
  store.activePath = path;
}

function onCloseTab(path: string): void {
  store.closeTab(path);
}

function onContentChange(value: string): void {
  if (activePath.value) {
    store.updateContent(activePath.value, value);
  }
}

function onCursorChange(line: number, col: number): void {
  cursorLine.value = line;
  cursorCol.value = col;
}

async function doSave(): Promise<void> {
  if (!activePath.value || !dirty.value || saving.value) return;
  const ok = await store.saveFile(activePath.value);
  if (ok) {
    message.success(t('common.save'));
  }
}

function onGlobalKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void doSave();
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey));
</script>

<template>
  <div class="h-full w-full flex flex-col bg-[var(--bg-page)]">
    <div class="flex-1 min-h-0 flex">
      <!-- Left: file tree (md+ inline; sm in drawer) -->
      <aside
        v-if="isMd"
        class="w-[260px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)]"
      >
        <FileTree
          :tree="fileTree"
          :selected="activePath"
          :search="searchQuery"
          :loading="treeLoading"
          @select="onSelectFile"
          @update:search="(v: string) => searchQuery = v"
        />
      </aside>

      <!-- Mobile toolbar -->
      <div
        v-if="!isMd"
        class="absolute top-2 left-2 z-20"
      >
        <NButton size="tiny" @click="treeDrawerOpen = true">
          ☰ {{ t('files.openTree') }}
        </NButton>
      </div>

      <!-- Center: editor area -->
      <div class="flex-1 min-w-0 flex flex-col">
        <FileTabs
          :tabs="openTabs.map(t => ({ path: t.path, name: t.name, dirty: t.content !== t.originalContent }))"
          :active-path="activePath"
          @select="onSelectTab"
          @close="onCloseTab"
        />

        <!-- Editor area -->
        <div class="flex-1 min-h-0 relative">
          <!-- Empty state -->
          <div
            v-if="!activePath"
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <EmptyState
              icon="📄"
              :title="t('files.emptyTitle')"
              :subtitle="t('files.emptySubtitle')"
            />
          </div>

          <!-- Monaco editor -->
          <div v-else class="absolute inset-0">
            <MonacoEditor
              :model-value="currentContent"
              :language="currentLanguage"
              @update:model-value="onContentChange"
              @cursor-position="onCursorChange"
            />
          </div>
        </div>

        <!-- Status bar -->
        <div
          v-if="activePath"
          class="h-7 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center px-3 gap-2 text-[11px] text-[var(--text-3)] shrink-0"
        >
          <span class="font-medium">{{ currentLanguage }}</span>
          <span class="opacity-40">|</span>
          <span>Ln {{ cursorLine }}, Col {{ cursorCol }}</span>
          <span class="opacity-40">|</span>
          <span>UTF-8</span>
          <span v-if="activeTab?.size" class="opacity-40">|</span>
          <span v-if="activeTab?.size">{{ formatSize(activeTab.size) }}</span>
          <span class="ml-auto flex items-center gap-2">
            <span v-if="saving" class="italic">{{ t('files.saving') }}</span>
            <span v-else-if="dirty" class="text-amber-500">{{ t('files.unsaved') }}</span>
            <NButton
              size="tiny"
              type="primary"
              :disabled="!dirty || saving"
              :loading="saving"
              @click="doSave"
            >
              {{ t('common.save') }} <span class="ml-1 opacity-70">⌘S</span>
            </NButton>
          </span>
        </div>
      </div>

      <!-- Right: collapsible console panel -->
      <aside
        v-if="isLg && showConsole"
        class="w-[260px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-card)]"
      >
        <div class="flex items-center justify-between px-3 h-9 border-b border-[var(--border)]">
          <span class="text-xs font-medium">{{ t('files.console') }}</span>
          <button
            class="text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
            @click="showConsole = false"
          >
            ×
          </button>
        </div>
        <div class="p-3 text-xs text-[var(--text-3)] italic">
          {{ t('files.consolePlaceholder') }}
        </div>
      </aside>

      <!-- Console toggle button (when hidden) -->
      <button
        v-if="isLg && !showConsole"
        class="w-6 shrink-0 border-l border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center text-xs text-[var(--text-3)] hover:bg-[var(--bg-elevate)] transition-colors"
        title="Console"
        @click="showConsole = true"
      >
        ◀
      </button>

      <!-- Mobile drawer for tree -->
      <NDrawer
        v-if="!isMd"
        v-model:show="treeDrawerOpen"
        :width="280"
        placement="left"
      >
        <NDrawerContent :title="t('files.treeTitle')" closable>
          <FileTree
            :tree="fileTree"
            :selected="activePath"
            :search="searchQuery"
            :loading="treeLoading"
            @select="onSelectFile"
            @update:search="(v: string) => searchQuery = v"
          />
        </NDrawerContent>
      </NDrawer>
    </div>
  </div>
</template>
