<template>
  <div class="admin-page">
    <!-- Header -->
    <div class="admin-header">
      <h1 class="admin-title">管理后台</h1>
      <p class="admin-sub">订单管理 · License 签发</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon--blue">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        </div>
        <div>
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">总订单</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--green">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div class="stat-value">{{ stats.deliveredOrders }}</div>
          <div class="stat-label">已交付</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--purple">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
        </div>
        <div>
          <div class="stat-value">{{ stats.totalLicenses }}</div>
          <div class="stat-label">已签发 License</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--amber">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div>
          <div class="stat-value">{{ stats.activeLicenses }}</div>
          <div class="stat-label">已激活</div>
        </div>
      </div>
    </div>

    <!-- Tabs: Orders & Licenses -->
    <div class="admin-tabs-card">
      <n-tabs type="line" animated default-value="orders">
        <!-- Orders Tab -->
        <n-tab-pane name="orders" tab="订单管理">
          <div class="tab-content">
            <n-spin :show="ordersLoading">
              <template v-if="allOrders.length">
                <n-table :bordered="false" :single-line="false" size="small" class="admin-table">
                  <thead>
                    <tr>
                      <th class="w-[200px]">订单 ID</th>
                      <th>方案</th>
                      <th>状态</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in allOrders" :key="order.id">
                      <td><code class="order-id">{{ order.id.slice(0, 12) }}…</code></td>
                      <td>
                        <span class="order-tier">{{ tierLabel(order.tier) }}</span>
                        <span class="order-price-text">{{ tierPrice(order.tier) }}</span>
                      </td>
                      <td><n-tag :type="statusType(order.status)" size="small" round>{{ order.status }}</n-tag></td>
                      <td class="date-cell">{{ formatDate(order.createdAt) }}</td>
                      <td>
                        <n-select
                          v-if="order.status !== 'refunded'"
                          :value="statusMap[order.id]"
                          :options="statusOptions"
                          size="tiny"
                          class="!w-28"
                          @update:value="(v: string) => handleStatus(order.id, v)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </n-table>
              </template>
              <div v-else class="empty-tab">
                <svg class="empty-tab-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                <p>暂无订单</p>
              </div>
            </n-spin>
          </div>
        </n-tab-pane>

        <!-- Licenses Tab -->
        <n-tab-pane name="licenses" tab="License 管理">
          <div class="tab-content">
            <div class="licenses-toolbar">
              <span class="licenses-count">共 {{ allLicenses.length }} 个 License</span>
              <n-button type="primary" size="small" @click="openIssueModal">
                <template #icon>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                </template>
                签发 License
              </n-button>
            </div>
            <n-spin :show="licensesLoading">
              <template v-if="allLicenses.length">
                <n-table :bordered="false" :single-line="false" size="small" class="admin-table">
                  <thead>
                    <tr>
                      <th>License Key</th>
                      <th>方案</th>
                      <th>状态</th>
                      <th>绑定设备</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="lic in allLicenses" :key="lic.id">
                      <td>
                        <div class="key-cell">
                          <svg class="key-cell-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                          <code class="key-text">{{ lic.licenseKey.slice(0, 40) }}…</code>
                        </div>
                      </td>
                      <td><span class="text-sm" style="color:var(--text-primary)">{{ tierLabel(lic.tier) }}</span></td>
                      <td>
                        <n-tag v-if="lic.boundDevice" type="success" size="small" round>已激活</n-tag>
                        <n-tag v-else-if="lic.deactivatedAt" type="warning" size="small" round>已取消</n-tag>
                        <n-tag v-else type="default" size="small" round>未激活</n-tag>
                      </td>
                      <td class="device-cell">
                        <template v-if="lic.boundDevice">
                          <code class="device-fp">{{ lic.boundDevice.slice(0, 16) }}…</code>
                          <span class="device-os">· {{ lic.boundOs }}</span>
                        </template>
                        <span v-else class="device-none">—</span>
                      </td>
                      <td class="date-cell">{{ formatDate(lic.createdAt) }}</td>
                    </tr>
                  </tbody>
                </n-table>
              </template>
              <div v-else class="empty-tab">
                <svg class="empty-tab-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                <p>暂无 License</p>
              </div>
            </n-spin>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- Issue License Modal -->
    <n-modal v-model:show="showIssue">
      <n-card
        style="width: 440px"
        title="签发 License"
      >
        <n-form ref="issueFormRef" :model="issueForm" :rules="issueRules" label-placement="top">
          <n-form-item path="orderId" label="订单 ID">
            <n-input v-model:value="issueForm.orderId" placeholder="输入订单 UUID" />
          </n-form-item>
          <n-form-item path="tier" label="方案">
            <n-select v-model:value="issueForm.tier" :options="tierOptions" />
          </n-form-item>
          <div class="issue-hint">
            <p>签发后 License 将包含对应方案的全部功能列表，并附带 Ed25519 签名。</p>
          </div>
        </n-form>
        <template #footer>
          <div class="modal-footer">
            <n-button @click="showIssue = false">取消</n-button>
            <n-button type="primary" :loading="issuing" @click="handleIssue">确认签发</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { api } from '@/api';
