<template>
  <div class="docs-layout">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <DocsSidebar :class="{ 'docs-sidebar--open': sidebarOpen }" @navigate="sidebarOpen = false" />

    <!-- Main content -->
    <div class="docs-main">
      <!-- Mobile topbar -->
      <div class="docs-topbar">
        <button class="hamburger-btn" @click="toggleSidebar" aria-label="Toggle menu">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <span class="docs-topbar-title">Hermes Panel 文档</span>
        <router-link to="/" class="docs-topbar-home">← 官网</router-link>
      </div>

      <!-- Breadcrumb -->
      <nav v-if="breadcrumbs.length" class="breadcrumb">
        <router-link to="/hermes-panel">首页</router-link>
        <template v-for="(crumb, i) in breadcrumbs" :key="i">
          <span class="breadcrumb-sep">/</span>
          <router-link v-if="crumb.path && i < breadcrumbs.length - 1" :to="crumb.path">{{ crumb.title }}</router-link>
          <span v-else class="breadcrumb-current">{{ crumb.title }}</span>
        </template>
      </nav>

      <!-- Page content + TOC -->
      <div class="docs-body">
        <article class="docs-content" ref="contentRef">
          <slot />
        </article>

        <!-- Right TOC -->
        <aside v-if="tocItems.length > 1" class="docs-toc">
          <div class="toc-title">本页目录</div>
          <nav class="toc-nav">
            <a
              v-for="item in tocItems"
              :key="item.id"
              :href="`#${item.id}`"
              class="toc-link"
              :class="{ 'toc-link--active': activeTocId === item.id, 'toc-link--h3': item.level === 3 }"
              @click.prevent="scrollToHeading(item.id)"
            >{{ item.text }}</a>
          </nav>
        </aside>
      </div>

      <!-- Previous / Next navigation -->
      <nav v-if="prevPage || nextPage" class="page-nav">
        <router-link v-if="prevPage" :to="prevPage.path" class="page-nav-link page-nav-link--prev">
          <span class="page-nav-label">← 上一页</span>
          <span class="page-nav-title">{{ prevPage.title }}</span>
        </router-link>
        <div v-else class="page-nav-link page-nav-link--empty" />
        <router-link v-if="nextPage" :to="nextPage.path" class="page-nav-link page-nav-link--next">
          <span class="page-nav-label">下一页 →</span>
          <span class="page-nav-title">{{ nextPage.title }}</span>
        </router-link>
        <div v-else class="page-nav-link page-nav-link--empty" />
      </nav>

      <!-- Footer -->
      <div class="docs-footer">
        <div class="docs-footer-inner">
          <span>&copy; 2026 Hermes Panel</span>
          <router-link to="/hermes-panel/docs/intro">文档首页</router-link>
          <router-link to="/hermes-panel">产品首页</router-link>
        </div>
      </div>
    </div>

    <!-- Back to top -->
    <button v-if="showBackTop" class="back-to-top" @click="scrollToTop" title="回到顶部">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeStore } from '@/stores/theme';
import DocsSidebar from './DocsSidebar.vue';
import { sidebarSections } from './sidebarConfig';

const route = useRoute();
const theme = useThemeStore();
const sidebarOpen = ref(false);
const showBackTop = ref(false);
const activeTocId = ref('');
const contentRef = ref<HTMLElement | null>(null);

// ── Breadcrumb ──────────────────────────────────────────────
const breadcrumbs = computed(() => {
  const path = route.path;
  const parts: { title: string; path?: string }[] = [];
  if (path === '/hermes-panel/docs/intro') return parts;

  // Find current page in sidebar sections
  for (const section of sidebarSections) {
    if (section.children) {
      for (const child of section.children) {
        if (child.path === path) {
          parts.push({ title: section.title, path: section.children[0]?.path || child.path });
          parts.push({ title: child.title });
          return parts;
        }
      }
    } else if (section.path === path) {
      parts.push({ title: section.title });
      return parts;
    }
  }
  return parts;
});

// ── Previous / Next ─────────────────────────────────────────
type NavLink = { title: string; path: string } | null;

const flatPages = computed(() => {
  const pages: { title: string; path: string; section: string }[] = [];
  for (const section of sidebarSections) {
    if (section.children) {
      for (const child of section.children) {
        pages.push({ title: child.title, path: child.path, section: section.title });
      }
    } else if (section.path) {
      pages.push({ title: section.title, path: section.path, section: '' });
    }
  }
  return pages;
});

const prevPage = computed<NavLink>(() => {
  const pages = flatPages.value;
  const idx = pages.findIndex(p => p.path === route.path);
  return idx > 0 ? pages[idx - 1] : null;
});

const nextPage = computed<NavLink>(() => {
  const pages = flatPages.value;
  const idx = pages.findIndex(p => p.path === route.path);
  return idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null;
});

// ── TOC extraction ──────────────────────────────────────────
interface TocItem { id: string; text: string; level: number }

const tocItems = ref<TocItem[]>([]);

function extractToc() {
  nextTick(() => {
    if (!contentRef.value) return;
    const headings = contentRef.value.querySelectorAll('h2, h3');
    const items: TocItem[] = [];
    headings.forEach((h, i) => {
      const id = h.id || `heading-${i}`;
      if (!h.id) h.id = id;
      items.push({ id, text: h.textContent || '', level: Number(h.tagName[1]) });
    });
    tocItems.value = items;
  });
}

