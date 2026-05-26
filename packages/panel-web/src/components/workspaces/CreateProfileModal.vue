<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  NModal, NCard, NForm, NFormItem, NInput, NSelect, NCheckbox, NButton, useMessage,
} from 'naive-ui';
import { useWorkspacesStore } from '@/stores/workspaces';

type CloneMode = 'none' | 'config' | 'all' | 'from';

const { t } = useI18n();
const store = useWorkspacesStore();
const { profiles, currentProfile } = storeToRefs(store);
const message = useMessage();

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>();

const name = ref('');
const cloneMode = ref<CloneMode>('none');
const cloneFrom = ref<string | null>(null);
const noAlias = ref(false);
const submitting = ref(false);

const cloneModeOptions = computed(() => [
  { label: t('workspaces.create.cloneMode.none'), value: 'none' },
  { label: t('workspaces.create.cloneMode.config'), value: 'config' },
  { label: t('workspaces.create.cloneMode.all'), value: 'all' },
  { label: t('workspaces.create.cloneMode.from'), value: 'from' },
]);

const cloneFromOptions = computed(() =>
  profiles.value.map(p => ({ label: p.name, value: p.name })),
);

const nameValid = computed(() => /^[a-z0-9][a-z0-9_-]*$/.test(name.value.trim()));
const nameHint = computed(() => {
  if (!name.value.trim()) return '';
  if (!nameValid.value) return t('workspaces.create.nameInvalid');
  if (profiles.value.some(p => p.name === name.value.trim())) {
    return t('workspaces.create.nameExists');
  }
  return '';
});

const canSubmit = computed(() => {
  if (submitting.value) return false;
  if (!nameValid.value) return false;
  if (profiles.value.some(p => p.name === name.value.trim())) return false;
  if (cloneMode.value === 'from' && !cloneFrom.value) return false;
  return true;
});

function reset(): void {
  name.value = '';
  cloneMode.value = 'none';
  cloneFrom.value = currentProfile.value?.name ?? null;
  noAlias.value = false;
}

watch(() => props.show, v => { if (v) reset(); });

async function submit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  const r = await store.createProfile({
    name: name.value.trim(),
    cloneMode: cloneMode.value,
    cloneFrom: cloneMode.value === 'from' ? cloneFrom.value ?? undefined : undefined,
    noAlias: noAlias.value || undefined,
  });
  submitting.value = false;
  if (r.ok) {
    message.success(t('workspaces.create.success', { name: name.value.trim() }));
    emit('update:show', false);
  } else {
    message.error(`${t('workspaces.create.failed')}: ${r.error ?? ''}`);
  }
}
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="!submitting"
    @update:show="emit('update:show', $event)"
  >
    <NCard
      :title="t('workspaces.create.title')"
      style="width: 520px; max-width: 90vw"
      :bordered="false"
      size="huge"
    >
      <NForm label-placement="top" :show-feedback="false">
        <NFormItem :label="t('workspaces.create.nameLabel')" required>
          <div class="w-full">
            <NInput
              v-model:value="name"
              :placeholder="t('workspaces.create.namePlaceholder')"
              :status="name && !nameValid ? 'error' : undefined"
            />
            <div
              v-if="nameHint"
              class="mt-1 text-xs text-red-500"
            >
              {{ nameHint }}
            </div>
            <div v-else class="mt-1 text-xs text-[var(--text-3)]">
              {{ t('workspaces.create.nameHint') }}
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="t('workspaces.create.cloneModeLabel')">
          <NSelect v-model:value="cloneMode" :options="cloneModeOptions" />
        </NFormItem>

        <NFormItem
          v-if="cloneMode === 'from'"
          :label="t('workspaces.create.cloneFromLabel')"
          required
        >
          <NSelect
            v-model:value="cloneFrom"
            :options="cloneFromOptions"
            :placeholder="t('workspaces.create.cloneFromPlaceholder')"
            filterable
          />
        </NFormItem>

        <NFormItem :show-label="false">
          <NCheckbox v-model:checked="noAlias">
            {{ t('workspaces.create.noAlias') }}
          </NCheckbox>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton :disabled="submitting" @click="emit('update:show', false)">
            {{ t('common.cancel') }}
          </NButton>
          <NButton type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
            {{ t('workspaces.create.submit') }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>
