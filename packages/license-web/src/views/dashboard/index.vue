<template>
  <div class="dashboard-layout">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <!-- Logo -->
      <div class="sidebar-brand">
        <router-link to="/" class="sidebar-logo-link" @click="closeSidebar">
          <div class="sidebar-logo-icon">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div class="sidebar-logo-title">Hermes Panel</div>
            <div class="sidebar-logo-sub">License Portal</div>
          </div>
        </router-link>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <p class="sidebar-section-label">用户中心</p>
        <router-link to="/dashboard/orders" class="sidebar-nav-item" active-class="sidebar-nav-item--active" @click="closeSidebar">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span>我的订单</span>
        </router-link>
        <router-link to="/dashboard/licenses" class="sidebar-nav-item" active-class="sidebar-nav-item--active" @click="closeSidebar">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
          <span>我的 License</span>
        </router-link>

        <template v-if="auth.isAdmin">
          <p class="sidebar-section-label sidebar-section-label--admin">管理</p>
          <router-link to="/dashboard/admin" class="sidebar-nav-item sidebar-nav-item--admin" active-class="sidebar-nav-item--admin-active" @click="closeSidebar">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            <span>管理后台</span>
          </router-link>
        </template>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Theme toggle -->
      <div class="sidebar-footer">
        <div class="theme-toggle" @click="cycleTheme" :title="themeLabel">
          <svg v-if="theme.mode === 'light'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg v-else-if="theme.mode === 'dark'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>

        <!-- User -->
        <div class="sidebar-user">
          <div class="sidebar-avatar">
            {{ (auth.user?.displayName || auth.user?.email)?.[0]?.toUpperCase() || 'U' }}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ auth.user?.displayName || auth.user?.email }}</div>
          </div>
          <button @click="handleLogout" class="sidebar-logout-btn" title="退出登录">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Content -->
    <main class="dashboard-content">
      <!-- Mobile top bar -->
      <div class="mobile-topbar">
        <button class="hamburger-btn" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span class="mobile-topbar-title">Hermes Panel</span>
      </div>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const auth = useAuthStore();
const router = useRouter();
const theme = useThemeStore();
const sidebarOpen = ref(false);

const themeLabel = computed(() => ({
  light: '亮色模式', dark: '暗色模式', auto: '自动模式',
}[theme.mode]));

function cycleTheme() {
  const next = { light: 'dark', dark: 'auto', auto: 'light' } as const;
  theme.setMode(next[theme.mode]);
}

function closeSidebar() {
  sidebarOpen.value = false;
}

async function handleLogout() {
  await auth.logout();
  router.push('/');
}
</script>

<style scoped>
.dashboard-layout { min-height: 100vh; display: flex; background: var(--bg-deep); color: var(--text-primary); }

/* ── Sidebar ────────────────────────────────────────────── */

.sidebar {
  width: 240px; display: flex; flex-direction: column; flex-shrink: 0;
  background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border);
  transition: transform 0.25s ease;
  z-index: 50;
}

/* Mobile: sidebar hidden off-screen */
@media (max-width: 768px) {
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    transform: translateX(-100%);
  }
  .sidebar--open { transform: translateX(0); }
}

/* Overlay */
.sidebar-overlay {
  display: none;
}
@media (max-width: 768px) {
  .sidebar-overlay {
    display: block; position: fixed; inset: 0;
    background: rgba(0,0,0,0.4); z-index: 40;
  }
  .dark .sidebar-overlay { background: rgba(0,0,0,0.6); }
}

/* Brand */
.sidebar-brand { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-subtle); }
.sidebar-logo-link { display: flex; align-items: center; gap: 0.625rem; }
.sidebar-logo-icon {
  width: 2rem; height: 2rem; border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
}
.sidebar-logo-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
.sidebar-logo-sub { font-size: 0.6875rem; color: var(--text-muted); }

/* Nav */
.sidebar-nav { flex: 1; padding: 0.75rem 0.625rem; overflow-y: auto; }
.sidebar-section-label {
  padding: 0.25rem 0.75rem; margin: 0.5rem 0 0.25rem;
  font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--text-muted);
}
.sidebar-section-label--admin { color: var(--warning); opacity: 0.6; }

.sidebar-nav-item {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);
  font-size: 0.8125rem; color: var(--text-secondary);
  transition: all 0.15s;
}
.sidebar-nav-item:hover { color: var(--text-primary); background: var(--bg-hover); }
.sidebar-nav-item--active { background: var(--bg-active); color: var(--text-primary); font-weight: 500; }

.sidebar-nav-item--admin { color: var(--warning); opacity: 0.55; }
.sidebar-nav-item--admin:hover { opacity: 0.85; background: var(--warning-soft); }
.sidebar-nav-item--admin-active { background: var(--warning-soft); opacity: 1; font-weight: 500; }

/* Footer */
.sidebar-footer { padding: 0.625rem; border-top: 1px solid var(--border-subtle); }
.theme-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; margin: 0 auto 0.5rem;
  border-radius: var(--radius-sm); color: var(--text-muted);
  cursor: pointer; transition: all 0.15s;
}
.theme-toggle:hover { background: var(--bg-hover); color: var(--text-primary); }

.sidebar-user { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem; }
.sidebar-avatar {
  width: 1.75rem; height: 1.75rem; border-radius: 50%; flex-shrink: 0;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6875rem; font-weight: 600;
}
.sidebar-user-info { flex: 1; min-width: 0; }
.sidebar-user-name { font-size: 0.6875rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-logout-btn {
  padding: 0.25rem; border-radius: var(--radius-sm);
  color: var(--text-muted); transition: all 0.15s; flex-shrink: 0;
}
.sidebar-logout-btn:hover { background: var(--bg-hover); color: var(--danger); }

/* ── Content ────────────────────────────────────────────── */

.dashboard-content { flex: 1; overflow: auto; background: var(--bg-base); }

/* Mobile topbar */
.mobile-topbar {
  display: none; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card); border-bottom: 1px solid var(--border-default);
}
.mobile-topbar-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
.hamburger-btn {
  padding: 0.25rem; border-radius: var(--radius-sm); color: var(--text-secondary);
  transition: all 0.15s;
}
.hamburger-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

@media (max-width: 768px) {
  .mobile-topbar { display: flex; }
}
</style>
