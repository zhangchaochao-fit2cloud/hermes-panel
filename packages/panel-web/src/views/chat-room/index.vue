<script setup lang="ts">
import { onMounted, ref, nextTick, watch, computed } from 'vue';
import { NButton, NInput, NModal, NSpin, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useChatRoomsStore } from '@/stores/chat-rooms';
import { useWorkspacesStore } from '@/stores/workspaces';
import { teamFor, type RoleDef } from '@/data/roles';
import EmptyState from '@/components/shared/EmptyState.vue';

const { t } = useI18n();
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
  try {
    await store.sendMessage(roomId, text);
  } catch (err) {
    msg.error((err as Error).message);
  } finally {
    sending.value = false;
  }
}

function selectRoom(id: string): void { store.fetchMessages(id); }
function handleDelete(id: string): void { store.deleteRoom(id); }

function onKeydown(e: KeyboardEvent): void {
  if (e.isComposing) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
}
</script>

<template>
  <div class="flex h-[calc(100vh-140px)] max-w-[1200px] mx-auto">
    <!-- Sidebar: room list -->
    <div class="w-[260px] flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-card)]">
      <div class="p-4 border-b border-[var(--border)]">
        <h3 class="text-sm font-semibold text-[var(--text-1)] mb-1">{{ t('nav.chatRoom') }}</h3>
        <p class="text-xs text-[var(--text-3)]">{{ workspaces.activeWorkspace?.name || t('common.allWorkspaces') }}</p>
        <NButton size="tiny" type="primary" block class="mt-2" @click="showCreate = true">+ 新建房间</NButton>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="store.loading" class="flex justify-center py-8"><NSpin size="small" /></div>
        <div
          v-for="room in store.rooms"
          :key="room.id"
          class="px-4 py-3 cursor-pointer hover:bg-[var(--bg-elevate)] border-b border-[var(--border)] transition-colors"
          :class="store.activeRoomId === room.id ? 'bg-[color-mix(in_srgb,var(--brand-500)_8%,transparent)]' : ''"
          @click="selectRoom(room.id)"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-[var(--text-1)] truncate"># {{ room.name }}</span>
            <button class="text-xs text-[var(--text-3)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100" @click.stop="handleDelete(room.id)">✕</button>
          </div>
          <div class="text-xs text-[var(--text-3)] mt-0.5">{{ room.workspace_name || t('common.general') }}</div>
        </div>
        <EmptyState v-if="!store.loading && store.rooms.length === 0" :title="t('chatRoom.empty')" description="创建第一个群聊房间，@mention 邀请 Agent 协作" />
      </div>
    </div>

    <!-- Main: messages -->
    <div class="flex-1 flex flex-col min-w-0">
      <div ref="scroller" class="flex-1 overflow-y-auto px-6 py-4">
        <EmptyState v-if="!store.activeRoomId" title="选择一个房间" description="从左侧列表选择一个群聊房间开始对话" icon="💬" />
        <div v-else-if="store.messages.length === 0" class="flex items-center justify-center h-full text-sm text-[var(--text-3)]">暂无消息，发送第一条吧</div>
        <div v-for="msg in store.messages" :key="msg.id" class="mb-4" :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
          <div
            class="max-w-[75%] rounded-2xl px-4 py-2.5"
            :class="msg.role === 'user'
              ? 'bg-[var(--brand-500)] text-white rounded-br-md'
              : 'bg-[var(--bg-elevate)] text-[var(--text-1)] rounded-bl-md border border-[var(--border)]'"
          >
            <div v-if="msg.agent_name" class="flex items-center gap-1.5 mb-1">
              <span class="text-sm">{{ msg.agent_icon }}</span>
              <span class="text-xs font-semibold text-[var(--brand-600)]">@{{ msg.agent_name }}</span>
            </div>
            <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ msg.content }}</p>
          </div>
        </div>
      </div>

      <!-- Composer -->
      <div v-if="store.activeRoomId" class="border-t border-[var(--border)] p-4 bg-[var(--bg-card)]">
        <div class="flex items-center gap-2">
          <div class="flex-1 relative">
            <NInput
              v-model:value="input"
              type="textarea"
              :placeholder="`输入消息，@角色名 召唤 Agent...`"
              :autosize="{ minRows: 1, maxRows: 4 }"
              :disabled="sending"
              @keydown="onKeydown"
            />
            <!-- @mention hint -->
            <div v-if="input.includes('@')" class="flex gap-1 mt-1 flex-wrap">
              <button
                v-for="r in roles.filter(r => r.id.includes(input.split('@').pop()?.split(' ')[0] || ''))"
                :key="r.id"
                class="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevate)] hover:bg-[var(--brand-500)] hover:text-white transition-colors cursor-pointer"
                @click="input = input.replace(/@\S*$/, '@' + r.id + ' ')"
              >{{ r.icon }} @{{ r.id }}</button>
            </div>
          </div>
          <NButton type="primary" :loading="sending" :disabled="!input.trim()" @click="handleSend">发送</NButton>
        </div>
      </div>
    </div>

    <!-- Create room modal -->
    <NModal :show="showCreate" @update:show="showCreate = $event">
      <div class="bg-[var(--bg-card)] rounded-xl p-6 w-[360px]">
        <h3 class="text-sm font-semibold mb-3">新建群聊房间</h3>
        <NInput v-model:value="newRoomName" placeholder="房间名称" class="mb-3" @keydown.enter="handleCreate" />
        <div class="flex gap-2 justify-end">
          <NButton size="small" @click="showCreate = false">取消</NButton>
          <NButton size="small" type="primary" :disabled="!newRoomName.trim()" @click="handleCreate">创建</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
