<template>
  <DocsLayout>
    <h1>备份管理</h1>
    <p class="lead">保护您的对话数据、记忆和配置，支持手动快照与自动备份策略，确保数据安全可恢复。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>快照创建与恢复</strong><span>一键创建当前数据快照，支持随时恢复到任意历史快照节点。</span></div>
      <div class="info-card"><strong>自动备份策略</strong><span>按日、周、月周期自动备份，保留最近 N 份备份，循环覆盖。</span></div>
      <div class="info-card"><strong>迁移助手</strong><span>将数据从旧环境迁移到新环境，支持跨平台、跨版本导入导出。</span></div>
    </div>

    <h2>备份内容</h2>
    <p>备份涵盖 Hermes Panel 的核心数据：</p>
    <ul>
      <li><strong>对话会话</strong> — 全部历史会话和消息内容</li>
      <li><strong>记忆数据</strong> — 持久化记忆和上下文知识库</li>
      <li><strong>用户偏好</strong> — 主题、语言、快捷键等个性化设置</li>
      <li><strong>供应商配置</strong> — 模型供应商列表和参数（不含 API Key）</li>
      <li><strong>工作区配置</strong> — 工作区定义、Cron 任务、Webhook 规则</li>
    </ul>
    <div class="callout warn">
      <strong>注意</strong>
      <span>API Key 等敏感信息不会包含在备份包中，迁移后需重新配置密钥。</span>
    </div>

    <h2>使用方式</h2>
    <h3>手动快照</h3>
    <p>进入 <strong>设置 &gt; 备份管理</strong>，点击"创建快照"立即备份当前数据。快照文件以 <code>.hermes-snapshot</code> 格式保存在备份目录中。您可以为快照添加备注标签，方便后期定位。</p>

    <h3>自动备份</h3>
    <p>在备份设置中开启自动备份开关，选择备份周期（每日/每周/每月）和保留份数。系统会在后台静默执行备份，不影响正常使用。备份时间默认选在凌晨低负载时段。</p>

    <h3>数据恢复</h3>
    <p>在快照列表中选中目标快照，点击"恢复"即可将数据回滚到该快照节点。恢复操作会创建恢复前的自动快照作为保险，防止误操作导致数据丢失。</p>

    <h2>跨环境迁移</h2>
    <p>迁移助手支持将备份包导出为独立文件，复制到新机器后通过"导入快照"恢复。适用于更换电脑、升级系统、服务器迁移等场景。导入时自动校验备份完整性，确保数据无损坏。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/model-providers" class="next-link">← 模型供应商</router-link>
      <router-link to="/hermes-panel/docs/secrets" class="next-link">密钥管理 →</router-link>
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
code { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg-hover); padding: .125rem .375rem; border-radius: 4px; font-size: .8125rem; color: var(--accent); border: 1px solid var(--border-default); }
a { color: var(--accent); }
a:hover { text-decoration: underline; }
.cards-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: .75rem; margin: 1rem 0; }
@media (max-width: 700px) { .cards-3 { grid-template-columns: 1fr; } }
.info-card {
  padding: 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default);
  display: flex; flex-direction: column; gap: .5rem;
}
.info-card strong { font-size: .875rem; color: var(--text-primary); }
.info-card span { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; }
.callout { padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid; margin: 1rem 0; display: flex; flex-direction: column; gap: .25rem; }
.callout.warn { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.15); }
.callout.warn strong { color: #d97706; }
.callout span { font-size: .8125rem; color: var(--text-muted); }
.callout.warn span { color: rgba(245,158,11,.7); }
.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
