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
const testing = ref(false);
const testResult = ref<string | null>(null);
const wechatStatus = ref<{ bound: boolean } | null>(null);

async function testConnection(): Promise<void> {
  testing.value = true; testResult.value = null;
  try {
    const res = await fetch(`/api/channels/${props.name}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Token': document.querySelector<HTMLMetaElement>('meta[name="panel-token"]')?.content ?? '' },
    });
    if (res.ok) { testResult.value = 'success'; }
    else { const j = await res.json().catch(() => ({ error: 'unknown' })); testResult.value = `failed: ${j.error || 'unknown error'}`; }
  } catch { testResult.value = 'failed: network error'; }
  finally { testing.value = false; }
}

async function checkWechatStatus(): Promise<void> {
  try {
    const res = await fetch('/api/channels/wechat/status', {
      headers: { 'X-Panel-Token': document.querySelector<HTMLMetaElement>('meta[name="panel-token"]')?.content ?? '' },
    });
    wechatStatus.value = await res.json();
  } catch { /**/ }
}

async function bindWechat(): Promise<void> {
  testing.value = true; testResult.value = null;
  try {
    const res = await fetch('/api/channels/wechat/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Token': document.querySelector<HTMLMetaElement>('meta[name="panel-token"]')?.content ?? '' },
    });
    const data = await res.json();
    if (data.qrUrl) {
      testResult.value = `qr:${data.qrUrl}`;
    } else {
      testResult.value = `请查看日志：${data.raw?.slice(0, 200) || '无输出'}`;
    }
  } catch { testResult.value = 'failed'; }
  finally { testing.value = false; }
}

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

        <div class="flex gap-2 mt-3 flex-wrap">
          <NButton size="tiny" :loading="testing" @click="testConnection">🔌 测试连接</NButton>
          <template v-if="props.name === 'wechat'">
            <NButton size="tiny" type="primary" :loading="testing" @click="bindWechat">📱 获取扫码链接</NButton>
            <NButton size="tiny" @click="checkWechatStatus">📋 检查绑定状态</NButton>
          </template>
        </div>
        <div v-if="wechatStatus" class="mt-2 text-xs" :class="wechatStatus.bound ? 'text-[var(--color-success)]' : 'text-[var(--text-3)]'">
          {{ wechatStatus.bound ? '✅ 已绑定微信' : '⚠️ 未绑定，点击「获取扫码链接」进行绑定' }}
        </div>
        <div v-if="testResult" class="mt-2 p-3 rounded-lg text-xs" :class="testResult === 'success' ? 'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]' : testResult?.startsWith('qr:') ? 'bg-[color-mix(in_srgb,var(--brand-500)_10%,transparent)] text-[var(--brand-600)]' : 'bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] text-[var(--color-error)]'">
          <template v-if="testResult === 'success'">✅ 连接成功，渠道配置正确</template>
          <template v-else-if="testResult.startsWith('failed:')">{{ testResult }}</template>
          <template v-else-if="testResult.startsWith('qr:')">
            <p class="font-semibold mb-1">📱 扫码绑定微信</p>
            <code class="block p-2 bg-[var(--bg-card)] rounded break-all text-xs">{{ testResult.slice(3) }}</code>
          </template>
        </div>

        <!-- Channel-specific setup guide -->
        <div class="mt-4 p-4 rounded-xl bg-[color-mix(in_srgb,var(--brand-500)_5%,var(--bg-elevate))] border border-[color-mix(in_srgb,var(--brand-500)_15%,var(--border))]">
          <p class="text-xs font-semibold text-[var(--brand-600)] mb-2">📖 如何获取配置信息</p>
          <template v-if="props.name === 'telegram'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>打开 Telegram 搜索 <code class="bg-[var(--bg-card)] px-1 rounded">@BotFather</code></li>
              <li>发送 <code class="bg-[var(--bg-card)] px-1 rounded">/newbot</code> 创建机器人</li>
              <li>将获得的 Token 粘贴到上方「Bot Token」字段</li>
              <li>保存后重启 Gateway，在 Telegram 中 @你的机器人 即可对话</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'discord'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>前往 <a href="https://discord.com/developers/applications" target="_blank" class="text-[var(--brand-500)] underline">Discord Developer Portal</a></li>
              <li>创建 Application → Bot → 获取 Token</li>
              <li>将 Bot 添加到服务器：OAuth2 → URL Generator → bot + Send Messages</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'slack'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>前往 <a href="https://api.slack.com/apps" target="_blank" class="text-[var(--brand-500)] underline">Slack API</a> 创建 App</li>
              <li>OAuth & Permissions → Bot Token Scopes → 添加 chat:write</li>
              <li>Install to Workspace → 获取 Bot Token</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'wechat'">
            <p class="text-xs text-[var(--text-2)] mb-2 font-semibold">所需操作：仅需填写 AppID 和 AppSecret 即可</p>
            <ol class="text-xs text-[var(--text-2)] space-y-1.5 list-decimal list-inside">
              <li>注册<a href="https://mp.weixin.qq.com" target="_blank" class="text-[var(--brand-500)] underline">微信公众平台</a>（服务号或订阅号），完成认证</li>
              <li>在公众平台「开发 → 基本配置」中获取 <strong>AppID</strong> 和 <strong>AppSecret</strong></li>
              <li>将获取的 AppID 和 AppSecret 填入上方表单</li>
              <li><strong>Token 和 EncodingAESKey 已自动生成</strong>，无需手动填写</li>
              <li>保存后重启 Gateway → 点击「📱 获取扫码链接」→ 用微信扫描完成绑定</li>
            </ol>
            <p class="text-xs text-[var(--text-3)] mt-2">⚠️ 微信渠道需要 Hermes Gateway 安装微信插件（pip install qrcode[pil] 并配置 iLink Bot API）。Gateway 启动后会自动读取 config.yaml 中的配置，无需手动编辑。</p>
          </template>
          <template v-else-if="props.name === 'feishu'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>前往 <a href="https://open.feishu.cn/app" target="_blank" class="text-[var(--brand-500)] underline">飞书开放平台</a> 创建应用</li>
              <li>获取 App ID 和 App Secret</li>
              <li>添加机器人能力 → 配置事件订阅</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'whatsapp'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>Hermes Gateway 使用 <code class="bg-[var(--bg-card)] px-1 rounded">whatsapp-web.js</code> 通过 QR 码登录</li>
              <li>启用后重启 Gateway，在 Gateway 日志中查看 QR 码</li>
              <li>用 WhatsApp 手机客户端扫描 QR 码完成绑定</li>
              <li>mentionMode: <code class="bg-[var(--bg-card)] px-1 rounded">always</code> 始终 @机器人 / <code class="bg-[var(--bg-card)] px-1 rounded">at_mention</code> 仅被 @时回复 / <code class="bg-[var(--bg-card)] px-1 rounded">never</code> 不回复</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'matrix'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>需要一个 Matrix 账号和 Homeserver URL（默认 <code class="bg-[var(--bg-card)] px-1 rounded">matrix.org</code>）</li>
              <li>Access Token：在 Matrix 客户端 (Element) 中 Settings → Help & About → Access Token</li>
              <li>Homeserver：你的 Matrix 服务器地址</li>
              <li>启用 <code class="bg-[var(--bg-card)] px-1 rounded">autoThread</code> 可自动为每条消息创建独立线程</li>
            </ol>
          </template>
          <template v-else-if="props.name === 'wecom'">
            <ol class="text-xs text-[var(--text-2)] space-y-1 list-decimal list-inside">
              <li>前往<a href="https://work.weixin.qq.com" target="_blank" class="text-[var(--brand-500)] underline">企业微信管理后台</a></li>
              <li>「应用管理 → 创建应用」获取 AgentId 和 Secret</li>
              <li>Bot ID 即企业 ID (CorpId)，在「我的企业」页面查看</li>
              <li>配置「接收消息」回调 URL 指向 Hermes Gateway 地址</li>
            </ol>
          </template>
          <template v-else>
            <p class="text-xs text-[var(--text-2)]">请填写上方配置信息，保存后重启 Gateway 使配置生效。</p>
          </template>
        </div>

        <p class="text-xs text-[var(--text-3)] mt-3 leading-relaxed">
          💡 {{ t('channels.config.restartHint') }}
          <span v-if="store.enabledCount > 0" class="text-[var(--brand-500)] cursor-pointer hover:underline" @click="store.restartGateway()">{{ t('channels.config.restartNow') }}</span>
          <span class="mx-1">·</span>
          <a href="#/developer" class="text-[var(--brand-500)] underline" @click="emit('close')">查看 Gateway 日志 →</a>
        </p>

        <div class="flex gap-3 mt-4">
          <NButton type="primary" :loading="isSaving" :disabled="isSaving" @click="save">{{ t('common.save') }}</NButton>
          <NButton @click="emit('close')">{{ t('common.cancel') }}</NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
