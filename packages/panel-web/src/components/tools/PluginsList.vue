<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NButton, NPopconfirm, NSpin, NSwitch, NTag, useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { usePluginsStore } from '@/stores/plugins';
import InstallPluginModal from '@/components/tools/InstallPluginModal.vue';

const { t } = useI18n();
const store = usePluginsStore();
const message = useMessage();
const { plugins, loading, isEmpty, initialized, enabledCount, totalCount } = storeToRefs(store);

const showInstall = ref(false);

onMounted(async () => {
  if (!initialized.value) await store.load();
});

async function onRefresh(): Promise<void> {
  await store.load();
}

async function onToggle(name: string, enabled: boolean): Promise<void> {
  const r = await store.setEnabled(name, enabled);
  if (r.ok) {
    message.success(
      `${enabled ? t('tools.plugins.enableSuccess') : t('tools.plugins.disableSuccess')} · ${name}`,
      { duration: 2000 },
    );
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.plugins.toggleFailed', { name })}${reason ? ` (${reason})` : ''}`);
  }
}

async function onUpdate(name: string): Promise<void> {
  const r = await store.update(name);
  if (r.ok) {
    message.success(t('tools.plugins.updateSuccess', { name }));
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.plugins.updateFailed', { name })}${reason ? ` (${reason})` : ''}`);
  }
}

async function onRemove(name: string): Promise<void> {
  const r = await store.remove(name);
  if (r.ok) {
    message.success(t('tools.plugins.removeSuccess', { name }));
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.plugins.removeFailed', { name })}${reason ? ` (${reason})` : ''}`);
  }
}

function sourceLabel(source: string | undefined): string {
  if (!source) return t('tools.plugins.sourceUnknown');
  return source;
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4 gap-3">
      <div class="text-xs text-[var(--text-3)]">
        {{ t('tools.plugins.summary', { enabled: enabledCount, total: totalCount }) }}
      </div>
      <div class="flex items-center gap-2">
        <NButton size="small" :loading="loading" @click="onRefresh">
          {{ t('common.refresh') }}
        </NButton>
        <NButton type="primary" size="small" @click="showInstall = true">
          {{ t('tools.plugins.install') }}
        </NButton>
      </div>
    </div>

    <NSpin :show="loading && plugins.length === 0">
      <div v-if="isEmpty" class="py-12 text-center">
        <div class="text-4xl mb-3">🧩</div>
        <h3 class="text-base font-medium mb-1">{{ t('tools.plugins.emptyTitle') }}</h3>
        <p class="text-sm text-[var(--text-3)] mb-4 max-w-md mx-auto">
          {{ t('tools.plugins.emptyDescription') }}
        </p>
        <NButton type="primary" size="small" @click="showInstall = true">
          {{ t('tools.plugins.installFirst') }}
        </NButton>
      </div>

      <div v-else-if="plugins.length > 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="p in plugins"
          :key="p.name"
          class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono font-medium text-sm truncate">{{ p.name }}</span>
                <NTag v-if="p.version" size="tiny" :bordered="false">
                  v{{ p.version }}
                </NTag>
              </div>
              <div
                v-if="p.description"
                class="text-xs text-[var(--text-2)] line-clamp-2 mb-1"
              >
                {{ p.description }}
              </div>
              <div class="text-xs text-[var(--text-3)]">
                {{ t('tools.plugins.sourceLabel') }}: {{ sourceLabel(p.source) }}
              </div>
            </div>
            <NSwitch
              :value="p.enabled"
              :loading="store.isMutating(p.name)"
              size="small"
              @update:value="(v: boolean) => onToggle(p.name, v)"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]">
            <NButton
              size="tiny"
              quaternary
              :loading="store.isMutating(p.name)"
              @click="onUpdate(p.name)"
            >
              {{ t('tools.plugins.update') }}
            </NButton>
            <NPopconfirm
              :positive-text="t('common.confirm')"
              :negative-text="t('common.cancel')"
              @positive-click="onRemove(p.name)"
            >
              <template #trigger>
                <NButton
                  size="tiny"
                  quaternary
                  type="error"
                  :loading="store.isMutating(p.name)"
                >
                  {{ t('tools.plugins.remove') }}
                </NButton>
              </template>
              {{ t('tools.plugins.removeConfirm', { name: p.name }) }}
            </NPopconfirm>
          </div>
        </div>
      </div>
    </NSpin>

    <InstallPluginModal v-model:show="showInstall" @installed="onRefresh" />
  </div>
</template>
