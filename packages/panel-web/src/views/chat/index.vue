<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { NSpin, useMessage } from 'naive-ui';
import { useSessionStore } from '@/stores/session';
import { useChatStreamStore } from '@/stores/chat-stream';
import { useSystemStore } from '@/stores/system';
import { bffFetch } from '@/api/bff';
import MessageBubble from '@/components/chat/MessageBubble.vue';
import Composer from '@/components/chat/Composer.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import RoleTeamBar from '@/components/chat/RoleTeamBar.vue';
import ChatSessionsDrawer from '@/components/chat/ChatSessionsDrawer.vue';
import { useSessionsStore } from '@/stores/sessions';
import { detectMention, type RoleDef } from '@/data/roles';
import { useWorkspacesStore } from '@/stores/workspaces';

const { t } = useI18n();
const session = useSessionStore();
const stream = useChatStreamStore();
const system = useSystemStore();
const message = useMessage();
const route = useRoute();
const router = useRouter();

const { messages } = storeToRefs(session);
const { state, lastError, lastErrorCode } = storeToRefs(stream);

const model = ref('hermes-agent');
const thinkingSpeed = ref<'fast' | 'extended' | 'auto'>('auto');
const sending = ref(false);
const resumingSession = ref(false);
const scroller = ref<HTMLElement | null>(null);
const composerRef = ref<InstanceType<typeof Composer> | null>(null);

const workspaces = useWorkspacesStore();
function summon(role: RoleDef): void {
  const c = composerRef.value as { prependMention?: (id: string) => void } | null;
  if (c?.prependMention) {
    c.prependMention(role.id);
  }
}

// Sessions drawer: collapsed state persisted to localStorage
const sessionsList = useSessionsStore();
const SIDEBAR_KEY = 'panel.chat.sidebar.collapsed';
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === '1');
watch(sidebarCollapsed, v => {
  localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0');
});

function onSelectSession(id: string): void {
  if (session.sessionId === id) return;
  void loadSession(id);
}

function onNewChat(): void {
  session.reset();
  // Drop ?resume= so a subsequent reload doesn't re-pop the old session
  if (route.query.resume) {
    void router.replace({ path: '/chat' });
  }
  void composerRef.value?.focus?.();
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
    message.error(`恢复会话失败: ${(err as Error).message}`, { duration: 5000 });
  } finally {
    resumingSession.value = false;
  }
}

interface DraftResponse {
  draft: { prompt: string; source: string; stagedAt: number } | null;
}

async function pickUpDraft(): Promise<void> {
  try {
    const r = await bffFetch<DraftResponse>('/api/draft', { silent: true });
    if (r.draft?.prompt) {
      const c = composerRef.value as { setText?: (v: string) => void } | null;
      c?.setText?.(r.draft.prompt);
      message.info(`Loaded draft from ${r.draft.source}`, { duration: 2500 });
      // Consume so we don't re-fill on the next mount
      await bffFetch('/api/draft', { method: 'DELETE', silent: true }).catch(() => { /* ignore */ });
    }
  } catch {
    // Silent — BFF unreachable or no draft, neither is fatal
  }
}

onMounted(async () => {
  await system.refresh();
  await system.loadToken();
  if (system.error) {
    message.error(`Init failed: ${system.error}`, { duration: 0, closable: true });
  }

  const resumeId = route.query.resume as string | undefined;
  if (resumeId) {
    await loadSession(resumeId);
  } else {
    // Only pick up IDE draft when not resuming a specific session
    await pickUpDraft();
  }
});

// Re-check for drafts whenever the window regains focus, so a quick
// VS Code → Panel switch loads the freshly-sent prompt.
function onFocus(): void {
  if (!route.query.resume) void pickUpDraft();
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', onFocus);
}

// Watch for query change so navigating from Sessions list to Chat?resume=:id works
watch(() => route.query.resume, async (id) => {
  if (id && typeof id === 'string') await loadSession(id);
});

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
      HERMES_API_UNAUTHORIZED: '认证失败：API key 无效或缺失',
      HERMES_API_SERVER_ERROR: 'Hermes 内部错误',
      HERMES_API_BAD_REQUEST: '请求被拒绝',
      HERMES_RUN_ERROR: '运行失败',
      UNKNOWN: '出错了',
    }[code] ?? '出错了';

    // Show the raw error detail so users can self-diagnose (dev-friendly).
    const full = `${headline}\n${detail}`;
    console.error('[chat] error', { code, detail });
    message.error(full, { duration: 10000, closable: true });
  }
});

const sampleQuestions = [
  '帮我查下今天的天气',
  '用 Vue 3 写一个 todo 组件',
  '解释一下 Tauri 和 Electron 的区别',
];

async function onSend(text: string): Promise<void> {
  if (!system.health?.hermes.running) {
    message.warning('Hermes 还没准备好，请稍等几秒...', { duration: 3000 });
    void system.refresh();
    return;
  }
  // Detect @mention and prepend role system-prompt fragment.
  let finalText = text;
  const mention = detectMention(text, workspaces.activeId);
  if (mention) {
    finalText = `${mention.role.promptPrefix}\n\n${mention.rest}`;
  }
  await stream.send(finalText, model.value);
}

function onStop(): void {
  stream.abort();
}

function trySample(q: string): void {
  void onSend(q);
}
</script>

<template>
  <!--
    h-[100dvh] (dynamic viewport units) so the iOS Safari URL bar / soft keyboard
    collapse doesn't push the composer off-screen. h-full is the fallback when
    the parent already constrains height (web build inside DefaultLayout).
  -->
  <div class="flex h-full w-full overflow-hidden bg-[var(--bg-page)]">
    <ChatSessionsDrawer
      v-model:collapsed="sidebarCollapsed"
      @select="onSelectSession"
      @new="onNewChat"
    />
    <main class="flex-1 flex flex-col min-w-0 min-h-0">
      <div ref="scroller" class="relative flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div
          v-if="resumingSession"
          class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-page)]/70 backdrop-blur-[1px]"
        >
          <NSpin size="small" />
        </div>
        <div class="max-w-3xl mx-auto">
          <EmptyState
            v-if="messages.length === 0"
            icon="💬"
            :title="t('chat.empty.title')"
            :subtitle="t('chat.empty.subtitle', { model })"
          >
            <div class="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              <button
                v-for="q in sampleQuestions"
                :key="q"
                class="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-card)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
                @click="trySample(q)"
              >
                {{ q }}
              </button>
            </div>
          </EmptyState>
          <!--
            TODO(mobile): replace desktop hover toolbar with long-press context
            menu (touchstart + 500ms timer → show copy/regenerate sheet).
            Tracked separately; placeholder hooked here.
          -->
          <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
        </div>
      </div>
      <div
        class="flex-shrink-0 px-4 pt-2 pb-4 sm:px-6 border-t border-[var(--border)] bg-[var(--bg-page)]"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
      >
        <div class="max-w-3xl mx-auto">
          <RoleTeamBar @mention="summon" />
          <Composer
            ref="composerRef"
            v-model:model="model"
            v-model:thinking-speed="thinkingSpeed"
            :sending="sending"
            @send="onSend"
            @stop="onStop"
          />
        </div>
      </div>
    </main>
  </div>
</template>
