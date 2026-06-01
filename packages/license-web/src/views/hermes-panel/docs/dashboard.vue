<template>
  <DocsLayout>
    <h1>仪表盘 & 统计</h1>
    <p class="lead">通过可视化图表直观掌握 AI 使用情况，包括 Token 消耗趋势、模型偏好分布、缓存命中率和月度成本变化。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>📊 Token 用量图</strong><span>按时间维度展示输入/输出 Token 的消耗曲线，支持日、周、月粒度切换，快速定位用量高峰。</span></div>
      <div class="info-card"><strong>🥧 模型分布饼图</strong><span>直观展示各模型（Claude、GPT 系列等）的调用占比，帮助了解模型使用偏好和成本分配。</span></div>
      <div class="info-card"><strong>⚡ 缓存命中率</strong><span>实时显示 Prompt Caching 的命中率和节省的 Token 数，评估缓存策略的收益效果。</span></div>
    </div>

    <h2>统计数据详解</h2>

    <h3>Token 用量趋势</h3>
    <p>仪表盘顶部的折线图展示指定时间范围内的 Token 消耗变化。输入 Token（浅色曲线）和输出 Token（深色曲线）分别绘制，悬停可查看具体数值。数据来自本地 SQLite 数据库的 <code>token_usage</code> 表，BFF 通过 <code>dailyTokenUsage()</code> 查询聚合。</p>

    <h3>模型分布</h3>
    <p>饼图区域展示各模型在总调用量中的占比。鼠标悬停时显示模型名称、调用次数和 Token 消耗量。数据来自 <code>modelDistribution()</code> 查询，按模型 ID 分组统计。如果只使用单一模型，饼图会以满圆形式展示。</p>

    <h3>缓存与月度统计</h3>
    <p>CacheCard 组件展示缓存命中的次数和节省的 Token 总量。MonthlyPaceCard 展示当月累计用量与预估月消耗，帮助预算规划。两个卡片的数据分别来自 <code>cacheStats()</code> 和 <code>monthlyPace()</code> 查询。</p>

    <h2>刷新机制</h2>
    <p>仪表盘数据在页面加载时自动拉取，后续可通过右上角的刷新按钮手动更新。数据完全来自本地 SQLite 数据库的只读查询，响应快速无需等待网络请求。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/sessions" class="next-link">← 会话管理</router-link>
      <router-link to="/hermes-panel/docs/usage-ledger" class="next-link">用量账本 →</router-link>
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

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
