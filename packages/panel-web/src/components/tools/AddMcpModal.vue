<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  NModal, NCard, NForm, NFormItem, NInput, NRadioGroup, NRadio,
  NButton, NDynamicInput, NSpace, useMessage,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useMcpStore, type AddMcpPayload } from '@/stores/mcp';

const { t } = useI18n();
const store = useMcpStore();
const message = useMessage();

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'added'): void;
}>();

type Transport = 'stdio' | 'url';

interface EnvPair { key: string; value: string }

const transport = ref<Transport>('stdio');
const name = ref('');
const command = ref('');
const argsText = ref('');
const url = ref('');
const envPairs = ref<EnvPair[]>([]);
const submitting = ref(false);

const nameError = computed(() => {
  const v = name.value.trim();
  if (!v) return '';
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(v)) return t('tools.mcp.errors.invalidName');
  return '';
});

const urlError = computed(() => {
  if (transport.value !== 'url') return '';
  const v = url.value.trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol)) return t('tools.mcp.errors.invalidUrl');
  } catch {
    return t('tools.mcp.errors.invalidUrl');
  }
  return '';
});

const canSubmit = computed(() => {
  if (submitting.value) return false;
  if (!name.value.trim()) return false;
  if (nameError.value) return false;
  if (transport.value === 'stdio') {
    return command.value.trim().length > 0;
  }
  return url.value.trim().length > 0 && !urlError.value;
});

function reset(): void {
  transport.value = 'stdio';
  name.value = '';
  command.value = '';
  argsText.value = '';
  url.value = '';
  envPairs.value = [];
  submitting.value = false;
}

watch(() => props.show, (v) => {
  if (v) reset();
});

function parseArgs(text: string): string[] {
  // Whitespace-split, honoring "double quoted" and 'single quoted' segments.
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return out.filter(s => s.length > 0);
}

function buildPayload(): AddMcpPayload | null {
  const trimmedName = name.value.trim();
  if (!trimmedName) return null;
  const payload: AddMcpPayload = { name: trimmedName };

  if (transport.value === 'stdio') {
    const cmd = command.value.trim();
    if (!cmd) return null;
    payload.command = cmd;
    const args = parseArgs(argsText.value);
    if (args.length > 0) payload.args = args;
    const env: Record<string, string> = {};
    for (const pair of envPairs.value) {
      const k = pair.key?.trim();
      if (!k) continue;
      env[k] = pair.value ?? '';
    }
    if (Object.keys(env).length > 0) payload.env = env;
    payload.transport = 'stdio';
  } else {
    const u = url.value.trim();
    if (!u) return null;
    payload.url = u;
    payload.transport = 'http';
  }
  return payload;
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return;
  const payload = buildPayload();
  if (!payload) return;
  submitting.value = true;
  const r = await store.add(payload);
  submitting.value = false;
  if (r.ok) {
    message.success(t('tools.mcp.addSuccess', { name: payload.name }));
    emit('added');
    emit('update:show', false);
  } else {
    const reason = r.message || r.error || '';
    message.error(`${t('tools.mcp.addFailed')}${reason ? ` (${reason})` : ''}`);
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
      :title="t('tools.mcp.modalTitle')"
      style="width: 560px; max-width: 90vw"
      :bordered="false"
      size="huge"
    >
      <NForm label-placement="top" :show-feedback="false">
        <NFormItem :label="t('tools.mcp.fields.name')" required>
          <div class="w-full">
            <NInput
              v-model:value="name"
              :placeholder="t('tools.mcp.fields.namePlaceholder')"
              :status="nameError ? 'error' : undefined"
            />
            <div v-if="nameError" class="mt-1 text-xs text-red-500">{{ nameError }}</div>
          </div>
        </NFormItem>

        <NFormItem :label="t('tools.mcp.fields.transport')">
          <NRadioGroup v-model:value="transport">
            <NSpace>
              <NRadio value="stdio">{{ t('tools.mcp.transport.stdio') }}</NRadio>
              <NRadio value="url">{{ t('tools.mcp.transport.url') }}</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>

        <template v-if="transport === 'stdio'">
          <NFormItem :label="t('tools.mcp.fields.command')" required>
            <NInput
              v-model:value="command"
              :placeholder="t('tools.mcp.fields.commandPlaceholder')"
            />
          </NFormItem>

          <NFormItem :label="t('tools.mcp.fields.args')">
            <div class="w-full">
              <NInput
                v-model:value="argsText"
                :placeholder="t('tools.mcp.fields.argsPlaceholder')"
              />
              <div class="mt-1 text-xs text-[var(--text-3)]">
                {{ t('tools.mcp.fields.argsHint') }}
              </div>
            </div>
          </NFormItem>

          <NFormItem :label="t('tools.mcp.fields.env')">
            <NDynamicInput
              v-model:value="envPairs"
              :on-create="() => ({ key: '', value: '' })"
              #="{ value: pair }"
            >
              <div class="flex gap-2 w-full">
                <NInput
                  v-model:value="pair.key"
                  :placeholder="t('tools.mcp.fields.envKeyPlaceholder')"
                  class="flex-1"
                />
                <NInput
                  v-model:value="pair.value"
                  :placeholder="t('tools.mcp.fields.envValuePlaceholder')"
                  class="flex-1"
                />
              </div>
            </NDynamicInput>
          </NFormItem>
        </template>

        <template v-else>
          <NFormItem :label="t('tools.mcp.fields.url')" required>
            <div class="w-full">
              <NInput
                v-model:value="url"
                :placeholder="t('tools.mcp.fields.urlPlaceholder')"
                :status="urlError ? 'error' : undefined"
              />
              <div v-if="urlError" class="mt-1 text-xs text-red-500">{{ urlError }}</div>
            </div>
          </NFormItem>
        </template>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton :disabled="submitting" @click="close">
            {{ t('common.cancel') }}
          </NButton>
          <NButton type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
            {{ t('tools.mcp.add') }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>
