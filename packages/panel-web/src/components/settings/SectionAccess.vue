<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NInputNumber, NSelect, NTag, useMessage } from 'naive-ui';
import type { LicenseInfo } from '@hermes-panel/shared';
import { useAuthStore } from '@/stores/auth';
import {
  createLicense,
  listLicenses,
  revokeLicense,
} from '@/api/auth';

const auth = useAuthStore();
const message = useMessage();

const licenses = ref<LicenseInfo[]>([]);
const loading = ref(false);

// License creation form
const licTier = ref<'web' | 'desktop' | 'pro'>('web');
const licExpiresDays = ref<number | null>(null);

const tierOptions = [
  { label: 'Web', value: 'web' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Pro', value: 'pro' },
] as const;

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const lr = await listLicenses();
    licenses.value = lr.licenses;
  } catch {
    // not admin — leave list empty
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

async function onCreateLicense(): Promise<void> {
  const expiresAt = licExpiresDays.value
    ? Date.now() + licExpiresDays.value * 24 * 60 * 60 * 1000
    : undefined;
  try {
    await createLicense({ tier: licTier.value, expiresAt });
    message.success('License 已创建');
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建失败');
  }
}

async function onRevokeLicense(key: string): Promise<void> {
  try {
    await revokeLicense(key);
    message.success('已吊销');
    await refresh();
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败');
  }
}

function formatExpiry(ts: number | null): string {
  if (!ts) return '永不过期';
  return new Date(ts).toLocaleDateString('zh-CN');
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">License 管理</h3>
      <NButton size="tiny" quaternary :loading="loading" @click="refresh">
        刷新
      </NButton>
    </div>

    <template v-if="!auth.isAdmin">
      <p class="text-sm text-[var(--text-3)]">仅管理员可管理 License。</p>
    </template>

    <template v-else>
      <div class="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div class="flex items-center gap-1 mb-3">
          <span class="text-sm font-medium">License 密钥</span>
          <NTag size="small" :bordered="false">{{ licenses.length }}</NTag>
        </div>

        <!-- Create form -->
        <div class="flex flex-wrap items-end gap-2 mb-3">
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-[var(--text-3)]">Tier 等级</span>
            <NSelect
              v-model:value="licTier"
              :options="tierOptions as any"
              size="small"
              style="width:110px"
            />
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-[var(--text-3)]">过期天数（可选）</span>
            <NInputNumber v-model:value="licExpiresDays" :min="1" :max="3650" placeholder="永久" size="small" style="width:100px" />
          </div>
          <NButton size="small" type="primary" @click="onCreateLicense">
            生成 License
          </NButton>
        </div>

        <!-- License list -->
        <div v-if="licenses.length" class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="lic in licenses"
            :key="lic.key"
            class="flex items-center justify-between rounded px-2 py-1.5 text-xs"
            :class="lic.revoked ? 'opacity-40' : 'bg-[var(--bg-elevate)]'"
          >
            <div class="flex items-center gap-2 min-w-0">
              <code class="text-[11px] text-[var(--brand-600)] flex-shrink-0">{{ lic.key }}</code>
              <NTag size="tiny" :bordered="false" :type="lic.tier === 'pro' ? 'error' : lic.tier === 'desktop' ? 'warning' : 'default'">
                {{ lic.tier }}
              </NTag>
              <span
                v-if="lic.boundUserId"
                class="text-[var(--text-3)] truncate hidden sm:inline"
                :title="lic.boundUserId"
              >
                已激活
              </span>
              <span class="text-[var(--text-3)] truncate hidden sm:inline">
                {{ formatExpiry(lic.expiresAt) }}
              </span>
            </div>
            <NButton
              v-if="!lic.revoked"
              size="tiny"
              quaternary
              type="error"
              @click="onRevokeLicense(lic.key)"
            >
              吊销
            </NButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
