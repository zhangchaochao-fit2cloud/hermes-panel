<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { NSkeleton, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useWorkspacesStore } from '@/stores/workspaces';
import { findWorkspace, type WorkspaceTemplate } from '@/data/workspaces';
import WorkspaceCard from '@/components/workspaces/WorkspaceCard.vue';
import WorkspaceDrawer from '@/components/workspaces/WorkspaceDrawer.vue';
import ProfileSwitch from '@/components/workspaces/ProfileSwitch.vue';

const { t } = useI18n();
const store = useWorkspacesStore();
const message = useMessage();
const { templates, activeId, loadingProfiles, profiles } = storeToRefs(store);

const drawerShow = ref(false);
const drawerWorkspace = ref<WorkspaceTemplate | null>(null);

// Show skeletons on first load until profiles arrive (data list is static, but
// the profile bar drives the visual "loading" feeling).
const showSkeleton = computed(
  () => loadingProfiles.value && profiles.value.length === 0,
);

onMounted(() => {
  void store.loadProfiles();
});

function activate(id: string): void {
  const ws = findWorkspace(id);
  if (!ws) return;
  store.activate(id);
  message.success(`已启用 · ${ws.name}`, { duration: 2200 });
}

function openDrawer(id: string): void {
  const ws = findWorkspace(id);
  if (!ws) return;
  drawerWorkspace.value = ws;
  drawerShow.value = true;
}

function activateFromDrawer(id: string): void {
  activate(id);
  drawerShow.value = false;
}
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)]">
    <div class="max-w-6xl mx-auto px-6 py-6">
      <!-- Header -->
      <header class="mb-6">
        <h1 class="text-xl font-semibold mb-1">
          {{ t('workspaces.title') }}
        </h1>
        <p class="text-sm text-[var(--text-3)]">
          {{ t('workspaces.subtitle') }}
        </p>
      </header>

      <!-- Profile switch bar -->
      <div class="mb-6">
        <ProfileSwitch />
      </div>

      <!-- Workspaces grid -->
      <section>
        <h2 class="text-sm font-semibold text-[var(--text-1)] mb-3">
          {{ t('workspaces.builtIn') }}
          <span class="ml-1 text-xs font-normal text-[var(--text-3)]">
            · {{ templates.length }}
          </span>
        </h2>

        <div
          v-if="showSkeleton"
          class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
          <NSkeleton v-for="i in 12" :key="i" :height="160" :sharp="false" />
        </div>

        <div
          v-else
          class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
          <WorkspaceCard
            v-for="ws in templates"
            :key="ws.id"
            :workspace="ws"
            :active="ws.id === activeId"
            @activate="activate"
            @open="openDrawer"
          />
        </div>
      </section>
    </div>

    <!-- Detail drawer -->
    <WorkspaceDrawer
      v-model:show="drawerShow"
      :workspace="drawerWorkspace"
      :active="!!drawerWorkspace && drawerWorkspace.id === activeId"
      @activate="activateFromDrawer"
    />
  </div>
</template>
