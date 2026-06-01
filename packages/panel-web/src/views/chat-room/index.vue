<script setup lang="ts">
import { onMounted, ref, nextTick, watch, computed } from 'vue';
import { NButton, NInput, NModal, NPopconfirm, NSpin, useMessage } from 'naive-ui';
import { useChatRoomsStore } from '@/stores/chat-rooms';
import { useWorkspacesStore } from '@/stores/workspaces';
import { teamFor, type RoleDef } from '@/data/roles';
import { getNextSteps, type WorkflowStep } from '@/data/workflows';
import EmptyState from '@/components/shared/EmptyState.vue';

const msg = useMessage();
const store = useChatRoomsStore();
const workspaces = useWorkspacesStore();

const newRoomName = ref('');
const showCreate = ref(false);
const input = ref('');
const scroller = ref<HTMLElement | null>(null);
const sending = ref(false);
const sidebarOpen = ref(true);
const isMobile = ref(window.innerWidth < 768);

const roles = computed<RoleDef[]>(() => workspaces.activeId ? teamFor(workspaces.activeId) : []);

onMounted(() => {
  store.fetchRooms();
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768; });
});

watch(() => store.messages.length, () => {
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight; });
});

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function parseMentions(text: string): Array<{ name: string; icon: string; prompt: string; model?: string }> {
  const re = /@(\w[\w-]*)/g;
  const seen = new Set<string>();
  const result: Array<{ name: string; icon: string; prompt: string; model?: string }> = [];
  for (const m of text.matchAll(re)) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      const info = store.getAgentInfo(name, workspaces.activeId);
      const systemPrompt = info.promptPrefix
        ? `${info.promptPrefix}\n\n用户问题: ${text}`
        : text;
      result.push({ name, icon: info.icon, prompt: systemPrompt, model: info.model });
    }
  }
  return result;
}

async function handleCreate(): Promise<void> {
  const name = newRoomName.value.trim();
  if (!name) return;
  await store.createRoom(name, workspaces.activeId ?? undefined);
  newRoomName.value = '';
  showCreate.value = false;
}

async function handleSend(): Promise<void> {
  const text = input.value.trim();
  const roomId = store.activeRoomId;
  if (!text || !roomId) return;
  input.value = '';
  sending.value = true;
  try { await store.sendMessage(roomId, text, parseMentions(text)); }
  catch (err) { msg.error((err as Error).message); }
  finally { sending.value = false; }
}

async function handleRetry(msgId: string): Promise<void> {
  // Re-send the same message content to retry failed agent calls
  const failedMsg = store.messages.find(m => m.id === msgId);
  if (!failedMsg?.agent_name) return;
  // Simple retry: re-trigger the entire last send
  const lastUserMsg = [...store.messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    store.messages = store.messages.filter(m => m.id !== msgId);
    await store.sendMessage(store.activeRoomId!, lastUserMsg.content, parseMentions(lastUserMsg.content));
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.isComposing) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
}

const activeRoom = computed(() => store.rooms.find(r => r.id === store.activeRoomId));

const mentionHint = computed(() => {
  if (!input.value.includes('@')) return [];
  const part = input.value.split('@').pop()?.split(' ')[0] || '';
  if (!part) return roles.value.slice(0, 6);
  return roles.value.filter(r => r.id.includes(part) || r.name.includes(part)).slice(0, 6);
});

// After latest agent message, suggest next workflow step
const nextSteps = computed<WorkflowStep[]>(() => {
  const msgs = store.messages;
  if (msgs.length === 0) return [];
  const lastAgent = [...msgs].reverse().find(m => m.role === 'agent' && m.agent_name);
  if (!lastAgent?.agent_name) return [];
  const wsId = workspaces.activeId;
  if (!wsId) return [];
  return getNextSteps(wsId, lastAgent.agent_name);
});

function continueWorkflow(step: WorkflowStep): void {
  store.sendMessage(
    store.activeRoomId!,
    step.trigger.replace('{{input}}', input.value || '请开始'),
    parseMentions(`@${step.role} ${step.description}`),
  );
}

