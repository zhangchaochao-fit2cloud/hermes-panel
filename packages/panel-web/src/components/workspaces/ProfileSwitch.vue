<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NTag, NSkeleton, NTooltip, useMessage } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useWorkspacesStore, type ProfileInfo } from '@/stores/workspaces';
import CreateProfileModal from './CreateProfileModal.vue';

const { t } = useI18n();
const store = useWorkspacesStore();
const message = useMessage();
const {
  profiles,
  loadingProfiles,
  switchingProfile,
  currentProfile,
} = storeToRefs(store);

const otherProfiles = computed<ProfileInfo[]>(() =>
  profiles.value.filter(p => !p.current),
);

const createOpen = ref(false);

async function switchTo(name: string): Promise<void> {
  const ok = await store.useProfile(name);
  if (ok) {
    message.success(t('workspaces.profile.switched', { name }), { duration: 2500 });
  } else {
    message.error(t('workspaces.profile.switchFailed', { error: store.error ?? '' }), {
      duration: 4000,
      closable: true,
    });
  }
}
</script>

<template>
  <div
    class="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-1)]"
  >
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-[var(--text-1)]">{{ t('workspaces.profile.title') }}</h2>
      <NButton size="small" quaternary @click="createOpen = true">
        {{ t('workspaces.profile.createBtn') }}
      </NButton>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingProfiles && profiles.length === 0" class="space-y-2">
      <NSkeleton :height="28" />
      <NSkeleton :height="20" :width="160" />
    </div>

    <template v-else>
      <!-- Current profile -->
      <div v-if="currentProfile" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-[var(--text-3)]">{{ t('workspaces.profile.current') }}</span>
        <span class="inline-flex items-center gap-1.5 font-mono text-sm font-medium">
          <span class="h-2 w-2 rounded-full status-dot-success animate-pulse" aria-hidden="true" />
          {{ currentProfile.name }}
        </span>
        <NTag
          v-if="currentProfile.model"
          size="tiny"
          :bordered="false"
          type="info"
        >
          {{ currentProfile.model }}
        </NTag>
        <NTag
          v-if="currentProfile.gateway"
          size="tiny"
          :bordered="false"
        >
          {{ currentProfile.gateway }}
        </NTag>
      </div>
      <div v-else class="text-xs text-[var(--text-3)]">
        {{ t('workspaces.profile.none') }}
      </div>

      <!-- Other profiles -->
      <div v-if="otherProfiles.length > 0" class="mt-3 flex items-center gap-2 flex-wrap">
        <span class="text-xs text-[var(--text-3)]">{{ t('workspaces.profile.others') }}</span>
        <NTooltip
          v-for="p in otherProfiles"
          :key="p.name"
          placement="top"
        >
          <template #trigger>
            <NButton
              size="tiny"
              :loading="switchingProfile === p.name"
              :disabled="!!switchingProfile"
              @click="switchTo(p.name)"
            >
              <span class="font-mono">{{ p.name }}</span>
              <span v-if="p.model" class="ml-1 text-[10px] opacity-60">
                · {{ p.model }}
              </span>
            </NButton>
          </template>
          {{ t('workspaces.profile.switchTooltip') }}
        </NTooltip>
      </div>
    </template>

    <CreateProfileModal v-model:show="createOpen" />
  </div>
</template>
