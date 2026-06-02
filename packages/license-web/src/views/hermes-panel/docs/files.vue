<template>
  <DocsLayout>
    <h1>文件管理</h1>
    <p class="lead">在 Panel 中直接管理 AI 可读写的文件资源，支持文件上传、预览、批量操作和精细化权限控制。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>📄 文件预览</strong><span>支持文本、代码、Markdown、JSON、图片等常见格式的在线预览，无需打开外部编辑器即可浏览文件内容。</span></div>
      <div class="info-card"><strong>📦 批量操作</strong><span>支持多选文件后批量上传、下载、移动、复制和删除，配合搜索和过滤功能高效管理大量文件。</span></div>
      <div class="info-card"><strong>🔒 权限控制</strong><span>精细化管理 AI Agent 对文件的读写权限，可以为不同工作区或 MCP 工具设置独立的文件访问范围。</span></div>
    </div>

    <h2>使用方式</h2>

    <h3>上传文件</h3>
    <p>通过拖拽或点击"上传"按钮将文件添加到 AI 工作区。支持单个文件和文件夹上传，文件大小受 Hermes Agent 配置限制（默认 10MB）。上传后文件立即可供 AI Agent 读取。</p>

    <h3>文件预览</h3>
    <p>点击文件列表中的条目即可在预览面板中查看内容。文本和代码文件以语法高亮展示；图片文件直接渲染预览；二进制文件显示文件元信息。预览面板也支持简单的编辑功能。</p>

    <h3>批量操作</h3>
    <p>勾选多个文件后，工具栏会显示批量操作按钮：</p>
    <ul>
      <li><strong>批量下载</strong> — 选中的文件打包为 ZIP 下载</li>
      <li><strong>批量移动</strong> — 移动到指定目录，支持拖拽到目标文件夹</li>
      <li><strong>批量删除</strong> — 从工作区中移除文件，确认后不可恢复</li>
    </ul>

    <h2>Agent 文件权限</h2>
    <p>在安全面板中，可以配置 AI Agent 对文件系统的访问策略：</p>
    <ul>
      <li><strong>允许路径</strong> — Agent 可以读取和写入的目录列表（如项目根目录）</li>
      <li><strong>拒绝路径</strong> — 禁止 Agent 访问的敏感目录（如系统配置文件）</li>
      <li><strong>文件类型过滤</strong> — 限制 Agent 只能读写特定扩展名的文件</li>
      <li><strong>只读模式</strong> — 全局开启后 Agent 只能读取文件，不能修改或创建</li>
    </ul>

    <div class="callout warn">
      <strong>安全提示：</strong>在配置 Agent 文件权限时，遵循最小权限原则——只开放 Agent 任务所需的目录和文件类型。避免将整个用户目录或系统目录配置为允许路径。
    </div>

    <h2>与工作区的集成</h2>
    <p>文件管理紧密集成于工作区系统。每个工作区管理独立的文件索引，AI Agent 只能访问当前工作区允许路径下的文件。切换工作区时，文件列表和权限配置也随之切换。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/memory" class="next-link">← 记忆管理</router-link>
      <router-link to="/hermes-panel/docs/draft" class="next-link">Draft 桥接 →</router-link>
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
.callout.warn { background: #fef9e7; border-left-color: #f59e0b; color: var(--text-secondary); }
.callout.warn strong { color: #d97706; }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
