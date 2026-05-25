import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/index.vue'),
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/chat/index.vue'),
  },
  {
    path: '/sessions',
    name: 'sessions',
    component: () => import('@/views/sessions/index.vue'),
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('@/views/tools/index.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/index.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
