<template>
  <DocsLayout>
    <h1>用量账本</h1>
    <p class="lead">按日、周、月维度统计 Token 消耗和 API 调用费用，支持 CSV 导出，帮助精准控制 AI 使用成本。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>📅 多维度统计</strong><span>支持按日、按周、按月切换查看 Token 消耗趋势，粒度精确到每次 API 调用，数据一目了然。</span></div>
      <div class="info-card"><strong>💰 费用估算</strong><span>基于模型单价自动计算预估费用。支持自定义模型定价，适配不同供应商的计费策略。</span></div>
      <div class="info-card"><strong>📤 数据导出</strong><span>将用量明细导出为 CSV 格式，方便导入 Excel 或财务系统进行进一步分析和报表生成。</span></div>
    </div>

    <h2>使用方式</h2>

    <h3>切换统计维度</h3>
    <p>页面上方提供日、周、月三个标签按钮，点击切换统计粒度。日视图展示过去 30 天的每日用量；周视图按自然周聚合；月视图展示过去 12 个月的趋势。</p>

    <h3>查看费用明细</h3>
    <p>每条记录显示模型名称、输入 Token 数、输出 Token 数、缓存 Token 数和预估费用。费用基于模型中台配置的单价计算，可在模型供应商页面调整。费用估算公式：</p>
    <pre><code>费用 = 输入 Token × 输入单价 + 输出 Token × 输出单价
  (缓存 Token 按输入单价的 10% 计算)</code></pre>

    <h3>导出报表</h3>
    <p>点击"导出 CSV"按钮，系统会按当前选中的时间范围生成用量明细报表。CSV 文件包含时间戳、模型、输入 Token、输出 Token、缓存 Token、费用等字段，可直接在 Excel 或 Numbers 中打开。</p>

    <div class="callout info">
      <strong>提示：</strong>导出功能仅在 Desktop 版中可用。Web 版可在页面上查看用量数据，但不提供文件导出能力。
    </div>

    <h2>数据来源</h2>
    <p>账本数据源自 Hermes Agent 本地 SQLite 数据库的 <code>token_usage</code> 和 <code>run_log</code> 表。BFF 通过 <code>sqlite-reader.ts</code> 提供的查询函数按时间维度聚合，每次切换维度时重新查询数据库，确保数据实时准确。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/dashboard" class="next-link">← 仪表盘 & 统计</router-link>
      <router-link to="/hermes-panel/docs/health" class="next-link">系统健康 →</router-link>
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

.callout { margin: 1rem 0; padding: .875rem 1rem; border-radius: 8px; border-left: 3px solid; font-size: .875rem; line-height: 1.7; }
.callout.info { background: var(--bg-hover); border-left-color: var(--accent); color: var(--text-secondary); }
.callout.info strong { color: var(--accent); }

.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
