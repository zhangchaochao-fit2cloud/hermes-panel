<template>
  <DocsLayout>
    <h1>网关配置</h1>
    <p class="lead">管理和配置 Hermes Gateway 服务编排，定义路由规则，实现多后端服务的统一入口和流量调度。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>服务编排</strong><span>将多个 Hermes Agent 实例编排为统一服务集群，自动分发请求。</span></div>
      <div class="info-card"><strong>路由规则</strong><span>基于模型类型、请求来源、负载情况等维度定义智能路由策略。</span></div>
      <div class="info-card"><strong>健康检查</strong><span>自动探测后端服务健康状态，故障节点自动摘除，保障服务高可用。</span></div>
    </div>

    <h2>关于 Hermes Gateway</h2>
    <p>Hermes Gateway 是 Hermes Agent 的流量入口组件，负责请求分发、负载均衡和协议转换。Panel 的网关管理界面提供了对 Gateway 的可视化操作能力，让运维管理更直观。</p>
    <p>Gateway 通过 <code>hermes gateway run --replace</code> 命令启动，监听 <code>:8642</code> 端口。Panel 的 BFF 通过这个端口与 Gateway 通信，实现对话、工具调用等核心功能。</p>

    <h2>服务编排</h2>
    <h3>注册后端服务</h3>
    <p>在 <strong>设置 &gt; 网关配置</strong> 中，可以注册多个 Hermes Agent 后端实例。每个实例需要配置：</p>
    <ul>
      <li><strong>名称</strong> — 实例标识，便于在路由规则中引用</li>
      <li><strong>地址</strong> — 后端服务的 URL（如 <code>http://192.168.1.100:8642</code>）</li>
      <li><strong>权重</strong> — 负载均衡权重，数值越高分配到请求的比例越大</li>
      <li><strong>标签</strong> — 自定义标签，用于路由规则匹配（如 <code>region=us-east</code>、<code>model=claude</code>）</li>
    </ul>

    <h3>负载均衡策略</h3>
    <p>支持轮询（Round-Robin）、最少连接（Least Connections）和加权分配（Weighted）三种策略。可以根据后端服务器的处理能力灵活选择。</p>

    <h2>路由规则</h2>
    <p>路由规则定义了请求如何分发给后端服务：</p>
    <ul>
      <li><strong>基于模型路由</strong> — Claude 系列请求发送到配置了 Anthropic Key 的节点，GPT 系列发送到 OpenAI 节点</li>
      <li><strong>基于来源路由</strong> — 按请求来源（Web 端、API 调用、VS Code 扩展）分发到不同优先级节点</li>
      <li><strong>故障转移</strong> — 主节点不可用时自动切换到备用节点，最大程度减少服务中断</li>
    </ul>

    <div class="callout info">
      <strong>提示</strong>
      <span>路由规则变更即时生效，无需重启 Gateway。建议先添加一条简单规则验证连通性，再逐步增加复杂策略。</span>
    </div>

    <h2>监控与诊断</h2>
    <p>网关管理面板提供实时监控指标：请求吞吐量、平均响应延迟、错误率、各节点健康状态。当某个节点连续健康检查失败时，系统会自动将其标记为离线并从路由池中移除，同时在通知中心发送告警。</p>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/sandbox" class="next-link">← 沙箱隔离</router-link>
      <router-link to="/hermes-panel/docs/webhook" class="next-link">Webhook →</router-link>
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
