<template>
  <DocsLayout>
    <h1>记忆管理</h1>
    <p class="lead">AI 的长期记忆系统，让模型在跨会话对话中保持一致的用户偏好、项目上下文和历史知识，避免每次对话"重新认识"。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>🧠 持久化记忆</strong><span>关键信息（用户偏好、重要事实、项目约定）持久化存储，在后续会话中自动注入上下文，无需重复说明。</span></div>
      <div class="info-card"><strong>🔗 跨会话上下文</strong><span>记忆不仅在单次对话中生效，还能跨越多个会话传递上下文。AI 在启动新会话时自动读取相关记忆。</span></div>
      <div class="info-card"><strong>✏️ 记忆管理</strong><span>可视化查看、编辑、搜索和删除记忆条目。每条记忆可标记来源会话和信任等级，精确控制注入范围。</span></div>
    </div>

    <h2>记忆的工作原理</h2>
    <p>Hermes Agent 的记忆系统基于向量数据库实现。当 AI 在对话中识别到值得记住的信息时，会自动生成记忆条目并存入本地存储。每次启动新会话时，系统会检索与当前上下文语义相似的记忆，作为系统提示词的一部分注入到对话中，让 AI "回忆起"之前的交流。</p>

    <p>记忆条目包含以下结构：</p>
    <ul>
      <li><strong>内容</strong> — 记忆的文本描述，由 AI 从对话中自动提取</li>
      <li><strong>来源</strong> — 创建该记忆的会话 ID 和时间戳</li>
      <li><strong>标签</strong> — 语义标签，用于分类和检索（如"用户信息""代码约定""项目需求"）</li>
      <li><strong>信任等级</strong> — 高/中/低，影响检索时的排序权重</li>
    </ul>

    <h2>使用方式</h2>

    <h3>查看记忆</h3>
    <p>记忆页面以列表形式展示所有已存储的记忆条目。支持按标签、信任等级和时间范围过滤。每条记忆显示摘要内容，点击可展开查看完整文本。</p>

    <h3>编辑与删除</h3>
    <p>如果 AI 自动生成的记忆不准确，可以手动编辑内容修正。不需要的记忆可以删除。编辑后的变更在下一次会话中生效。</p>

    <h3>手动添加</h3>
    <p>除了 AI 自动创建的记忆外，也支持手动添加记忆条目。这在需要提前"教会"AI 某些项目特定知识时非常有用，例如代码库架构说明、API 密钥位置等。</p>

    <div class="callout warn">
      <strong>注意：</strong>记忆功能仅在 Desktop 版中可用。Web 版会话使用单次上下文，不支持跨会话记忆持久化。
    </div>

    <h2>数据存储</h2>
    <p>记忆数据使用本地向量数据库（基于 SQLite 的 <code>sqlite-vec</code> 扩展）存储。语义嵌入在本地计算，所有数据不出设备。BFF 通过 <code>runHermesCli()</code> 调用 <code>hermes memory</code> 系列命令进行管理。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/plugins" class="next-link">← 插件系统</router-link>
      <router-link to="/hermes-panel/docs/files" class="next-link">文件管理 →</router-link>
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
