<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NButton, NTag, NModal, NCard, NForm, NFormItem, NInput, useMessage,
} from 'naive-ui';
import { isValidEndpointUrl, useHermesEndpointStore } from '@/stores/hermes-endpoint';

const { t } = useI18n();
const store = useHermesEndpointStore();
const message = useMessage();
const { endpoints, activeId } = storeToRefs(store);

const showAddModal = ref(false);
const nameInput = ref('');
const baseUrlInput = ref('');

const canSubmit = computed(() =>
  nameInput.value.trim() !== ''
    && isValidEndpointUrl(baseUrlInput.value.trim()),
);

function openAdd(): void {
  nameInput.value = '';
  baseUrlInput.value = '';
  showAddModal.value = true;
}

function submitAdd(): void {
  if (!canSubmit.value) return;
  const r = store.addEndpoint({ name: nameInput.value, baseUrl: baseUrlInput.value });
  if (r) {
    message.success(t('settings.hermesEndpoints.addSuccess'));
    showAddModal.value = false;
  } else {
    message.error(t('settings.hermesEndpoints.invalidUrl'));
  }
}

function pick(id: string): void {
  store.setActiveEndpoint(id);
}

function remove(id: string): void {
  store.removeEndpoint(id);
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between mb-1">
      <div>
        <h3 class="text-lg font-semibold">{{ t('settings.hermesEndpoints.title') }}</h3>
        <p class="text-sm opacity-60">{{ t('settings.hermesEndpoints.desc') }}</p>
      </div>
      <NButton size="small" type="primary" ghost @click="openAdd">
        + {{ t('settings.hermesEndpoints.add') }}
      </NButton>
    </div>

    <div class="mt-4 space-y-2">
      <button
        v-for="e in endpoints"
        :key="e.id"
        type="button"
        class="w-full text-left rounded-lg border bg-[var(--bg-card)] p-4 flex items-center gap-3 transition-colors"
        :class="
          activeId === e.id
            ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/5'
            : 'border-[var(--border)] hover:bg-[var(--bg-elevate)]'
        "
        @click="pick(e.id)"
      >
        <span
          class="w-5 h-5 flex items-center justify-center text-sm flex-shrink-0"
          :class="activeId === e.id ? 'text-[var(--brand-600)]' : 'text-transparent'"
          aria-hidden="true"
        >
          ✓
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="font-semibold text-sm"
              :class="activeId === e.id ? 'text-[var(--brand-600)]' : ''"
            >{{ e.name }}</span>
            <NTag v-if="e.builtin" size="tiny" :bordered="false">
              {{ t('settings.hermesEndpoints.builtin') }}
            </NTag>
            <NTag
              v-if="activeId === e.id"
              size="tiny"
              type="success"
              :bordered="false"
            >
              {{ t('settings.hermesEndpoints.active') }}
            </NTag>
          </div>
          <div class="mt-1 text-xs text-[var(--text-3)] font-mono truncate">
            {{ e.baseUrl }}
          </div>
        </div>
        <NButton
          v-if="!e.builtin"
          size="tiny"
          quaternary
          type="error"
          @click.stop="remove(e.id)"
        >
          {{ t('settings.hermesEndpoints.remove') }}
        </NButton>
      </button>
    </div>

    <NModal
      :show="showAddModal"
      @update:show="(v: boolean) => { showAddModal = v; }"
    >
      <NCard
        :title="t('settings.hermesEndpoints.modalTitle')"
        style="width: 520px; max-width: 90vw"
        :bordered="false"
        size="huge"
      >
        <NForm label-placement="top" :show-feedback="false">
          <NFormItem :label="t('settings.hermesEndpoints.nameLabel')" required>
            <NInput
              v-model:value="nameInput"
              :placeholder="t('settings.hermesEndpoints.namePlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="t('settings.hermesEndpoints.urlLabel')" required>
            <NInput
              v-model:value="baseUrlInput"
              :placeholder="t('settings.hermesEndpoints.urlPlaceholder')"
            />
          </NFormItem>
        </NForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <NButton @click="showAddModal = false">
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              :disabled="!canSubmit"
              @click="submitAdd"
            >
              {{ t('settings.hermesEndpoints.submit') }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>
