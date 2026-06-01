<template>
  <div class="docs-layout" :class="{ 'docs-layout--dark': theme.resolved === 'dark' }">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <DocsSidebar :class="{ 'docs-sidebar--open': sidebarOpen }" @navigate="sidebarOpen = false" />

    <!-- Main content -->
    <div class="docs-main">
      <!-- Mobile topbar -->
      <div class="docs-topbar">
        <button class="hamburger-btn" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span class="docs-topbar-title">Hermes Panel 文档</span>
        <a href="/" class="docs-topbar-home">← 返回官网</a>
      </div>

      <!-- Page content -->
      <div class="docs-content">
        <slot />
      </div>

      <!-- Footer -->
      <div class="docs-footer">
        <div class="docs-footer-inner">
          <span>&copy; 2026 Hermes Panel</span>
          <a href="/hermes-panel/docs/intro">文档首页</a>
          <a href="/hermes-panel">产品首页</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useThemeStore } from '@/stores/theme';
import DocsSidebar from './DocsSidebar.vue';

const theme = useThemeStore();
const sidebarOpen = ref(false);
</script>

<style scoped>
.docs-layout {
  min-height: 100vh; display: flex;
  background: var(--bg-base); color: var(--text-primary);
}

/* Sidebar overlay */
.sidebar-overlay {
  display: none;
}
@media (max-width: 768px) {
  .sidebar-overlay {
    display: block; position: fixed; inset: 0;
    background: rgba(0,0,0,.4); z-index: 40;
  }
  .docs-sidebar--open { transform: translateX(0); }
}

/* Main */
.docs-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

/* Mobile topbar */
.docs-topbar {
  display: none; align-items: center; gap: .75rem;
  padding: .75rem 1rem; position: sticky; top: 0; z-index: 30;
  background: var(--bg-card); border-bottom: 1px solid var(--border-default);
}
@media (max-width: 768px) {
  .docs-topbar { display: flex; }
}
.docs-topbar-title { font-size: .875rem; font-weight: 600; color: var(--text-primary); flex: 1; }
.docs-topbar-home { font-size: .75rem; color: var(--text-muted); }
.docs-topbar-home:hover { color: var(--accent); }
.hamburger-btn {
  padding: .25rem; border-radius: 4px; color: var(--text-secondary); transition: all .15s;
}
.hamburger-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Content area */
.docs-content {
  flex: 1; max-width: 860px; width: 100%; margin: 0 auto; padding: 2.5rem 2rem;
}
@media (max-width: 768px) {
  .docs-content { padding: 1.5rem 1.25rem; }
}

/* Footer */
.docs-footer {
  margin-top: auto; border-top: 1px solid var(--border-default);
  background: var(--bg-elevated);
}
.docs-footer-inner {
  max-width: 860px; margin: 0 auto; padding: 1.25rem 2rem;
  display: flex; align-items: center; gap: 1.5rem;
  font-size: .75rem; color: var(--text-muted);
}
.docs-footer-inner a:hover { color: var(--text-primary); }
</style>
