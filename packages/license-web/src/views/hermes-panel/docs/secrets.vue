<template>
  <DocsLayout>
    <h1>密钥管理</h1>
    <p class="lead">集中管理 AI 供应商 API Key 和 Panel 凭证，采用企业级加密存储方案，保障密钥全生命周期安全。</p>

    <h2>核心特性</h2>
    <div class="cards-3">
      <div class="info-card"><strong>安全存储</strong><span>支持系统 Keychain（macOS/Windows/Linux）和 AES-256-GCM 加密文件双保险。</span></div>
      <div class="info-card"><strong>密钥生命周期</strong><span>从创建、轮换到吊销，完整管理密钥的每个阶段。</span></div>
      <div class="info-card"><strong>不可逆传输</strong><span>密钥仅在 BFF 内存中使用，绝不通过网络传输到前端或第三方。</span></div>
    </div>

    <h2>存储架构</h2>
    <p>Hermes Panel 采用多层安全架构保护密钥：</p>
    <ul>
      <li><strong>首选项：系统 Keychain</strong> — macOS 使用 Keychain Access，Windows 使用 WinCred，Linux 使用 libsecret。密钥存储在操作系统原生安全存储中。</li>
      <li><strong>回退方案：加密文件</strong> — 当 Keychain 不可用时（如无头服务器），密钥以 AES-256-GCM 加密后写入 <code>~/.hermes-panel/secrets.enc</code>，解密密钥派生自用户密码。</li>
      <li><strong>内存防护</strong> — 密钥解密后在 BFF 进程内存中短期驻留，定期清除，避免核心转储泄露。</li>
    </ul>
    <div class="callout info">
      <strong>了解详情</strong>
      <span>对于老版本 <code>~/.hermes/auth.json</code> 中的密钥，系统会在首次读取时自动迁移到新存储方案，原文件不会被删除但不再使用。</span>
    </div>

    <h2>密钥生命周期管理</h2>
    <h3>添加密钥</h3>
    <p>在 <strong>设置 &gt; 密钥管理</strong> 中点击添加，选择供应商类型并输入 API Key。系统会立即验证密钥有效性并测试连通性，通过后自动加密存储。</p>

    <h3>密钥轮换</h3>
    <p>支持一键生成新密钥并替换旧密钥。轮换期间旧密钥会保留一段可配置的宽限期，确保正在运行的任务不会因密钥失效而中断。宽限期结束后旧密钥自动清除。</p>

    <h3>密钥吊销</h3>
    <p>当密钥疑似泄露或需要撤销访问权限时，可在管理界面吊销密钥。吊销操作会立即停止该密钥的全部使用，并在下一次 Hermes API 调用时触发错误提示。</p>

    <h2>安全最佳实践</h2>
    <ul>
      <li>为不同供应商使用独立的 API Key，不要跨账户共享</li>
      <li>定期轮换密钥（建议每 90 天一次），降低泄露风险</li>
      <li>启用密钥过期提醒，在密钥到期前收到通知</li>
      <li>在无头服务器上部署时，确保 <code>~/.hermes-panel/</code> 目录权限设置为 700</li>
    </ul>

    <div class="next-steps">
      <router-link to="/hermes-panel/docs/backup" class="next-link">← 备份管理</router-link>
      <router-link to="/hermes-panel/docs/doctor" class="next-link">诊断工具 →</router-link>
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
