<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useMcpStore } from '@/stores/mcp';
import EmptyState from '@/components/shared/EmptyState.vue';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';
import AddMcpModal from '@/components/tools/AddMcpModal.vue';

const { t } = useI18n();
const store = useMcpStore();
const message = useMessage();
const { servers, loading, isEmpty, initialized } = storeToRefs(store);

const showAdd = ref(false);

onMounted(async () => {
  if (!initialized.value) await store.load();
});

async function onRemove(name: string): Promise<void> {
  const r = await store.remove(name);
  if (r.ok) {
    message.success(t('tools.mcp.removeSuccess', { name }));
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.mcp.removeFailed', { name })}${reason ? ` (${reason})` : ''}`);
  }
}

async function onRefresh(): Promise<void> {
  await store.load();
}

function onAdded(): void {
  showAdd.value = false;
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 gap-3">
      <div class="text-xs text-[var(--text-3)]">
        {{ t('tools.mcp.totalCount', { n: servers.length }) }}
      </div>
      <div class="flex items-center gap-2">
        <NButton size="small" :loading="loading" @click="onRefresh">
          {{ t('common.refresh') }}
        </NButton>
        <NButton type="primary" size="small" @click="showAdd = true">
          {{ t('tools.mcp.add') }}
        </NButton>
      </div>
    </div>

    <div v-if="loading && servers.length === 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <ThemedSkeleton v-for="i in 3" :key="i" height="112px" />
    </div>

    <EmptyState
      v-else-if="isEmpty"
      icon="◇"
      :title="t('tools.mcp.emptyTitle')"
      :subtitle="t('tools.mcp.emptyDescription')"
    >
      <NButton type="primary" size="small" @click="showAdd = true">
        {{ t('tools.mcp.addFirst') }}
      </NButton>
    </EmptyState>

    <div v-else-if="servers.length > 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="s in servers"
        :key="s.name"
        class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="font-mono font-medium text-sm truncate">{{ s.name }}</div>
            <div class="text-xs text-[var(--text-3)] mt-1">
              {{ s.configured ? t('tools.mcp.statusConfigured') : t('tools.mcp.statusUnconfigured') }}
            </div>
          </div>
          <span
            :class="[
              'w-2 h-2 rounded-full mt-1.5 shrink-0',
              s.configured ? 'status-dot-success' : 'status-dot-neutral',
            ]"
          />
        </div>

        <div class="flex justify-end">
          <NPopconfirm
            :positive-text="t('common.confirm')"
            :negative-text="t('common.cancel')"
            @positive-click="onRemove(s.name)"
          >
            <template #trigger>
              <NButton
                size="tiny"
                quaternary
                type="error"
                :loading="store.isMutating(s.name)"
              >
                {{ t('tools.mcp.remove') }}
              </NButton>
            </template>
            {{ t('tools.mcp.removeConfirm', { name: s.name }) }}
          </NPopconfirm>
        </div>
      </div>
    </div>

    <AddMcpModal v-model:show="showAdd" @added="onAdded" />
  </div>
</template>
