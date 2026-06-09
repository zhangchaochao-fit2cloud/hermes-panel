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
const bindSuccess = ref(false); // persistent success state
const bindingStep = ref<string | null>(null); // current step text for progress display
const qrFetching = ref(false); // loading state while fetching QR from iLink

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
  // Uses the generic /api/channels/:name/status endpoint
  const name = props.name;
  if (name !== 'wechat' && name !== 'whatsapp') { wechatStatus.value = { bound: false }; return; }
  try { wechatStatus.value = await bffFetch<{ bound: boolean }>(`/api/channels/${name}/status`); }
  catch { wechatStatus.value = { bound: false }; }
}

/** Generic QR binding for bindable channels (wechat, whatsapp).
 * Uses the same iLink API pattern, with channel-specific BFF routes. */
async function bindQrChannel(channelName: string): Promise<void> {
  qrFetching.value = true;
  testing.value = true; testResult.value = null;
  try {
    // Step 1: Get QR code from iLink API
    const qrData = await bffFetch<{ qrcode?: string; qrcode_url?: string; bound?: boolean; error?: string; message?: string }>(`/api/channels/${channelName}/qrcode`);
    qrFetching.value = false;

    if (qrData.bound) {
      bindSuccess.value = true;
      testResult.value = { type: 'success', message: t(`channels.${channelName}.bindSuccess`) };
      store.fetchAll();
    } else if (qrData.error) {
      testResult.value = { type: 'error', message: qrData.message || qrData.error };
    } else if (qrData.qrcode) {
      // iLink returns: qrcode (hex poll token) + scan_url (liteapp URL)
      // Generate QR code from the scan_url so WeChat can trigger the binding flow
      const qrToken = qrData.qrcode;
      const scanUrl = (qrData as any).scan_url || qrData.qrcode_url || '';
      const qrDisplaySrc = scanUrl
        ? await toDataURL(scanUrl, { width: 256, margin: 1 })
        : await toDataURL(qrToken, { width: 256, margin: 1 });
      testResult.value = { type: 'qr', message: qrDisplaySrc };

      // Step 2: Poll bind status
      const currentQrcode = qrData.qrcode;
      if (statusPollTimer) clearInterval(statusPollTimer);
      statusPollTimer = setInterval(async () => {
        try {
          const statusData = await bffFetch<{ status?: string; bound?: boolean; needsGatewayRestart?: boolean; message?: string }>(
            `/api/channels/${channelName}/bind`,
            { method: 'POST', body: JSON.stringify({ qrcode: currentQrcode }) }
          );

          if (statusData.status === 'confirmed' || statusData.bound) {
            if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null; }
            bindSuccess.value = true;
            testResult.value = { type: 'success', message: t(`channels.${channelName}.bindSuccess`) };

            // Step 3: Restart gateway to pick up new credentials
            bindingStep.value = t('channels.bindSteps.restarting');
            await store.restartGateway().finally(() => { bindingStep.value = null; });

            // Step 4: Auto-pair the bot — poll for pairing codes and auto-approve
            bindingStep.value = t('channels.bindSteps.pairing');
            try {
              const pairRes = await bffFetch<{ autoPaired?: boolean }>(`/api/channels/${channelName}/auto-pair`, { method: 'POST' });
              if (pairRes.autoPaired) {
                bindingStep.value = null;
              }
            } catch { /* auto-pair is best-effort */ }
            finally { bindingStep.value = null; }

            store.fetchAll();
          } else if (statusData.status === 'expired' || statusData.status === 'cancelled') {
            if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null; }
            testResult.value = { type: 'error', message: t(`channels.${channelName}.qrExpired`) };
          }
        } catch {
          // keep polling on transient errors
        }
      }, 3000);
    } else {
      testResult.value = { type: 'error', message: t(`channels.${channelName}.bindFailed`) };
    }
  } catch (err: unknown) {
    qrFetching.value = false;
    testResult.value = { type: 'error', message: (err instanceof Error ? err.message : String(err)) || t(`channels.${channelName}.bindFailed`) };
  } finally { testing.value = false; }
}




watch(() => [props.name, props.visible], async ([name, vis]) => {
  if (!vis || !name) return;
  loading.value = true; errorMsg.value = null; testResult.value = null; bindSuccess.value = false;
  try {
    const cfg = await store.fetchConfig(name as ChannelName);
    config.value = { ...cfg as unknown as Record<string, unknown> };
  } catch { errorMsg.value = t('channels.config.loadFailed'); }
  finally { loading.value = false; }
  // If already bound, show the success state on re-entry
  const bindableChannels = ['wechat', 'whatsapp'];
  if (bindableChannels.includes(name as string) || name === 'wechat') {
    await checkWechatStatus();
    if (wechatStatus.value?.bound) {
      bindSuccess.value = true;
      testResult.value = { type: 'success', message: t('channels.wechat.bindSuccess') };
    }
  }
}, { immediate: true });

const isSaving = computed(() => store.saving === props.name);

