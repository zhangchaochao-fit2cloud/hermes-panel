<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch, nextTick, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { NDropdown, NSpin, useMessage } from 'naive-ui';
import { useSessionStore } from '@/stores/session';
import { useChatStreamStore } from '@/stores/chat-stream';
import { useSystemStore } from '@/stores/system';
import { bffFetch } from '@/api/bff';
import { useBreakpoint } from '@/composables/use-breakpoint';
import { absoluteTime } from '@/utils/relative-time';
import type { ChatMessage } from '@hermes-panel/shared';
import MessageBubble from '@/components/chat/MessageBubble.vue';
import ChatNavigator from '@/components/chat/ChatNavigator.vue';
import ChatFindBar from '@/components/chat/ChatFindBar.vue';
import Composer from '@/components/chat/Composer.vue';
import TaskProgressPanel from '@/components/chat/TaskProgressPanel.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import RoleTeamBar from '@/components/chat/RoleTeamBar.vue';
import PromptTemplatesBar from '@/components/chat/PromptTemplatesBar.vue';
import ToolsStatusBar from '@/components/chat/ToolsStatusBar.vue';
import ChatSessionsDrawer from '@/components/chat/ChatSessionsDrawer.vue';
import ViewErrorBoundary from '@/components/shared/ViewErrorBoundary.vue';
import { useSessionsStore } from '@/stores/sessions';
import { useAssistantOptions } from '@/composables/useAssistantOptions';
import { useCronAggregateView } from '@/composables/useCronAggregateView';
import { useChatExport } from '@/composables/useChatExport';
import { detectMention, type RoleDef } from '@/data/roles';
import { useWorkspacesStore } from '@/stores/workspaces';
import { getToolEditSummary } from '@/utils/tool-call-facts';

const { t } = useI18n();
const session = useSessionStore();
const stream = useChatStreamStore();
const system = useSystemStore();
const sessionsList = useSessionsStore();
const message = useMessage();
const route = useRoute();
const router = useRouter();

const { messages } = storeToRefs(session);
const { state, lastError, lastErrorCode, charsPerSec } = storeToRefs(stream);

const model = ref(localStorage.getItem('panel.chat.lastModel') || 'hermes-agent');
const thinkingSpeed = ref<'fast' | 'extended' | 'auto'>((localStorage.getItem('panel.chat.lastThinkingSpeed') as 'fast' | 'extended' | 'auto') || 'auto');
const sending = ref(false);
const lastSentText = ref('');
const resumingSession = ref(false);
const scroller = ref<HTMLElement | null>(null);
const scrolledUp = ref(false);
const compressing = ref(false);

async function handleCompress(): Promise<void> {
  const sid = session.sessionId;
  if (!sid || compressing.value) return;
  compressing.value = true;
  try {
    const result = await bffFetch<{ savedTokens: number; compressedCount: number }>(`/api/sessions/${sid}/compress`, { method: 'POST' });
    message.success(t('chat.compressSuccess', { count: result.compressedCount, tokens: result.savedTokens.toLocaleString() }), { duration: 3000 });
    // Reload session to get compressed messages
    await loadSession(sid);
  } catch { message.warning(t('chat.compressFailed')); }
  finally { compressing.value = false; }
}

function onScroll(): void {
  const el = scroller.value;
  if (!el) return;
  scrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
}
function scrollToBottom(): void {
  const el = scroller.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  scrolledUp.value = false;
}
const composerRef = ref<InstanceType<typeof Composer> | null>(null);
const taskPanelOpen = ref(false);

const workspaces = useWorkspacesStore();
function summon(role: RoleDef): void {
  composerRef.value?.prependMention(role.id);
}

// 顶部 header 用：当前 session 标题 + token 计费
// title 从 sessionsList 拉（后端已经会基于首条 user message 智能生成），
// 没找到时 fallback 到 i18n 占位。
const currentSessionMeta = computed(() => {
  const id = session.sessionId;
  if (!id) return null;
  return sessionsList.items.find(s => s.id === id) ?? null;
});
function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// 从最后一条已完成 assistant message 中解析 A/B/C 行首选项 — 见 useAssistantOptions.ts
const { options: lastAssistantOptions, pick: pickOption } = useAssistantOptions(
  messages,
  composerRef as Ref<{ setText?: (v: string) => void } | null>,
);

