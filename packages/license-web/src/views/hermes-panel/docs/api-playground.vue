<template>
  <DocsLayout>
    <h1>API Playground</h1>
    <p class="lead">在浏览器中直接调试 Hermes API，构造请求、查看响应、测试端点，无需额外安装 API 客户端。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>在线调试工具</strong><span>图形化请求构造界面，支持所有 Hermes API 端点的调用和调试。</span></div>
      <div class="info-card"><strong>请求构造器</strong><span>可视化编辑请求头、请求体、查询参数，支持 JSON 语法高亮和校验。</span></div>
      <div class="info-card"><strong>历史记录</strong><span>自动保存调试历史，支持回放、对比和分享调试记录。</span></div>
    </div>

    <h2>使用方式</h2>
    <h3>选择端点</h3>
    <p>进入 <strong>开发者 &gt; API Playground</strong>，从端点列表中选取要调试的 API。端点按功能分组（对话、会话、工具、记忆等），每个端点标明了 HTTP 方法和路径。您也可以手动输入完整的请求 URL。</p>

    <h3>构造请求</h3>
    <p>在请求编辑器中设置：</p>
    <ul>
      <li><strong>请求方法</strong> — GET、POST、PUT、DELETE 等，根据端点自动选择</li>
      <li><strong>请求头</strong> — 自动注入认证 Token 和 Content-Type，支持添加自定义 Header</li>
      <li><strong>请求体</strong> — JSON 编辑器支持语法高亮、自动补全和格式校验。输入不合法的 JSON 时编辑器会标红提示</li>
      <li><strong>查询参数</strong> — 键值对形式编辑 URL 查询参数，支持参数编码</li>
    </ul>

    <h3>发送与查看响应</h3>
    <p>点击"发送"按钮发起请求。响应区域展示：</p>
    <ul>
      <li><strong>状态码</strong> — HTTP 状态码，成功（2xx）、客户端错误（4xx）、服务端错误（5xx）分别以不同颜色标识</li>
      <li><strong>响应头</strong> — 完整的响应头信息</li>
      <li><strong>响应体</strong> — 格式化 JSON 预览，支持折叠展开和原始视图切换</li>
      <li><strong>耗时</strong> — 请求从发出到收到完整响应的时间</li>
    </ul>

    <h2>历史记录</h2>
    <p>每次调试请求自动保存到历史列表。您可以为重要请求添加标签和备注方便回顾。支持以下操作：</p>
    <ul>
      <li><strong>回放</strong> — 一键重复历史请求，便于回归测试</li>
      <li><strong>对比</strong> — 选中两次请求对比参数差异和响应变化</li>
      <li><strong>导出</strong> — 将请求导出为 cURL 命令或 OpenAPI 规范片段</li>
      <li><strong>分享</strong> — 生成分享链接，将调试记录发送给团队成员</li>
    </ul>

    <div class="callout warn">
      <strong>注意</strong>
      <span>Playground 发送的请求会真实调用后端 API，消耗 Token 和配额。请谨慎执行写操作和大量请求。</span>
    </div>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/preferences" class="next-link">← 偏好设置</router-link>
      <router-link to="/hermes-panel/docs/vscode-extension" class="next-link">VS Code 扩展 →</router-link>
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
