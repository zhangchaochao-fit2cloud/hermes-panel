<template>
  <DocsLayout>
    <h1>VS Code 扩展</h1>
    <p class="lead">在 VS Code 编辑器内无缝集成 Hermes Panel，选中代码即可发送到 AI 对话，让编程与 AI 协作行云流水。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>右键发送代码</strong><span>选中代码片段，右键菜单一键发送到 Panel 对话，无需复制粘贴。</span></div>
      <div class="info-card"><strong>上下文感知</strong><span>自动附带文件路径、语言类型、Git Diff 等上下文信息，AI 准确理解代码背景。</span></div>
      <div class="info-card"><strong>快捷键操作</strong><span>自定义快捷键，选中代码后即刻触发发送，编辑器中保持专注。</span></div>
    </div>

    <h2>安装配置</h2>
    <h3>安装扩展</h3>
    <p>在 VS Code 扩展市场（<kbd>Cmd+Shift+X</kbd>）搜索 <strong>"Hermes Panel"</strong>，点击安装。或者通过命令行安装：</p>
    <pre><code>code --install-extension hermes-panel-vscode</code></pre>

    <h3>连接 Panel</h3>
    <p>首次使用时，扩展会自动探测本地的 Hermes Panel 实例。如果 Panel 尚未运行，扩展会尝试通过以下方式打开：</p>
    <ul>
      <li>首选调用系统已安装的 Hermes Panel Tauri 桌面应用</li>
      <li>回退到 <code>hermes-panel://</code> 协议链接</li>
      <li>最终回退到 <code>http://127.0.0.1:5666</code></li>
    </ul>
    <p>您也可以在扩展设置中手动指定 Panel 的地址和认证 Token。</p>

    <h2>使用方法</h2>
    <h3>右键菜单</h3>
    <p>在编辑器中选中代码或文本，右键点击 <strong>"Send to Hermes Panel"</strong>。扩展会自动：</p>
    <ul>
      <li>收集选中内容</li>
      <li>附带当前文件路径和语言类型</li>
      <li>通过 <code>POST /api/draft</code> 发送到 Panel BFF</li>
      <li>打开 Panel 聊天界面并显示推送的上下文</li>
    </ul>

    <h3>快捷键</h3>
    <p>默认快捷键为 <kbd>Ctrl+Shift+P</kbd>（Windows/Linux）或 <kbd>Cmd+Shift+P</kbd>（macOS），选中代码后按下快捷键即可发送。您可以在 VS Code 键盘快捷方式设置中自定义此快捷键。</p>

    <h3>高级上下文</h3>
    <p>扩展支持发送多种上下文类型：</p>
    <ul>
      <li><strong>选中文本</strong> — 编辑器中的选中内容</li>
      <li><strong>文件路径</strong> — 自动附带当前文件路径，AI 可以推断代码所属模块</li>
      <li><strong>Git Diff</strong> — 发送当前文件的未暂存更改差异，适合代码审查场景</li>
      <li><strong>终端输出</strong> — 选中终端中的错误输出发送给 AI 排查问题</li>
    </ul>

    <div class="callout info">
      <strong>提示</strong>
      <span>当 Panel BFF 不可达时，扩展会自动回退到剪贴板模式：将选中内容复制到剪贴板并弹出通知，告知用户手动粘贴到 Panel 中。</span>
    </div>

    <h2>配置选项</h2>
    <p>扩展提供以下可配置选项（通过 VS Code 设置搜索 "Hermes Panel"）：</p>
    <ul>
      <li><code>hermesPanel.bffUrl</code> — BFF 服务地址，默认 <code>http://127.0.0.1:5667</code></li>
      <li><code>hermesPanel.panelUrl</code> — Panel Web 地址，默认 <code>http://127.0.0.1:5666</code></li>
      <li><code>hermesPanel.token</code> — 认证 Token（可选，未设置时自动从本地 Panel 读取）</li>
      <li><code>hermesPanel.includeGitDiff</code> — 是否默认包含 Git Diff，默认关闭</li>
    </ul>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/api-playground" class="next-link">← API Playground</router-link>
      <router-link to="/hermes-panel/docs/hermes-endpoints" class="next-link">Hermes 端点配置 →</router-link>
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
pre { margin: 1rem 0; padding: 1rem 1.25rem; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-default); overflow-x: auto; }
pre code { border: none; padding: 0; background: none; display: block; line-height: 1.7; }
kbd { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg-hover); padding: .125rem .375rem; border-radius: 4px; font-size: .75rem; border: 1px solid var(--border-default); color: var(--text-primary); }
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