const changedFilesSummary = computed(() => {
  const summaries = messages.value
    .flatMap(msg => msg.toolCalls ?? [])
    .map(getToolEditSummary)
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  if (summaries.length === 0) return null;
  const files = new Set(summaries.flatMap(summary => summary.files.map(file => file.path)));
  return {
    files: files.size,
    additions: summaries.reduce((sum, summary) => sum + summary.additions, 0),
    deletions: summaries.reduce((sum, summary) => sum + summary.deletions, 0),
  };
});

// Sessions drawer: collapsed state persisted to localStorage
const { isMobile } = useBreakpoint();

const SIDEBAR_KEY = 'panel.chat.sidebar.collapsed';
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === '1');
watch(sidebarCollapsed, v => {
  localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0');
});

watch(model, v => { localStorage.setItem('panel.chat.lastModel', v); });
watch(thinkingSpeed, v => { localStorage.setItem('panel.chat.lastThinkingSpeed', v); });

// hover toolbar 首次发现提示 — 用户进 chat 时显示一行小灰提示
// "💡 hover 消息可复制/编辑/分支"；点 ✕ 后 localStorage 持久化不再显
const HOVER_HINT_KEY = 'panel.chat.hoverHintDismissed';
const hoverHintDismissed = ref(localStorage.getItem(HOVER_HINT_KEY) === '1');
function dismissHoverHint(): void {
  hoverHintDismissed.value = true;
  localStorage.setItem(HOVER_HINT_KEY, '1');
}

function onSelectSession(id: string): void {
  // 移动端选完自动关 drawer，让会话占满屏
  if (window.matchMedia('(max-width: 767.98px)').matches) {
    sidebarCollapsed.value = true;
  }
  if (session.sessionId === id) return;
  void loadSession(id);
}

function onTemplatePick(content: string): void {
  composerRef.value?.setText(content);
}

// 会话分支 fork — 见 session.branchAt + onMessageBranch handler（行 391）

function appendComposerText(content: string): void {
  composerRef.value?.appendText(content);
}

function onSelectCronAggregate(jobId: string): void {
  if (window.matchMedia('(max-width: 767.98px)').matches) {
    sidebarCollapsed.value = true;
  }
  void router.push({ path: '/chat', query: { cron: jobId } });
}

function onNewChat(): void {
  session.reset();
  // Drop query state so a subsequent reload doesn't re-pop the old session.
  if (route.query.resume || route.query.cron || route.query.new) {
    void router.replace({ path: '/chat' });
  }
  composerRef.value?.focus();
}

interface SessionDetail {
  id: string;
  title: string;
  model: string;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    reasoning?: string;
    toolName?: string;
    timestamp: number;
  }>;
}

async function loadSession(id: string): Promise<void> {
  resumingSession.value = true;
  try {
    const detail = await bffFetch<SessionDetail>(`/api/sessions/${id}`);
    session.reset();
    session.sessionId = id;
    if (detail.model) model.value = detail.model;
    for (const m of detail.messages) {
      if (m.role === 'user') {
        const um = session.appendUserMessage(m.content);
        um.createdAt = m.timestamp;
      } else if (m.role === 'assistant') {
        const am = session.startAssistantMessage();
        am.content = m.content;
        am.reasoning = m.reasoning ?? undefined;
        am.completed = true;
        am.createdAt = m.timestamp;
      }
      // tool / system roles are skipped from rendering for now
    }
    message.success(t('chat.resumed', { id: id.slice(0, 8) }), { duration: 2000 });
  } catch (err) {
    message.error(t('chat.resumeFailed', { error: (err as Error).message }), { duration: 5000 });
    // 失效的 session（如 tray Pinned 指向已删除会话）— 清掉 URL query 跳到新会话状态
    if (route.query.resume) void router.replace({ path: '/chat' });
  } finally {
    resumingSession.value = false;
  }
}

// cron 合并视图（virtual session） — 见 useCronAggregateView.ts
const cronView = useCronAggregateView({ resumingFlag: resumingSession, modelRef: model });
const isVirtualSession = cronView.isVirtual;
const currentCronJob = cronView.currentJob;
async function loadCronAggregate(jobId: string): Promise<void> {
  const { runs } = await cronView.load(
    jobId,
    (n, date) => t('chat.cronAggregate.runSeparator', { n, date }),
  );
  if (runs === 0) message.warning(t('chat.cronAggregate.empty'), { duration: 2500 });
}