async function save(): Promise<void> {
  errorMsg.value = null;
  try {
    await store.saveConfig(props.name, config.value as unknown as ChannelConfig);
    emit('close');
  } catch { /* save error handled by store */ }
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
  if (!enabled) { bindingStep.value = null; return; }

  // Save config, then BFF handles gateway start + QR in one call.
  errorMsg.value = null;
  testResult.value = null;

  try {
    bindingStep.value = t('channels.bindSteps.saving');
    await store.saveConfig(props.name, config.value as unknown as ChannelConfig);

    if (props.name === 'wechat' || props.name === 'whatsapp') {
      bindingStep.value = t('channels.bindSteps.gettingQr');
      await bindQrChannel(props.name);
    } else {
      // Token-based channels: save → restart gateway → test connection
      bindingStep.value = t('channels.bindSteps.restarting');
      await store.restartGateway().finally(() => { bindingStep.value = null; });
      bindingStep.value = t('channels.bindSteps.testing');
      await testConnection();
    }
  } catch (err) {
    errorMsg.value = (err as Error).message;
  } finally {
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
        </div>

        <NForm label-placement="top">
          <NFormItem v-for="key in visibleKeys()" :key="key" :label="fieldLabel(key)">
            <template v-if="key === 'enabled'">
              <NSwitch :value="!!config[key]" :disabled="isSaving || !!bindingStep" :loading="!!bindingStep" @update:value="onEnableToggle" />
              <span v-if="bindingStep" class="ml-2 text-xs text-[var(--text-3)]">{{ bindingStep }}</span>
            </template>
            <NSwitch v-else-if="isBool(key)" :value="!!config[key]" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isToken(key)" type="password" show-password-on="click" :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isArr(key)" type="textarea" :value="arrStr(key)" :disabled="isSaving" :autosize="{ minRows: 2, maxRows: 4 }" @update:value="val => setArr(key, val)" />
            <NInput v-else :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
          </NFormItem>
        </NForm>

        <p v-if="errorMsg" class="text-xs text-red-500 mt-3">{{ errorMsg }}</p>

        <!-- Auto-binding progress indicator -->
        <div v-if="bindingStep || qrFetching" class="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--brand-500)_6%,transparent)]">
          <span class="animate-spin text-sm">⚙️</span>
          <span class="text-xs text-[var(--brand-600)]">{{ qrFetching ? t('channels.wechat.gettingQr') : bindingStep }}</span>
        </div>

        <!-- Actions bar -->
        <div class="flex gap-2 mt-3 flex-wrap">
          <!-- Hide test button for QR-bindable channels — they use QR flow instead -->
          <NButton v-if="props.name !== 'wechat' && props.name !== 'whatsapp'" size="tiny" :loading="testing" @click="testConnection">{{ t('channels.test.trigger') }}</NButton>
          <template v-if="(props.name === 'wechat' || props.name === 'whatsapp') && !bindSuccess">
            <NButton size="tiny" type="primary" :loading="testing" @click="bindQrChannel(props.name)">{{ t('channels.' + props.name + '.getQr') }}</NButton>
            <NButton size="tiny" @click="checkWechatStatus">{{ t('channels.' + props.name + '.checkStatus') }}</NButton>
          </template>
        </div>

        <!-- WeChat status -->
        <div v-if="wechatStatus" class="mt-2 text-xs px-3 py-2 rounded-lg"
          :class="wechatStatus.bound ? 'bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] text-[var(--color-success)]' : 'bg-[color-mix(in_srgb,var(--text-3)_8%,transparent)] text-[var(--text-3)]'">
          {{ wechatStatus.bound ? t('channels.' + props.name + '.bound') : t('channels.' + props.name + '.notBound') }}
        </div>

        <!-- Test result -->
        <div v-if="testResult" class="mt-2 p-3 rounded-lg text-xs"
          :class="{
            'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]': testResult.type === 'success',
            'bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] text-[var(--color-error)]': testResult.type === 'error',
            'bg-[color-mix(in_srgb,var(--brand-500)_8%,transparent)] text-[var(--brand-600)]': testResult.type === 'qr',
            'bg-[color-mix(in_srgb,var(--bg-elevate)_80%,transparent)] text-[var(--text-2)]': testResult.type === 'info',
          }">
          <!-- QR code display -->
          <template v-if="testResult.type === 'qr'">
            <p class="font-semibold mb-3 text-center">{{ t('channels.' + props.name + '.scanTitle') }}</p>
            <div class="flex justify-center mb-3">
              <img :src="testResult.message" :alt="props.name + ' QR'" class="rounded-xl border border-[var(--border)] bg-white p-2" width="256" height="256" />
            </div>
            <p class="text-xs text-center text-[var(--text-3)] animate-pulse">{{ t('channels.scanWaiting') }}</p>
          </template>
          <!-- Text result for non-QR types -->
          <template v-else>{{ testResult.message }}</template>
        </div>


        <!-- Actions footer -->
        <div class="mt-4 flex items-center gap-2 flex-wrap">
          <NButton type="primary" size="small" :loading="isSaving" :disabled="isSaving" @click="save">{{ t('common.save') }}</NButton>
          <NButton size="small" @click="emit('close')">{{ t('common.cancel') }}</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
