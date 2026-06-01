import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PublicUser, LicenseInfo, PremiumFeature } from '@hermes-panel/shared';
import {
  fetchMe,
  loginAccount,
  setupAccount,
  logoutAccount,
} from '@/api/auth';

const TOKEN_KEY = 'hermes-panel.session';

/**
 * Holds the account session token + current user. The token is the source of
 * truth for api/bff.ts (X-Panel-Token). Persisted to localStorage so a reload
 * keeps the user logged in until the session expires server-side.
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<PublicUser | null>(null);
  const license = ref<LicenseInfo | null>(null);
  const features = ref<string[]>([]);
  const ready = ref(false); // true once restore() has resolved (or failed)

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => user.value?.role === 'admin');

  /** Check whether a premium feature is enabled for the current user. */
  function isFeatureEnabled(f: PremiumFeature): boolean {
    return features.value.includes(f);
  }

  function setToken(t: string): void {
    token.value = t;
    localStorage.setItem(TOKEN_KEY, t);
  }

  function clear(): void {
    token.value = null;
    user.value = null;
    license.value = null;
    features.value = [];
    localStorage.removeItem(TOKEN_KEY);
  }

  /** Re-validate a persisted token on app boot. Always sets `ready`. */
  async function restore(): Promise<void> {
    if (!token.value) {
      ready.value = true;
      return;
    }
    try {
      const res = await fetchMe();
      user.value = res.user;
      license.value = res.license;
      features.value = res.features;
    } catch {
      clear();
    } finally {
      ready.value = true;
    }
  }

  /** Login with password (1Panel style). email optional for backward compat. */
  async function login(password: string, email?: string): Promise<void> {
    const res = await loginAccount({ password, email });
    setToken(res.token);
    user.value = res.user;
  }

  /** First-launch admin setup. */
  async function setup(password: string): Promise<void> {
    const res = await setupAccount(password);
    setToken(res.token);
    user.value = res.user;
  }

  async function logout(): Promise<void> {
    await logoutAccount();
    clear();
  }

  /** Called by bff.ts on a 401 — drop local state so the guard redirects. */
  function onUnauthorized(): void {
    clear();
  }

  return {
    token,
    user,
    license,
    features,
    ready,
    isAuthenticated,
    isAdmin,
    isFeatureEnabled,
    setToken,
    restore,
    login,
    setup,
    logout,
    onUnauthorized,
  };
});