interface DraftResponse {
  draft: { prompt: string; source: string; stagedAt: number } | null;
}

async function pickUpDraft(): Promise<void> {
  try {
    const r = await bffFetch<DraftResponse>('/api/draft', { silent: true });
    if (r.draft?.prompt) {
      composerRef.value?.setText(r.draft.prompt);
      message.info(t('chat.draftLoaded', { source: r.draft.source }), { duration: 2500 });
      // Consume so we don't re-fill on the next mount
      await bffFetch('/api/draft', { method: 'DELETE', silent: true }).catch(() => { /* ignore */ });
    }
  } catch {
    // Silent — BFF unreachable or no draft, neither is fatal
  }
}

onMounted(async () => {
  await Promise.all([system.refresh(), system.loadToken()]);
  if (system.error) {
    message.error(t('chat.initFailed', { error: system.error }), { duration: 0, closable: true });
  }

  const resumeId = route.query.resume as string | undefined;
  const cronJobId = route.query.cron as string | undefined;
  const newChatToken = route.query.new as string | undefined;
  if (newChatToken) {
    onNewChat();
  } else if (cronJobId) {
    // 先确保 sessions list 已加载，才能筛该 job 所有 cron sessions
    if (!sessionsList.initialized) await sessionsList.load({ initial: true });
    await loadCronAggregate(cronJobId);
  } else if (resumeId) {
    await loadSession(resumeId);
  } else {
    // Only pick up IDE draft when not resuming a specific session
    await pickUpDraft();
  }

  // 进 chat 立即 focus composer 让用户能马上输入；
  // 已有消息时再确保滚到底（loadSession 内有 messages watch 触发 scroll，
  // 但 onMounted 完成时 watch 第一次还没跑 — 显式补一次更稳）。
  await nextTick();
  if (messages.value.length > 0 && scroller.value) {
    scroller.value.scrollTop = scroller.value.scrollHeight;
  }
  // virtual session 是只读，不 focus composer 避免误导
  if (!isVirtualSession.value) {
    composerRef.value?.focus();
  }
});

// Re-check for drafts whenever the window regains focus, so a quick
// VS Code → Panel switch loads the freshly-sent prompt.
function onFocus(): void {
  if (!route.query.resume) void pickUpDraft();
}
onMounted(() => window.addEventListener('focus', onFocus));
onBeforeUnmount(() => window.removeEventListener('focus', onFocus));

// 合并三个 watch — `?cron=`/`?resume=`/`?new=` 分别走对应 loader。
// 单 watch + dispatch 比三个独立 watch 注册开销小，路由切换也只触发一次。
watch(
  () => [route.query.cron, route.query.resume, route.query.new] as const,
  async ([cron, resume, isNew]) => {
    if (typeof cron === 'string' && cron) {
      if (!sessionsList.initialized) await sessionsList.load({ initial: true });
      await loadCronAggregate(cron);
    } else if (typeof resume === 'string' && resume) {
      await loadSession(resume);
    } else if (typeof isNew === 'string' && isNew) {
      onNewChat();
    }
  },
);

watch(messages, async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}, { deep: true });

watch(state, (s, prev) => {
  sending.value = s === 'creating' || s === 'streaming' || s === 'reconnecting';

  // When a stream ends successfully, refresh the sidebar list so a brand-new
  // session shows up immediately without a manual reload.
  if ((s === 'idle' || s === 'done') && (prev === 'streaming' || prev === 'creating')) {
    void sessionsList.load();
  }

  if (s === 'error' && prev !== 'error') {
    const code = lastErrorCode.value ?? 'UNKNOWN';
    const detail = lastError.value ?? t('error.unknown');
    const headline = {
      HERMES_API_UNREACHABLE: t('error.hermes_not_found'),
      HERMES_API_UNAUTHORIZED: t('chat.errors.unauthorized'),
      HERMES_API_SERVER_ERROR: t('chat.errors.serverError'),
      HERMES_API_BAD_REQUEST: t('chat.errors.badRequest'),
      HERMES_RUN_ERROR: t('chat.errors.runError'),
      UNKNOWN: t('error.boundaryTitle'),
    }[code] ?? t('error.boundaryTitle');

    console.error('[chat] error', { code, detail });
    // 用 render 给 toast 加 Retry 按钮：可以保留已收到的 assistant 内容，
    // 用最后一条 user 消息重新 send；可恢复的错误（unreachable/server error/
    // run error）显示重试，认证类错误不显示（重试也没用）。
    const canRetry = code === 'HERMES_API_UNREACHABLE'
      || code === 'HERMES_API_SERVER_ERROR'
      || code === 'HERMES_RUN_ERROR'
      || code === 'UNKNOWN';
    const lastUser = [...messages.value].reverse().find(m => m.role === 'user');
    message.error(() => h('div', { class: 'flex flex-col gap-1.5' }, [
      h('div', { class: 'font-medium' }, headline),
      h('div', { class: 'text-xs opacity-80 whitespace-pre-wrap' }, detail),
      canRetry && lastUser ? h('button', {
        class: 'self-start mt-1 px-3 py-1 rounded text-xs font-medium bg-white/15 hover:bg-white/25 transition-colors',
        onClick: () => {
          void onSend(lastUser.content);
        },
      }, t('chat.retryRun')) : null,
    ]), { duration: 12000, closable: true });
  }
});

