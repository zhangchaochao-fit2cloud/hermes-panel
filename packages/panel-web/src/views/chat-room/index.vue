<script setup lang="ts">
import { onMounted, ref, nextTick, watch, computed } from 'vue';
import { NButton, NInput, NModal, NPopconfirm, NSpin, useMessage } from 'naive-ui';
import { useChatRoomsStore } from '@/stores/chat-rooms';
import { useWorkspacesStore } from '@/stores/workspaces';
import { teamFor, type RoleDef } from '@/data/roles';
import EmptyState from '@/components/shared/EmptyState.vue';

const msg = useMessage();
const store = useChatRoomsStore();
const workspaces = useWorkspacesStore();

const newRoomName = ref('');
const showCreate = ref(false);
const input = ref('');
const scroller = ref<HTMLElement | null>(null);
const sending = ref(false);

const roles = computed<RoleDef[]>(() => workspaces.activeId ? teamFor(workspaces.activeId) : []);

onMounted(() => { store.fetchRooms(); });

watch(() => store.messages.length, () => {
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight; });
});

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function parseMentions(text: string): Array<{ name: string; icon: string }> {
  const re = /@(\w[\w-]*)/g;
  const seen = new Set<string>();
  const result: Array<{ name: string; icon: string }> = [];
  for (const m of text.matchAll(re)) {
    const name = m[1];
    if (!seen.has(name)) { seen.add(name); result.push(store.getAgentInfo(name, workspaces.activeId)); }
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
</script>

<template>
  <div class="chat-room-layout">
    <!-- Sidebar -->
    <aside class="room-sidebar" role="navigation" aria-label="群聊房间列表">
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
          @click="store.fetchMessages(room.id)"
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
        <span class="room-header-count">{{ store.messages.length }} 条消息</span>
      </header>

      <div ref="scroller" class="message-list">
        <EmptyState v-if="!store.activeRoomId" title="选择或创建一个房间" description="从左侧选择群聊房间开始对话" />
        <div v-else-if="store.messages.length === 0" class="message-empty">
          <span class="message-empty-icon">💬</span>
          <p>发送第一条消息，用 @角色名 召唤 Agent 加入讨论</p>
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
                <p>{{ msg.content }}</p>
              </div>
            </div>
          </div>
        </template>
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
.message-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--text-2); font-size: 14px; }
.message-empty-icon { font-size: 48px; opacity: 0.5; }

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

/* ─── Modal ─── */
.create-modal { background: var(--bg-card); border-radius: 16px; padding: 24px; width: 400px; }
.create-modal h3 { font-size: 16px; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
.create-modal-desc { font-size: 12px; color: var(--text-3); margin-bottom: 16px; }
.create-modal .n-input { margin-bottom: 12px; }
.create-modal-roles { font-size: 12px; color: var(--text-3); margin-bottom: 16px; }
.create-modal-role-tag { color: var(--brand-600); font-weight: 500; margin-left: 4px; }
.create-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 768px) {
  .room-sidebar { width: 100%; position: absolute; z-index: 10; height: 100%; }
  .room-sidebar:not(.is-visible) { display: none; }
  .msg-row { max-width: 95%; }
}
@media (prefers-reduced-motion: reduce) {
  .room-item, .mention-chip { transition: none; }
}
</style>
