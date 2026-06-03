<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import {
  NDrawer, NDrawerContent, NForm, NFormItem, NSwitch,
  NInput, NButton, NSpin,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { toDataURL } from 'qrcode';
import type { ChannelName, ChannelConfig } from '@hermes-panel/shared';
import { CHANNEL_META } from '@hermes-panel/shared';
import { useChannelsStore } from '@/stores/channels';
import { bffFetch } from '@/api/bff';

const { t } = useI18n();

const props = defineProps<{ name: ChannelName; visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useChannelsStore();
const meta = CHANNEL_META[props.name];
const config = ref<Record<string, unknown>>({});
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const testing = ref(false);
const testResult = ref<{ type: 'success' | 'error' | 'qr' | 'info'; message: string } | null>(null);
const wechatStatus = ref<{ bound: boolean } | null>(null);
let statusPollTimer: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => { if (statusPollTimer) clearInterval(statusPollTimer); });

async function testConnection(): Promise<void> {
  testing.value = true; testResult.value = null;
  try {
    await bffFetch(`/api/channels/${props.name}/test`, { method: 'POST' });
    testResult.value = { type: 'success', message: t('channels.test.success') };
  } catch (err) {
    testResult.value = { type: 'error', message: (err as Error).message || t('channels.test.failed') };
  } finally { testing.value = false; }
}

async function checkWechatStatus(): Promise<void> {
  try { wechatStatus.value = await bffFetch<{ bound: boolean }>('/api/channels/wechat/status'); }
  catch { wechatStatus.value = { bound: false }; }
}

async function bindWechat(): Promise<void> {
  testing.value = true; testResult.value = null;
  try {
    const data = await bffFetch<{ qrUrl?: string; instruction?: string; error?: string; message?: string }>('/api/channels/wechat/bind', { method: 'POST' });
    if (data.error) { testResult.value = { type: 'error', message: data.message || data.error }; }
    else if (data.qrUrl) {
      const qrDataUrl = await toDataURL(data.qrUrl, { width: 256, margin: 1 });
      testResult.value = { type: 'qr', message: qrDataUrl };
      if (statusPollTimer) clearInterval(statusPollTimer);
      statusPollTimer = setInterval(async () => {
        await checkWechatStatus();
        if (wechatStatus.value?.bound) { if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null; } testResult.value = { type: 'success', message: t('channels.wechat.bindSuccess') }; }
      }, 3000);
    } else { testResult.value = { type: 'info', message: data.instruction || t('channels.wechat.checkGatewayLogs') }; }
  } catch (err: unknown) { testResult.value = { type: 'error', message: (err instanceof Error ? err.message : String(err)) || t('channels.wechat.bindFailed') }; }
  finally { testing.value = false; }
}

async function waitForGateway(maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const gw = await bffFetch<{ running: boolean }>('/api/gateway/status');
      if (gw.running) return true;
    } catch { /* keep waiting */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return false;
}

watch(() => [props.name, props.visible], async ([name, vis]) => {
  if (!vis || !name) return;
  loading.value = true; errorMsg.value = null; testResult.value = null;
  try {
    const cfg = await store.fetchConfig(name as ChannelName);
    config.value = { ...cfg as unknown as Record<string, unknown> };
  } catch { errorMsg.value = t('channels.config.loadFailed'); }
  finally { loading.value = false; }
  if (name === 'wechat') checkWechatStatus();
}, { immediate: true });

const isSaving = computed(() => store.saving === props.name);

async function save(): Promise<void> {
  errorMsg.value = null;
  try {
    await store.saveConfig(props.name, config.value as unknown as ChannelConfig);
    const shouldRestart = config.value.enabled && store.enabledCount > 0;
    if (shouldRestart) {
      try { await store.restartGateway(); } catch { /* non-critical */ }
    }
    if (props.name === 'wechat' && config.value.enabled) {
      // Wait for gateway to be ready, then auto-bind
      if (shouldRestart) await waitForGateway();
      await bindWechat();
      return; // keep drawer open to show QR code
    }
    emit('close');
  } catch { errorMsg.value = t('channels.config.saveFailed'); }
}