onMounted(extractToc);
watch(() => route.path, extractToc);

// ── TOC scroll spy ──────────────────────────────────────────
function onScroll() {
  const scrollY = window.scrollY;
  showBackTop.value = scrollY > 400;

  if (tocItems.value.length === 0) return;
  for (let i = tocItems.value.length - 1; i >= 0; i--) {
    const el = document.getElementById(tocItems.value[i].id);
    if (el && el.offsetTop - 100 <= scrollY) {
      activeTocId.value = tocItems.value[i].id;
      return;
    }
  }
  activeTocId.value = tocItems.value[0]?.id || '';
}

// ── Lifecycle ───────────────────────────────────────────────
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  document.body.style.overflow = sidebarOpen.value ? 'hidden' : '';
}

function closeSidebar() {
  sidebarOpen.value = false;
  document.body.style.overflow = '';
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  extractToc();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  document.body.style.overflow = '';
});

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeTocId.value = id;
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<style scoped>
.docs-layout {
  min-height: 100vh; display: flex;
  background: var(--bg-deep); color: var(--text-primary);
}

/* Overlay */
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
@media (max-width: 768px) { .docs-topbar { display: flex; } }
.docs-topbar-title { font-size: .875rem; font-weight: 600; color: var(--text-primary); flex: 1; }
.docs-topbar-home { font-size: .75rem; color: var(--text-muted); }
.docs-topbar-home:hover { color: var(--accent); }
.hamburger-btn {
  padding: .25rem; border-radius: 4px;
  color: var(--text-secondary); transition: all .15s;
}
.hamburger-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; gap: .375rem;
  padding: 1rem 2rem 0; font-size: .8125rem; color: var(--text-muted);
  max-width: 1040px; width: 100%; margin: 0 auto;
}
.breadcrumb a { color: var(--text-muted); }
.breadcrumb a:hover { color: var(--accent); }
.breadcrumb-sep { opacity: .4; }
.breadcrumb-current { color: var(--text-secondary); }
@media (max-width: 768px) { .breadcrumb { padding: .75rem 1.25rem 0; } }

/* Body: content + TOC */
.docs-body {
  display: flex; gap: 2rem;
  max-width: 1040px; width: 100%; margin: 0 auto;
  padding: 2rem 2rem 0;
}
@media (max-width: 900px) {
  .docs-body { display: block; }
}
@media (max-width: 768px) {
  .docs-body { padding: 1.5rem 1.25rem 0; }
}

/* Content */
.docs-content { flex: 1; min-width: 0; }

/* TOC */
.docs-toc {
  width: 200px; flex-shrink: 0;
  position: sticky; top: 5rem; align-self: flex-start;
  max-height: calc(100vh - 6rem); overflow-y: auto;
}
.toc-title {
  font-size: .75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--text-muted);
  margin-bottom: .75rem;
}
.toc-nav { display: flex; flex-direction: column; gap: 2px; border-left: 1px solid var(--border-default); }
.toc-link {
  display: block; padding: .25rem .75rem;
  font-size: .75rem; color: var(--text-muted);
  border-left: 2px solid transparent; margin-left: -1px;
  transition: all .15s; line-height: 1.5;
}
.toc-link:hover { color: var(--text-secondary); }
.toc-link--active {
  color: var(--accent); border-left-color: var(--accent);
  background: var(--accent-soft);
}
.toc-link--h3 { padding-left: 1.5rem; }

/* Page nav (prev/next) */
.page-nav {
  display: flex; gap: 1rem;
  max-width: 1040px; width: 100%; margin: 3rem auto 0;
  padding: 1.5rem 2rem 0;
  border-top: 1px solid var(--border-default);
}
@media (max-width: 768px) {
  .page-nav { flex-direction: column; padding: 1.5rem 1.25rem 0; }
}
.page-nav-link {
  flex: 1; display: flex; flex-direction: column; gap: .25rem;
  padding: .75rem 1rem; border-radius: 8px;
  border: 1px solid var(--border-default);
  transition: all .15s;
}
.page-nav-link:hover { border-color: var(--accent); background: var(--accent-soft); }
.page-nav-link--empty { border: none; }
.page-nav-link--next { text-align: right; }
.page-nav-label { font-size: .75rem; color: var(--text-muted); }
.page-nav-title { font-size: .875rem; color: var(--text-primary); font-weight: 500; }

/* Footer */
.docs-footer {
  margin-top: 2rem; border-top: 1px solid var(--border-default);
  background: var(--bg-elevated);
}
.docs-footer-inner {
  max-width: 1040px; margin: 0 auto; padding: 1.25rem 2rem;
  display: flex; align-items: center; gap: 1.5rem;
  font-size: .75rem; color: var(--text-muted);
}
.docs-footer-inner a:hover { color: var(--text-primary); }

/* Back to top */
.back-to-top {
  position: fixed; bottom: 2rem; right: 2rem; z-index: 50;
  width: 2.5rem; height: 2.5rem; border-radius: 50%;
  background: var(--bg-card); border: 1px solid var(--border-default);
  color: var(--text-muted); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s; box-shadow: var(--shadow-md);
}
.back-to-top:hover { color: var(--accent); border-color: var(--accent); transform: translateY(-2px); }
</style>
