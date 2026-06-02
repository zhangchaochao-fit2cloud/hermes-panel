<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import {
  NDrawer, NDrawerContent, NForm, NFormItem, NSwitch,
  NInput, NButton, NSpin,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { ChannelName, ChannelConfig } from '@hermes-panel/shared';
import { CHANNEL_META } from '@hermes-panel/shared';
import { useChannelsStore } from '@/stores/channels';

const { t } = useI18n();

const props = defineProps<{
  name: ChannelName;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = useChannelsStore();
const meta = CHANNEL_META[props.name];
const config = ref<Record<string, unknown>>({});
const loading = ref(false);
const errorMsg = ref<string | null>(null);

watch(() => [props.name, props.visible], async ([name, vis]) => {
  if (!vis || !name) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    const cfg = await store.fetchConfig(name as ChannelName);
    config.value = { ...cfg as unknown as Record<string, unknown> };
  } catch {
    errorMsg.value = t('channels.config.loadFailed');
  } finally {
    loading.value = false;
  }
}, { immediate: true });

const isSaving = computed(() => store.saving === props.name);

async function save(): Promise<void> {
  errorMsg.value = null;
  try {
    await store.saveConfig(props.name, config.value as unknown as ChannelConfig);
    emit('close');
  } catch {
    errorMsg.value = t('channels.config.saveFailed');
  }
}

const FIELD_LABELS: Record<string, string> = {
  enabled: t('channels.config.fields.enabled'),
  botToken: 'Bot Token',
  appId: 'App ID',
  appSecret: 'App Secret',
  botId: 'Bot ID',
  botSecret: 'Bot Secret',
  accessToken: 'Access Token',
  homeserver: 'Homeserver URL',
  atMention: t('channels.config.fields.atMention'),
  emojiReaction: t('channels.config.fields.emojiReaction'),
  freeReply: t('channels.config.fields.freeReply'),
  autoThread: t('channels.config.fields.autoThread'),
  mentionControl: t('channels.config.fields.mentionControl'),
  handleBotMessages: t('channels.config.fields.handleBotMessages'),
  mentionMode: t('channels.config.fields.mentionMode'),
  channelWhitelist: t('channels.config.fields.channelWhitelist'),
  channelBlacklist: t('channels.config.fields.channelBlacklist'),
};

const BOOLEAN_FIELDS = new Set(['enabled', 'atMention', 'emojiReaction', 'freeReply', 'autoThread', 'mentionControl', 'handleBotMessages']);
const TOKEN_FIELDS = new Set(['botToken', 'appSecret', 'botSecret', 'accessToken']);
const ARRAY_FIELDS = new Set(['channelWhitelist', 'channelBlacklist']);

function fieldLabel(k: string): string { return FIELD_LABELS[k] ?? k; }
function isBool(k: string): boolean { return BOOLEAN_FIELDS.has(k); }
function isToken(k: string): boolean { return TOKEN_FIELDS.has(k); }
function isArr(k: string): boolean { return ARRAY_FIELDS.has(k); }

function visibleKeys(): string[] {
  return Object.keys(config.value);
}

function arrStr(key: string): string {
  const v = config.value[key];
  return Array.isArray(v) ? v.join(', ') : String(v ?? '');
}

function setArr(key: string, val: string): void {
  config.value[key] = val.split(',').map(s => s.trim()).filter(Boolean);
}
</script>

<template>
  <NDrawer :show="visible" :width="440" placement="right" @update:show="emit('close')">
    <NDrawerContent :title="`${meta.icon} ${meta.label} ${t('channels.config.drawerTitle')}`" closable>
      <NSpin v-if="loading" />
      <template v-else>
        <NForm label-placement="top">
          <NFormItem v-for="key in visibleKeys()" :key="key" :label="fieldLabel(key)">
            <NSwitch
              v-if="isBool(key)"
              :value="!!config[key]"
              :disabled="isSaving"
              @update:value="val => config[key] = val"
            />
            <NInput
              v-else-if="isToken(key)"
              type="password"
              show-password-on="click"
              :value="String(config[key] ?? '')"
              :disabled="isSaving"
              @update:value="val => config[key] = val"
            />
            <NInput
              v-else-if="isArr(key)"
              type="textarea"
              :value="arrStr(key)"
              :disabled="isSaving"
              :autosize="{ minRows: 2, maxRows: 4 }"
              @update:value="val => setArr(key, val)"
            />
            <NInput
              v-else
              :value="String(config[key] ?? '')"
              :disabled="isSaving"
              @update:value="val => config[key] = val"
            />
          </NFormItem>
        </NForm>

        <p v-if="errorMsg" class="text-xs text-red-500 mt-3">{{ errorMsg }}</p>

        <p class="text-xs text-[var(--text-3)] mt-3 leading-relaxed">
          {{ t('channels.config.restartHint') }}
          <span v-if="store.enabledCount > 0" class="text-[var(--brand-500)] cursor-pointer hover:underline" @click="store.restartGateway()">{{ t('channels.config.restartNow') }}</span>
        </p>

        <div class="flex gap-3 mt-4">
          <NButton type="primary" :loading="isSaving" :disabled="isSaving" @click="save">{{ t('common.save') }}</NButton>
          <NButton @click="emit('close')">{{ t('common.cancel') }}</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
