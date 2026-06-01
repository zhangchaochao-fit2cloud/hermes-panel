<template>
  <DocsLayout>
    <h1>会话管理</h1>
    <p class="lead">Hermes Panel 提供完整的会话生命周期管理，支持多会话切换、历史搜索、重命名和批量删除操作。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>📋 多会话并发</strong><span>支持同时管理数十个独立会话，互不干扰。可在会话间快速切换，对比不同场景下的 AI 回复质量。</span></div>
      <div class="info-card"><strong>🔍 会话搜索</strong><span>通过关键词快速检索历史会话，支持按会话标题和时间范围过滤，方便定位特定的对话记录。</span></div>
      <div class="info-card"><strong>🗑️ 批量操作</strong><span>支持单个或批量删除历史会话，清理不再需要的对话记录。删除操作会同步至 Hermes Agent 后端。</span></div>
    </div>

    <h2>会话生命周期</h2>
    <p>每个会话从创建到归档经历完整的生命周期：</p>
    <ul>
      <li><strong>创建</strong> — 点击新建会话按钮，自动分配唯一会话 ID，初始化对话上下文</li>
      <li><strong>活跃</strong> — 正在交互的会话，接收消息流并实时更新 Token 用量统计</li>
      <li><strong>归档</strong> — 历史会话自动归档到本地数据库，支持随时回溯和继续对话</li>
      <li><strong>删除</strong> — 从本地数据库和 Hermes Agent 中彻底移除，不可恢复</li>
    </ul>

    <h2>使用方式</h2>
    <h3>会话切换与搜索</h3>
    <p>左侧抽屉面板展示所有会话列表，按最后活动时间倒序排列。顶部搜索框支持全文搜索，匹配结果高亮显示。点击任意会话即可切换上下文。</p>

    <h3>重命名会话</h3>
    <p>右键点击会话列表中的条目，选择"重命名"或双击标题区域，输入新名称后按 Enter 确认。有意义的命名有助于后续快速检索。</p>

    <h3>删除与清理</h3>
    <p>支持按时间范围（过去 1 小时 / 今天 / 本周 / 全部）批量删除会话。删除前会弹出确认对话框，避免误操作。BFF 通过 <code>hermes sessions delete --force</code> 命令同步到后端。</p>

    <h2>技术实现</h2>
    <p>会话数据存储在 <code>~/.hermes/state.db</code>（SQLite），BFF 通过 <code>better-sqlite3</code> 以只读方式读取。写操作（重命名、删除）通过 <code>runHermesCli()</code> 委托给 Hermes CLI 执行，遵循单写入者模式：</p>
    <pre><code>路由层 → runHermesCli('sessions', ['list', '--json'])
        ↓
      数据映射为 SessionSummary 类型
        ↓
      前端 Pinia store 缓存并响应式渲染</code></pre>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/chat" class="next-link">← 对话系统</router-link>
      <router-link to="/hermes-panel/docs/dashboard" class="next-link">仪表盘 & 统计 →</router-link>
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
.info-card strong { font-size: .875rem; color: var(--text-primary); }
.info-card span { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
