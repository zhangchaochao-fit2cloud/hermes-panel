<template>
  <DocsLayout>
    <h1>常见问题</h1>
    <p class="lead">关于 Hermes Panel 的常见问题与解答。</p>

    <div v-for="item in faqs" :key="item.q" class="faq-item">
      <h3>{{ item.q }}</h3>
      <p>{{ item.a }}</p>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel" class="next-link">← 返回产品首页</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';

const faqs = [
  { q: 'Hermes Panel 和 Hermes Agent 是什么关系？', a: 'Hermes Agent 是 Nous Research 开源的 AI Agent 框架，运行在命令行。Hermes Panel 是它的可视化控制面板，提供 Web 界面来管理对话、工作区、工具集成等功能。Panel 通过 Hermes Agent 的 API（默认 :8642）与之通信。' },
  { q: 'Web 版和 Desktop 版有什么区别？', a: 'Web 版（浏览器 / npx）提供 11 项基础功能：对话、会话管理、仪表盘、统计、健康监控、通知中心、用户管理、基础设置、功能探测、偏好管理和 Draft 跨端桥接，全部免费。Desktop 版额外解锁 15 项高级功能：工作区、定时任务、记忆管理、文件管理、MCP 工具、技能、插件、开发者工具、密钥管理、模型供应商、备份、诊断、沙箱、网关和 Webhook。' },
  { q: '数据会传到云端吗？', a: '不会。Hermes Panel 完全本地部署，所有对话数据、工作区文件、配置信息都存储在你的设备上。没有遥测，不上传任何业务数据。唯一的网络通信是与 Hermes Agent 的本地 API 通信（默认 127.0.0.1:8642）。' },
  { q: '支持哪些平台？', a: 'Windows、macOS、Linux 全平台支持。提供 Tauri 桌面客户端、NPX 命令行和 VS Code 扩展三种使用方式。' },
  { q: 'License 绑定设备后可以换电脑吗？', a: '可以。先在旧设备上取消激活（设置页中一键操作），然后在新设备上用同一 License 文件重新激活即可。License 支持设备解绑和换绑。' },
  { q: '支持哪些 AI 模型？', a: '通过模型供应商配置，支持 Anthropic Claude 系列、OpenAI GPT 系列，以及任何兼容 OpenAI API 格式的模型服务。可以在 Panel 设置中自由切换。' },
  { q: 'MCP 工具是什么？', a: 'MCP (Model Context Protocol) 是一个开放标准，允许 AI 模型安全地访问外部工具和数据源。Hermes Panel 内置 MCP 工具管理界面，可以安装和使用社区共享的 MCP 工具（如天气查询、文件搜索、数据库访问等），也可以开发自定义工具。' },
  { q: '定时任务可以做什么？', a: '通过可视化 Cron 编辑器，可以设置定时执行的 AI 任务。例如：每天早上 8 点生成工作简报、每小时检查服务器状态并报告、每周一生成周报汇总。所有任务在本地自动执行。' },
  { q: '如何从旧版本升级？', a: 'npx hermes-panel 会自动使用最新版本。Desktop 客户端会自动检测更新。数据和配置向后兼容，升级不会丢失任何数据。' },
  { q: '遇到问题如何诊断？', a: '使用内置的 Doctor 诊断工具可以自动检测常见问题：Hermes Agent 连通性、API Key 配置、端口冲突、数据目录权限等。也可以查看 Logs 页面获取详细日志信息。' },
];
</script>

<style scoped>
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; }
.faq-item { margin-bottom: 2rem; }
h3 { font-size: 1.0625rem; font-weight: 600; margin-bottom: .5rem; color: var(--text); }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
a { color: var(--accent); }
a:hover { text-decoration: underline; }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
