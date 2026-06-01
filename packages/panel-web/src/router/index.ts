import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import type { PremiumFeature } from '@hermes-panel/shared';
import { clearRouteError, setRouteError } from '@/utils/route-error';
import { finishRouteLoading, resetRouteLoading, startRouteLoading } from '@/utils/route-loading';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    premium?: PremiumFeature;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/login/index.vue'), meta: { public: true } },
  { path: '/', redirect: '/dashboard' },
  // Basic features (no license needed)
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/dashboard/index.vue') },
  { path: '/chat', name: 'chat', component: () => import('@/views/chat/index.vue') },
  { path: '/sessions', name: 'sessions', component: () => import('@/views/sessions/index.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/settings/index.vue') },
  // Premium features (require license)
  { path: '/workspaces', name: 'workspaces', component: () => import('@/views/workspaces/index.vue'), meta: { premium: 'workspaces' } },
  { path: '/cron', name: 'cron', component: () => import('@/views/cron/index.vue'), meta: { premium: 'cron' } },
  { path: '/memory', name: 'memory', component: () => import('@/views/memory/index.vue'), meta: { premium: 'memory' } },
  { path: '/files', name: 'files', component: () => import('@/views/files/index.vue'), meta: { premium: 'files' } },
  { path: '/tools', name: 'tools', component: () => import('@/views/tools/index.vue'), meta: { premium: 'tools' } },
  { path: '/developer', name: 'developer', component: () => import('@/views/developer/index.vue'), meta: { premium: 'developer' } },
  { path: '/channels', name: 'channels', component: () => import('@/views/channels/index.vue'), meta: { premium: 'channels' } },
  { path: '/chat-room', name: 'chat-room', component: () => import('@/views/chat-room/index.vue'), meta: { premium: 'channels' } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to) => {
  clearRouteError();
  startRouteLoading();

  const auth = useAuthStore();
  // Validate a persisted token once on first navigation.
  if (!auth.ready) await auth.restore();

  if (to.meta.public) {
    // Already logged in → skip the login page.
    if (auth.isAuthenticated) {
      resetRouteLoading();
      return { name: 'dashboard' };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    resetRouteLoading();
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
  }

  // Premium feature gating: redirect to settings if feature not unlocked.
  if (to.meta.premium && !auth.isFeatureEnabled(to.meta.premium as PremiumFeature)) {
    resetRouteLoading();
    return { name: 'settings', hash: '#license' };
  }

  return true;
});

router.afterEach(() => {
  finishRouteLoading();
});

router.onError((err) => {
  resetRouteLoading();
  setRouteError(err);
});
