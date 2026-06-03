<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import {
  NDrawer, NDrawerContent, NForm, NFormItem, NSwitch,
  NInput, NButton, NSpin,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
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
  try {
    wechatStatus.value = await bffFetch<{ bound: boolean }>('/api/channels/wechat/status');
  } catch { wechatStatus.value = { bound: false }; }
}

async function bindWechat(): Promise<void> {
  testing.value = true; testResult.value = null;
  try {
    const data = await bffFetch<{ qrUrl?: string; raw?: string }>('/api/channels/wechat/bind', { method: 'POST' });
    if (data.qrUrl) {
      testResult.value = { type: 'qr', message: data.qrUrl };
      if (statusPollTimer) clearInterval(statusPollTimer);
      statusPollTimer = setInterval(async () => {
        await checkWechatStatus();
        if (wechatStatus.value?.bound) {
          if (statusPollTimer) clearInterval(statusPollTimer);
          testResult.value = { type: 'success', message: t('channels.wechat.bindSuccess') };
        }
      }, 3000);
    } else {
      testResult.value = { type: 'info', message: data.raw?.slice(0, 300) || t('channels.wechat.noQrOutput') };
    }
  } catch (err: unknown) {
    const msg = (err instanceof Error) ? err.message : String(err);
    testResult.value = { type: 'error', message: msg || t('channels.wechat.bindFailed') };
  } finally { testing.value = false; }
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

const SETUP_GUIDE: Partial<Record<ChannelName, Array<{ text: string }>>> = {
  telegram: [
    { text: '打开 Telegram 搜索 @BotFather' },
    { text: '发送 /newbot 创建机器人' },
    { text: '将获得的 Token 粘贴到上方「Bot Token」字段' },
    { text: '保存后重启 Gateway，在 Telegram 中 @你的机器人 即可对话' },
  ],
  discord: [
    { text: '前往 Discord Developer Portal 创建 Application' },
    { text: 'Bot 页面获取 Token' },
    { text: 'OAuth2 → URL Generator → bot + Send Messages → 添加到服务器' },
  ],
  slack: [
    { text: '前往 Slack API 创建 App' },
    { text: 'OAuth & Permissions → Bot Token Scopes → 添加 chat:write' },
    { text: 'Install to Workspace → 获取 Bot Token' },
  ],
  feishu: [
    { text: '前往飞书开放平台创建应用' },
    { text: '获取 App ID 和 App Secret' },
    { text: '添加机器人能力 → 配置事件订阅' },
  ],
  whatsapp: [
    { text: '启用后重启 Gateway，查看日志中的 QR 码' },
    { text: '用 WhatsApp 扫描 QR 码完成绑定' },
    { text: 'mentionMode: always (始终回复) / at_mention (仅被@时回复) / never (不回复)' },
  ],
  matrix: [
    { text: '需要一个 Matrix 账号和 Homeserver URL（默认 matrix.org）' },
    { text: 'Access Token：在 Element 客户端 Settings → Help & About 获取' },
    { text: '启用 autoThread 可自动为每条消息创建独立线程' },
  ],
  wecom: [
    { text: '前往企业微信管理后台' },
    { text: '「应用管理 → 创建应用」获取 AgentId 和 Secret' },
    { text: 'Bot ID 即企业 ID (CorpId)，在「我的企业」页面查看' },
    { text: '配置「接收消息」回调 URL 指向 Hermes Gateway 地址' },
  ],
};
</script>

<template>
  <NDrawer :show="visible" :width="480" placement="right" @update:show="emit('close')">
    <NDrawerContent :title="`${meta.icon} ${meta.label} ${t('channels.config.drawerTitle')}`" closable>
      <NSpin v-if="loading" />
      <template v-else>
        <!-- Setup guide (shown first for unconfigured channels) -->
        <div v-if="SETUP_GUIDE[props.name]" class="mb-4 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_4%,var(--bg-elevate))] border border-[color-mix(in_srgb,var(--brand-500)_12%,var(--border))]">
          <p class="text-xs font-semibold text-[var(--brand-600)] mb-2">{{ t('channels.setupGuide') }}</p>
          <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
            <li v-for="(s, i) in SETUP_GUIDE[props.name]" :key="i">{{ s.text }}</li>
          </ol>
          <template v-if="props.name === 'wechat'">
            <p class="text-xs text-[var(--text-3)] mt-2">{{ t('channels.wechat.autoNote') }}</p>
          </template>
        </div>

        <NForm label-placement="top">
          <NFormItem v-for="key in visibleKeys()" :key="key" :label="fieldLabel(key)">
            <NSwitch v-if="isBool(key)" :value="!!config[key]" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isToken(key)" type="password" show-password-on="click" :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
            <NInput v-else-if="isArr(key)" type="textarea" :value="arrStr(key)" :disabled="isSaving" :autosize="{ minRows: 2, maxRows: 4 }" @update:value="val => setArr(key, val)" />
            <NInput v-else :value="String(config[key] ?? '')" :disabled="isSaving" @update:value="val => config[key] = val" />
          </NFormItem>
        </NForm>

        <p v-if="errorMsg" class="text-xs text-red-500 mt-3">{{ errorMsg }}</p>

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
            <p class="font-semibold mb-2">{{ t('channels.wechat.scanTitle') }}</p>
            <p class="mb-2">{{ t('channels.wechat.scanHint') }}</p>
            <a :href="testResult.message" target="_blank" rel="noopener"
              class="inline-block px-3 py-2 rounded-lg bg-[var(--brand-500)] text-white text-xs font-medium hover:bg-[var(--brand-600)] transition-colors mb-2">
              🔗 {{ t('channels.wechat.openLink') }}
            </a>
            <div class="bg-[var(--bg-card)] rounded p-2 mt-2 break-all font-mono text-[11px] text-[var(--text-2)] max-h-[80px] overflow-y-auto">
              {{ testResult.message }}
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
