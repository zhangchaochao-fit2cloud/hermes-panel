<template>
  <DocsLayout>
    <h1>安装部署</h1>
    <p class="lead">Hermes Panel 支持三种安装方式：NPX 命令行、Tauri 桌面客户端、Docker 容器部署。</p>

    <h2>方式一：NPX 命令行（推荐）</h2>
    <p>无需安装，有 Node.js ≥ 20 即可启动：</p>
    <pre><code>npx hermes-panel</code></pre>
    <p>首次运行自动下载 npm 包，然后启动 BFF 服务和 Web 前端。控制台输出访问地址：</p>
    <pre><code>Panel ready → http://127.0.0.1:5666</code></pre>
    <div class="callout info"><strong>全局安装</strong><span>也可以全局安装：<code>npm i -g hermes-panel</code>，之后用 <code>hermes-panel</code> 命令启动。</span></div>

    <h3>环境配置</h3>
    <p>通过环境变量配置 Panel：</p>
    <pre><code>PANEL_TOKEN=mytoken123 \
HERMES_API_KEY=sk-xxx \
HERMES_API_BASE=http://127.0.0.1:8642 \
npx hermes-panel</code></pre>

    <h2>方式二：Tauri 桌面客户端</h2>
    <p>下载对应平台的安装包，双击安装即用。桌面版额外提供：</p>
    <ul>
      <li>系统托盘常驻</li>
      <li>全局快捷键唤醒</li>
      <li>开机自启动</li>
      <li>原生窗口体验</li>
    </ul>
    <p>下载地址：<a href="#">GitHub Releases</a>（Windows / macOS / Linux）</p>

    <h2>方式三：VS Code 扩展</h2>
    <p>在 VS Code 扩展市场搜索 "Hermes Panel" 安装。安装后：</p>
    <ul>
      <li>选中代码 → 右键 → "Send to Hermes Panel"</li>
      <li>自动打开 Panel 聊天界面并携带选中内容</li>
      <li>支持文件路径、Git Diff 等多种上下文</li>
    </ul>

    <h2>前置依赖：Hermes Agent</h2>
    <p>Hermes Panel 需要连接到正在运行的 Hermes Agent 实例。安装方式：</p>
    <pre><code># 克隆并安装 Hermes Agent
git clone https://github.com/NousResearch/hermes-agent
cd hermes-agent
pip install -e .

# 启动 Gateway
hermes gateway run --replace</code></pre>

    <div class="callout warn">
      <strong>注意</strong>
      <span>如果 Hermes Agent 未运行，可以使用 <code>pnpm fake-hermes</code> 启动模拟服务器进行开发测试。</span>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/intro" class="next-link">← 产品简介</router-link>
      <router-link to="/hermes-panel/docs/quick-start" class="next-link">三分钟上手 →</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';
</script>

<style scoped>
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; }
h2 { font-size: 1.375rem; font-weight: 600; margin: 2.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
h3 { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 .75rem; }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
ul { padding-left: 1.25rem; margin-bottom: 1rem; }
li { color: var(--text-secondary); line-height: 1.8; margin-bottom: .375rem; }
code { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg-subtle); padding: .125rem .375rem; border-radius: 4px; font-size: .8125rem; color: var(--accent-text); border: 1px solid var(--border); }
pre { margin: 1rem 0; padding: 1rem 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border); overflow-x: auto; }
pre code { border: none; padding: 0; background: none; display: block; line-height: 1.7; }
a { color: var(--accent-text); }
a:hover { text-decoration: underline; }
.callout { padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid; margin: 1rem 0; display: flex; flex-direction: column; gap: .25rem; }
.callout.info { background: var(--accent-soft); border-color: rgba(99,102,241,.15); }
.callout.warn { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.15); color: #d97706; }
.callout strong { font-size: .8125rem; }
.callout span { font-size: .8125rem; color: var(--text-muted); }
.callout.warn span { color: rgba(245,158,11,.7); }
.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
