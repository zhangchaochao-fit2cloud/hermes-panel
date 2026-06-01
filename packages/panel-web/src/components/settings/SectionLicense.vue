<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NInput, NTag, NDivider, useMessage } from 'naive-ui';
import type { LicenseInfo } from '@hermes-panel/shared';
import { activateUserLicense, deactivateUserLicense, getLicenseStatus } from '@/api/auth';

const message = useMessage();

const license = ref<LicenseInfo | null>(null);
const features = ref<string[]>([]);
const licenseKey = ref('');
const loading = ref(false);

const hasLicense = computed(() => license.value !== null);
const isActive = computed(() => license.value?.revoked === false);

async function refresh(): Promise<void> {
  try {
    const res = await getLicenseStatus();
    license.value = res.license;
    features.value = res.features;
  } catch {
    // not authenticated — leave empty
  }
}

onMounted(refresh);

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('zh-CN');
}

function formatFeature(f: string): string {
  const map: Record<string, string> = {
    workspaces: '工作区',
    cron: '定时任务',
    memory: '记忆管理',
    files: '文件管理',
    tools: '工具页',
    developer: '开发者工具',
    providers: '模型供应商',
    backup: '备份',
    sandbox: '沙箱',
    gateway: '网关',
    webhook: 'Webhook',
    doctor: '诊断',
    logs: '日志',
    secrets: '密钥',
  };
  return map[f] ?? f;
}

async function onActivate(): Promise<void> {
  if (!licenseKey.value.trim() || loading.value) return;
  loading.value = true;
  try {
    await activateUserLicense(licenseKey.value.trim());
    message.success('License 激活成功');
    licenseKey.value = '';
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : '激活失败');
  } finally {
    loading.value = false;
  }
}

async function onDeactivate(): Promise<void> {
  if (!license.value || loading.value) return;
  loading.value = true;
  try {
    await deactivateUserLicense(license.value.key);
    message.success('License 已取消激活');
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败');
  } finally {
    loading.value = false;
  }
}

async function onRefresh(): Promise<void> {
  loading.value = true;
  try {
    await refresh();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">License 激活</h3>
      <NButton size="tiny" quaternary :loading="loading" @click="onRefresh">
        刷新
      </NButton>
    </div>

    <!-- No license yet -->
    <div v-if="!hasLicense" class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p class="text-sm text-[var(--text-3)] mb-3">
        尚未激活 License。输入 License Key 解锁高级功能（工作区、定时任务、记忆管理等）。
      </p>
      <div class="flex gap-2">
        <NInput
          v-model:value="licenseKey"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          size="small"
          style="flex:1"
          @keyup.enter="onActivate"
        />
        <NButton type="primary" size="small" :loading="loading" @click="onActivate">
          激活
        </NButton>
      </div>
    </div>

    <!-- License active -->
    <div v-else class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
      <div class="flex items-center gap-2">
        <NTag :type="license!.tier === 'pro' ? 'error' : license!.tier === 'desktop' ? 'warning' : 'default'" size="small">
          {{ license!.tier }}
        </NTag>
        <NTag :type="isActive ? 'success' : 'default'" size="small">
          {{ isActive ? '已激活' : '已吊销' }}
        </NTag>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span class="text-[var(--text-3)]">Key</span>
        <code class="text-[var(--brand-600)]">{{ license!.key }}</code>
        <span class="text-[var(--text-3)]">激活时间</span>
        <span>{{ formatTimestamp(license!.activatedAt) }}</span>
        <span class="text-[var(--text-3)]">过期时间</span>
        <span>{{ formatTimestamp(license!.expiresAt) }}</span>
        <span class="text-[var(--text-3)]">绑定设备</span>
        <code class="text-[10px] truncate">{{ license!.boundDevice || '未绑定' }}</code>
      </div>

      <NDivider />

      <div>
        <span class="text-xs font-medium text-[var(--text-2)]">已解锁功能</span>
        <div class="flex flex-wrap gap-1 mt-1">
          <NTag
            v-for="f in features"
            :key="f"
            size="tiny"
            :bordered="false"
            type="info"
          >
            {{ formatFeature(f) }}
          </NTag>
          <span v-if="features.length === 0" class="text-xs text-[var(--text-3)]">无高级功能</span>
        </div>
      </div>

      <NButton size="small" quaternary type="error" @click="onDeactivate">
        取消激活
      </NButton>
    </div>
  </div>
</template>
