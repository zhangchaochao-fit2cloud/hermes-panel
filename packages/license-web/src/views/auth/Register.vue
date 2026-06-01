<template>
  <div class="login-page">
    <div class="login-glow login-glow--1" />
    <div class="login-glow login-glow--2" />

    <div class="login-card-wrapper">
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
        <p class="login-desc">创建账号以管理 License</p>
      </div>

      <div class="login-form-card">
        <h2 class="login-form-title">创建账号</h2>
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" require-mark-placement="right-hanging">
          <n-form-item path="displayName" label="昵称">
            <n-input v-model:value="form.displayName" placeholder="输入昵称（可选）" size="large" />
          </n-form-item>
          <n-form-item path="email" label="邮箱地址">
            <n-input v-model:value="form.email" placeholder="name@example.com" autocomplete="email" size="large" />
          </n-form-item>
          <n-form-item path="password" label="登录密码">
            <n-input v-model:value="form.password" type="password" placeholder="至少6位字符" autocomplete="new-password" size="large" show-password-toggle />
          </n-form-item>
          <n-button type="primary" block size="large" :loading="auth.loading" :disabled="!form.email || !form.password" @click="handleRegister">
            <template v-if="!auth.loading">注 册</template>
          </n-button>
        </n-form>
        <div class="login-register-link">
          已有账号？<router-link to="/login">立即登录 →</router-link>
        </div>
      </div>

      <p class="login-copyright">&copy; 2026 Hermes Panel</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/stores/toast';

const auth = useAuthStore();
const router = useRouter();
const form = reactive({ displayName: '', email: '', password: '' });
const formRef = ref<any>(null);
const toast = useToast();
const rules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [{ required: true, min: 6, message: '密码至少6位字符', trigger: 'blur' }],
};

async function handleRegister() {
  try { await formRef.value?.validate(); } catch { return; }
  try {
    await auth.register(form.email, form.password, form.displayName || undefined);
    router.push('/dashboard');
  } catch { toast.error('注册失败，请稍后再试'); }
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
</style>
