<template>
  <DocsLayout>
    <h1>版本对比</h1>
    <p class="lead">Web 版免费开放全部基础功能；Desktop 版解锁高级 AI Agent 工作流能力。</p>

    <div class="compare-wrap">
      <table class="compare-table">
        <thead><tr><th>功能模块</th><th>Web（免费）</th><th>Desktop（License）</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name" :style="r.divider ? 'border-top:2px solid var(--border-default)' : ''">
            <td>{{ r.name }}</td>
            <td><span v-if="r.web" class="check">✓</span><span v-else class="na">—</span></td>
            <td><span v-if="r.desktop" class="check">✓</span><span v-else class="na">—</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Web 版（免费）</h2>
    <p>通过浏览器访问，提供完整的对话体验和基础管理功能。适合个人试用和日常对话场景。</p>
    <ul>
      <li>11 项基础功能全部免费开放</li>
      <li>无设备限制，随时随地浏览器访问</li>
      <li>数据 100% 本地存储</li>
    </ul>

    <h2>Desktop 版（License）</h2>
    <p>除 Web 版全部功能外，额外解锁 13+ 项高级功能。适合专业用户和团队使用。</p>
    <ul>
      <li>包含 Web 版全部 11 项基础功能</li>
      <li>额外 15 项高级功能</li>
      <li>原生桌面体验（系统托盘、全局快捷键）</li>
      <li>一证一机，License 绑定设备</li>
    </ul>

    <h2>如何获取 License？</h2>
    <p>访问 <a href="/register">SoftKey 平台</a> 注册账号，创建订单并下载 License 文件，然后在 Panel 设置页中上传激活。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/quick-start" class="next-link">← 三分钟上手</router-link>
      <router-link to="/hermes-panel/docs/chat" class="next-link">对话系统 →</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';

const rows = [
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
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; }
h2 { font-size: 1.375rem; font-weight: 600; margin: 2.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--border-default); }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
ul { padding-left: 1.25rem; margin-bottom: 1rem; }
li { color: var(--text-secondary); line-height: 1.8; margin-bottom: .375rem; }
a { color: var(--accent); }
a:hover { text-decoration: underline; }

.compare-wrap { border-radius: 10px; overflow: hidden; border: 1px solid var(--border-default); margin: 1rem 0 2rem; }
.compare-table { width: 100%; border-collapse: collapse; font-size: .8125rem; }
.compare-table th { padding: .625rem 1rem; font-size: .75rem; font-weight: 600; color: var(--text-muted); text-align: left; background: var(--bg-hover); border-bottom: 1px solid var(--border-default); }
.compare-table th:not(:first-child) { text-align: center; }
.compare-table td { padding: .5rem 1rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.compare-table td:not(:first-child) { text-align: center; }
.compare-table tr:last-child td { border-bottom: 0; }
.check { color: #22c55e; font-weight: 600; }
.na { color: var(--text-muted); opacity: .25; }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