const sampleQuestions = computed(() => [
  t('chat.samples.weather'),
  t('chat.samples.todo'),
  t('chat.samples.tauri'),
]);

async function onSend(text: string): Promise<void> {
  if (isVirtualSession.value) {
    message.warning(t('chat.cronAggregate.readonly'), { duration: 3000 });
    return;
  }
  if (!system.health?.hermes.running) {
    message.warning(t('chat.hermesNotReady'), { duration: 3000 });
    void system.refresh();
    return;
  }
  // Detect @mention and prepend role system-prompt fragment.
  let finalText = text;
  const mention = detectMention(text, workspaces.activeId);
  if (mention) {
    finalText = `${mention.role.promptPrefix}\n\n${mention.rest}`;
  }
  const sentText = finalText;
  await stream.send(sentText, model.value);
  composerRef.value?.setText('');
}

function onStop(): void {
  stream.abort();
}

// 当前正在流式的 assistant 消息 id — MessageBubble 用它来决定是否显内联 stop 按钮
const lastStreamingMessageId = computed<string | null>(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i];
    if (m.role === 'assistant' && !m.completed) return m.id;
  }
  return null;
});

// 时间分组 — 相邻消息间隔 > 30 分钟时插入 divider，让长会话更易导航。
// divider 显示 absolute time（含日期），iMessage 风格。
const TIME_GAP_MS = 30 * 60 * 1000;
type FlowItem = { kind: 'divider'; id: string; label: string }
              | { kind: 'message'; m: ChatMessage };
const flowItems = computed<FlowItem[]>(() => {
  const out: FlowItem[] = [];
  let prevTs = 0;
  for (const m of messages.value) {
    const ts = m.createdAt;
    if (prevTs === 0 || ts - prevTs > TIME_GAP_MS) {
      out.push({ kind: 'divider', id: `d_${ts}_${m.id}`, label: absoluteTime(ts) });
    }
    out.push({ kind: 'message', m });
    prevTs = ts;
  }
  return out;
});

function onMessageEditSave(payload: { id: string; content: string }): void {
  // 就地编辑：替换 user message 内容、截断之后所有 assistant 回复，再重新跑
  const next = session.editUserMessageAt(payload.id, payload.content);
  if (next === null) return;
  void onSend(next);
}

function onMessageBranch(id: string): void {
  if (!session.branchAt(id)) return;
  void router.replace({ path: '/chat' });
  message.success(t('chat.message.branchCreated'), { duration: 2200 });
  void nextTick(() => composerRef.value?.focus());
}

function onMessageAddSelection(content: string): void {
  const trimmed = content.trim();
  if (!trimmed) return;
  appendComposerText(`${t('chat.selection.promptHeader')}\n${trimmed}`);
  message.success(t('chat.selection.added'), { duration: 1600 });
}

function trySample(q: string): void {
  void onSend(q);
}

