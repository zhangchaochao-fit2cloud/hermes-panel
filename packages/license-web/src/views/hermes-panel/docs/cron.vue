<template>
  <DocsLayout>
    <h1>定时任务 (Cron)</h1>
    <p class="lead">通过可视化 Cron 编辑器调度 AI 任务定时执行，支持常见表达式预设和自定义周期，实现全自动化的 AI 工作流。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>🕐 可视化编辑器</strong><span>通过下拉菜单选择分钟、小时、日期、月份和星期，自动生成 Cron 表达式，无需记忆语法。</span></div>
      <div class="info-card"><strong>📋 常用模板</strong><span>内置"每小时""每天 8 点""工作日上午 9 点""每周一"等常用表达式模板，一键选用。</span></div>
      <div class="info-card"><strong>🤖 AI 自动化</strong><span>定时运行的 AI 任务可执行总结报告、信息监控、数据采集等场景，结果自动推送到指定会话。</span></div>
    </div>

    <h2>常见 Cron 表达式</h2>
    <p>编辑器提供了以下预设表达式，也可手动输入自定义表达式：</p>
    <ul>
      <li><code>0 * * * *</code> — 每小时整点执行</li>
      <li><code>0 8 * * *</code> — 每天早上 8:00 执行</li>
      <li><code>0 9 * * 1-5</code> — 工作日上午 9:00 执行</li>
      <li><code>0 0 * * 1</code> — 每周一午夜执行</li>
      <li><code>0 0 1 * *</code> — 每月 1 日午夜执行</li>
      <li><code>*/15 * * * *</code> — 每 15 分钟执行一次</li>
    </ul>

    <h2>自动化场景示例</h2>

    <h3>每日工作简报</h3>
    <p>创建一个定时任务，设定 <code>0 8 * * 1-5</code>，配置 AI 检查待办事项、汇总未读通知并生成一份图文并茂的工作简报，推送到指定会话。</p>

    <h3>系统健康巡检</h3>
    <p>设定 <code>0 */2 * * *</code>（每 2 小时），让 AI 执行一组诊断命令（磁盘使用率、内存占用、进程状态），将结果与健康基线对比，异常时发送告警。</p>

    <h3>周报自动生成</h3>
    <p>设定 <code>0 17 * * 5</code>（每周五 17:00），AI 汇总本周的对话记录、任务完成情况和 Token 用量，生成结构化周报并归档。</p>

    <h2>任务执行机制</h2>
    <p>Cron 任务由 Desktop 版内置的调度器管理，基于 <code>node-cron</code> 实现。任务执行时 BFF 调用 Hermes Agent API 发起新会话运行，结果写入本地数据库。任务日志在 Cron 页面列表中实时更新，支持手动触发立即执行和暂停/恢复调度。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/workspaces" class="next-link">← 工作区</router-link>
      <router-link to="/hermes-panel/docs/mcp-tools" class="next-link">MCP 工具集成 →</router-link>
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
