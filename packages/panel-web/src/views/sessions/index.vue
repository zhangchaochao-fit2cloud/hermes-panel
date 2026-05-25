<script setup lang="ts">
import { onMounted, ref, watch, computed, onBeforeUnmount, h } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NSkeleton,
  NButton,
  NInput,
  useMessage,
  useDialog,
} from 'naive-ui';
import type { SessionSummary } from '@hermes-panel/shared';
import EmptyState from '@/components/shared/EmptyState.vue';
import SessionFilters from '@/components/sessions/SessionFilters.vue';
import SessionTable from '@/components/sessions/SessionTable.vue';
import SessionGrid from '@/components/sessions/SessionGrid.vue';
import { useSessionsStore, type SourceFilter, type ViewMode } from '@/stores/sessions';
import { useBreakpoint } from '@/composables/use-breakpoint';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const store = useSessionsStore();
const { items, loading, refreshing, error, initialized, search, source, view, total } = storeToRefs(store);
const { isMobile } = useBreakpoint();

// Force grid view on phones — the table layout horizontally scrolls and is
// painful to use with a thumb. We do not persist this override, so the
// desktop preference survives when the viewport widens again.
const effectiveView = computed<ViewMode>(() => (isMobile.value ? 'grid' : view.value));

// Debounced search
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleReload(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void store.load();
  }, 300);
}

watch(search, () => scheduleReload());
watch(source, () => {
  // source change should be immediate
  if (debounceTimer) clearTimeout(debounceTimer);
  void store.load();
});

onMounted(() => {
  void store.load({ initial: true });
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

// ---- handlers ----

function onCreate(): void {
  void router.push('/chat');
}

function onOpen(id: string): void {
  void router.push({ path: '/chat', query: { resume: id } });
}

function onRename(row: SessionSummary): void {
  const inputRef = ref(row.title);
  const d = dialog.create({
    title: t('sessions.rename.title'),
    content: () =>
      h(NInput, {
        value: inputRef.value,
        'onUpdate:value': (v: string) => { inputRef.value = v; },
        autofocus: true,
        placeholder: t('sessions.rename.placeholder'),
      }),
    positiveText: t('sessions.rename.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const next = inputRef.value.trim();
      if (!next) {
        message.warning(t('sessions.rename.empty'));
        return false;
      }
      if (next === row.title) {
        return true;
      }
      try {
        await store.rename(row.id, next);
        message.success(t('sessions.rename.success'));
      } catch (err) {
        message.error(`${t('sessions.rename.failed')}: ${(err as Error).message}`);
        return false;
      }
      return true;
    },
  });
  void d;
}

interface UndoState {
  id: string;
  restore: () => void;
  timer: ReturnType<typeof setTimeout>;
  reactive: { destroy: () => void };
}
const pendingUndo = new Map<string, UndoState>();

function onDelete(row: SessionSummary): void {
  // 1) optimistic local removal
  const { restore, snapshot } = store.removeLocal(row.id);
  if (!snapshot) return;

  // 2) show undo toast (5s)
  const reactive = message.info(
    `${t('sessions.delete.removed', { title: snapshot.title })}`,
    {
      duration: 5000,
      closable: true,
      render: props => {
        return h(
          'div',
          { class: 'flex items-center gap-3' },
          [
            h('span', null, props.content as string),
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                type: 'primary',
                onClick: () => undoDelete(row.id),
              },
              { default: () => t('sessions.delete.undo') },
            ),
          ],
        );
      },
    },
  );

  // 3) schedule the real DELETE after the undo window
  const timer = setTimeout(() => {
    pendingUndo.delete(row.id);
    void store.deleteRemote(row.id).catch(err => {
      // rollback if backend failed
      restore();
      message.error(`${t('sessions.delete.failed')}: ${(err as Error).message}`);
    });
  }, 5000);

  pendingUndo.set(row.id, {
    id: row.id,
    restore,
    timer,
    reactive,
  });
}

function undoDelete(id: string): void {
  const u = pendingUndo.get(id);
  if (!u) return;
  clearTimeout(u.timer);
  u.restore();
  u.reactive.destroy();
  pendingUndo.delete(id);
  message.success(t('sessions.delete.undone'));
}

onBeforeUnmount(() => {
  // flush pending deletes when page unmounts — let them complete normally
  // (timers stay alive; we just clear our map references)
  for (const u of pendingUndo.values()) {
    u.reactive.destroy();
  }
  pendingUndo.clear();
});

// ---- two-way bindings for filters ----
const searchValue = computed({
  get: () => search.value,
  set: v => { search.value = v; },
});
const sourceValue = computed({
  get: () => source.value,
  set: v => store.setSource(v as SourceFilter),
});
const viewValue = computed({
  // Reflect the effective view in the toolbar so the toggle highlights "grid"
  // when forced by mobile. Writes still update the underlying preference for
  // when the user is back on desktop.
  get: () => effectiveView.value,
  set: v => store.setView(v as ViewMode),
});

const isEmpty = computed(() => initialized.value && !loading.value && items.value.length === 0);
const showInitialSkeleton = computed(() => loading.value && !initialized.value);
</script>

<template>
  <div class="flex flex-col h-full bg-[var(--bg-page)]">
    <!-- filters / toolbar -->
    <SessionFilters
      v-model:search="searchValue"
      v-model:source="sourceValue"
      v-model:view="viewValue"
      :total="total"
      @create="onCreate"
    />

    <!-- thin top progress for non-initial refreshes -->
    <div class="relative h-[1px] bg-transparent overflow-hidden">
      <div
        v-if="refreshing"
        class="absolute inset-y-0 left-0 h-full bg-[var(--brand-500)] animate-progress"
      />
    </div>

    <!-- error banner -->
    <div
      v-if="error"
      class="px-6 py-2 text-xs bg-red-500/10 text-red-600 border-b border-red-500/30"
    >
      {{ error }}
      <button
        class="ml-2 underline opacity-80 hover:opacity-100"
        @click="store.load({ initial: true })"
      >
        {{ t('sessions.retry') }}
      </button>
    </div>

    <!-- body -->
    <div class="flex-1 min-h-0 overflow-auto">
      <!-- skeleton (first load) -->
      <div v-if="showInitialSkeleton" class="px-6 py-4 space-y-3">
        <NSkeleton v-for="i in 5" :key="i" text :repeat="1" :sharp="false" height="48px" />
      </div>

      <!-- empty -->
      <EmptyState
        v-else-if="isEmpty"
        icon="💬"
        :title="t('sessions.empty.title')"
        :subtitle="t('sessions.empty.subtitle')"
      >
        <NButton type="primary" class="mt-3" @click="onCreate">
          {{ t('sessions.empty.cta') }}
        </NButton>
      </EmptyState>

      <!-- content -->
      <template v-else-if="initialized">
        <SessionTable
          v-if="effectiveView === 'table'"
          :items="items"
          @open="onOpen"
          @rename="onRename"
          @delete="onDelete"
        />
        <SessionGrid
          v-else
          :items="items"
          @open="onOpen"
          @rename="onRename"
          @delete="onDelete"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-slide {
  0% {
    width: 0%;
    transform: translateX(0%);
  }
  50% {
    width: 50%;
    transform: translateX(50%);
  }
  100% {
    width: 0%;
    transform: translateX(200%);
  }
}
.animate-progress {
  animation: progress-slide 1.2s ease-in-out infinite;
}
</style>
