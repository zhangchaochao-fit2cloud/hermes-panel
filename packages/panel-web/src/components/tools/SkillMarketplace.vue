<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NInput,
  NButton,
  NTag,
  NPagination,
  NSpin,
  useMessage,
  useDialog,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useToolsStore } from '@/stores/tools';
import ThemedSkeleton from '@/components/shared/ThemedSkeleton.vue';

const { t } = useI18n();
const store = useToolsStore();
const message = useMessage();
const dialog = useDialog();
const { availableSkills, availableTotal, loadingBrowse, installingSkills } = storeToRefs(store);

const search = ref('');
const page = ref(1);
const pageSize = 30;

const pageCount = computed(() => {
  const total = availableTotal.value || 0;
  return Math.max(1, Math.ceil(total / pageSize));
});

onMounted(async () => {
  if (availableSkills.value.length === 0) {
    await store.browseSkills(undefined, 1, pageSize);
  }
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
function onSearchChange(value: string): void {
  search.value = value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void store.browseSkills(search.value, 1, pageSize);
  }, 300);
}

async function onPageChange(p: number): Promise<void> {
  page.value = p;
  await store.browseSkills(search.value, p, pageSize);
}

function isInstalling(name: string): boolean {
  return installingSkills.value.has(name);
}

async function onInstall(name: string): Promise<void> {
  const ok = await store.installSkill(name);
  if (ok) {
    message.success(t('tools.marketplace.installSuccess', { name }), { duration: 2500 });
  } else {
    message.error(t('tools.marketplace.installFailed', { name }), { duration: 3500 });
  }
}

function onUninstall(name: string): void {
  dialog.warning({
    title: t('tools.marketplace.uninstallConfirmTitle'),
    content: t('tools.marketplace.uninstallConfirmContent', { name }),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const ok = await store.uninstallSkill(name);
      if (ok) {
        message.success(t('tools.marketplace.uninstallSuccess', { name }), { duration: 2500 });
      } else {
        message.error(t('tools.marketplace.uninstallFailed', { name }), { duration: 3500 });
      }
    },
  });
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <NInput
        :value="search"
        :placeholder="t('tools.marketplace.searchPlaceholder')"
        clearable
        size="small"
        class="max-w-xs"
        @update:value="onSearchChange"
      />
      <span class="text-xs text-[var(--text-3)]">
        {{ t('tools.marketplace.totalCount', { n: availableTotal }) }}
      </span>
    </div>

    <div v-if="loadingBrowse && availableSkills.length === 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <ThemedSkeleton v-for="i in 6" :key="i" height="120px" />
    </div>

    <div
      v-else-if="!loadingBrowse && availableSkills.length === 0"
      class="py-12 text-center text-sm text-[var(--text-3)]"
    >
      {{ t('tools.marketplace.empty') }}
    </div>

    <NSpin :show="loadingBrowse && availableSkills.length > 0">
      <div v-if="availableSkills.length > 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="s in availableSkills"
          :key="s.name"
          class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono font-medium text-sm truncate">{{ s.name }}</span>
            <NTag v-if="s.category" size="tiny" type="info" :bordered="false">
              {{ s.category }}
            </NTag>
            <NTag v-if="s.installed" size="tiny" type="success" :bordered="false">
              {{ t('tools.marketplace.installed') }}
            </NTag>
          </div>

          <div
            v-if="s.description"
            class="text-xs text-[var(--text-3)] line-clamp-2"
            :title="s.description"
          >
            {{ s.description }}
          </div>

          <div v-if="s.source" class="text-[11px] text-[var(--text-3)] truncate" :title="s.source">
            {{ t('tools.marketplace.sourceLabel') }}: {{ s.source }}
          </div>

          <div class="mt-auto flex items-center justify-between pt-2">
            <span v-if="isInstalling(s.name)" class="text-xs text-[var(--text-3)]">
              {{ s.installed
                  ? t('tools.marketplace.uninstalling', { name: s.name })
                  : t('tools.marketplace.installing', { name: s.name })
              }}
            </span>
            <span v-else />

            <NButton
              v-if="!s.installed"
              size="tiny"
              type="primary"
              :loading="isInstalling(s.name)"
              :disabled="isInstalling(s.name)"
              @click="onInstall(s.name)"
            >
              {{ t('tools.marketplace.install') }}
            </NButton>
            <NButton
              v-else
              size="tiny"
              type="error"
              ghost
              :loading="isInstalling(s.name)"
              :disabled="isInstalling(s.name)"
              @click="onUninstall(s.name)"
            >
              {{ t('tools.marketplace.uninstall') }}
            </NButton>
          </div>
        </div>
      </div>
    </NSpin>

    <div v-if="pageCount > 1" class="mt-6 flex justify-center">
      <NPagination
        :page="page"
        :page-count="pageCount"
        :page-size="pageSize"
        @update:page="onPageChange"
      />
    </div>
  </div>
</template>
