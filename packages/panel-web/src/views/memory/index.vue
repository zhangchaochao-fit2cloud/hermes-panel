<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NButton,
  NDrawer,
  NDrawerContent,
  NInput,
  NSkeleton,
  useDialog,
  useMessage,
} from 'naive-ui';
import { useMemoryStore } from '@/stores/memory';
import EmptyState from '@/components/shared/EmptyState.vue';
import FileTree from '@/components/memory/FileTree.vue';
import FileEditor from '@/components/memory/FileEditor.vue';
import FileInfoPanel from '@/components/memory/FileInfoPanel.vue';

const { t } = useI18n();
const store = useMemoryStore();
const dialog = useDialog();
const message = useMessage();

const {
  files,
  search,
  currentPath,
  draftContent,
  loadingFile,
  fileError,
  listLoading,
  listError,
  listErrorCode,
  initialized,
  saving,
  dirty,
  tree,
  currentFile,
} = storeToRefs(store);

// Track viewport width for responsive layout (3-col / 2-col / 1-col).
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280);
function onResize(): void {
  viewportWidth.value = window.innerWidth;
}
onMounted(() => {
  window.addEventListener('resize', onResize);
  void store.loadList();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
});

const isLg = computed(() => viewportWidth.value >= 1024);
const isMd = computed(() => viewportWidth.value >= 768);
// Single-column (sm): tree is in a drawer
const treeDrawerOpen = ref(false);

// Show empty state if memory dir doesn't exist on the host yet
const showEmptyState = computed(() =>
  initialized.value && !listLoading.value && listErrorCode.value === 'MEMORY_DIR_MISSING',
);

// "List is loaded but unusable" — only show error banner if it's NOT the
// expected "directory missing" case (which has its own dedicated empty state).
const showErrorBanner = computed(() =>
  !!listError.value || (!!listErrorCode.value && listErrorCode.value !== 'MEMORY_DIR_MISSING'),
);

const searchValue = computed({
  get: () => search.value,
  set: (v: string) => { search.value = v; },
});

// ---- selection ----
async function onSelect(path: string): Promise<void> {
  if (dirty.value && currentPath.value && currentPath.value !== path) {
    const confirmed = await confirmDiscard();
    if (!confirmed) return;
  }
  await store.openFile(path);
  // On sm screens close the drawer after picking
  if (!isMd.value) treeDrawerOpen.value = false;
}

function confirmDiscard(): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const settle = (v: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    dialog.warning({
      title: t('memory.confirmDiscardTitle'),
      content: t('memory.confirmDiscardContent'),
      positiveText: t('memory.discard'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => { settle(true); },
      onNegativeClick: () => { settle(false); },
      onClose: () => { settle(false); },
      onMaskClick: () => { settle(false); },
    });
  });
}

// ---- save ----
async function doSave(): Promise<void> {
  if (!dirty.value || saving.value) return;
  const ok = await store.save();
  if (ok) {
    message.success(t('memory.saved'));
  } else {
    message.error(`${t('memory.saveFailed')}${fileError.value ? `: ${fileError.value}` : ''}`);
  }
}

// ---- new file modal ----
function onNewFile(): void {
  const inputRef = ref('');
  const errorRef = ref<string | null>(null);

  const d = dialog.create({
    title: t('memory.newFileTitle'),
    content: () => h('div', { class: 'space-y-2' }, [
      h(NInput, {
        value: inputRef.value,
        placeholder: t('memory.newFilePlaceholder'),
        autofocus: true,
        'onUpdate:value': (v: string) => {
          inputRef.value = v;
          errorRef.value = null;
        },
      }),
      h('div', { class: 'text-xs text-[var(--text-3)]' }, t('memory.newFileHint')),
      errorRef.value
        ? h('div', { class: 'text-xs text-red-500' }, errorRef.value)
        : null,
    ]),
    positiveText: t('memory.create'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const path = inputRef.value.trim();
      if (!path) {
        errorRef.value = t('memory.newFileEmpty');
        return false;
      }
      // Block path traversal and absolute paths client-side; BFF also enforces.
      if (path.startsWith('/') || path.startsWith('\\') || path.includes('..')) {
        errorRef.value = t('memory.newFileInvalid');
        return false;
      }
      const r = await store.createFile(path);
      if (r.ok) {
        message.success(t('memory.created', { path }));
        return true;
      }
      if (r.error === 'EXISTS') {
        errorRef.value = t('memory.newFileExists');
      } else {
        errorRef.value = `${t('memory.newFileFailed')}: ${r.error ?? '?'}`;
      }
      return false;
    },
  });
  void d;
}

