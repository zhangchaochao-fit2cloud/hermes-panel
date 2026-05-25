import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/dashboard/index.vue') },
  { path: '/chat', name: 'chat', component: () => import('@/views/chat/index.vue') },
  { path: '/sessions', name: 'sessions', component: () => import('@/views/sessions/index.vue') },
  { path: '/workspaces', name: 'workspaces', component: () => import('@/views/workspaces/index.vue') },
  { path: '/cron', name: 'cron', component: () => import('@/views/cron/index.vue') },
  { path: '/memory', name: 'memory', component: () => import('@/views/memory/index.vue') },
  { path: '/tools', name: 'tools', component: () => import('@/views/tools/index.vue') },
  { path: '/developer', name: 'developer', component: () => import('@/views/developer/index.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/settings/index.vue') },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
