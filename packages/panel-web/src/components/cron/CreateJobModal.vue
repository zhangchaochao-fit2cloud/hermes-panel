<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NModal, NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, useMessage } from 'naive-ui';
import { useCronStore } from '@/stores/cron';
import { nextRuns, fmtDateTime, parseCron } from '@/utils/cron-helpers';

const { t } = useI18n();
const store = useCronStore();
const message = useMessage();

const props = defineProps<{ show: boolean; initialPrompt?: string }>();
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'created'): void;
}>();

const name = ref('');
const schedule = ref('');
const prompt = ref('');
const deliver = ref<string>('local');
const repeat = ref<number | null>(null);
const submitting = ref(false);

const deliverOptions = [
  { label: 'local', value: 'local' },
  { label: 'origin', value: 'origin' },
  { label: 'telegram', value: 'telegram' },
  { label: 'discord', value: 'discord' },
  { label: 'signal', value: 'signal' },
];

const parsedSchedule = computed(() => schedule.value ? parseCron(schedule.value) : null);
const upcomingPreview = computed(() => {
  if (!schedule.value) return [];
  const ms = nextRuns(schedule.value, 3);
  return ms.map(fmtDateTime);
});

const scheduleHint = computed(() => {
  if (!schedule.value.trim()) return '';
  // Friendly shortcuts that hermes accepts but our 5-field parser doesn't
  if (/^(\d+[mhd]|every\s+\d+\s*[mhd])/i.test(schedule.value)) {
    return t('cron.create.scheduleShortcut');
  }
  if (!parsedSchedule.value) return t('cron.create.invalidCron');
  return '';
});

const canSubmit = computed(() =>
  schedule.value.trim() !== '' &&
  prompt.value.trim() !== '' &&
  !submitting.value
);

function reset(): void {
  name.value = '';
  schedule.value = '';
  prompt.value = '';
  deliver.value = 'local';
  repeat.value = null;
}

watch(() => props.show, (v) => {
  if (v) {
    reset();
    if (props.initialPrompt) prompt.value = props.initialPrompt;
  }
});

async function submit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  const r = await store.create({
    schedule: schedule.value.trim(),
    prompt: prompt.value.trim(),
    name: name.value.trim() || undefined,
    deliver: deliver.value || undefined,
    repeat: repeat.value ?? undefined,
  });
  submitting.value = false;
  if (r.ok) {
    message.success(t('cron.create.success'));
    emit('created');
    emit('update:show', false);
  } else {
    message.error(`${t('cron.create.failed')}: ${r.error ?? ''}`);
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
      :title="t('cron.create.formTitle')"
      style="width: 560px; max-width: 90vw"
      :bordered="false"
      size="huge"
    >
      <NForm label-placement="top" :show-feedback="false">
        <NFormItem :label="t('cron.create.nameLabel')">
          <NInput v-model:value="name" :placeholder="t('cron.create.namePlaceholder')" />
        </NFormItem>

        <NFormItem :label="t('cron.create.scheduleLabel')" required>
          <div class="w-full">
            <NInput
              v-model:value="schedule"
              :placeholder="t('cron.create.schedulePlaceholder')"
              :status="scheduleHint && !parsedSchedule && !/^(\d+[mhd]|every)/i.test(schedule) ? 'error' : 'success'"
            />
            <div
              v-if="scheduleHint"
              class="mt-1 text-xs"
              :class="parsedSchedule || /^(\d+[mhd]|every)/i.test(schedule) ? 'text-[var(--text-3)]' : 'text-[var(--color-error)]'"
            >
              {{ scheduleHint }}
            </div>
            <div
              v-if="upcomingPreview.length > 0"
              class="mt-2 text-xs text-[var(--text-3)] space-y-0.5"
            >
              <div class="font-medium opacity-80">{{ t('cron.create.nextPreview') }}</div>
              <div v-for="(t, i) in upcomingPreview" :key="i" class="font-mono">
                • {{ t }}
              </div>
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="t('cron.create.promptLabel')" required>
          <NInput
            v-model:value="prompt"
            type="textarea"
            :placeholder="t('cron.create.promptPlaceholder')"
            :autosize="{ minRows: 3, maxRows: 8 }"
            maxlength="2000"
            show-count
          />
        </NFormItem>

        <NFormItem :label="t('cron.create.deliverLabel')">
          <NSelect v-model:value="deliver" :options="deliverOptions" />
        </NFormItem>

        <NFormItem :label="t('cron.create.repeatLabel')">
          <NInputNumber
            v-model:value="repeat"
            :placeholder="t('cron.create.repeatPlaceholder')"
            :min="1"
            class="w-full"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton :disabled="submitting" @click="emit('update:show', false)">
            {{ t('common.cancel') }}
          </NButton>
          <NButton type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
            {{ t('cron.create.submit') }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>