// ---- editor binding ----
const editorContent = computed({
  get: () => draftContent.value,
  set: (v: string) => store.setDraft(v),
});

// ---- Cmd/Ctrl+S as a global shortcut while on this view (fallback for when
// focus is outside the textarea, e.g. the side panels).
function onGlobalKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void doSave();
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey));

// ---- guards ----
onBeforeRouteLeave(async (_to, _from, next) => {
  if (!dirty.value) return next();
  const ok = await confirmDiscard();
  next(ok);
});

// Warn on browser-level close/navigate
function onBeforeUnload(e: BeforeUnloadEvent): void {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));

// Reset selection on first load if list was empty before but now has files
watch(files, (next) => {
  if (next.length > 0 && !currentPath.value) {
    // Auto-open first file on initial load for a friendlier first impression
    void store.openFile(next[0].path);
  }
});
</script>

<template>
  <div class="h-full w-full flex flex-col bg-[var(--bg-page)]">
    <!-- Optional error banner (non-empty-state errors only) -->
    <div
      v-if="showErrorBanner"
      class="px-4 py-2 text-xs bg-red-500/10 text-red-600 border-b border-red-500/30 flex items-center gap-2"
    >
      <span>{{ listError ?? listErrorCode }}</span>
      <button class="underline opacity-80 hover:opacity-100" @click="store.loadList()">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Empty state: memory dir missing -->
    <div v-if="showEmptyState" class="flex-1 min-h-0">
      <EmptyState
        icon="🧠"
        :title="t('memory.empty.title')"
        :subtitle="t('memory.empty.subtitle')"
      >
        <NButton type="primary" class="mt-3" @click="onNewFile">
          {{ t('memory.newFile') }}
        </NButton>
      </EmptyState>
    </div>

    <!-- Initial loading skeleton -->
    <div v-else-if="!initialized || (listLoading && files.length === 0)" class="flex-1 min-h-0 p-6">
      <NSkeleton text :repeat="6" height="20px" />
    </div>

    <!-- Main 3-column layout -->
    <div v-else class="flex-1 min-h-0 flex relative">
      <!-- Mobile (sm) toolbar to open the tree (overlay on the editor) -->
      <div
        v-if="!isMd"
        class="absolute top-2 left-2 z-20"
      >
        <NButton size="tiny" @click="treeDrawerOpen = true">
          ☰ {{ t('memory.openTree') }}
        </NButton>
      </div>

      <!-- Left: file tree (lg and md inline; sm in drawer) -->
      <aside
        v-if="isMd"
        class="w-[280px] flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)]"
      >
        <FileTree
          :tree="tree"
          :selected="currentPath"
          :search="search"
          :loading="listLoading"
          @select="onSelect"
          @update:search="(v: string) => searchValue = v"
          @new-file="onNewFile"
        />
      </aside>

      <!-- Center: editor -->
      <div class="flex-1 min-w-0 flex flex-col">
        <FileEditor
          :path="currentPath"
          :content="editorContent"
          :loading="loadingFile"
          :saving="saving"
          :dirty="dirty"
          :error="fileError"
          @update:content="(v: string) => editorContent = v"
          @save="doSave"
        />
      </div>

      <!-- Right: info panel (lg only) -->
      <aside
        v-if="isLg"
        class="w-[240px] flex-shrink-0 border-l border-[var(--border)]"
      >
        <FileInfoPanel
          :file="currentFile"
          :draft-content="draftContent"
          :saving="saving"
          :dirty="dirty"
          @save="doSave"
        />
      </aside>

      <!-- Mobile drawer for tree -->
      <NDrawer
        v-if="!isMd"
        v-model:show="treeDrawerOpen"
        :width="300"
        placement="left"
      >
        <NDrawerContent :title="t('memory.treeTitle')" closable>
          <FileTree
            :tree="tree"
            :selected="currentPath"
            :search="search"
            :loading="listLoading"
            @select="onSelect"
            @update:search="(v: string) => searchValue = v"
            @new-file="onNewFile"
          />
        </NDrawerContent>
      </NDrawer>
    </div>
  </div>
</template>