const FIELD_LABELS: Record<string, string> = {
  enabled: t('channels.config.fields.enabled'),
  botToken: t('channels.config.fields.botToken'),
  appId: t('channels.config.fields.appId'),
  appSecret: t('channels.config.fields.appSecret'),
  botId: t('channels.config.fields.botId'),
  botSecret: t('channels.config.fields.botSecret'),
  accessToken: t('channels.config.fields.accessToken'),
  homeserver: t('channels.config.fields.homeserver'),
  atMention: t('channels.config.fields.atMention'),
  emojiReaction: t('channels.config.fields.emojiReaction'),
  freeReply: t('channels.config.fields.freeReply'),
  autoThread: t('channels.config.fields.autoThread'),
  mentionControl: t('channels.config.fields.mentionControl'),
  handleBotMessages: t('channels.config.fields.handleBotMessages'),
  mentionMode: t('channels.config.fields.mentionMode'),
  channelWhitelist: t('channels.config.fields.channelWhitelist'),
  channelBlacklist: t('channels.config.fields.channelBlacklist'),
  token: t('channels.config.fields.token'),
  encodingAESKey: t('channels.config.fields.encodingAESKey'),
};
const BOOLEAN_FIELDS = new Set(['enabled', 'atMention', 'emojiReaction', 'freeReply', 'autoThread', 'mentionControl', 'handleBotMessages']);
const TOKEN_FIELDS = new Set(['botToken', 'appSecret', 'botSecret', 'accessToken', 'encodingAESKey']);
const ARRAY_FIELDS = new Set(['channelWhitelist', 'channelBlacklist']);

function fieldLabel(k: string): string { return FIELD_LABELS[k] ?? k; }
function isBool(k: string): boolean { return BOOLEAN_FIELDS.has(k); }
function isToken(k: string): boolean { return TOKEN_FIELDS.has(k); }
function isArr(k: string): boolean { return ARRAY_FIELDS.has(k); }
function visibleKeys(): string[] { return Object.keys(config.value); }
function arrStr(key: string): string { const v = config.value[key]; return Array.isArray(v) ? v.join(', ') : String(v ?? ''); }
function setArr(key: string, val: string): void { config.value[key] = val.split(',').map(s => s.trim()).filter(Boolean); }

async function onEnableToggle(enabled: boolean): Promise<void> {
  config.value.enabled = enabled;
  if (!enabled) return; // just disabling, no auto-flow needed

  // Auto-bind flow: save → restart gateway → test/bind
  errorMsg.value = null;
  testResult.value = null;

  try {
    // Step 1: Auto-save the config
    await store.saveConfig(props.name, config.value as unknown as ChannelConfig);

    // Step 2: Restart gateway
    await store.restartGateway();

    // Wait for gateway to be ready
    await waitForGateway();

    // Step 3: Channel-specific binding action
    if (props.name === 'wechat') {
      await bindWechat();
    } else {
      await testConnection();
    }
  } catch (err) {
    errorMsg.value = (err as Error).message;
  }
}

const SETUP_GUIDE_STEPS: Partial<Record<ChannelName, number>> = {
  telegram: 4, discord: 3, slack: 3, feishu: 3, wechat: 3, whatsapp: 3, matrix: 3, wecom: 4,
};
</script>