// Export the current chat as a self-contained Markdown file. Generated
// client-side from the session store — no BFF round-trip — so it works
// offline and never leaks message text past the browser.
const { exportAs } = useChatExport(messages);
const exportOptions = computed(() => [
  { key: 'md', label: t('chat.export.formats.md') },
  { key: 'json', label: t('chat.export.formats.json') },
  { key: 'html', label: t('chat.export.formats.html') },
  { key: 'clipboard', label: t('chat.export.formats.clipboard') },
]);
async function onExportSelect(key: string | number): Promise<void> {
  const r = await exportAs(key as 'md' | 'json' | 'html' | 'clipboard');
  if (!r.ok) {
    if (r.reason === 'empty') message.warning(t('chat.export.empty'), { duration: 2500 });
    else if (r.reason === 'clipboard_failed') message.error(t('chat.export.clipboardFailed'));
    return;
  }
  if (r.format === 'clipboard') message.success(t('chat.export.clipboardOk'), { duration: 2000 });
  else message.success(t('chat.export.success', { filename: r.filename }), { duration: 2500 });
}
</script>

<template>
  <ViewErrorBoundary name="chat">
  <div class="flex h-full w-full overflow-hidden bg-[var(--bg-page)]">
    <ChatSessionsDrawer
      v-model:collapsed="sidebarCollapsed"
      @select="onSelectSession"
      @select-aggregate="onSelectCronAggregate"
      @new="onNewChat"
    />
    <main class="relative flex-1 flex flex-col min-w-0 min-h-0">
      <!-- 顶部标题条：会话标题居中（fallback 占位）+ 右侧模型/token 指示。
           h-12 保证不抢内容空间；border-b 划分与下方 scroller 的边界。
           Empty state 时仍显示但只展模型名（标题区显占位）。 -->
      <header
        class="chat-header"
      >
        <!-- 移动端汉堡按钮：< md 时显示，点开 drawer overlay。桌面端 drawer 常驻，不需要。 -->
        <button
          v-if="sidebarCollapsed"
          class="chat-mobile-menu-button md:hidden"
          :title="t('chat.sidebar.expand')"
          :aria-label="t('chat.sidebar.expand')"
          @click="sidebarCollapsed = false"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </button>
        <!-- 中央：标题 + 副标题。virtual session 时显示 cron job 名，
             不另外标"合并视图"，让用户感觉是一条普通会话。 -->
        <div class="chat-header-title-wrap">
          <div class="chat-header-title" :title="(isVirtualSession ? currentCronJob?.name : currentSessionMeta?.title) || ''">
            {{
              isVirtualSession
                ? (currentCronJob?.name || currentCronJob?.id || t('chat.header.untitled'))
                : (currentSessionMeta?.title || (messages.length > 0 ? t('chat.header.untitled') : t('chat.header.newChat')))
            }}
          </div>
        </div>
        <!-- 右侧：模型 + token + export -->
        <div class="chat-header-actions">
          <span class="chat-header-pill hidden sm:inline-flex">
            <span class="chat-header-pill-label">{{ t('chat.header.model') }}</span>
            <span class="chat-header-pill-value">{{ model }}</span>
          </span>
          <span v-if="messages.length > 0 && session.tokenUsage.total > 0" class="chat-header-pill hidden md:inline-flex">
            <span class="chat-header-pill-value tabular-nums">{{ fmtTokens(session.tokenUsage.total) }}</span>
            <span class="chat-header-pill-label">tokens</span>
          </span>
          <!-- 流式中实时显示 char/s ≈ 估算 token/s（系数 ~0.35） -->
          <span v-if="state === 'streaming' && charsPerSec > 0" class="chat-header-pill is-live">
            <span class="chat-header-pulse" aria-hidden="true" />
            <span class="chat-header-pill-value tabular-nums">~{{ Math.round(charsPerSec * 0.35) }}</span>
            <span class="chat-header-pill-label">tok/s</span>
          </span>
          <button
            v-if="messages.length > 20 && session.sessionId"
            type="button"
            class="chat-header-icon-button"
            :title="compressing ? t('chat.compressing') : t('chat.compressHint')"
            :disabled="compressing"
            @click="handleCompress"
          >🗜️</button>
          <button
            v-if="messages.length > 0"
            type="button"
            class="chat-header-icon-button"
            :class="{ 'is-active': taskPanelOpen }"
            :title="t('chat.taskPanel.title')"
            :aria-label="t('chat.taskPanel.title')"
            @click="taskPanelOpen = !taskPanelOpen"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3.5h10M3 8h7M3 12.5h5" />
              <path d="m11.5 11.5 1.2 1.2 2-2.4" />
            </svg>
          </button>
          <NDropdown
            v-if="messages.length > 0"
            :options="exportOptions"
            @select="onExportSelect"
            placement="bottom-end"
            trigger="click"
          >
            <button
              type="button"
              class="chat-export-button"
              :title="t('chat.export.label')"
              :aria-label="t('chat.export.label')"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M8 11V3M4 7l4 4 4-4M3 13h10" />
              </svg>
              <span class="hidden lg:inline">{{ t('chat.export.label') }}</span>
              <svg class="hidden lg:block" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 4.5l3 3 3-3" />
              </svg>
            </button>
          </NDropdown>
        </div>
      </header>
      <!-- streaming 心跳条：1px 细线在 header 下，呼吸 + 滑动让用户知道 AI 还在工作 -->
      <div class="chat-streaming-strip" :class="{ 'is-active': state === 'streaming' || state === 'creating' || state === 'reconnecting' }" />
      <div class="relative flex-1 flex flex-col min-h-0">
        <div ref="scroller" class="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6" @scroll="onScroll">
        <div
          v-if="resumingSession"
          class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-page)]/70 backdrop-blur-[1px]"
        >
          <NSpin size="small" />
        </div>
        <div class="chat-conversation-column">
          <EmptyState
            v-if="messages.length === 0"
            :title="t('chat.empty.title')"
          >
            <template #icon>
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--brand-600)] ring-1 ring-[var(--border)]">
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
                </svg>
              </div>
            </template>
            <div class="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              <button
                v-for="q in sampleQuestions"
                :key="q"
                class="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:bg-[var(--bg-elevate)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
                @click="trySample(q)"
              >
                {{ q }}
              </button>
            </div>
          </EmptyState>
          <!-- hover toolbar 发现提示 — 仅当有消息且未关闭过 -->
          <div
            v-if="messages.length > 0 && !hoverHintDismissed && !isMobile"
            class="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-3)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 5v3M8 11h.01" />
            </svg>
            <span class="flex-1">{{ t('chat.hints.hover') }}</span>
            <button
              type="button"
              class="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-[var(--bg-elevate)] text-[var(--text-3)]"
              :aria-label="t('common.dismiss')"
              @click="dismissHoverHint"
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <path d="M1.5 1.5l6 6m0-6l-6 6" />
              </svg>
            </button>
          </div>
          <template v-for="item in flowItems" :key="item.kind === 'divider' ? item.id : item.m.id">
            <div
              v-if="item.kind === 'divider'"
              class="chat-time-divider my-3 flex items-center gap-2 text-[10px] text-[var(--text-3)] select-none"
              :aria-hidden="true"
            >
              <div class="h-px flex-1 bg-[var(--border)]" />
              <span>{{ item.label }}</span>
              <div class="h-px flex-1 bg-[var(--border)]" />
            </div>
            <MessageBubble
              v-else
              :message="item.m"
              :is-streaming="state === 'streaming' && item.m.id === lastStreamingMessageId"
              @edit-save="onMessageEditSave"
              @add-selection="onMessageAddSelection"
              @branch="onMessageBranch"
              @stop="onStop"
            />
          </template>
        </div>

        <!-- Scroll-to-bottom button -->
        <button
          v-if="scrolledUp"
          type="button"
          class="scroll-bottom-btn"
          @click="scrollToBottom"
          :aria-label="t('chat.navigator.jumpBottom')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <ChatNavigator
        v-if="messages.length > 1"
        :scroller="scroller"
        :messages="messages"
      />
      <ChatFindBar
        v-if="messages.length > 0"
        :messages="messages"
        :scroller="scroller"
      />
      <TaskProgressPanel
        v-if="messages.length > 0"
        :messages="messages"
        :stream-state="state"
        :open="taskPanelOpen"
      />
      </div>
      <!-- 悬浮 composer：无 border-t，靠 padding 与 messages 拉开距离；
           Composer 自身已有 card 样式，外层用 transparent 让阴影自然外溢。 -->
      <div
        class="flex-shrink-0 px-4 pt-2 pb-4 sm:px-6 bg-[var(--bg-page)]"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
      >
        <div class="chat-composer-stack chat-composer-column">
          <!-- 上一条 assistant 含 A/B/C 选项时显示快捷选项区 -->
          <div
            v-if="lastAssistantOptions.length > 0"
            class="chat-option-rail"
          >
            <span class="chat-option-label">
              {{ t('chat.options.pick') }}
            </span>
            <button
              v-for="opt in lastAssistantOptions"
              :key="opt.label"
              type="button"
              class="chat-option-chip"
              :title="opt.raw"
              @click="pickOption(opt)"
            >
              <span class="font-semibold text-[var(--brand-600)]">{{ opt.label }}</span>
              <span class="truncate">{{ opt.content }}</span>
            </button>
          </div>
          <div class="chat-context-bar">
            <div
              v-if="changedFilesSummary"
              class="chat-context-chip chat-changed-files"
            >
              <span class="truncate">{{ t('chat.composer.changedFiles', { n: changedFilesSummary.files }) }}</span>
              <span class="font-semibold tabular-nums text-[var(--color-success)]">+{{ changedFilesSummary.additions }}</span>
              <span class="font-semibold tabular-nums text-[var(--color-error)]">-{{ changedFilesSummary.deletions }}</span>
            </div>
            <div class="chat-context-team">
              <RoleTeamBar @mention="summon" />
            </div>
            <div class="chat-context-actions">
              <ToolsStatusBar />
              <PromptTemplatesBar @pick="onTemplatePick" />
            </div>
          </div>
          <Composer
            ref="composerRef"
            v-model:model="model"
            v-model:thinking-speed="thinkingSpeed"
            :sending="sending"
            :last-sent-text="lastSentText"
            @send="onSend"
            @stop="onStop"
          />
        </div>
      </div>
    </main>
  </div>
  </ViewErrorBoundary>
