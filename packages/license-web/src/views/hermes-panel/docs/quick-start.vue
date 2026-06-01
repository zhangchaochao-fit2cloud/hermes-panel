<template>
  <DocsLayout>
    <h1>三分钟上手</h1>
    <p class="lead">只需三步，从零开始使用 Hermes Panel。</p>

    <h2>前置要求</h2>
    <ul>
      <li>Node.js ≥ 20（推荐使用 <code>nvm</code> 或 <code>fnm</code> 管理 Node 版本）</li>
      <li>Hermes Agent 已安装并运行（API 默认监听 <code>:8642</code>）</li>
    </ul>

    <h2>Step 1: 启动 Hermes Panel</h2>
    <p>打开终端，运行：</p>
    <pre><code>npx hermes-panel</code></pre>
    <p>首次运行时会自动下载依赖。启动后控制台会显示访问地址和 Token。</p>
    <div class="callout">
      <strong>提示</strong>
      <span>可以使用环境变量 <code>PANEL_TOKEN</code> 指定自定义 Token，否则自动生成随机 Token。</span>
    </div>

    <h2>Step 2: 设置管理员密码</h2>
    <p>首次访问 <code>http://localhost:5666</code> 时，系统会引导你设置管理员密码。输入密码后，即可进入主界面。</p>
    <p>设置完成后，系统会自动保存 Token，后续访问无需重复登录。</p>

    <h2>Step 3: 开始使用</h2>
    <p>登录后即可使用以下功能：</p>
    <ul>
      <li><strong>对话</strong> — 在聊天界面输入问题，AI 会实时流式回复</li>
      <li><strong>仪表盘</strong> — 查看 Token 用量、模型分布等统计信息</li>
      <li><strong>设置</strong> — 调整外观主题、语言、快捷键等偏好</li>
    </ul>
    <p>如需高级功能（工作区、定时任务、MCP 工具等），请参考 <router-link to="/hermes-panel/docs/editions">版本对比</router-link> 了解 License 激活方式。</p>

    <h2>常用环境变量</h2>
    <div class="env-table-wrap">
      <table class="env-table">
        <thead><tr><th>变量名</th><th>默认值</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><code>PANEL_TOKEN</code></td><td>随机生成</td><td>Panel 认证 Token</td></tr>
          <tr><td><code>BFF_PORT</code></td><td><code>5667</code></td><td>BFF 服务端口</td></tr>
          <tr><td><code>HERMES_API_KEY</code></td><td>—</td><td>Hermes Agent API Key</td></tr>
          <tr><td><code>HERMES_API_BASE</code></td><td><code>http://127.0.0.1:8642</code></td><td>Hermes Agent 地址</td></tr>
          <tr><td><code>PANEL_HOME</code></td><td><code>~/.hermes-panel</code></td><td>Panel 数据目录</td></tr>
        </tbody>
      </table>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/installation" class="next-link">← 安装部署</router-link>
      <router-link to="/hermes-panel/docs/chat" class="next-link">对话系统 →</router-link>
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
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
ul { padding-left: 1.25rem; margin-bottom: 1rem; }
li { color: var(--text-secondary); line-height: 1.8; margin-bottom: .375rem; }
code { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg-subtle); padding: .125rem .375rem; border-radius: 4px; font-size: .8125rem; color: var(--accent-text); border: 1px solid var(--border); }
pre { margin: 1rem 0; padding: 1rem 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border); overflow-x: auto; }
pre code { border: none; padding: 0; background: none; display: block; line-height: 1.7; }
.callout { padding: 1rem 1.25rem; border-radius: 10px; background: var(--accent-soft); border: 1px solid rgba(99,102,241,.15); margin: 1rem 0; display: flex; flex-direction: column; gap: .25rem; }
.callout strong { font-size: .8125rem; color: var(--accent-text); }
.callout span { font-size: .8125rem; color: var(--text-muted); }
a { color: var(--accent-text); }
a:hover { text-decoration: underline; }
.env-table-wrap { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); margin: 1rem 0; }
.env-table { width: 100%; border-collapse: collapse; font-size: .8125rem; }
.env-table th { padding: .625rem 1rem; text-align: left; font-size: .75rem; color: var(--text-muted); background: var(--bg-subtle); border-bottom: 1px solid var(--border); }
.env-table td { padding: .625rem 1rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-light); }
.env-table tr:last-child td { border-bottom: 0; }
.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link {
  padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important;
  font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important;
}
.next-link:hover { opacity: .9; }
</style>
