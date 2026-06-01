<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">我的 License</h1>
        <p class="page-desc">管理 License 密钥和绑定设备</p>
      </div>
    </div>

    <n-spin :show="loading">
      <div v-if="licenses.length" class="license-list">
        <div v-for="lic in licenses" :key="lic.licenseKey" class="license-card">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="license-tier">{{ tierLabel(lic.tier) }}</span>
                <n-tag :type="lic.boundDevice ? 'success' : 'default'" size="tiny" round>
                  {{ lic.boundDevice ? '已激活' : '未激活' }}
                </n-tag>
                <n-tag v-if="lic.deactivatedAt" type="warning" size="tiny" round>已取消</n-tag>
              </div>
              <div class="license-dates">
                创建于 {{ formatDate(lic.createdAt) }}
                <template v-if="lic.activatedAt"> · 激活于 {{ formatDate(lic.activatedAt) }}</template>
              </div>
            </div>
            <div class="flex gap-2">
              <n-button size="small" secondary @click="handleDownload(lic.licenseKey)">
                <template #icon>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </template>
                下载
              </n-button>
              <n-button v-if="lic.boundDevice" size="small" type="warning" secondary :loading="resetting === lic.licenseKey" @click="handleReset(lic.licenseKey)">重置绑定</n-button>
            </div>
          </div>

          <!-- Key display -->
          <div class="key-block">
            <div class="flex items-center gap-2 mb-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--text-muted)"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              <span class="key-label">License Key · Ed25519 签名</span>
            </div>
            <code class="key-text">{{ lic.licenseKey }}</code>
          </div>

          <!-- Device info -->
          <div v-if="lic.boundDevice" class="device-info">
            <span class="device-dot" />
            <code>{{ lic.boundDevice.slice(0, 16) }}…</code>
            <span>{{ lic.boundOs }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
        </div>
        <p class="empty-title">暂无 License</p>
        <p class="empty-desc">请先创建订单，管理员签发后即可在此查看</p>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';
import { useToast } from '@/stores/toast';

interface License {
  id: number; orderId: string; licenseKey: string; tier: string; userId: string;
  boundDevice: string | null; boundOs: string | null; activatedAt: number | null;
  deactivatedAt: number | null; lastVerifiedAt: number | null; createdAt: number;
}

const licenses = ref<License[]>([]);
const loading = ref(true);
const resetting = ref<string | null>(null);
const toast = useToast();

async function fetchLicenses() {
  loading.value = true;
  try { const r = await api.get<{ licenses: License[] }>('/licenses'); licenses.value = r.licenses; } catch { toast.error('加载 License 失败'); }
  finally { loading.value = false; }
}

async function handleDownload(key: string) {
  try {
    const tk = localStorage.getItem('license-token');
    const r = await fetch(`/api/licenses/${encodeURIComponent(key)}/download`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!r.ok) { toast.error('下载失败'); return; }
    const b = new Blob([await r.text()], { type: 'application/octet-stream' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = `license_hermes_${key.slice(0, 8)}.key`; a.click();
    URL.revokeObjectURL(u);
  } catch { toast.error('下载失败'); }
}

async function handleReset(key: string) {
  resetting.value = key;
  try { await api.post(`/licenses/${encodeURIComponent(key)}/reset`); await fetchLicenses(); toast.success('绑定已重置'); } catch { toast.error('重置失败'); }
  finally { resetting.value = null; }
}

function tierLabel(t: string) { return { web: 'Web', desktop: 'Desktop', pro: 'Pro' }[t] ?? t; }
function formatDate(ts: number) { return new Date(ts).toLocaleDateString('zh-CN'); }

onMounted(fetchLicenses);
</script>

<style scoped>
.page { padding: 1.5rem; }
.page-header { margin-bottom: 1.5rem; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.page-desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.125rem; }

.license-list { display: flex; flex-direction: column; gap: 1rem; }
.license-card {
  padding: 1.25rem; border-radius: var(--radius-md);
  background: var(--bg-card); border: 1px solid var(--border-default);
  transition: border-color 0.15s;
}
.license-card:hover { border-color: var(--border-strong); }
.license-tier { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
.license-dates { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem; }

.key-block { padding: 0.75rem; border-radius: var(--radius-sm); background: var(--bg-active); border: 1px solid var(--border-subtle); margin-bottom: 0.75rem; }
.key-label { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.key-text { font-size: 0.75rem; color: var(--text-secondary); font-family: monospace; word-break: break-all; line-height: 1.5; }

.device-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); }
.device-dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: var(--success); }

.empty-state { text-align: center; padding: 5rem 1rem; }
.empty-icon {
  width: 3.5rem; height: 3.5rem; margin: 0 auto 1rem; border-radius: 1rem;
  background: var(--bg-active); display: flex; align-items: center; justify-content: center; color: var(--text-placeholder);
}
.empty-title { font-size: 0.875rem; color: var(--text-muted); }
.empty-desc { font-size: 0.75rem; color: var(--text-placeholder); margin-top: 0.25rem; }
</style>
