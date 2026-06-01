import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/landing/index.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/Register.vue'),
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      component: () => import('@/views/dashboard/index.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'orders' } },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/dashboard/Orders.vue'),
        },
        {
          path: 'licenses',
          name: 'licenses',
          component: () => import('@/views/dashboard/Licenses.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/admin/index.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
    // ═══ Hermes Panel 产品站点 ═══
    {
      path: '/hermes-panel',
      name: 'hermes-panel',
      component: () => import('@/views/hermes-panel/index.vue'),
    },
    {
      path: '/hermes-panel/docs',
      children: [
        { path: '', redirect: '/hermes-panel/docs/intro' },
        { path: 'intro', name: 'docs-intro', component: () => import('@/views/hermes-panel/docs/intro.vue') },
        { path: 'quick-start', name: 'docs-quick-start', component: () => import('@/views/hermes-panel/docs/quick-start.vue') },
        { path: 'installation', name: 'docs-installation', component: () => import('@/views/hermes-panel/docs/installation.vue') },
        { path: 'editions', name: 'docs-editions', component: () => import('@/views/hermes-panel/docs/editions.vue') },
        { path: 'faq', name: 'docs-faq', component: () => import('@/views/hermes-panel/docs/faq.vue') },
        // 使用手册
        { path: 'chat', name: 'docs-chat', component: () => import('@/views/hermes-panel/docs/chat.vue') },
        { path: 'sessions', name: 'docs-sessions', component: () => import('@/views/hermes-panel/docs/sessions.vue') },
        { path: 'dashboard', name: 'docs-dashboard', component: () => import('@/views/hermes-panel/docs/dashboard.vue') },
        { path: 'usage-ledger', name: 'docs-usage-ledger', component: () => import('@/views/hermes-panel/docs/usage-ledger.vue') },
        { path: 'health', name: 'docs-health', component: () => import('@/views/hermes-panel/docs/health.vue') },
        { path: 'notifications', name: 'docs-notifications', component: () => import('@/views/hermes-panel/docs/notifications.vue') },
        { path: 'user-management', name: 'docs-user-management', component: () => import('@/views/hermes-panel/docs/user-management.vue') },
        { path: 'workspaces', name: 'docs-workspaces', component: () => import('@/views/hermes-panel/docs/workspaces.vue') },
        { path: 'cron', name: 'docs-cron', component: () => import('@/views/hermes-panel/docs/cron.vue') },
        { path: 'mcp-tools', name: 'docs-mcp-tools', component: () => import('@/views/hermes-panel/docs/mcp-tools.vue') },
        { path: 'skills', name: 'docs-skills', component: () => import('@/views/hermes-panel/docs/skills.vue') },
        { path: 'plugins', name: 'docs-plugins', component: () => import('@/views/hermes-panel/docs/plugins.vue') },
        { path: 'memory', name: 'docs-memory', component: () => import('@/views/hermes-panel/docs/memory.vue') },
        { path: 'files', name: 'docs-files', component: () => import('@/views/hermes-panel/docs/files.vue') },
        { path: 'draft', name: 'docs-draft', component: () => import('@/views/hermes-panel/docs/draft.vue') },
        // 进阶配置
        { path: 'model-providers', name: 'docs-model-providers', component: () => import('@/views/hermes-panel/docs/model-providers.vue') },
        { path: 'backup', name: 'docs-backup', component: () => import('@/views/hermes-panel/docs/backup.vue') },
        { path: 'secrets', name: 'docs-secrets', component: () => import('@/views/hermes-panel/docs/secrets.vue') },
        { path: 'doctor', name: 'docs-doctor', component: () => import('@/views/hermes-panel/docs/doctor.vue') },
        { path: 'logs', name: 'docs-logs', component: () => import('@/views/hermes-panel/docs/logs.vue') },
        { path: 'sandbox', name: 'docs-sandbox', component: () => import('@/views/hermes-panel/docs/sandbox.vue') },
        { path: 'gateway', name: 'docs-gateway', component: () => import('@/views/hermes-panel/docs/gateway.vue') },
        { path: 'webhook', name: 'docs-webhook', component: () => import('@/views/hermes-panel/docs/webhook.vue') },
        { path: 'preferences', name: 'docs-preferences', component: () => import('@/views/hermes-panel/docs/preferences.vue') },
        // 开发者
        { path: 'api-playground', name: 'docs-api-playground', component: () => import('@/views/hermes-panel/docs/api-playground.vue') },
        { path: 'vscode-extension', name: 'docs-vscode-extension', component: () => import('@/views/hermes-panel/docs/vscode-extension.vue') },
        { path: 'hermes-endpoints', name: 'docs-hermes-endpoints', component: () => import('@/views/hermes-panel/docs/hermes-endpoints.vue') },
        { path: 'capabilities', name: 'docs-capabilities', component: () => import('@/views/hermes-panel/docs/capabilities.vue') },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn) await auth.restore();

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }
  if (to.meta.guest && auth.isLoggedIn) {
    return next({ name: 'orders' });
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: 'orders' });
  }
  next();
});

export default router;