import { useToast } from '@/stores/toast';

interface Order {
  id: string; userId: string; tier: string; status: string; createdAt: number; updatedAt: number;
}
interface License {
  id: number; orderId: string; licenseKey: string; tier: string; userId: string;
  boundDevice: string | null; boundOs: string | null; activatedAt: number | null;
  deactivatedAt: number | null; lastVerifiedAt: number | null; createdAt: number;
}

const allOrders = ref<Order[]>([]);
const allLicenses = ref<License[]>([]);
const ordersLoading = ref(true);
const licensesLoading = ref(true);
const statusMap = ref<Record<string, string>>({});

const stats = computed(() => ({
  totalOrders: allOrders.value.length,
  deliveredOrders: allOrders.value.filter(o => o.status === 'delivered').length,
  totalLicenses: allLicenses.value.length,
  activeLicenses: allLicenses.value.filter(l => l.boundDevice && !l.deactivatedAt).length,
}));

const showIssue = ref(false);
const issuing = ref(false);
const issueForm = reactive({ orderId: '', tier: 'desktop' });
const issueFormRef = ref<any>(null);
const issueRules = { orderId: [{ required: true, message: '请输入订单 ID' }] };
const toast = useToast();

watch(showIssue, (v) => {
  if (!v) { issueForm.orderId = ''; issueForm.tier = 'desktop'; }
});

const statusOptions = [
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已交付', value: 'delivered' },
  { label: '已退款', value: 'refunded' },
];
const tierOptions = [
  { label: 'Web — 免费', value: 'web' },
  { label: 'Desktop — $29/年', value: 'desktop' },
  { label: 'Pro — $79/年', value: 'pro' },
];

async function fetchOrders() {
  ordersLoading.value = true;
  try {
    const res = await api.get<{ orders: Order[] }>('/admin/orders');
    allOrders.value = res.orders;
    for (const o of res.orders) statusMap.value[o.id] = o.status;
  } catch { toast.error('加载订单失败'); }
  finally { ordersLoading.value = false; }
}

async function fetchLicenses() {
  licensesLoading.value = true;
  try {
    const res = await api.get<{ licenses: License[] }>('/admin/licenses');
    allLicenses.value = res.licenses;
  } catch { toast.error('加载 License 失败'); }
  finally { licensesLoading.value = false; }
}

async function handleStatus(orderId: string, status: string) {
  try { await api.patch(`/admin/orders/${orderId}`, { status }); toast.success('状态已更新'); } catch { toast.error('更新状态失败'); }
}

function openIssueModal() { showIssue.value = true; }

async function handleIssue() {
  try { await issueFormRef.value?.validate(); } catch { return; }
  issuing.value = true;
  try {
    await api.post('/admin/licenses/issue', { orderId: issueForm.orderId, tier: issueForm.tier });
    showIssue.value = false;
    issueForm.orderId = '';
    await fetchLicenses();
    toast.success('License 签发成功');
  } catch { toast.error('签发失败'); }
  finally { issuing.value = false; }
}