</template>

<style scoped>
.chat-header {
  position: relative;
  display: flex;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 54%, transparent), transparent 92%),
    var(--bg-page);
  padding: 0 16px;
}

.chat-mobile-menu-button,
.chat-header-icon-button,
.chat-export-button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.chat-mobile-menu-button {
  width: 30px;
  margin-left: -6px;
  margin-right: 4px;
}

.chat-header-icon-button {
  width: 30px;
}

.chat-export-button {
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
}

.chat-mobile-menu-button:hover,
.chat-mobile-menu-button:focus-visible,
.chat-header-icon-button:hover,
.chat-header-icon-button:focus-visible,
.chat-header-icon-button.is-active,
.chat-export-button:hover,
.chat-export-button:focus-visible {
  border-color: color-mix(in srgb, var(--border) 78%, transparent);
  background: color-mix(in srgb, var(--bg-elevate) 86%, transparent);
  color: var(--text-1);
  outline: none;
  transform: translateY(-1px);
}

.chat-header-icon-button.is-active {
  border-color: color-mix(in srgb, var(--brand-500) 22%, transparent);
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-elevate));
  color: var(--brand-600);
}

.chat-export-button:hover,
.chat-export-button:focus-visible {
  box-shadow: 0 8px 20px color-mix(in srgb, var(--text-1) 6%, transparent);
}