<template>
  <NDrawer :show="visible" :width="480" placement="right" @update:show="emit('close')">
    <NDrawerContent :title="`${meta.icon} ${meta.label} ${t('channels.config.drawerTitle')}`" closable>
      <NSpin v-if="loading" />
      <template v-else>
        <!-- Setup guide (shown first for unconfigured channels) -->
        <div v-if="SETUP_GUIDE_STEPS[props.name]" class="mb-4 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_4%,var(--bg-elevate))] border border-[color-mix(in_srgb,var(--brand-500)_12%,var(--border))]">
          <p class="text-xs font-semibold text-[var(--brand-600)] mb-2">{{ t('channels.setupGuide') }}</p>
          <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
            <li v-for="i in SETUP_GUIDE_STEPS[props.name]" :key="i">{{ t('channels.guide.' + props.name + '.' + i) }}</li>
          </ol>
          <template v-if="props.name === 'wechat'">
            <p class="text-xs text-[var(--text-3)] mt-2">{{ t('channels.wechat.autoNote') }}</p>
          </template>
        </div>

        <NForm label-placement="top">
          <NFormItem v-for="key in visibleKeys()" :key="key" :label="fieldLabel(key)">
            <template v-if="key === 'enabled'">
              <NSwitch :value="!!config[key]" :disabled="isSaving || store.saving === 'gateway'" :loading="store.saving === 'gateway'" @update:value="onEnableToggle" />
              <span v-if="store.saving === 'gateway'" class="ml-2 text-xs text-[var(--text-3)]">{{ t('channels.autoBinding') }}</span>
            </template>
            <NSwitch v-else-if="isBool(key)" :value="!!config[key]" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isToken(key)" type="password" show-password-on="click" :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isArr(key)" type="textarea" :value="arrStr(key)" :disabled="isSaving" :autosize="{ minRows: 2, maxRows: 4 }" @update:value="val => setArr(key, val)" />
            <NInput v-else :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
          </NFormItem>
        </NForm>

        <p v-if="errorMsg" class="text-xs text-red-500 mt-3">{{ errorMsg }}</p>

        <!-- Auto-binding progress indicator -->
        <div v-if="store.saving === 'gateway'" class="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)]">
          <span class="animate-spin text-sm">⚙️</span>
          <span class="text-xs text-[var(--brand-600)]">{{ t('channels.autoBinding') }}</span>
        </div>

        <!-- Actions bar -->
        <div class="flex gap-2 mt-3 flex-wrap">
          <NButton size="tiny" :loading="testing" @click="testConnection">{{ t('channels.test.trigger') }}</NButton>
          <template v-if="props.name === 'wechat'">
            <NButton size="tiny" type="primary" :loading="testing" @click="bindWechat">{{ t('channels.wechat.getQr') }}</NButton>
            <NButton size="tiny" @click="checkWechatStatus">{{ t('channels.wechat.checkStatus') }}</NButton>
          </template>
        </div>

        <!-- WeChat status -->
        <div v-if="wechatStatus" class="mt-2 text-xs px-3 py-2 rounded-lg"
          :class="wechatStatus.bound ? 'bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] text-[var(--color-success)]' : 'bg-[color-mix(in_srgb,var(--text-3)_8%,transparent)] text-[var(--text-3)]'">
          {{ wechatStatus.bound ? t('channels.wechat.bound') : t('channels.wechat.notBound') }}
        </div>

        <!-- Test result -->
        <div v-if="testResult" class="mt-2 p-3 rounded-lg text-xs"
          :class="{
            'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]': testResult.type === 'success',
            'bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] text-[var(--color-error)]': testResult.type === 'error',
            'bg-[color-mix(in_srgb,var(--brand-500)_8%,transparent)] text-[var(--brand-600)]': testResult.type === 'qr',
            'bg-[color-mix(in_srgb,var(--bg-elevate)_80%,transparent)] text-[var(--text-2)]': testResult.type === 'info',
          }">
          <template v-if="testResult.type === 'qr'">
            <p class="font-semibold mb-3 text-center">{{ t('channels.wechat.scanTitle') }}</p>
            <div class="flex justify-center mb-3">
              <img :src="testResult.message" alt="WeChat QR" class="rounded-xl border border-[var(--border)] bg-white p-2" width="256" height="256" />
            </div>
          </template>
          <template v-else>{{ testResult.message }}</template>
        </div>

        <!-- Actions footer -->
        <div class="mt-4 flex items-center gap-2 flex-wrap">
          <NButton type="primary" size="small" :loading="isSaving" :disabled="isSaving" @click="save">{{ t('common.save') }}</NButton>
          <NButton size="small" @click="emit('close')">{{ t('common.cancel') }}</NButton>
          <span v-if="store.enabledCount > 0" class="text-xs text-[var(--brand-500)] cursor-pointer hover:underline" @click="store.restartGateway()">{{ t('channels.config.restartNow') }}</span>
        </div>
        <p class="text-xs text-[var(--text-3)] mt-2">{{ t('channels.config.restartHint') }}</p>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
