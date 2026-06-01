<template>
  <div class="landing">
    <!-- Header -->
    <header class="landing-header">
      <div class="landing-header-inner">
        <div class="flex items-center gap-3">
          <div class="header-logo">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span class="header-title">Hermes Panel</span>
        </div>
        <nav class="header-nav">
          <a href="#features" class="nav-link">功能</a>
          <a href="#pricing" class="nav-link">定价</a>
          <span class="nav-divider" />
          <router-link to="/login" class="nav-link">登录</router-link>
          <router-link to="/register" class="nav-cta">免费开始</router-link>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-badge">
        <span class="hero-badge-dot" />
        本地优先 · 数据安全
      </div>
      <h1 class="hero-title">
        <span class="hero-gradient">AI Agent 控制面板</span>
        <br />的专业之选
      </h1>
      <p class="hero-desc">本地部署，无需云端中转。购买 License 解锁工作区、定时任务、MCP 工具集成等高级功能。</p>
      <div class="hero-actions">
        <router-link to="/register" class="hero-btn-primary">免费注册</router-link>
        <a href="#pricing" class="hero-btn-secondary">查看定价 →</a>
      </div>
    </section>

    <!-- Feature section -->
    <section id="features" class="section">
      <div class="section-title">功能对比</div>
      <p class="section-sub">选择最适合你的方案</p>
      <div class="feature-table-wrap">
        <table class="feature-table">
          <thead>
            <tr>
              <th>功能</th>
              <th class="text-center"><div class="plan-name">Web</div><div class="plan-price">免费</div></th>
              <th class="text-center plan-col--highlight"><div class="plan-name">Desktop</div><div class="plan-price">$29/年</div></th>
              <th class="text-center"><div class="plan-name">Pro</div><div class="plan-price">$79/年</div></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in featureRows" :key="i">
              <td>{{ row.label }}</td>
              <td :class="row.web ? 'check' : 'na'">{{ row.web ? '✓' : '—' }}</td>
              <td :class="[row.desktop ? 'check' : 'na', 'plan-col--highlight']">{{ row.desktop ? '✓' : '—' }}</td>
              <td :class="row.pro ? 'check' : 'na'">{{ row.pro ? '✓' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="section">
      <div class="section-title">定价方案</div>
      <p class="section-sub">选择适合你的方案，随时升级</p>
      <div class="pricing-grid">
        <div v-for="plan in plans" :key="plan.tier" class="pricing-card" :class="{ 'pricing-card--popular': plan.highlight }">
          <div v-if="plan.highlight" class="popular-badge">推荐</div>
          <h3 class="pricing-plan-name">{{ plan.name }}</h3>
          <div class="pricing-price">
            <span class="pricing-amount">{{ plan.price || '免费' }}</span>
            <span v-if="plan.price" class="pricing-period">/年</span>
          </div>
          <p class="pricing-desc">{{ plan.desc }}</p>
          <ul class="pricing-features">
            <li v-for="f in plan.features" :key="f">
              <svg class="w-4 h-4 pricing-check" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              {{ f }}
            </li>
          </ul>
          <router-link to="/register" :class="plan.highlight ? 'hero-btn-primary w-full text-center block' : 'hero-btn-secondary w-full text-center block'" style="margin-top:auto">
            {{ plan.price ? '开始使用' : '免费开始' }}
          </router-link>
        </div>
      </div>
    </section>

    <footer class="landing-footer">&copy; 2026 Hermes Panel. All rights reserved.</footer>
  </div>
</template>

<script setup lang="ts">
const featureRows = [
  { label: '对话 (Chat)', web: true, desktop: true, pro: true },
  { label: '会话历史 (Sessions)', web: true, desktop: true, pro: true },
  { label: '仪表盘 & 统计', web: true, desktop: true, pro: true },
  { label: '系统健康监控', web: true, desktop: true, pro: true },
  { label: '通知中心', web: true, desktop: true, pro: true },
  { label: '基础设置', web: true, desktop: true, pro: true },
  { label: '用户管理', web: true, desktop: true, pro: true },
  { label: '工作区 (Workspaces)', web: false, desktop: true, pro: true },
  { label: '定时任务 (Cron)', web: false, desktop: true, pro: true },
  { label: '记忆管理 (Memory)', web: false, desktop: true, pro: true },
  { label: '文件管理 (Files)', web: false, desktop: true, pro: true },
  { label: 'MCP / 技能 / 插件', web: false, desktop: true, pro: true },
  { label: '开发工具 (Developer)', web: false, desktop: true, pro: true },
  { label: '模型供应商配置', web: false, desktop: true, pro: true },
  { label: '备份管理', web: false, desktop: true, pro: true },
  { label: '沙箱 & 网关', web: false, desktop: true, pro: true },
  { label: '诊断 & 日志', web: false, desktop: false, pro: true },
  { label: '密钥管理 (Secrets)', web: false, desktop: false, pro: true },
];

const plans = [
  { tier: 'web', name: 'Web', price: null, highlight: false, desc: '适合个人试用和基础场景', features: ['完整对话功能', '会话历史管理', '仪表盘和统计', '基础设置', '用户管理'] },
  { tier: 'desktop', name: 'Desktop', price: '$29', highlight: true, desc: '适合专业用户和团队', features: ['Web 全部功能', '工作区和定时任务', '记忆和文件管理', 'MCP/技能/插件集成', '模型供应商配置', '备份管理'] },
  { tier: 'pro', name: 'Pro', price: '$79', highlight: false, desc: '适合高级用户和开发者', features: ['Desktop 全部功能', '诊断和日志查看', '密钥管理', '沙箱隔离', '网关配置', '优先技术支持'] },
];
</script>

<style scoped>
.landing { min-height: 100vh; background: var(--bg-deep); color: var(--text-primary); }
.landing-header { position: sticky; top: 0; z-index: 50; border-bottom: 1px solid var(--border-subtle); background: var(--bg-deep); backdrop-filter: blur(16px); }
.landing-header-inner { max-width: 72rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; }
.header-logo {
  width: 2rem; height: 2rem; border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.header-title { font-weight: 600; font-size: 0.9375rem; }
.header-nav { display: flex; align-items: center; gap: 0.25rem; }
.nav-link { padding: 0.5rem 0.75rem; font-size: 0.8125rem; color: var(--text-secondary); border-radius: var(--radius-sm); transition: color 0.15s; }
.nav-link:hover { color: var(--text-primary); }
.nav-divider { width: 1px; height: 1.25rem; background: var(--border-default); margin: 0 0.5rem; }
.nav-cta { margin-left: 0.25rem; padding: 0.5rem 1rem; font-size: 0.8125rem; font-weight: 500; background: var(--text-primary); color: var(--bg-deep); border-radius: var(--radius-sm); transition: opacity 0.15s; }
.nav-cta:hover { opacity: 0.85; }

/* Hero */
.hero { max-width: 48rem; margin: 0 auto; text-align: center; padding: 6rem 1.5rem 5rem; }
.hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; background: var(--bg-active); font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1.5rem; }
.hero-badge-dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: var(--success); }
.hero-title { font-size: 2.75rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
.hero-gradient { background: linear-gradient(135deg, var(--brand-from), var(--brand-to)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-desc { font-size: 1.0625rem; color: var(--text-muted); max-width: 36rem; margin: 0 auto 2.5rem; line-height: 1.65; }
.hero-actions { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; }
.hero-btn-primary { display: inline-block; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 500; background: var(--accent); color: #fff; border-radius: var(--radius-sm); transition: background 0.15s; }
.hero-btn-primary:hover { background: var(--accent-hover); }
.hero-btn-secondary { display: inline-block; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 500; background: var(--bg-active); color: var(--text-secondary); border-radius: var(--radius-sm); border: 1px solid var(--border-default); transition: all 0.15s; }
.hero-btn-secondary:hover { border-color: var(--border-strong); color: var(--text-primary); }

/* Section */
.section { max-width: 72rem; margin: 0 auto; padding: 5rem 1.5rem; }
.section-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: 0.5rem; }
.section-sub { font-size: 0.875rem; color: var(--text-muted); text-align: center; margin-bottom: 2.5rem; }

/* Feature table */
.feature-table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border-default); background: var(--bg-card); }
.feature-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.feature-table th { padding: 1rem 1.5rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid var(--border-default); }
.feature-table td { padding: 0.75rem 1.5rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
.feature-table tbody tr:last-child td { border-bottom: 0; }
.plan-name { color: var(--text-secondary); }
.plan-price { font-size: 0.625rem; font-weight: 400; text-transform: none; color: var(--text-muted); margin-top: 0.125rem; }
.plan-col--highlight { background: var(--accent-soft); }
.check { text-align: center; color: var(--success); font-weight: 500; }
.na { text-align: center; color: var(--text-placeholder); opacity: 0.3; }

/* Pricing */
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; max-width: 56rem; margin: 0 auto; }
@media (max-width: 768px) { .pricing-grid { grid-template-columns: 1fr; } }
.pricing-card {
  position: relative; padding: 1.5rem; border-radius: var(--radius-lg);
  background: var(--bg-card); border: 1px solid var(--border-default);
  display: flex; flex-direction: column; gap: 1rem;
}
.pricing-card--popular { border-color: var(--accent); box-shadow: var(--shadow-glow); }
.popular-badge { position: absolute; top: -0.75rem; left: 50%; transform: translateX(-50%); padding: 0.125rem 0.75rem; border-radius: 9999px; background: var(--accent); color: #fff; font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.pricing-plan-name { font-size: 1.125rem; font-weight: 600; }
.pricing-price { margin-top: 0.5rem; }
.pricing-amount { font-size: 1.75rem; font-weight: 700; }
.pricing-period { font-size: 0.875rem; color: var(--text-muted); }
.pricing-desc { font-size: 0.8125rem; color: var(--text-muted); }
.pricing-features { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.pricing-features li { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8125rem; color: var(--text-secondary); }
.pricing-check { color: var(--success); flex-shrink: 0; margin-top: 0.125rem; }

.landing-footer { text-align: center; padding: 2rem; font-size: 0.75rem; color: var(--text-placeholder); border-top: 1px solid var(--border-subtle); }
</style>