.chat-header-title-wrap {
  position: absolute;
  left: 50%;
  max-width: min(520px, 46vw);
  min-width: 0;
  text-align: center;
  transform: translateX(-50%);
}

.chat-header-title {
  overflow: hidden;
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-actions {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--text-3);
  font-size: 12px;
}

.chat-header-pill {
  height: 28px;
  align-items: center;
  gap: 5px;
  border: 1px solid color-mix(in srgb, var(--border) 56%, transparent);
  border-radius: 999px;
  padding: 0 9px;
  background: color-mix(in srgb, var(--bg-card) 62%, transparent);
  color: var(--text-3);
}

.chat-header-pill.is-live {
  border-color: color-mix(in srgb, var(--brand-500) 22%, transparent);
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
  color: var(--brand-600);
}

.chat-header-pill-label {
  color: var(--text-3);
  font-weight: 600;
}

.chat-header-pill-value {
  min-width: 0;
  max-width: 150px;
  overflow: hidden;
  color: var(--text-2);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-pill.is-live .chat-header-pill-value,
.chat-header-pill.is-live .chat-header-pill-label {
  color: var(--brand-600);
}

.chat-header-pulse {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--brand-500);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-500) 12%, transparent);
}

/* streaming 心跳条 — header 下方一条扫光，inactive 时占 1px 透明保位 */
.chat-streaming-strip {
  height: 1px;
  flex-shrink: 0;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.chat-streaming-strip.is-active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--brand-500) 65%, transparent) 30%,
    color-mix(in srgb, var(--brand-500) 90%, transparent) 50%,
    color-mix(in srgb, var(--brand-500) 65%, transparent) 70%,
    transparent 100%
  );
  background-size: 40% 100%;
  background-repeat: no-repeat;
  animation: chat-streaming-slide 1.4s linear infinite;
}
@keyframes chat-streaming-slide {
  0%   { background-position: -40% 0; }
  100% { background-position: 140% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .chat-streaming-strip.is-active::after {
    animation: chat-streaming-pulse 1.6s ease-in-out infinite;
    background: color-mix(in srgb, var(--brand-500) 70%, transparent);
  }
  @keyframes chat-streaming-pulse {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.9; }
  }
}

