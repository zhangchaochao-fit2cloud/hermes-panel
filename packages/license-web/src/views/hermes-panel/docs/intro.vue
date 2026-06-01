<template>
  <DocsLayout>
    <h1>产品简介</h1>
    <p class="lead">Hermes Panel 是一款本地优先的 AI Agent 控制面板，为 Hermes Agent 提供专业级可视化操作界面。</p>

    <h2>什么是 Hermes Panel？</h2>
    <p>Hermes Panel 是 <a href="https://github.com/NousResearch/hermes-agent" target="_blank">Hermes Agent</a> 的官方控制面板。Hermes Agent 是 Nous Research 开源的 AI Agent 框架，运行在命令行。Hermes Panel 为它提供了一个现代化的 Web 操作界面，让您无需记忆 CLI 命令就能管理 AI 工作流。</p>

    <h3>核心理念</h3>
    <div class="cards-3">
      <div class="info-card"><strong>🔒 本地优先</strong><span>数据 100% 存储本地，不上传任何业务数据到云端，安全可控。</span></div>
      <div class="info-card"><strong>🔌 协议标准</strong><span>基于 MCP (Model Context Protocol) 标准，与社区工具生态无缝集成。</span></div>
      <div class="info-card"><strong>⚡ 即装即用</strong><span>一行 NPX 命令启动，或下载桌面客户端，无需复杂配置。</span></div>
    </div>

    <h2>功能概览</h2>
    <p>Hermes Panel 提供 24+ 项内置功能，分为基础功能和高级功能两大类：</p>

    <h3>基础功能（永久免费）</h3>
    <ul>
      <li><strong>对话系统</strong> — SSE 实时流式响应，Codex 风格消息布局，支持多轮对话和上下文理解</li>
      <li><strong>会话管理</strong> — 创建、切换、重命名、搜索、删除会话，完整的会话生命周期管理</li>
      <li><strong>仪表盘</strong> — Token 用量统计、模型分布饼图、缓存命中率、月度消耗趋势图</li>
      <li><strong>用量账本</strong> — 按日/周/月维度统计 Token 消耗，支持费用估算</li>
      <li><strong>系统健康监控</strong> — 实时监控 Hermes Agent 连通性、BFF 状态、资源占用</li>
      <li><strong>通知中心</strong> — 任务完成通知、错误告警、系统事件推送</li>
      <li><strong>用户管理</strong> — 多用户访问控制，管理员角色，密码认证</li>
      <li><strong>基础设置</strong> — 外观主题切换（亮色/暗色/自动）、多语言、快捷键配置</li>
      <li><strong>功能探测</strong> — 自动检测 Hermes Agent 可用能力，动态注册功能模块</li>
      <li><strong>偏好管理</strong> — 用户级偏好设置持久化，跨会话保持</li>
      <li><strong>Draft 跨端桥接</strong> — VS Code 扩展支持，选中代码一键发送到 Panel</li>
    </ul>

    <h3>高级功能（需 License 激活）</h3>
    <ul>
      <li><strong>工作区</strong> — 多项目隔离，每个工作区独立配置，互不干扰</li>
      <li><strong>定时任务</strong> — 可视化 Cron 编辑器，定时执行 AI 任务，支持每日早报等自动化场景</li>
      <li><strong>记忆管理</strong> — 持久化记忆存储，跨会话上下文保持，知识积累</li>
      <li><strong>文件管理</strong> — 文件上传、预览、批量操作，Agent 可直接读写文件</li>
      <li><strong>MCP 工具集成</strong> — 模型上下文协议标准，无限扩展 AI 能力边界</li>
      <li><strong>技能 & 插件</strong> — 专家级指令模板、社区共享技能、可插拔扩展系统</li>
      <li><strong>模型供应商</strong> — 多模型配置，支持 Anthropic / OpenAI 等，动态切换</li>
      <li><strong>沙箱隔离</strong> — 代码执行沙箱，安全隔离环境，防止恶意代码</li>
      <li>以及更多：开发者工具、密钥管理、备份、诊断、网关、Webhook 等</li>
    </ul>

    <h2>技术架构</h2>
    <p>Hermes Panel 采用三层架构：</p>
    <div class="arch-diagram">
      <div class="arch-layer">
        <strong>🖥️ 前端层 (Vue 3)</strong>
        <span>panel-web / Tauri WebView — Naive UI + Pinia + ECharts + Tailwind</span>
      </div>
      <div class="arch-arrow">↕ REST + SSE</div>
      <div class="arch-layer">
        <strong>🔧 中间层 (Koa BFF)</strong>
        <span>panel-bff — 认证、授权、API 代理、SQLite 只读查询、CLI 调用</span>
      </div>
      <div class="arch-arrow">↕ HTTP API + CLI</div>
      <div class="arch-layer">
        <strong>🤖 底层 (Hermes Agent)</strong>
        <span>Hermes Agent API (:8642) — 对话引擎、MCP 运行时、任务调度</span>
      </div>
    </div>

    <h2>运行形态</h2>
    <div class="cards-3">
      <div class="info-card"><strong>📦 NPX 命令行</strong><span>一行命令启动 Web 服务，浏览器访问即可使用。适合快速体验和服务器部署。</span></div>
      <div class="info-card"><strong>🖥️ Tauri 桌面应用</strong><span>原生桌面体验，系统托盘、全局快捷键、自动启动。Windows / macOS / Linux。</span></div>
      <div class="info-card"><strong>🔌 VS Code 扩展</strong><span>编辑器内一键发送选中代码到 Panel，无缝衔接开发与 AI 工作流。</span></div>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/installation" class="next-link">下一步：安装部署 →</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';
</script>

<style scoped>
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.7; }
h2 { font-size: 1.375rem; font-weight: 600; margin: 2.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--border-default); }
h3 { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 .75rem; }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
ul { padding-left: 1.25rem; margin-bottom: 1rem; }
li { color: var(--text-secondary); line-height: 1.8; margin-bottom: .375rem; }
a { color: var(--accent); }
a:hover { text-decoration: underline; }

.cards-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: .75rem; margin: 1rem 0; }
@media (max-width: 700px) { .cards-3 { grid-template-columns: 1fr; } }
.info-card {
  padding: 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default);
  display: flex; flex-direction: column; gap: .5rem;
}
.info-card strong { font-size: .875rem; color: var(--text); }
.info-card span { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; }

.arch-diagram { margin: 1rem 0 2rem; }
.arch-layer {
  padding: 1rem 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default);
  display: flex; flex-direction: column; gap: .25rem;
}
.arch-layer strong { font-size: .875rem; color: var(--text); }
.arch-layer span { font-size: .8125rem; color: var(--text-muted); }
.arch-arrow { text-align: center; padding: .5rem 0; font-size: 1rem; color: var(--accent); }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); }
.next-link {
  display: inline-flex; align-items: center; gap: .375rem;
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
