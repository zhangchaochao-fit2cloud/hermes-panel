<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NInput, useMessage } from 'naive-ui';
import { fetchAuthContext } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const message = useMessage();

const mode = ref<'login' | 'setup'>('login');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const submitDisabled = computed(() => !password.value.trim() || loading.value);

onMounted(async () => {
  try {
    const ctx = await fetchAuthContext();
    if (ctx.needsBootstrap) {
      mode.value = 'setup';
    }
  } catch {
    // keep login mode as default
  }
});

async function finish(): Promise<void> {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
  await router.replace(redirect);
}

async function submitSetup(): Promise<void> {
  if (!password.value.trim() || loading.value) return;
  if (password.value !== confirmPassword.value) {
    message.error('两次输入的密码不一致');
    return;
  }
  loading.value = true;
  try {
    await auth.setup(password.value);
    await finish();
  } catch (err) {
    message.error(err instanceof Error ? err.message : '设置失败');
  } finally {
    loading.value = false;
  }
}

async function submitLogin(): Promise<void> {
  if (submitDisabled.value) return;
  loading.value = true;
  try {
    await auth.login(password.value);
    await finish();
  } catch (err) {
    message.error(err instanceof Error ? err.message : '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-full bg-[var(--bg-page)] text-[var(--text-1)] flex items-center justify-center px-6 py-10">
    <section class="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-2)]">
      <div class="mb-5">
        <div class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">Hermes Panel</div>
        <h1 class="mt-2 text-xl font-semibold">{{ mode === 'setup' ? '设置管理员密码' : '登录控制台' }}</h1>
        <p class="mt-1 text-sm text-[var(--text-3)]">
          {{ mode === 'setup' ? '首次启动，请设置管理员密码。' : '输入密码登录你的本地面板。' }}
        </p>
      </div>

      <!-- Setup mode: first launch -->
      <div v-if="mode === 'setup'" class="space-y-3">
        <NInput v-model:value="password" placeholder="密码" type="password" show-password-on="click" size="large" />
        <NInput v-model:value="confirmPassword" placeholder="确认密码" type="password" show-password-on="click" size="large" @keyup.enter="submitSetup" />
        <NButton type="primary" block size="large" :loading="loading" :disabled="!password.trim() || !confirmPassword.trim()" @click="submitSetup">
          设置密码并登录
        </NButton>
      </div>

      <!-- Login mode -->
      <div v-else class="space-y-3">
        <NInput v-model:value="password" placeholder="密码" type="password" show-password-on="click" size="large" @keyup.enter="submitLogin" />
        <NButton type="primary" block size="large" :loading="loading" :disabled="submitDisabled" @click="submitLogin">
          登录
        </NButton>
      </div>
    </section>
  </div>
</template>
