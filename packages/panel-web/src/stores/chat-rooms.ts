import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bffFetch } from '@/api/bff';

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
    await bffFetch(`/api/chat-rooms/${id}`, { method: 'DELETE' });
    rooms.value = rooms.value.filter(r => r.id !== id);
    if (activeRoomId.value === id) { activeRoomId.value = null; messages.value = []; }
  }

  async function fetchMessages(roomId: string): Promise<void> {
    activeRoomId.value = roomId;
    messages.value = await bffFetch<ChatMsg[]>(`/api/chat-rooms/${roomId}/messages`);
  }

  async function sendMessage(roomId: string, content: string): Promise<{ userMessage: ChatMsg; agentReplies: ChatMsg[] }> {
    const result = await bffFetch<{ userMessage: ChatMsg; agentReplies: ChatMsg[] }>(`/api/chat-rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content }),
    });
    messages.value.push(result.userMessage);
    messages.value.push(...result.agentReplies);
    return result;
  }

  function addLocalMessage(msg: ChatMsg): void {
    messages.value.push(msg);
  }

  return { rooms, messages, loading, activeRoomId, fetchRooms, createRoom, deleteRoom, fetchMessages, sendMessage, addLocalMessage };
});
