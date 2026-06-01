<template>
  <DocsLayout>
    <h1>Hermes 端点配置</h1>
    <p class="lead">Hermes Panel 的 Hermes 端点配置 功能文档。</p>
    <p>完整文档编写中，敬请期待。如需了解更多，请访问 <router-link to="/hermes-panel/docs/intro">产品简介</router-link> 或查看其他已完成的文档页面。</p>
    <div class="next-steps">
      <router-link to="/hermes-panel/docs/intro" class="next-link">← 产品简介</router-link>
      <router-link to="/hermes-panel" class="next-link">产品首页 →</router-link>
    </div>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '@/components/hermes-panel/DocsLayout.vue';
</script>

<style scoped>
h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: .5rem; }
.lead { font-size: 1.0625rem; color: var(--text-secondary); margin-bottom: 2rem; }
p { color: var(--text-secondary); line-height: 1.8; margin-bottom: 1rem; }
a { color: var(--accent); }
a:hover { text-decoration: underline; }
.next-steps { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default); display: flex; gap: .75rem; flex-wrap: wrap; }
.next-link { padding: .5rem 1rem; border-radius: 8px; background: var(--accent); color: #fff !important; font-size: .875rem; font-weight: 500; transition: all .15s; text-decoration: none !important; }
.next-link:hover { opacity: .9; }
</style>
