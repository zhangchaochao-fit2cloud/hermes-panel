<template>
  <DocsLayout>
    <h1>对话系统 (Chat)</h1>
    <p class="lead">Hermes Panel 提供完整的 AI 对话体验，支持 SSE 实时流式响应、多会话并发、工具调用可视化。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>⚡ SSE 流式响应</strong><span>基于 Server-Sent Events 的实时流式消息传输，打字机效果逐字显示回复。</span></div>
      <div class="info-card"><strong>🎨 Codex 风格布局</strong><span>用户消息紧凑 Chip 样式，AI 回复宽松排版，清晰的视觉层级。</span></div>
      <div class="info-card"><strong>🔧 工具调用可视化</strong><span>AI 调用 MCP 工具时实时显示工具名称、参数和结果，过程透明可见。</span></div>
    </div>

    <h2>消息类型</h2>
    <p>Hermes Panel 支持多种 SSE 事件类型，每种都有独特的 UI 呈现：</p>
    <ul>
      <li><strong>message.delta</strong> — AI 回复的增量文本，逐字追加到消息气泡中</li>
      <li><strong>reasoning.available</strong> — AI 的推理过程，以折叠面板展示思维链</li>
      <li><strong>tool.started</strong> — 工具调用开始，显示工具图标和名称</li>
      <li><strong>tool.completed</strong> — 工具调用完成，展示调用结果</li>
      <li><strong>run.completed</strong> — 对话运行完成，更新 Token 用量统计</li>
      <li><strong>run.error</strong> — 运行出错，显示错误信息和重试按钮</li>
    </ul>

    <h2>使用方式</h2>
    <h3>发送消息</h3>
    <p>在底部输入框输入内容，按 Enter 发送。支持 Shift+Enter 换行。</p>
    <h3>会话切换</h3>
    <p>左侧抽屉面板展示所有会话列表，点击切换。支持搜索、重命名、删除操作。</p>
    <h3>上下文共享</h3>
    <p>通过 VS Code 扩展或 HTTP API 向当前会话注入上下文（代码片段、文件路径、Git Diff 等），AI 将基于上下文进行回复。</p>

    <h2>技术实现</h2>
    <p>前端通过 BFF 代理连接 Hermes Agent API。BFF 负责 Token 认证和 SSE 流式转发，确保 API Key 不会暴露到浏览器：</p>
    <pre><code>前端 → POST /api/hermes/sessions/:id/runs
        ↓
BFF  → 转发到 Hermes Agent :8642
        ↓
BFF  ← SSE 流式响应
        ↓
前端 ← chunk-by-chunk SSE 转发</code></pre>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/editions" class="next-link">← 版本对比</router-link>
      <router-link to="/hermes-panel/docs/sessions" class="next-link">会话管理 →</router-link>
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
pre { margin: 1rem 0; padding: 1rem 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default); overflow-x: auto; }
pre code { border: none; padding: 0; background: none; display: block; line-height: 1.7; }
a { color: var(--accent); }
a:hover { text-decoration: underline; }

.cards-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: .75rem; margin: 1rem 0; }
@media (max-width: 700px) { .cards-3 { grid-template-columns: 1fr; } }
.info-card { padding: 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default); display: flex; flex-direction: column; gap: .5rem; }
.info-card strong { font-size: .875rem; color: var(--text); }
.info-card span { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
