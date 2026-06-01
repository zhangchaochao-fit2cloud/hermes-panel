<template>
  <DocsLayout>
    <h1>沙箱隔离</h1>
    <p class="lead">为 AI Agent 的代码执行提供隔离运行环境，防止恶意代码影响宿主机，保障系统安全。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>代码执行沙箱</strong><span>Agent 生成的代码在隔离环境中运行，与宿主机文件系统和网络完全隔离。</span></div>
      <div class="info-card"><strong>多级隔离策略</strong><span>支持进程级、容器级、网络级隔离，按安全需求灵活选择。</span></div>
      <div class="info-card"><strong>安全策略配置</strong><span>自定义允许执行的命令、可访问的文件路径、网络白名单等规则。</span></div>
    </div>

    <h2>隔离原理</h2>
    <p>Hermes Panel 的沙箱基于操作系统级虚拟化技术构建：</p>
    <ul>
      <li><strong>进程隔离</strong> — 代码运行在独立子进程中，拥有独立的进程命名空间，无法访问宿主进程的内存或文件句柄</li>
      <li><strong>文件系统隔离</strong> — 沙箱拥有临时根文件系统，仅挂载白名单目录。对沙箱文件的写入不会影响宿主机</li>
      <li><strong>网络隔离</strong> — 默认禁止出站网络连接，仅允许访问预配置的白名单端点</li>
      <li><strong>资源限制</strong> — 通过 cgroup（Linux）或类似的资源控制机制限制 CPU、内存、磁盘 I/O 使用量</li>
    </ul>

    <h2>隔离级别</h2>
    <h3>进程级别（默认）</h3>
    <p>使用子进程隔离，适用于大多数日常场景。开销最小，无需额外容器运行时。Hermes Panel 通过 <code>child_process</code> 启动隔离子进程，配合 seccomp 过滤系统调用。</p>

    <h3>容器级别（可选）</h3>
    <p>需要 Docker 或 Podman 运行时。每个沙箱启动一个临时容器，完成执行后自动销毁。隔离性最强，适合执行不可信代码或第三方脚本。</p>

    <h3>网络级别</h3>
    <p>使用 iptables/nftables 规则或容器网络策略，精确控制沙箱的出站和入站流量。支持域名白名单、端口范围限制和协议过滤。</p>

    <h2>安全策略配置</h2>
    <p>在 <strong>设置 &gt; 沙箱隔离</strong> 中配置以下策略：</p>
    <ul>
      <li><strong>命令白名单</strong> — 允许在沙箱中执行的命令列表，默认仅允许 <code>python3</code>、<code>node</code>、<code>bash</code> 等基础工具</li>
      <li><strong>文件访问规则</strong> — 允许沙箱读取和写入的宿主目录路径</li>
      <li><strong>网络策略</strong> — 允许访问的外部服务域名和端口</li>
      <li><strong>超时限制</strong> — 沙箱最大执行时间，超时自动终止</li>
      <li><strong>内存上限</strong> — 沙箱可使用的最大内存量</li>
    </ul>
    <div class="callout warn">
      <strong>安全提醒</strong>
      <span>沙箱隔离并非绝对安全。对于极度敏感的环境，建议在独立的虚拟机中运行 Hermes Agent。</span>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/logs" class="next-link">← 日志查看</router-link>
      <router-link to="/hermes-panel/docs/gateway" class="next-link">网关配置 →</router-link>
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
