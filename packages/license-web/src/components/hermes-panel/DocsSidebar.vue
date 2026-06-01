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
      <template v-for="section in sections" :key="section.title">
        <div class="nav-section">
          <button
            v-if="section.children"
            class="nav-section-title"
            :class="{ 'nav-section-title--open': expandedSections.has(section.title) }"
            @click="toggleSection(section.title)"
          >
            <span class="nav-section-icon" v-html="section.icon"></span>
            <span>{{ section.title }}</span>
            <svg class="nav-section-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <router-link
            v-else
            :to="section.path"
            class="nav-section-title nav-section-title--link"
            active-class="nav-link--active"
            @click="$emit('navigate')"
          >
            <span class="nav-section-icon" v-html="section.icon"></span>
            <span>{{ section.title }}</span>
          </router-link>

          <div v-if="section.children && expandedSections.has(section.title)" class="nav-section-children">
            <router-link
              v-for="child in section.children"
              :key="child.path"
              :to="child.path"
              class="nav-link"
              active-class="nav-link--active"
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
import { ref } from 'vue';

defineEmits<{ navigate: [] }>();

const expandedSections = ref(new Set([
  '快速开始',
  '使用手册',
  '进阶配置',
  '开发者',
]));

function toggleSection(title: string) {
  if (expandedSections.value.has(title)) {
    expandedSections.value.delete(title);
  } else {
    expandedSections.value.add(title);
  }
  // Trigger reactivity
  expandedSections.value = new Set(expandedSections.value);
}

const sections = [
  {
    title: '产品首页',
    path: '/hermes-panel',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
  },
  {
    title: '快速开始',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    children: [
      { title: '产品简介', path: '/hermes-panel/docs/intro' },
      { title: '安装部署', path: '/hermes-panel/docs/installation' },
      { title: '三分钟上手', path: '/hermes-panel/docs/quick-start' },
      { title: '版本对比', path: '/hermes-panel/docs/editions' },
    ],
  },
  {
    title: '使用手册',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
    children: [
      { title: '对话系统 (Chat)', path: '/hermes-panel/docs/chat' },
      { title: '会话管理', path: '/hermes-panel/docs/sessions' },
      { title: '仪表盘 & 统计', path: '/hermes-panel/docs/dashboard' },
      { title: '用量账本', path: '/hermes-panel/docs/usage-ledger' },
      { title: '系统健康监控', path: '/hermes-panel/docs/health' },
      { title: '通知中心', path: '/hermes-panel/docs/notifications' },
      { title: '用户管理', path: '/hermes-panel/docs/user-management' },
      { title: '工作区', path: '/hermes-panel/docs/workspaces' },
      { title: '定时任务 (Cron)', path: '/hermes-panel/docs/cron' },
      { title: 'MCP 工具集成', path: '/hermes-panel/docs/mcp-tools' },
      { title: '技能 (Skills)', path: '/hermes-panel/docs/skills' },
      { title: '插件系统', path: '/hermes-panel/docs/plugins' },
      { title: '记忆管理', path: '/hermes-panel/docs/memory' },
      { title: '文件管理', path: '/hermes-panel/docs/files' },
      { title: 'Draft 跨端桥接', path: '/hermes-panel/docs/draft' },
    ],
  },
  {
    title: '进阶配置',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    children: [
      { title: '模型供应商', path: '/hermes-panel/docs/model-providers' },
      { title: '备份管理', path: '/hermes-panel/docs/backup' },
      { title: '密钥管理', path: '/hermes-panel/docs/secrets' },
      { title: '诊断工具 (Doctor)', path: '/hermes-panel/docs/doctor' },
      { title: '日志查看', path: '/hermes-panel/docs/logs' },
      { title: '沙箱隔离', path: '/hermes-panel/docs/sandbox' },
      { title: '网关配置', path: '/hermes-panel/docs/gateway' },
      { title: 'Webhook', path: '/hermes-panel/docs/webhook' },
      { title: '偏好设置', path: '/hermes-panel/docs/preferences' },
    ],
  },
  {
    title: '开发者',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>',
    children: [
      { title: 'API Playground', path: '/hermes-panel/docs/api-playground' },
      { title: 'VS Code 扩展', path: '/hermes-panel/docs/vscode-extension' },
      { title: 'Hermes 端点配置', path: '/hermes-panel/docs/hermes-endpoints' },
      { title: '功能探测', path: '/hermes-panel/docs/capabilities' },
    ],
  },
  {
    title: 'FAQ',
    path: '/hermes-panel/docs/faq',
    icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  },
];
</script>

<style scoped>
.docs-sidebar {
  width: 260px; min-height: 100vh; flex-shrink: 0;
  background: var(--bg-raised); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow-y: auto;
  position: sticky; top: 0; max-height: 100vh;
}

.sidebar-brand {
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
}
.sidebar-logo { display: flex; align-items: center; gap: .5rem; }
.sidebar-logo-icon {
  width: 2rem; height: 2rem; border-radius: 7px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.sidebar-logo-text { font-size: .875rem; font-weight: 700; color: var(--text); }

.sidebar-nav { flex: 1; padding: .5rem .625rem; overflow-y: auto; }

.nav-section { margin-bottom: 2px; }

.nav-section-title {
  display: flex; align-items: center; gap: .5rem;
  width: 100%; padding: .5rem .625rem; border-radius: 6px;
  font-size: .8125rem; font-weight: 600; color: var(--text-secondary);
  transition: all .15s; cursor: pointer; text-align: left;
}
.nav-section-title:hover { color: var(--text); background: var(--bg-subtle); }
.nav-section-title--open { color: var(--text); }
.nav-section-title--link { font-weight: 500; }
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
.nav-link:hover { color: var(--text); background: var(--bg-subtle); }
.nav-link--active {
  color: var(--accent-text); background: var(--accent-soft); font-weight: 500;
}

/* Mobile */
@media (max-width: 768px) {
  .docs-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
    transform: translateX(-100%); transition: transform .25s ease;
  }
  .docs-sidebar--open { transform: translateX(0); }
}
</style>
