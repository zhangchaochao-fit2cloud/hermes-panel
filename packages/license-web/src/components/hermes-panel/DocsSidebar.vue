<template>
  <aside class="docs-sidebar">
    <div class="sidebar-brand">
      <router-link to="/hermes-panel" class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="sidebar-logo-text">Hermes Panel</span>
      </router-link>
    </div>

    <nav class="sidebar-nav">
      <template v-for="section in sidebarSections" :key="section.title">
        <div class="nav-section">
          <button
            v-if="section.children"
            class="nav-section-title"
            :class="{ 'nav-section-title--open': expanded.has(section.title) }"
            @click="toggle(section.title)"
          >
            <span class="nav-section-icon" v-html="section.icon"></span>
            <span>{{ section.title }}</span>
            <svg class="nav-section-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <router-link
            v-else
            :to="section.path!"
            class="nav-section-title nav-section-title--link"
            :class="{ 'nav-section-title--active': route.path === section.path }"
            @click="$emit('navigate')"
          >
            <span class="nav-section-icon" v-html="section.icon"></span>
            <span>{{ section.title }}</span>
          </router-link>

          <div v-if="section.children && expanded.has(section.title)" class="nav-section-children">
            <router-link
              v-for="child in section.children"
              :key="child.path"
              :to="child.path"
              class="nav-link"
              :class="{ 'nav-link--active': route.path === child.path }"
              @click="$emit('navigate')"
            >
              {{ child.title }}
            </router-link>
          </div>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { sidebarSections } from './sidebarConfig';

defineEmits<{ navigate: [] }>();

const route = useRoute();

// Auto-expand section containing current route
function getExpandedSections(): Set<string> {
  const s = new Set<string>();
  for (const section of sidebarSections) {
    if (!section.children) continue;
    if (section.children.some(c => c.path === route.path)) {
      s.add(section.title);
    }
  }
  // Default: expand first three sections
  if (s.size === 0) {
    s.add('快速开始');
    s.add('使用手册');
    s.add('进阶配置');
    s.add('开发者');
  }
  return s;
}

const expanded = ref(getExpandedSections());

watch(() => route.path, () => {
  expanded.value = getExpandedSections();
});

function toggle(title: string) {
  const next = new Set(expanded.value);
  if (next.has(title)) next.delete(title);
  else next.add(title);
  expanded.value = next;
}
</script>

<style scoped>
.docs-sidebar {
  width: 260px; min-height: 100vh; flex-shrink: 0;
  background: var(--bg-elevated); border-right: 1px solid var(--border-default);
  display: flex; flex-direction: column; overflow-y: auto;
  position: sticky; top: 0; max-height: 100vh;
}

.sidebar-brand {
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-default);
}
.sidebar-logo { display: flex; align-items: center; gap: .5rem; }
.sidebar-logo-icon {
  width: 2rem; height: 2rem; border-radius: 7px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.sidebar-logo-text { font-size: .875rem; font-weight: 700; color: var(--text-primary); }

.sidebar-nav { flex: 1; padding: .5rem .625rem; overflow-y: auto; }

.nav-section { margin-bottom: 2px; }

.nav-section-title {
  display: flex; align-items: center; gap: .5rem;
  width: 100%; padding: .5rem .625rem; border-radius: 6px;
  font-size: .8125rem; font-weight: 600; color: var(--text-secondary);
  transition: all .15s; cursor: pointer; text-align: left;
}
.nav-section-title:hover { color: var(--text-primary); background: var(--bg-hover); }
.nav-section-title--open { color: var(--text-primary); }
.nav-section-title--link { font-weight: 500; }
.nav-section-title--active { color: var(--accent); background: var(--accent-soft); }
.nav-section-icon { display: flex; align-items: center; flex-shrink: 0; opacity: .5; }
.nav-section-chevron {
  margin-left: auto; flex-shrink: 0; opacity: .4; transition: transform .2s;
}
.nav-section-title--open .nav-section-chevron { transform: rotate(90deg); }

.nav-section-children { padding: 2px 0 4px; }

.nav-link {
  display: block; padding: .375rem .625rem .375rem 2.25rem;
  font-size: .8125rem; color: var(--text-muted); border-radius: 6px;
  transition: all .15s; line-height: 1.5;
}
.nav-link:hover { color: var(--text-primary); background: var(--bg-hover); }
.nav-link--active {
  color: var(--accent); background: var(--accent-soft); font-weight: 500;
}

@media (max-width: 768px) {
  .docs-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
    transform: translateX(-100%); transition: transform .25s ease;
  }
  .docs-sidebar--open { transform: translateX(0); }
}
</style>
