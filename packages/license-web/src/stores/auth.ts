import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setToken } from '@/api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: number;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const isLoggedIn = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
      setToken(res.token);
      user.value = res.user;
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string, displayName?: string) {
    loading.value = true;
    try {
      const res = await api.post<{ user: User; token: string }>('/auth/register', { email, password, displayName });
      setToken(res.token);
      user.value = res.user;
    } finally {
      loading.value = false;
    }
  }

  async function restore() {
    if (!getTokenFromStore()) return;
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      user.value = res.user;
    } catch {
      setToken(null);
      user.value = null;
    }
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setToken(null);
    user.value = null;
  }

  return { user, loading, isLoggedIn, isAdmin, login, register, restore, logout };
});

function getTokenFromStore(): string | null {
  return localStorage.getItem('license-token');
}
