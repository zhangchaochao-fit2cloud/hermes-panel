<template>
  <div class="login-page">
    <div class="login-glow login-glow--1" />
    <div class="login-glow login-glow--2" />

    <div class="login-card-wrapper">
      <!-- Brand -->
      <router-link to="/" class="login-back">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        返回首页
      </router-link>

      <div class="login-logo">
        <div class="login-logo-icon">
          <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="login-title">Hermes Panel</h1>
        <p class="login-desc">License 管理门户</p>
      </div>

      <!-- Form -->
      <div class="login-form-card">
        <h2 class="login-form-title">账号登录</h2>
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" require-mark-placement="right-hanging">
          <n-form-item path="email" label="邮箱地址">
            <n-input v-model:value="form.email" placeholder="name@example.com" autocomplete="email" size="large">
              <template #prefix>
                <svg class="w-4 h-4 icon-muted" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="password" label="登录密码">
            <n-input v-model:value="form.password" type="password" placeholder="输入密码" autocomplete="current-password" size="large" show-password-toggle>
              <template #prefix>
                <svg class="w-4 h-4 icon-muted" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </template>
            </n-input>
          </n-form-item>
          <n-button type="primary" block size="large" :loading="auth.loading" :disabled="!form.email || !form.password" @click="handleLogin">
            <template v-if="!auth.loading">登 录</template>
          </n-button>
        </n-form>
        <div class="login-register-link">
          还没有账号？<router-link to="/register">立即注册 →</router-link>
        </div>
      </div>

      <p class="login-copyright">&copy; 2026 Hermes Panel</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/stores/toast';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const form = reactive({ email: '', password: '' });
const formRef = ref<any>(null);
const toast = useToast();
const rules = {
  email: [{ required: true, message: '请输入邮箱地址', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
};

async function handleLogin() {
  try { await formRef.value?.validate(); } catch { return; }
  try {
    await auth.login(form.email, form.password);
    router.push((route.query.redirect as string) ?? '/dashboard');
  } catch { toast.error('登录失败，请检查邮箱和密码'); }
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: var(--bg-deep); display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; overflow: hidden; }
.login-glow { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.06; pointer-events: none; }
.login-glow--1 { width: 500px; height: 500px; background: var(--accent); top: -150px; right: -100px; }
.login-glow--2 { width: 400px; height: 400px; background: var(--brand-to); bottom: -120px; left: -80px; }

.login-card-wrapper { width: 100%; max-width: 400px; position: relative; z-index: 1; }
.login-back { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.75rem; margin-bottom: 1.5rem; }
.login-back:hover { color: var(--text-secondary); }

.login-logo { text-align: center; margin-bottom: 2rem; }
.login-logo-icon {
  width: 3rem; height: 3rem; margin: 0 auto 0.75rem; border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--brand-from), var(--brand-to));
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: var(--shadow-glow);
}
.login-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.login-desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; }

.login-form-card { padding: 1.75rem; border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border-default); }
.login-form-title { font-size: 1.0625rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.5rem; }

.login-register-link { margin-top: 1.25rem; text-align: center; font-size: 0.8125rem; color: var(--text-muted); }
.login-register-link a { color: var(--accent); font-weight: 500; }
.login-register-link a:hover { color: var(--accent-hover); }

.login-copyright { text-align: center; margin-top: 2rem; font-size: 0.75rem; color: var(--text-placeholder); }
.icon-muted { color: var(--text-muted); }
</style>
