<template>
  <div class="landing-root">
    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <router-link to="/hermes-panel" class="header-logo">
          <div class="header-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          Hermes Panel
        </router-link>
        <nav class="header-nav">
          <a href="/hermes-panel#features">全部功能</a>
          <router-link to="/hermes-panel/docs/intro">文档</router-link>
          <a href="/hermes-panel#compare">版本对比</a>
          <a href="/hermes-panel#usage">使用方式</a>
          <a href="/hermes-panel/docs/faq">FAQ</a>
          <a href="https://github.com/NousResearch/hermes-agent" target="_blank">GitHub ↗</a>
        </nav>
        <div class="header-actions">
          <button class="btn-theme" @click="cycleTheme" title="切换主题">
            <svg v-if="iconTheme === 'sun'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <svg v-else fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          </button>
          <a href="/login" class="btn-ghost">登录</a>
          <a href="/register" class="btn-primary">免费使用</a>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-grid container">
        <div>
          <div class="hero-tag"><span class="hero-tag-dot" />本地优先 · 数据 100% 私有化</div>
          <h1 class="hero-title">
            不止于对话的<br><span>AI Agent 控制面板</span>
          </h1>
          <p class="hero-desc">
            为 <a href="https://github.com/NousResearch/hermes-agent" target="_blank" class="link">Hermes Agent</a> 提供专业级可视化操作界面。
            从日常对话到自动化工作流，从 MCP 工具到沙箱隔离，<strong>24+ 项功能</strong>覆盖 AI Agent 管理和使用的全场景。
          </p>
          <div class="hero-actions">
            <a href="/register" class="btn-primary btn-primary--lg">
              免费开始使用
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
            <a href="/hermes-panel/docs/intro" class="btn-outline--lg">
              查看文档
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253"/></svg>
            </a>
          </div>
          <div class="hero-stats">
            <div><div class="hero-stat-num">24+</div><div class="hero-stat-label">内置功能模块</div></div>
            <div><div class="hero-stat-num">3</div><div class="hero-stat-label">运行形态</div></div>
            <div><div class="hero-stat-num">100%</div><div class="hero-stat-label">本地数据处理</div></div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="hero-visual-glow" />
          <div class="hero-screen">
            <div class="hero-screen-topbar"><span class="hero-screen-dot" /><span class="hero-screen-dot" /><span class="hero-screen-dot" /></div>
            <div class="hero-screen-body">
              <div class="hero-screen-msg">你好！我今天能用 MCP 天气工具、搜索文档、读写文件、执行定时任务来帮你。需要我做什么？</div>
              <div class="hero-screen-msg--user">帮我创建一个每天早上 8 点生成工作简报的自动化</div>
              <div class="hero-screen-tool">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                已创建定时任务「每日工作简报」— Cron: 0 8 * * 1-5
              </div>
              <div class="hero-screen-tool hero-screen-tool--warn">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                已启用 3 个 MCP 工具：weather、file-search、notion
              </div>
              <div class="hero-screen-input">输入你想做的事情...</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stat banner -->
    <div class="stat-banner container">
      <div class="stat-card"><div class="stat-card-icon stat-card-icon--blue">⚡</div><div class="stat-card-num">24+</div><div class="stat-card-label">功能模块</div></div>
      <div class="stat-card"><div class="stat-card-icon stat-card-icon--purple">🖥️</div><div class="stat-card-num">3</div><div class="stat-card-label">运行形态</div></div>
      <div class="stat-card"><div class="stat-card-icon stat-card-icon--cyan">🔌</div><div class="stat-card-num">∞</div><div class="stat-card-label">MCP 扩展能力</div></div>
      <div class="stat-card"><div class="stat-card-icon stat-card-icon--green">🔒</div><div class="stat-card-num">100%</div><div class="stat-card-label">数据本地化</div></div>
    </div>

    <!-- Features -->
    <section id="features" class="section" style="padding-top:6rem">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">全部功能</span>
          <h2 class="section-title">24+ 项内置功能</h2>
          <p class="section-desc">从基础对话到高级沙箱，覆盖 AI Agent 工作流的每一个环节</p>
        </div>

        <div v-for="group in featureGroups" :key="group.label" class="feature-group">
          <div class="feature-section-title">
            <div class="feature-section-icon" :class="group.iconClass">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" v-html="group.iconPath" />
            </div>
            {{ group.label }}
          </div>
          <div class="feature-grid">
            <div v-for="f in group.items" :key="f.name" class="feature-cell">
              <div class="feature-cell-icon" :class="f.iconClass">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" v-html="f.iconPath" />
              </div>
              <div class="feature-cell-info">
                <div class="feature-cell-name">{{ f.name }}</div>
                <div class="feature-cell-desc">{{ f.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Compare -->
    <section id="compare" class="section section-alt">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">版本对比</span>
          <h2 class="section-title">功能全面对比</h2>
          <p class="section-desc">Web 版免费开放全部基础功能；Desktop 版解锁高级工作流能力</p>
        </div>
        <div class="compare-wrap">
          <table class="compare-table">
            <thead>
              <tr><th>功能模块</th><th>Web</th><th>Desktop</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in compareRows" :key="r.name" :style="r.divider ? 'border-top:2px solid var(--border-default)' : ''">
                <td>{{ r.name }}</td>
                <td><span v-if="r.web" class="compare-check">✓</span><span v-else class="compare-na">—</span></td>
                <td><span v-if="r.desktop" class="compare-check">✓</span><span v-else class="compare-na">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Usage -->
    <section id="usage" class="section">
      <div class="container">
        <div class="section-header">
          <span class="section-eyebrow">使用方式</span>
          <h2 class="section-title">三种形态，一个体验</h2>
          <p class="section-desc">无论你习惯命令行、桌面应用还是 VS Code 编辑器，Hermes Panel 都已适配</p>
        </div>
        <div class="cards-row">
          <div class="usage-card">
            <div class="usage-card-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
            <h3>NPX 一行启动</h3>
            <p>零安装，有 Node.js 就能跑</p>
            <code>npx hermes-panel</code>
          </div>
          <div class="usage-card">
            <div class="usage-card-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></div>
            <h3>Tauri 桌面客户端</h3>
            <p>原生窗口体验，系统级集成</p>
            <code>下载安装包 → 双击启动</code>
          </div>
          <div class="usage-card">
            <div class="usage-card-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 2l2 6.338L18 2h2l-4 8h-2l-2-6.338L10 10H8L4 2h2l2 6.338L10 2h4z"/></svg></div>
            <h3>VS Code 扩展</h3>
            <p>选中代码，一键发送到 Panel</p>
            <code>VS Code Marketplace → 安装</code>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-glow" />
      <div class="footer-inner container">
        <div class="footer-brand">
          <router-link to="/hermes-panel" class="header-logo">
            <div class="header-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            Hermes Panel
          </router-link>
          <p class="footer-brand-desc">本地部署的 AI Agent 控制面板。24+ 项功能，100% 数据私有化，跨平台支持。</p>
        </div>
        <div class="footer-col">
          <h4>产品</h4>
          <ul>
            <li><a href="/hermes-panel#features">全部功能</a></li>
            <li><a href="/hermes-panel#compare">版本对比</a></li>
            <li><a href="/hermes-panel#usage">使用方式</a></li>
            <li><router-link to="/hermes-panel/docs/intro">产品文档</router-link></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>资源</h4>
          <ul>
            <li><router-link to="/hermes-panel/docs/faq">常见问题</router-link></li>
            <li><router-link to="/hermes-panel/docs/quick-start">快速上手</router-link></li>
            <li><a href="https://github.com/NousResearch/hermes-agent" target="_blank">Hermes Agent ↗</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>外观</h4>
          <div class="btn-theme-group">
            <button :class="{ active: theme.mode === 'dark' }" @click="theme.setMode('dark')">暗色</button>
            <button :class="{ active: theme.mode === 'light' }" @click="theme.setMode('light')">亮色</button>
            <button :class="{ active: theme.mode === 'auto' }" @click="theme.setMode('auto')">自动</button>
          </div>
        </div>
      </div>
      <div class="footer-bottom">&copy; 2026 Hermes Panel. 数据 100% 本地化，安全可控。</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';

const theme = useThemeStore();

const iconTheme = computed(() => {
  const isDark = theme.resolved === 'dark';
  return isDark ? 'moon' : 'sun';
});

function cycleTheme() {
  const next = { light: 'dark', dark: 'auto', auto: 'light' } as const;
  theme.setMode(next[theme.mode]);
}

// Icon paths stored as SVG inner content
const ICONS: Record<string, string> = {
  chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
  sessions: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>',
  dashboard: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
  usage: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
  health: '<path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>',
  notifications: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>',
  users: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
  settings: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
  caps: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  prefs: '<path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  draft: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M7 20H4a1 1 0 01-1-1V5a1 1 0 011-1h3.5a1 1 0 01.949.684L14 20h1.5a1 1 0 01.949.684l1.499 4.494A1 1 0 0117 26H3a1 1 0 01-1-1V5a1 1 0 011-1h3.5a1 1 0 01.949.684L14 20z"/>',
  workspaces: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>',
  cron: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  memory: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  files: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
  mcp: '<path stroke-linecap="round" stroke-linejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/>',
  skills: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
  plugins: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>',
  developer: '<path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
  secrets: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
  models: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>',
  backup: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
  doctor: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  logs: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  webhook: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>',
  sandbox: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
  gateway: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>',
  memory2: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
};

const featureGroups = [
  {
    label: '基础功能 — 永久免费开放',
    iconClass: 'feature-section-icon--blue',
    iconPath: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    items: [
      { name: '对话 (Chat)', desc: 'SSE 实时流式响应 · Codex 风格消息布局 · 多会话并发', iconPath: ICONS.chat, iconClass: 'feature-cell-icon--blue' },
      { name: '会话管理', desc: '历史搜索 · 重命名 · 删除 · 多会话切换', iconPath: ICONS.sessions, iconClass: 'feature-cell-icon--blue' },
      { name: '仪表盘 (Dashboard)', desc: 'Token 用量 · 模型分布 · 缓存命中 · 月度统计', iconPath: ICONS.dashboard, iconClass: 'feature-cell-icon--blue' },
      { name: '用量账本', desc: '按日/周/月统计 Token 消耗 · 费用估算', iconPath: ICONS.usage, iconClass: 'feature-cell-icon--blue' },
      { name: '系统健康监控', desc: 'Hermes Agent 连通性 · BFF 状态 · 资源占用', iconPath: ICONS.health, iconClass: 'feature-cell-icon--blue' },
      { name: '通知中心', desc: '任务完成通知 · 错误告警 · 系统事件推送', iconPath: ICONS.notifications, iconClass: 'feature-cell-icon--blue' },
      { name: '用户管理', desc: '多用户访问控制 · 管理员角色 · 密码认证', iconPath: ICONS.users, iconClass: 'feature-cell-icon--blue' },
      { name: '基础设置', desc: '外观主题 · 语言切换 · 快捷键 · Hermes 端点 · 关于', iconPath: ICONS.settings, iconClass: 'feature-cell-icon--blue' },
      { name: '功能探测', desc: '自动检测 Hermes 可用能力 · 动态功能注册', iconPath: ICONS.caps, iconClass: 'feature-cell-icon--blue' },
      { name: '偏好管理', desc: '用户级偏好持久化 · 跨会话保持', iconPath: ICONS.prefs, iconClass: 'feature-cell-icon--blue' },
      { name: 'Draft 跨端桥接', desc: 'VS Code 扩展 · 选中代码一键发送 · 快速草稿', iconPath: ICONS.draft, iconClass: 'feature-cell-icon--blue' },
    ],
  },
  {
    label: '高级功能 — 专业级 AI Agent 工作流',
    iconClass: 'feature-section-icon--purple',
    iconPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>',
    items: [
      { name: '工作区 (Workspaces)', desc: '多项目隔离 · 独立配置 · 工作区切换', iconPath: ICONS.workspaces, iconClass: 'feature-cell-icon--purple' },
      { name: '定时任务 (Cron)', desc: '可视化 Cron 编辑器 · 自动化执行 · 每日简报', iconPath: ICONS.cron, iconClass: 'feature-cell-icon--purple' },
      { name: '记忆管理 (Memory)', desc: '持久记忆 · 跨会话上下文 · 知识积累', iconPath: ICONS.memory2, iconClass: 'feature-cell-icon--purple' },
      { name: '文件管理 (Files)', desc: '上传 · 预览 · 批量操作 · Agent 可读写文件', iconPath: ICONS.files, iconClass: 'feature-cell-icon--purple' },
      { name: 'MCP 工具集成', desc: '模型上下文协议 · 无限扩展能力 · 一键安装', iconPath: ICONS.mcp, iconClass: 'feature-cell-icon--purple' },
      { name: '技能 (Skills)', desc: '专家级指令模板 · 社区共享 · 自定义', iconPath: ICONS.skills, iconClass: 'feature-cell-icon--purple' },
      { name: '插件系统', desc: '可插拔扩展 · 热加载 · 生态共建', iconPath: ICONS.plugins, iconClass: 'feature-cell-icon--purple' },
      { name: '开发者工具', desc: 'API Playground · 调试面板 · 请求重放', iconPath: ICONS.developer, iconClass: 'feature-cell-icon--purple' },
      { name: '密钥管理', desc: 'API Key 安全存储 · Keychain 集成 · 加密文件保险箱', iconPath: ICONS.secrets, iconClass: 'feature-cell-icon--purple' },
      { name: '模型供应商', desc: '多模型配置 · Anthropic / OpenAI · 动态切换', iconPath: ICONS.models, iconClass: 'feature-cell-icon--purple' },
      { name: '备份管理', desc: '数据备份 · 快照恢复 · 迁移助手', iconPath: ICONS.backup, iconClass: 'feature-cell-icon--purple' },
      { name: '诊断 (Doctor)', desc: '系统自检 · 依赖检测 · 配置问题排查', iconPath: ICONS.doctor, iconClass: 'feature-cell-icon--purple' },
      { name: '日志查看 (Logs)', desc: 'BFF 日志 · Hermes 输出 · 实时追踪', iconPath: ICONS.logs, iconClass: 'feature-cell-icon--purple' },
      { name: 'Webhook', desc: '事件回调 · 外部集成 · 自定义触发', iconPath: ICONS.webhook, iconClass: 'feature-cell-icon--purple' },
      { name: '沙箱隔离', desc: '代码执行沙箱 · 安全隔离环境', iconPath: ICONS.sandbox, iconClass: 'feature-cell-icon--purple' },
      { name: '网关配置', desc: 'Hermes Gateway 管理 · 服务编排 · 路由规则', iconPath: ICONS.gateway, iconClass: 'feature-cell-icon--purple' },
    ],
  },
];

const compareRows = [
  { name: '对话 (Chat)', web: true, desktop: true },
  { name: '会话历史', web: true, desktop: true },
  { name: '仪表盘 & 统计', web: true, desktop: true },
  { name: '用量账本', web: true, desktop: true },
  { name: '系统健康监控', web: true, desktop: true },
  { name: '通知中心', web: true, desktop: true },
  { name: '用户管理', web: true, desktop: true },
  { name: '基础设置', web: true, desktop: true },
  { name: '功能探测', web: true, desktop: true },
  { name: '偏好管理', web: true, desktop: true },
  { name: 'Draft 跨端桥接', web: true, desktop: true },
  { name: '工作区', web: false, desktop: true, divider: true },
  { name: '定时任务', web: false, desktop: true },
  { name: '记忆管理', web: false, desktop: true },
  { name: '文件管理', web: false, desktop: true },
  { name: 'MCP / 技能 / 插件', web: false, desktop: true },
  { name: '开发者工具', web: false, desktop: true },
  { name: '模型供应商', web: false, desktop: true },
  { name: '备份管理', web: false, desktop: true },
  { name: '沙箱隔离', web: false, desktop: true },
  { name: '网关配置', web: false, desktop: true },
  { name: 'Webhook', web: false, desktop: true },
  { name: '诊断 & 日志', web: false, desktop: true },
  { name: '密钥管理', web: false, desktop: true },
];
</script>

<style scoped>
.landing-root {
  min-height: 100vh;
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
a { text-decoration: none; color: inherit; }
button { cursor: pointer; border: none; background: none; font: inherit; color: inherit; }
ul { list-style: none; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
@media (max-width: 768px) { .container { padding: 0 1.25rem; } }

/* Header */
.header { position: sticky; top: 0; z-index: 100; background: var(--bg-base); border-bottom: 1px solid var(--border-default); backdrop-filter: blur(20px); }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 3.5rem; max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
.header-logo { display: flex; align-items: center; gap: .5rem; font-weight: 700; font-size: .9375rem; }
.header-logo-icon { width: 2rem; height: 2rem; border-radius: 7px; background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); display: flex; align-items: center; justify-content: center; color: #fff; }
.header-logo-icon svg { width: 1.125rem; height: 1.125rem; }
.header-nav { display: flex; align-items: center; gap: 2px; }
.header-nav a { padding: .375rem .75rem; font-size: .8125rem; color: var(--text-secondary); border-radius: 6px; transition: all .15s; }
.header-nav a:hover { color: var(--text-primary); background: var(--border-subtle); }
.header-nav a.router-link-active { color: var(--accent); }
.header-actions { display: flex; align-items: center; gap: .5rem; }
.btn-theme { width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-muted); transition: all .15s; }
.btn-theme:hover { background: var(--border-subtle); color: var(--text-primary); }
.btn-theme svg { width: 1rem; height: 1rem; }
.btn-ghost { padding: .375rem .75rem; font-size: .8125rem; color: var(--text-secondary); border-radius: 6px; transition: all .15s; display: inline-flex; }
.btn-ghost:hover { background: var(--border-subtle); color: var(--text-primary); }
.btn-primary { padding: .5rem 1.125rem; font-size: .8125rem; font-weight: 500; background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); color: #fff; border-radius: 6px; display: inline-flex; align-items: center; gap: .375rem; transition: all .2s; box-shadow: 0 2px 12px var(--accent-glow); }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px var(--accent-glow); }
.btn-primary--lg { padding: .75rem 2rem; font-size: .9375rem; border-radius: 10px; }
.btn-outline--lg { padding: .75rem 2rem; font-size: .9375rem; border-radius: 10px; border: 1px solid var(--border-default); color: var(--text-secondary); display: inline-flex; align-items: center; gap: .375rem; transition: all .2s; }
.btn-outline--lg:hover { border-color: var(--text-muted); color: var(--text-primary); }
@media (max-width: 768px) { .header-nav { display: none; } }

/* Hero */
.hero { position: relative; padding: 5rem 0 4rem; overflow: hidden; background: radial-gradient(ellipse 600px 400px at 20% 50%, rgba(99,102,241,.12), transparent), radial-gradient(ellipse 500px 500px at 80% 20%, rgba(168,85,247,.1), transparent), radial-gradient(ellipse 400px 300px at 60% 80%, rgba(6,182,212,.06), transparent); }
.hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
@media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr; gap: 3rem; } }
.hero-tag { display: inline-flex; align-items: center; gap: .5rem; padding: .25rem .875rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: .75rem; font-weight: 600; margin-bottom: 1.5rem; border: 1px solid rgba(99,102,241,.15); }
.hero-tag-dot { width: .375rem; height: .375rem; border-radius: 50%; background: var(--accent); animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
.hero-title { font-size: 3.25rem; font-weight: 800; line-height: 1.1; letter-spacing: -.03em; margin-bottom: 1.25rem; }
.hero-title span { background: linear-gradient(135deg, var(--brand-from) 0%, var(--accent) 50%, var(--brand-to) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
@media (max-width: 768px) { .hero-title { font-size: 2.25rem; } }
.hero-desc { font-size: 1.0625rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 2rem; max-width: 460px; }
.hero-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 2.5rem; }
.hero-stats { display: flex; gap: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); }
.hero-stat-num { font-size: 2rem; font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-stat-label { font-size: .75rem; color: var(--text-muted); margin-top: .125rem; }
.hero-visual { position: relative; }
.hero-visual-glow { position: absolute; inset: -1px; border-radius: 20px; background: linear-gradient(135deg, var(--brand-from), var(--accent), var(--brand-to)); opacity: .15; filter: blur(30px); }
.hero-screen { position: relative; border-radius: 14px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-default); box-shadow: 0 0 60px rgba(99,102,241,.08); }
.hero-screen-topbar { display: flex; align-items: center; gap: .375rem; padding: .625rem 1rem; background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle); }
.hero-screen-dot { width: .75rem; height: .75rem; border-radius: 50%; background: var(--border-default); }
.hero-screen-body { padding: 1.25rem; display: flex; flex-direction: column; gap: .625rem; min-height: 300px; }
.hero-screen-msg { max-width: 80%; padding: .75rem 1rem; border-radius: 8px; font-size: .8125rem; color: var(--text-primary); background: var(--bg-hover); line-height: 1.5; }
.hero-screen-msg--user { align-self: flex-end; padding: .5rem .875rem; border-radius: 999px; background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); color: #fff; font-size: .75rem; font-weight: 500; max-width: 50%; }
.hero-screen-tool { display: flex; align-items: center; gap: .5rem; padding: .5rem .75rem; border-radius: 6px; background: var(--success-soft); font-size: .75rem; color: var(--success); border: 1px solid rgba(34,197,94,.1); }
.hero-screen-tool--warn { background: var(--warning-soft); color: var(--warning); border-color: rgba(245,158,11,.1); }
.hero-screen-input { margin-top: auto; padding: .625rem .875rem; border-radius: 8px; border: 1px solid var(--border-default); font-size: .75rem; color: var(--text-muted); background: var(--bg-base); }
.link { color: var(--accent); font-weight: 500; text-decoration: underline; }

/* Stat banner */
.stat-banner { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-top: -2rem; position: relative; z-index: 10; }
@media (max-width: 640px) { .stat-banner { grid-template-columns: repeat(2,1fr); } }
.stat-card { padding: 1.5rem; border-radius: 14px; background: var(--bg-card); border: 1px solid var(--border-default); text-align: center; transition: all .2s; }
.stat-card:hover { border-color: rgba(99,102,241,.25); transform: translateY(-2px); }
.stat-card-icon { width: 2.5rem; height: 2.5rem; margin: 0 auto .75rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
.stat-card-icon--blue { background: rgba(99,102,241,.12); color: #818cf8; }
.stat-card-icon--purple { background: rgba(168,85,247,.12); color: #a78bfa; }
.stat-card-icon--cyan { background: rgba(6,182,212,.12); color: #22d3ee; }
.stat-card-icon--green { background: rgba(34,197,94,.12); color: #4ade80; }
.stat-card-num { font-size: 2rem; font-weight: 800; letter-spacing: -.02em; background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-card-label { font-size: .75rem; color: var(--text-muted); margin-top: .25rem; }

/* Sections */
.section { padding: 5rem 0; }
.section-alt { background: var(--bg-elevated); }
@media (max-width: 768px) { .section { padding: 3rem 0; } }
.section-header { text-align: center; margin-bottom: 3.5rem; }
.section-eyebrow { display: inline-block; padding: .25rem .875rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .75rem; border: 1px solid rgba(99,102,241,.1); }
.section-title { font-size: 2.125rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .75rem; }
.section-desc { font-size: 1rem; color: var(--text-muted); max-width: 560px; margin: 0 auto; }
@media (max-width: 768px) { .section-title { font-size: 1.5rem; } }

/* Feature groups */
.feature-group { margin-bottom: 3rem; }
.feature-group:last-child { margin-bottom: 0; }
.feature-section-title { display: flex; align-items: center; gap: .75rem; font-size: 1.125rem; font-weight: 700; margin-bottom: 1.25rem; padding-bottom: .75rem; border-bottom: 1px solid var(--border-default); }
.feature-section-icon { width: 2rem; height: 2rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.feature-section-icon--blue { background: rgba(99,102,241,.12); color: #818cf8; }
.feature-section-icon--purple { background: rgba(168,85,247,.12); color: #a78bfa; }
.feature-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: .75rem; }
@media (max-width: 1000px) { .feature-grid { grid-template-columns: repeat(3,1fr); } }
@media (max-width: 640px) { .feature-grid { grid-template-columns: repeat(2,1fr); } }
.feature-cell { padding: 1rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default); transition: all .2s; display: flex; align-items: flex-start; gap: .625rem; }
.feature-cell:hover { border-color: rgba(99,102,241,.2); background: var(--bg-hover); transform: translateY(-1px); }
.feature-cell-icon { width: 1.75rem; height: 1.75rem; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.feature-cell-icon--blue { background: rgba(99,102,241,.1); color: #818cf8; }
.feature-cell-icon--purple { background: rgba(168,85,247,.1); color: #a78bfa; }
.feature-cell-info { min-width: 0; }
.feature-cell-name { font-size: .8125rem; font-weight: 600; }
.feature-cell-desc { font-size: .6875rem; color: var(--text-muted); margin-top: .125rem; line-height: 1.5; }

/* Compare */
.compare-wrap { border-radius: 14px; overflow: hidden; border: 1px solid var(--border-default); background: var(--bg-card); max-width: 960px; margin: 0 auto; }
.compare-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.compare-table th { padding: 1rem 1.25rem; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); border-bottom: 1px solid var(--border-default); text-align: left; background: var(--bg-hover); }
.compare-table th:not(:first-child) { text-align: center; }
.compare-table td { padding: .75rem 1.25rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.compare-table td:not(:first-child) { text-align: center; }
.compare-table tr:last-child td { border-bottom: 0; }
.compare-check { color: var(--success); font-weight: 600; font-size: 1rem; }
.compare-na { color: var(--text-muted); opacity: .25; }

/* Usage */
.cards-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; max-width: 960px; margin: 0 auto; }
@media (max-width: 768px) { .cards-row { grid-template-columns: 1fr; max-width: 400px; } }
.usage-card { padding: 2rem 1.5rem; border-radius: 14px; background: var(--bg-card); border: 1px solid var(--border-default); text-align: center; transition: all .2s; }
.usage-card:hover { border-color: rgba(99,102,241,.2); transform: translateY(-2px); }
.usage-card-icon { width: 3rem; height: 3rem; margin: 0 auto 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent); }
.usage-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: .5rem; }
.usage-card p { font-size: .8125rem; color: var(--text-muted); line-height: 1.5; }
.usage-card code { display: block; margin-top: .75rem; padding: .5rem .75rem; border-radius: 6px; background: var(--bg-hover); border: 1px solid var(--border-default); font-size: .75rem; color: var(--accent); font-family: 'SF Mono', 'Fira Code', monospace; overflow-x: auto; white-space: nowrap; }

/* Footer */
.footer { background: var(--bg-elevated); border-top: 1px solid var(--border-default); position: relative; }
.footer-glow { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 1px; background: linear-gradient(90deg, transparent, var(--brand-from), var(--accent), var(--brand-to), transparent); opacity: .3; }
.footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2rem; padding-top: 3rem; padding-bottom: 3rem; }
@media (max-width: 700px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
.footer-brand-desc { font-size: .8125rem; color: var(--text-muted); margin-top: .75rem; line-height: 1.6; }
.footer-col h4 { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: .875rem; }
.footer-col li { margin-bottom: .5rem; }
.footer-col a { font-size: .8125rem; color: var(--text-secondary); transition: color .15s; }
.footer-col a:hover { color: var(--text-primary); }
.btn-theme-group { display: flex; gap: .25rem; }
.btn-theme-group button { padding: .25rem .625rem; border-radius: 4px; font-size: .75rem; color: var(--text-muted); border: 1px solid var(--border-default); transition: all .15s; }
.btn-theme-group button:hover { border-color: var(--text-muted); }
.btn-theme-group button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.footer-bottom { text-align: center; font-size: .75rem; color: var(--text-muted); padding: 1.25rem 0; border-top: 1px solid var(--border-subtle); }
</style>