function statusType(s: string) {
  const m: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    delivered: 'success', paid: 'info', refunded: 'warning', pending: 'default',
  };
  return m[s] ?? 'default';
}
function tierLabel(t: string) { return { web: 'Web', desktop: 'Desktop', pro: 'Pro' }[t] ?? t; }
function tierPrice(t: string) { return { web: '免费', desktop: '$29/年', pro: '$79/年' }[t] ?? t; }
function formatDate(ts: number) { return new Date(ts).toLocaleDateString('zh-CN'); }

onMounted(() => { fetchOrders(); fetchLicenses(); });
</script>

<style scoped>
.admin-page { padding: 1.5rem; }

/* Header */
.admin-header { margin-bottom: 1.5rem; }
.admin-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.admin-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.125rem; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
@media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }

.stat-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem; border-radius: var(--radius-md);
  background: var(--bg-card); border: 1px solid var(--border-default);
  transition: border-color 0.15s;
}
.stat-card:hover { border-color: var(--border-strong); }
.stat-icon {
  width: 2.5rem; height: 2.5rem; border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon--blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.stat-icon--green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.stat-icon--purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.stat-icon--amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.dark .stat-icon--blue { color: #60a5fa; }
.dark .stat-icon--green { color: #34d399; }
.dark .stat-icon--purple { color: #a78bfa; }
.dark .stat-icon--amber { color: #fbbf24; }

.stat-value { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 0.75rem; color: var(--text-muted); }

/* Tabs card */
.admin-tabs-card {
  border-radius: var(--radius-lg);
  background: var(--bg-card); border: 1px solid var(--border-default);
}

/* Tab content */
.tab-content { padding: 1.25rem; }

/* Order table cells */
.order-id { font-size: 0.6875rem; color: var(--text-muted); }
.order-tier { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
.order-price-text { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.25rem; }
.date-cell { font-size: 0.75rem; color: var(--text-muted); }

/* License table cells */
.key-cell { display: flex; align-items: center; gap: 0.5rem; }
.key-cell-icon { width: 0.875rem; height: 0.875rem; flex-shrink: 0; color: var(--text-muted); }
.key-text {
  font-size: 0.6875rem; color: var(--text-muted);
  font-family: monospace; overflow: hidden; text-overflow: ellipsis; max-width: 240px; display: inline-block;
}

.device-cell { font-size: 0.75rem; color: var(--text-muted); }
.device-fp { font-size: 0.625rem; color: var(--text-muted); }
.device-os { color: var(--text-placeholder); margin-left: 0.25rem; }
.device-none { color: var(--text-placeholder); }

/* Licenses toolbar */
.licenses-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.licenses-count { font-size: 0.8125rem; color: var(--text-muted); }

/* Empty state inside tab */
.empty-tab { padding: 4rem 1rem; text-align: center; color: var(--text-placeholder); }
.empty-tab-icon { width: 2.5rem; height: 2.5rem; margin: 0 auto 0.75rem; opacity: 0.4; }

/* Table overrides */
:deep(.admin-table .n-data-table-th) {
  background: transparent !important;
  font-size: 0.6875rem !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.05em !important;
  color: var(--text-muted) !important; opacity: 0.6 !important;
  border-bottom: 1px solid var(--border-default) !important;
}
:deep(.admin-table .n-data-table-td) {
  border-bottom: 1px solid var(--border-subtle) !important;
  padding-top: 0.75rem !important; padding-bottom: 0.75rem !important;
}
:deep(.admin-table .n-data-table-tr:last-child .n-data-table-td) {
  border-bottom: 0 !important;
}

/* Modal */
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
.issue-hint {
  margin-top: 0.5rem; padding: 0.75rem; border-radius: var(--radius-md);
  background: var(--warning-soft); border: 1px solid rgba(217, 119, 6, 0.15);
}
.issue-hint p { font-size: 0.75rem; color: var(--warning); }
</style>
