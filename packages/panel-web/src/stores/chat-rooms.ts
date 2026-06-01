import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';
import { getBffBaseAsync, getPanelTokenAsync } from '@/api/token';
import { HEADERS } from '@hermes-panel/shared';
import { teamFor, type RoleDef } from '@/data/roles';

export interface ChatRoom {
  id: string;
  name: string;
  workspace_name: string | null;
  created_at: number;
  updated_at: number;
}

export interface ChatMsg {
  id: string;
  room_id: string;
  role: 'user' | 'agent';
  agent_name: string | null;
  agent_icon: string | null;
  content: string;
  created_at: number;
}

export const useChatRoomsStore = defineStore('chat-rooms', () => {
  const rooms = ref<ChatRoom[]>([]);
  const messages = ref<ChatMsg[]>([]);
  const loading = ref(false);
  const activeRoomId = ref<string | null>(null);
  const streaming = ref(false);
  let streamAbort: AbortController | null = null;

  async function fetchRooms(): Promise<void> {
    loading.value = true;
    try { rooms.value = await bffFetch<ChatRoom[]>('/api/chat-rooms'); }
    finally { loading.value = false; }
  }

  async function createRoom(name: string, workspaceName?: string): Promise<ChatRoom> {
    const room = await bffFetch<ChatRoom>('/api/chat-rooms', {
      method: 'POST',
      body: JSON.stringify({ name, workspace_name: workspaceName }),
    });
    rooms.value.unshift(room);
    return room;
  }

  async function deleteRoom(id: string): Promise<void> {
    stopStream();
    await bffFetch(`/api/chat-rooms/${id}`, { method: 'DELETE' });
    rooms.value = rooms.value.filter(r => r.id !== id);
    if (activeRoomId.value === id) { activeRoomId.value = null; messages.value = []; }
  }

  async function fetchMessages(roomId: string): Promise<void> {
    activeRoomId.value = roomId;
    messages.value = await bffFetch<ChatMsg[]>(`/api/chat-rooms/${roomId}/messages`);
  }

  async function sendMessage(roomId: string, content: string, mentions: Array<{ name: string; icon: string; prompt: string; model?: string }> = []): Promise<void> {
    const result = await bffFetch<{ userMessage: ChatMsg; agentReplies: ChatMsg[] }>(`/api/chat-rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content, mentions }),
    });
    messages.value.push(result.userMessage);
    messages.value.push(...result.agentReplies);

    // Start SSE stream to get live agent responses
    if (result.agentReplies.length > 0) {
      startStream(roomId);
    }
  }

  async function startStream(roomId: string): Promise<void> {
    stopStream();
    streaming.value = true;
    const base = await getBffBaseAsync();
    const token = await getPanelTokenAsync();
    streamAbort = new AbortController();

    try {
      const res = await fetch(`${base}/api/chat-rooms/${roomId}/stream`, {
        headers: { [HEADERS.PANEL_TOKEN]: token },
        signal: streamAbort.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const data = line.replace(/^data: /, '');
          if (!data) continue;
          try {
            const ev = JSON.parse(data);
            if (ev.event === 'messages' && Array.isArray(ev.data)) {
              for (const m of ev.data as ChatMsg[]) {
                const existing = messages.value.findIndex(x => x.id === m.id);
                if (existing >= 0) messages.value[existing] = m;
              }
            }
            if (ev.event === 'done') { stopStream(); }
          } catch { /**/ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        streaming.value = false;
      }
    }
  }

  function stopStream(): void {
    streamAbort?.abort();
    streamAbort = null;
    streaming.value = false;
  }

  function getAgentInfo(name: string, workspaceId?: string | null): RoleDef {
    if (!workspaceId) return { icon: '🤖', name, id: name, description: '', promptPrefix: '' };
    const roles = teamFor(workspaceId);
    const role = roles.find(r => r.id === name);
    return role ?? { icon: '🤖', name, id: name, description: '', promptPrefix: '' };
  }

  return {
    rooms, messages, loading, streaming, activeRoomId,
    fetchRooms, createRoom, deleteRoom, fetchMessages, sendMessage, stopStream, getAgentInfo,
  };
});
