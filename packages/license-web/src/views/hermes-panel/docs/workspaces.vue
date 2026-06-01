<template>
  <DocsLayout>
    <h1>工作区</h1>
    <p class="lead">通过工作区实现多项目隔离，每个工作区拥有独立的对话历史、配置偏好和工具绑定，互不干扰。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>🏗️ 项目隔离</strong><span>每个工作区的会话记录、文件索引、记忆数据和 Cron 任务完全独立，适合管理多个互不关联的项目。</span></div>
      <div class="info-card"><strong>⚙️ 独立配置</strong><span>工作区可单独设定 AI 模型、系统提示词、MCP 工具集和技能绑定，为不同项目定制最优工作流。</span></div>
      <div class="info-card"><strong>🔄 快速切换</strong><span>侧边栏工作区切换器支持一键跳转，当前工作区标识清晰醒目，上下文切换无需等待。</span></div>
    </div>

    <h2>使用方式</h2>

    <h3>创建工作区</h3>
    <p>点击侧边栏底部"新建工作区"按钮，输入名称和可选描述即可创建。新工作区会继承全局默认配置，随后可按需调整模型、技能和工具绑定。</p>

    <h3>配置工作区</h3>
    <p>在工作区设置面板中，可以配置以下独立项：</p>
    <ul>
      <li><strong>AI 模型</strong> — 选择该工作区默认使用的语言模型和参数</li>
      <li><strong>系统提示词</strong> — 为该工作区定制的 System Prompt，注入项目上下文</li>
      <li><strong>MCP 工具</strong> — 绑定该工作区可用的 MCP 工具集合，按需激活</li>
      <li><strong>技能绑定</strong> — 关联特定技能，实现自动化工作流</li>
    </ul>

    <h3>切换与删除</h3>
    <p>工作区切换器位于侧边栏顶部区域，点击即可切换，当前会话的上下文会全部更新。删除工作区会清除其所有关联数据（对话、文件索引、记忆等），操作前会弹出确认对话框。</p>

    <div class="callout warn">
      <strong>注意：</strong>工作区功能仅 Desktop 版提供。Web 版使用单个全局工作区，所有数据在同一上下文中管理。
    </div>

    <h2>数据存储</h2>
    <p>工作区元数据存储在 <code>~/.hermes-panel/workspaces.json</code> 中，每个工作区的对话数据使用独立的 SQLite 数据库文件。工作区切换时 BFF 重新绑定数据库连接，确保数据隔离在读写层面得到保障。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/user-management" class="next-link">← 用户管理</router-link>
      <router-link to="/hermes-panel/docs/cron" class="next-link">定时任务 →</router-link>
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