.chat-composer-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-conversation-column,
.chat-composer-column {
  width: min(100%, 940px);
  margin-inline: auto;
}

.chat-composer-column {
  width: min(100%, 900px);
}

.chat-option-rail {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}

.chat-option-label {
  margin-right: 2px;
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.chat-option-chip {
  display: inline-flex;
  min-width: 0;
  max-width: min(260px, 100%);
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 999px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
  color: var(--text-2);
  font-size: 12px;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.chat-option-chip:hover {
  border-color: color-mix(in srgb, var(--brand-500) 32%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--text-1);
}

.chat-context-bar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
  border-radius: 18px;
  padding: 6px;
  background: color-mix(in srgb, var(--bg-card) 58%, transparent);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--text-1) 4%, transparent);
}

.chat-context-chip {
  display: inline-flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 0 9px;
  height: 28px;
  color: var(--text-3);
  font-size: 12px;
  background: color-mix(in srgb, var(--bg-elevate) 54%, transparent);
}

.chat-changed-files {
  max-width: 190px;
}

.chat-context-team {
  min-width: 0;
  flex: 1 1 auto;
}

.chat-context-actions {
  display: inline-flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.chat-context-team :deep(.team-bar) {
  margin-bottom: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 0;
}

.chat-context-team :deep(.team-summary) {
  max-width: 132px;
  background: color-mix(in srgb, var(--bg-elevate) 52%, transparent);
  color: var(--text-3);
}

.chat-context-team :deep(.team-count) {
  background: color-mix(in srgb, var(--brand-500) 9%, transparent);
}

.chat-context-team :deep(.team-role) {
  color: var(--text-3);
}

.chat-context-team :deep(.team-role:hover),
.chat-context-team :deep(.team-role.is-active) {
  background: color-mix(in srgb, var(--brand-500) 7%, transparent);
  color: var(--text-1);
  transform: none;
}

.chat-context-actions :deep(button) {
  max-width: 132px;
  min-width: 0;
  height: 28px;
  white-space: nowrap;
}

.chat-context-actions :deep(button span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767.98px) {
  .chat-composer-stack {
    gap: 7px;
  }

  .chat-option-rail {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 1px;
    scrollbar-width: none;
  }

  .chat-option-rail::-webkit-scrollbar {
    display: none;
  }

  .chat-option-label {
    display: none;
  }

  .chat-option-chip {
    flex: 0 0 auto;
    max-width: 72vw;
  }

  .chat-context-bar {
    flex-wrap: wrap;
    align-items: stretch;
    gap: 6px;
    border-radius: 16px;
    padding: 5px;
  }

  .chat-changed-files {
    order: 1;
    max-width: calc(100% - 96px);
  }

  .chat-context-actions {
    order: 2;
    margin-left: auto;
  }

  .chat-context-team {
    order: 3;
    flex-basis: 100%;
  }

  .chat-context-actions :deep(button) {
    max-width: 116px;
  }

  .chat-context-team :deep(.team-summary) {
    max-width: 118px;
  }

  .chat-context-team :deep(.role-id) {
    display: none;
  }
}

.scroll-bottom-btn {
  position: absolute;
  bottom: 12px;
  right: 16px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  background: var(--bg-card);
  color: var(--text-2);
  box-shadow: var(--shadow-2);
  cursor: pointer;
  transition: transform var(--dur-fast), box-shadow var(--dur-fast);
}
.scroll-bottom-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-3);
}
@media (prefers-reduced-motion: reduce) {
  .scroll-bottom-btn { transition: none; }
}
</style>