const quickStarts = computed(() => {
  if (!roles.value.length) return [];
  const picks = roles.value.slice(0, 4);
  return picks.map(r => ({
    label: `@${r.id} 帮我分析这个项目`,
    icon: r.icon,
  }));
});

function insertQuick(text: string): void {
  input.value = text;
}

function selectRoom(id: string): void {
  store.fetchMessages(id);
  if (isMobile.value) sidebarOpen.value = false;
}
</script>

<template>
  <div class="chat-room-layout">
    <!-- Mobile toggle -->
    <button v-if="isMobile && store.activeRoomId" class="mobile-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
      <span v-if="sidebarOpen">✕</span><span v-else>☰ 房间列表</span>
    </button>

    <!-- Sidebar -->
    <aside class="room-sidebar" :class="{ 'is-visible': sidebarOpen }" role="navigation" aria-label="群聊房间列表">
      <div class="sidebar-header">
        <h3 class="sidebar-title">群聊</h3>
        <p class="sidebar-subtitle">{{ workspaces.activeWorkspace?.name || '通用' }}</p>
        <NButton size="small" type="primary" block class="mt-3" @click="showCreate = true" aria-label="新建群聊房间">+ 新建房间</NButton>
      </div>

      <!-- Available roles hint -->
      <div v-if="roles.length" class="sidebar-roles">
        <p class="sidebar-roles-label">可用角色 ({{ roles.length }}) — 输入 @ 召唤</p>
        <div class="sidebar-roles-list">
          <button
            v-for="r in roles"
            :key="r.id"
            class="sidebar-role-chip"
            :title="r.description"
            @click="input = (input || '') + '@' + r.id + ' '"
          >
            <span class="sidebar-role-icon">{{ r.icon }}</span>
            <span class="sidebar-role-name">@{{ r.id }}</span>
          </button>
        </div>
      </div>

      <div class="room-list">
        <NSpin v-if="store.loading" size="small" class="flex justify-center py-8" />
        <button
          v-for="room in store.rooms"
          :key="room.id"
          class="room-item group"
          :class="{ 'room-item--active': store.activeRoomId === room.id }"
          :aria-label="`房间: ${room.name}`"
          @click="selectRoom(room.id)"
        >
          <span class="room-icon">#</span>
          <div class="room-info">
            <span class="room-name">{{ room.name }}</span>
            <span class="room-meta">{{ room.workspace_name || '通用' }} · {{ fmtTime(room.updated_at) }}</span>
          </div>
          <NPopconfirm @positive-click="store.deleteRoom(room.id)">
            <template #trigger>
              <span class="room-delete-btn" role="button" aria-label="删除房间" @click.stop>×</span>
            </template>
            确定删除此房间？
          </NPopconfirm>
        </button>
        <EmptyState v-if="!store.loading && store.rooms.length === 0" title="还没有群聊房间" description="创建房间后 @mention 召唤 Agent 协作" />
      </div>
    </aside>

    <!-- Main -->
    <main class="room-main">
      <header v-if="activeRoom" class="room-header">
        <div class="room-header-left">
          <span class="room-header-icon">#</span>
          <span class="room-header-name">{{ activeRoom.name }}</span>
          <span class="room-header-workspace">{{ activeRoom.workspace_name || '通用' }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="store.streaming" class="streaming-indicator">Agent 回复中...</span>
          <span class="room-header-count">{{ store.messages.length }} 条消息</span>
        </div>
      </header>

      <div ref="scroller" class="message-list">
        <EmptyState v-if="!store.activeRoomId" title="选择或创建一个房间" description="从左侧选择群聊房间开始对话" />
        <div v-else-if="store.messages.length === 0" class="message-empty">
          <span class="message-empty-icon">💬</span>
          <p class="message-empty-title">开始与 Agent 协作</p>
          <p class="message-empty-desc">输入消息并用 @ 召唤角色，多个 Agent 可并行回复</p>
          <div v-if="quickStarts.length" class="quick-starts">
            <button v-for="qs in quickStarts" :key="qs.label" class="quick-start-btn" @click="insertQuick(qs.label)">
              <span>{{ qs.icon }}</span> {{ qs.label }}
            </button>
          </div>
        </div>
        <template v-for="msg in store.messages" :key="msg.id">
          <div v-if="msg.role === 'user'" class="msg-row msg-row--user">
            <div class="msg-bubble msg-bubble--user">
              <p>{{ msg.content }}</p>
              <time class="msg-time">{{ fmtTime(msg.created_at) }}</time>
            </div>
          </div>
          <div v-else class="msg-row msg-row--agent">
            <div class="msg-agent-avatar" :aria-label="`Agent ${msg.agent_name}`">{{ msg.agent_icon || '🤖' }}</div>
            <div class="msg-agent-body">
              <div class="msg-agent-meta">
                <span class="msg-agent-name">{{ msg.agent_name || 'Agent' }}</span>
                <time class="msg-time">{{ fmtTime(msg.created_at) }}</time>
              </div>
              <div class="msg-bubble msg-bubble--agent">
                <p v-if="msg.content.startsWith('⏳')" class="msg-typing">{{ msg.content }}</p>
                <p v-else-if="msg.content.startsWith('❌')" class="msg-failed">
                  {{ msg.content }}
                  <button class="msg-retry-btn" @click="handleRetry(msg.id)">重试</button>
                </p>
                <p v-else class="msg-text">{{ msg.content }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Workflow: next step suggestions -->
      <div v-if="nextSteps.length && !store.streaming" class="workflow-next">
        <span class="workflow-next-label">下一步建议</span>
        <button
          v-for="step in nextSteps"
          :key="step.role"
          class="workflow-next-btn"
          @click="continueWorkflow(step)"
        >{{ step.description }} →</button>
      </div>

      <footer v-if="store.activeRoomId" class="room-composer">
        <div v-if="mentionHint.length" class="mention-bar" role="listbox" aria-label="可召唤的角色">
          <button
            v-for="r in mentionHint"
            :key="r.id"
            class="mention-chip"
            :class="{ 'mention-chip--active': input.includes('@' + r.id) }"
            role="option"
            :aria-label="`召唤 ${r.name}`"
            @click="input = input.replace(/@\S*$/, '@' + r.id + ' ')"
          >{{ r.icon }} {{ r.name }}</button>
        </div>
        <div class="composer-row">
          <NInput
            v-model:value="input"
            type="textarea"
            :placeholder="mentionHint.length ? 'Enter 发送，继续 @召唤更多角色' : '@角色名 召唤 Agent · Shift+Enter 换行'"
            :autosize="{ minRows: 1, maxRows: 4 }"
            :disabled="sending"
            @keydown="onKeydown"
          />
          <NButton type="primary" :loading="sending" :disabled="!input.trim()" @click="handleSend" class="send-btn">发送</NButton>
        </div>
      </footer>
    </main>

    <NModal :show="showCreate" @update:show="showCreate = $event">
      <div class="create-modal">
        <h3>新建群聊房间</h3>
        <p class="create-modal-desc">创建房间，@mention 邀请 Workspace 角色协作讨论</p>
        <NInput v-model:value="newRoomName" placeholder="输入房间名称" size="large" @keydown.enter="handleCreate" />
        <div class="create-modal-roles" v-if="roles.length">
          可用角色：<span v-for="r in roles" :key="r.id" class="create-modal-role-tag">{{ r.icon }} {{ r.name }}</span>
        </div>
        <div class="create-modal-actions">
          <NButton @click="showCreate = false">取消</NButton>
          <NButton type="primary" :disabled="!newRoomName.trim()" @click="handleCreate">创建</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
/* ─── Layout ─── */
.chat-room-layout { display: flex; height: calc(100vh - 140px); max-width: 1200px; margin: 0 auto; }

/* ─── Sidebar ─── */
.room-sidebar {
  width: 280px; flex-shrink: 0; display: flex; flex-direction: column;
  border-right: 1px solid var(--border); background: var(--bg-card);
}
.sidebar-header { padding: 16px; border-bottom: 1px solid var(--border); }
.sidebar-title { font-size: 14px; font-weight: 600; color: var(--text-1); margin-bottom: 2px; }
.sidebar-subtitle { font-size: 12px; color: var(--text-3); }
.room-list { flex: 1; overflow-y: auto; }

.room-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 12px 16px; border: 0; border-bottom: 1px solid var(--border);
  border-left: 3px solid transparent;
  background: transparent; color: var(--text-1); cursor: pointer;
  text-align: left; font: inherit;
  transition: background 150ms var(--ease), border-color 150ms var(--ease);
}
.room-item:hover { background: var(--bg-elevate); }
.room-item--active {
  background: color-mix(in srgb, var(--brand-500) 8%, transparent);
  border-left-color: var(--brand-500);
}
.room-icon { font-size: 16px; font-weight: 700; color: var(--text-2); flex-shrink: 0; }
.room-info { flex: 1; min-width: 0; }
.room-name { display: block; font-size: 13px; font-weight: 600; color: var(--text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-meta { display: block; font-size: 11px; color: var(--text-3); margin-top: 2px; }
.room-delete-btn {
  font-size: 16px; color: var(--text-3); cursor: pointer; opacity: 0; transition: opacity 150ms; line-height: 1;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 0; background: none;
}
.group:hover .room-delete-btn, .room-delete-btn:hover { opacity: 1; }
.room-delete-btn:hover { color: var(--color-error); }

/* ─── Sidebar role chips ─── */
.sidebar-roles {
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--brand-500) 3%, var(--bg-card));
}
.sidebar-roles-label { font-size: 11px; font-weight: 600; color: var(--text-3); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; }
.sidebar-roles-list { display: flex; flex-wrap: wrap; gap: 4px; }
.sidebar-role-chip {
  display: inline-flex; align-items: center; gap: 3px; font-size: 11px;
  padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--bg-card); color: var(--text-2); cursor: pointer;
  transition: all 150ms var(--ease);
}
.sidebar-role-chip:hover {
  border-color: var(--brand-500); background: var(--brand-500); color: #fff;
}
.sidebar-role-icon { font-size: 12px; }
.sidebar-role-name { font-weight: 500; }

