<template>
  <DocsLayout>
    <h1>MCP 工具集成</h1>
    <p class="lead">Model Context Protocol (MCP) 是 AI 模型与外部工具之间的开放标准协议。Hermes Panel 提供完整的 MCP 工具管理界面，轻松接入社区生态。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>🔌 协议标准</strong><span>MCP 定义了 AI 模型调用外部工具的统一接口规范。工具以 JSON Schema 声明参数，模型自动生成符合规范的调用请求。</span></div>
      <div class="info-card"><strong>📦 工具管理</strong><span>在可视化管理器中浏览已安装的工具列表，查看工具描述、参数说明和调用示例，一键启用/禁用。</span></div>
      <div class="info-card"><strong>🌐 社区生态</strong><span>支持从 npm、PyPI 等源安装社区共享的 MCP 工具，覆盖天气查询、数据库访问、文件搜索、代码分析等场景。</span></div>
    </div>

    <h2>什么是 MCP？</h2>
    <p>MCP (Model Context Protocol) 由 Anthropic 提出，是一种开放协议，允许 AI 模型与外部数据源和工具进行安全交互。它的工作方式类似于"AI 世界的 USB 接口"——工具开发者编写一次 MCP 服务器，任何支持 MCP 的 AI 客户端都能直接使用。在 Hermes Panel 中，MCP 工具是 AI 能力的延伸，让模型可以执行代码、查询数据库、读写文件、调用 Web API 等。</p>

    <h2>使用方式</h2>

    <h3>浏览已安装工具</h3>
    <p>MCP 工具页面展示所有已安装的工具卡片，每张卡片包含工具名称、简短描述、参数定义和启用状态。点击可查看详细的参数 JSON Schema。</p>

    <h3>管理工具状态</h3>
    <p>每个工具有独立的启用/禁用开关。关闭的工具不会被 AI 模型识别调用。可以按类别过滤工具列表，或通过搜索框快速定位特定工具。</p>

    <h3>安装新工具</h3>
    <p>点击"安装工具"按钮，输入 MCP 工具包的名称或 Git 仓库地址。系统会自动解析工具元数据并完成安装。安装成功后，工具会出现在可用工具列表中。</p>

    <div class="callout info">
      <strong>提示：</strong>MCP 工具通过 <code>hermes mcp install</code> CLI 命令管理。Panel 调用 CLI 执行安装、卸载和状态查询，所有操作结果即时反映在界面上。
    </div>

    <h2>开发自定义工具</h2>
    <p>你可以使用 TypeScript 或 Python 开发自定义 MCP 工具。MCP 协议要求工具服务器通过 stdio 或 HTTP 与客户端通信，使用 JSON-RPC 2.0 格式交换请求和响应。Hermes Agent 的文档仓库提供了完整的 SDK 和示例代码。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/cron" class="next-link">← 定时任务</router-link>
      <router-link to="/hermes-panel/docs/skills" class="next-link">技能系统 →</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';
</script>

<style scoped>
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; }
h2 { font-size: 1.375rem; font-weight: 600; margin: 2.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--border-default); }
h3 { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 .75rem; }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
ul { padding-left: 1.25rem; margin-bottom: 1rem; }
li { color: var(--text-secondary); line-height: 1.8; margin-bottom: .375rem; }
code { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg-hover); padding: .125rem .375rem; border-radius: 4px; font-size: .8125rem; color: var(--accent); border: 1px solid var(--border-default); }
a { color: var(--accent); }
a:hover { text-decoration: underline; }

.cards-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: .75rem; margin: 1rem 0; }
@media (max-width: 700px) { .cards-3 { grid-template-columns: 1fr; } }
.info-card { padding: 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default); display: flex; flex-direction: column; gap: .5rem; }
.info-card strong { font-size: .875rem; color: var(--text-primary); }
.info-card span { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; }

.callout { margin: 1rem 0; padding: .875rem 1rem; border-radius: 8px; border-left: 3px solid; font-size: .875rem; line-height: 1.7; }
.callout.info { background: var(--bg-hover); border-left-color: var(--accent); color: var(--text-secondary); }
.callout.info strong { color: var(--accent); }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
