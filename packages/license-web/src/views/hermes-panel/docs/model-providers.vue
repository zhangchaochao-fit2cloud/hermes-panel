<template>
  <DocsLayout>
    <h1>模型供应商</h1>
    <p class="lead">管理多个 AI 模型供应商，动态切换模型配置，让每次对话都能选择最合适的模型。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>多供应商聚合</strong><span>同时配置 Anthropic、OpenAI 等多个供应商的 API Key，集中管理。</span></div>
      <div class="info-card"><strong>动态模型切换</strong><span>在对话中实时切换模型供应商，无需重启服务或重新配置。</span></div>
      <div class="info-card"><strong>API Key 安全存储</strong><span>密钥通过系统 Keychain 或加密文件存储，不暴露在配置文件中。</span></div>
    </div>

    <h2>支持的供应商</h2>
    <p>Hermes Panel 支持主流 AI 模型供应商的完整接入：</p>
    <ul>
      <li><strong>Anthropic</strong> — Claude 系列模型（Claude 3.5 Sonnet、Claude 3 Opus 等），原生支持思考 (Thinking) 和扩展思考 (Extended Thinking)</li>
      <li><strong>OpenAI</strong> — GPT-4/GPT-4o/GPT-4 Turbo 系列，o1/o3 推理模型</li>
      <li><strong>兼容端点</strong> — 任何兼容 OpenAI API 格式的第三方服务，如 Azure OpenAI、Together AI、Groq 等</li>
    </ul>

    <h2>配置方法</h2>
    <h3>添加供应商</h3>
    <p>进入 <strong>设置 &gt; 模型供应商</strong>，点击"添加供应商"按钮。选择供应商类型，填入 API Base URL 和 API Key。系统会自动验证密钥有效性。</p>
    <div class="callout info">
      <strong>提示</strong>
      <span>API Key 添加后会自动加密存储到系统 Keychain（macOS）或加密文件中，不会以明文形式保存在磁盘上。</span>
    </div>

    <h3>模型列表</h3>
    <p>每个供应商配置完成后，系统会自动拉取可用模型列表。您可以为每个模型设置别名、默认参数（温度、最大 Token 数等），以及是否在对话选择器中显示。</p>

    <h3>动态切换</h3>
    <p>在对话界面中，点击输入框上方的模型选择器即可随时切换模型。切换仅对当前消息生效，不会影响历史消息的模型归属。系统会保留每条消息使用的模型信息，方便后续追溯。</p>

    <h2>最佳实践</h2>
    <ul>
      <li>为每个供应商配置主用和备用 API Key，当一个 Key 达到速率限制时自动切换</li>
      <li>将复杂推理任务分配给 Claude 系列，将快速摘要任务分配给 GPT 系列</li>
      <li>定期检查供应商状态面板，了解各模型的可用性和响应延迟</li>
    </ul>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/draft" class="next-link">← Draft 跨端桥接</router-link>
      <router-link to="/hermes-panel/docs/backup" class="next-link">备份管理 →</router-link>
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
.callout.info { background: var(--accent-soft); border-color: rgba(99,102,241,.15); }
.callout strong { font-size: .8125rem; color: var(--accent); }
.callout span { font-size: .8125rem; color: var(--text-muted); }
.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