/* ─── Main ─── */
.room-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.room-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 24px; border-bottom: 1px solid var(--border); background: var(--bg-card);
}
.room-header-left { display: flex; align-items: center; gap: 8px; }
.room-header-icon { font-size: 18px; font-weight: 700; color: var(--brand-500); }
.room-header-name { font-size: 16px; font-weight: 700; color: var(--text-1); }
.room-header-workspace { font-size: 11px; color: var(--text-3); padding: 2px 8px; border-radius: 999px; background: var(--bg-elevate); }
.room-header-count { font-size: 12px; color: var(--text-3); }

/* ─── Messages ─── */
.message-list { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.message-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; color: var(--text-2); font-size: 14px; }
.message-empty-icon { font-size: 48px; opacity: 0.4; }
.message-empty-title { font-size: 16px; font-weight: 600; color: var(--text-1); }
.message-empty-desc { font-size: 13px; color: var(--text-3); max-width: 320px; text-align: center; }
.quick-starts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; justify-content: center; }
.quick-start-btn {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
  padding: 8px 14px; border-radius: 12px; border: 1px solid var(--border);
  background: var(--bg-card); color: var(--text-2); cursor: pointer;
  transition: all 150ms var(--ease);
}
.quick-start-btn:hover { border-color: var(--brand-500); background: color-mix(in srgb, var(--brand-500) 6%, transparent); color: var(--text-1); }

