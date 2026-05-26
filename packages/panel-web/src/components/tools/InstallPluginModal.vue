<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NCard, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { usePluginsStore } from '@/stores/plugins';

const { t } = useI18n();
const store = usePluginsStore();
const message = useMessage();

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'installed'): void;
}>();

const source = ref('');
const submitting = ref(false);

// Validation mirrors the BFF service rules (Git URL or owner/repo shorthand).
const HTTP = /^https?:\/\/\S+$/i;
const GIT_SCHEME = /^(git|ssh):\/\/\S+$/i;
const SCP = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:[\w./~-]+(?:\.git)?$/;
const OWNER_REPO = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

const sourceError = computed(() => {
  const v = source.value.trim();
  if (!v) return '';
  if (HTTP.test(v) || GIT_SCHEME.test(v) || SCP.test(v) || OWNER_REPO.test(v)) return '';
  return t('tools.plugins.errors.invalidSource');
});

const canSubmit = computed(() => {
  if (submitting.value) return false;
  if (!source.value.trim()) return false;
  return !sourceError.value;
});

watch(() => props.show, v => {
  if (v) {
    source.value = '';
    submitting.value = false;
  }
});

async function submit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  const r = await store.install(source.value.trim());
  submitting.value = false;
  if (r.ok) {
    message.success(t('tools.plugins.installSuccess'));
    emit('installed');
    emit('update:show', false);
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.plugins.installFailed')}${reason ? ` (${reason})` : ''}`);
  }
}

function close(): void {
  if (submitting.value) return;
  emit('update:show', false);
}
</script>

<template>
  <NModal :show="show" :mask-closable="!submitting" @update:show="emit('update:show', $event)">
    <NCard
      :title="t('tools.plugins.installTitle')"
      style="width: 520px; max-width: 90vw"
      :bordered="false"
      size="huge"
    >
      <NForm label-placement="top" :show-feedback="false">
        <NFormItem :label="t('tools.plugins.fields.source')" required>
          <div class="w-full">
            <NInput
              v-model:value="source"
              :placeholder="t('tools.plugins.fields.sourcePlaceholder')"
              :status="sourceError ? 'error' : undefined"
              @keydown.enter.prevent="submit"
            />
            <div v-if="sourceError" class="mt-1 text-xs text-red-500">{{ sourceError }}</div>
            <div v-else class="mt-1 text-xs text-[var(--text-3)]">
              {{ t('tools.plugins.fields.sourceHint') }}
            </div>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton :disabled="submitting" @click="close">
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            type="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ t('tools.plugins.install') }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>