.msg-typing { color: var(--text-3); font-style: italic; }
.msg-failed { color: var(--color-error); font-size: 13px; }
.msg-retry-btn {
  display: inline-block; margin-left: 8px; font-size: 11px; color: var(--brand-500);
  cursor: pointer; border: 0; background: none; text-decoration: underline;
}
.msg-text { white-space: pre-wrap; word-break: break-word; }

.msg-row { display: flex; max-width: 80%; }
.msg-row--user { margin-left: auto; }
.msg-row--agent { gap: 10px; }
.msg-agent-avatar {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
  background: color-mix(in srgb, var(--brand-500) 12%, transparent);
}
.msg-agent-body { min-width: 0; }
.msg-agent-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.msg-agent-name { font-size: 12px; font-weight: 600; color: var(--brand-600); }
.msg-time { font-size: 10px; color: var(--text-3); }

.msg-bubble { padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.6; }
.msg-bubble--user {
  background: var(--brand-500); color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-bubble--agent {
  background: var(--bg-elevate); color: var(--text-1);
  border: 1px solid var(--border); border-top-left-radius: 4px;
}
.msg-bubble p { white-space: pre-wrap; word-break: break-word; margin: 0; }
.msg-row--user .msg-time { text-align: right; margin-top: 4px; display: block; color: rgba(255,255,255,0.65); }

/* ─── Composer ─── */
.room-composer { border-top: 1px solid var(--border); padding: 12px 24px; background: var(--bg-card); }
.mention-bar { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.mention-chip {
  display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--bg-elevate); color: var(--text-2); cursor: pointer;
  transition: all 150ms var(--ease);
}
.mention-chip:hover { border-color: var(--brand-500); background: color-mix(in srgb, var(--brand-500) 8%, transparent); }
.mention-chip--active { background: var(--brand-500); color: #fff; border-color: var(--brand-500); }
.composer-row { display: flex; align-items: flex-end; gap: 8px; }
.composer-row :deep(.n-input) { flex: 1; }
.send-btn { flex-shrink: 0; }
.streaming-indicator {
  font-size: 11px; color: var(--brand-500); font-weight: 500;
  display: flex; align-items: center; gap: 4px;
}
.streaming-indicator::before {
  content: ''; width: 6px; height: 6px; border-radius: 999px;
  background: var(--brand-500);
  animation: stream-pulse 1.2s ease-in-out infinite;
}
@keyframes stream-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

/* ─── Workflow next step ─── */
.workflow-next {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 24px; border-top: 1px dashed var(--border);
  background: color-mix(in srgb, var(--brand-500) 4%, var(--bg-card));
}
.workflow-next-label { font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; }
.workflow-next-btn {
  font-size: 12px; padding: 4px 12px; border-radius: 999px;
  border: 1px solid var(--brand-500); background: transparent;
  color: var(--brand-600); cursor: pointer; font-weight: 500;
  transition: all 150ms var(--ease);
}
.workflow-next-btn:hover { background: var(--brand-500); color: #fff; }

/* ─── Modal ─── */
.create-modal { background: var(--bg-card); border-radius: 16px; padding: 24px; width: 400px; }
.create-modal h3 { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
.create-modal-desc { font-size: 12px; color: var(--text-3); margin-bottom: 16px; }
.create-modal .n-input { margin-bottom: 12px; }
.create-modal-roles { font-size: 12px; color: var(--text-3); margin-bottom: 16px; }
.create-modal-role-tag { color: var(--brand-600); font-weight: 500; margin-left: 4px; }
.create-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 768px) {
  .room-sidebar { width: 100%; position: absolute; z-index: 20; height: 100%; }
  .room-sidebar:not(.is-visible) { display: none; }
  .msg-row { max-width: 95%; }
  .mobile-sidebar-toggle {
    position: fixed; bottom: 16px; left: 16px; z-index: 30;
    padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-2); font-size: 13px; cursor: pointer;
    box-shadow: var(--shadow-2);
  }
}
@media (prefers-reduced-motion: reduce) {
  .room-item, .mention-chip { transition: none; }
}
</style>
