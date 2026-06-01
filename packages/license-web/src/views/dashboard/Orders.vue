<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">我的订单</h1>
        <p class="page-desc">管理你的 License 订单</p>
      </div>
      <n-button type="primary" @click="showCreate = true">
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        </template>
        创建订单
      </n-button>
    </div>

    <n-spin :show="loading">
      <div v-if="orders.length" class="order-list">
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="flex items-center gap-3">
            <div class="order-icon" :class="order.tier === 'pro' ? 'order-icon--pro' : order.tier === 'desktop' ? 'order-icon--desktop' : ''">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="order-tier">{{ tierLabel(order.tier) }}</span>
                <n-tag :type="statusType(order.status)" size="tiny" round>{{ order.status }}</n-tag>
              </div>
              <div class="order-meta">
                <code>{{ order.id.slice(0, 12) }}…</code>
                <span>· {{ formatDate(order.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="order-price">{{ tierPrice(order.tier) }}</div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        </div>
        <p class="empty-title">暂无订单</p>
        <p class="empty-desc">创建订单以获取 License</p>
        <n-button size="small" class="mt-4" @click="showCreate = true">创建第一个订单</n-button>
      </div>
    </n-spin>

    <n-modal v-model:show="showCreate">
      <n-card style="width: 400px" title="创建订单">
        <div class="space-y-2">
          <div v-for="plan in tierPlans" :key="plan.value"
            class="tier-option" :class="{ 'tier-option--selected': newTier === plan.value }"
            @click="newTier = plan.value">
            <div>
              <div class="tier-option-label">{{ plan.label }}</div>
              <div class="tier-option-desc">{{ plan.desc }}</div>
            </div>
            <div class="tier-option-price">{{ plan.price }}</div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 mt-2">
            <n-button @click="showCreate = false">取消</n-button>
            <n-button type="primary" :loading="creating" @click="handleCreate">确认创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';
import { useToast } from '@/stores/toast';

interface Order { id: string; userId: string; tier: string; status: string; createdAt: number; updatedAt: number; }

const orders = ref<Order[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newTier = ref('desktop');
const toast = useToast();

const tierPlans = [
  { value: 'web', label: 'Web — 免费', price: '免费', desc: '基础功能' },
  { value: 'desktop', label: 'Desktop', price: '$29/年', desc: '高级功能' },
  { value: 'pro', label: 'Pro', price: '$79/年', desc: '全部功能' },
];

async function fetchOrders() {
  loading.value = true;
  try { const r = await api.get<{ orders: Order[] }>('/orders'); orders.value = r.orders; } catch { toast.error('加载订单失败'); }
  finally { loading.value = false; }
}
async function handleCreate() {
  creating.value = true;
  try { await api.post('/orders', { tier: newTier.value }); showCreate.value = false; await fetchOrders(); toast.success('订单创建成功'); } catch { toast.error('创建订单失败'); }
  finally { creating.value = false; }
}

function statusType(s: string) { const m: Record<string, 'success' | 'info' | 'warning' | 'default'> = { delivered: 'success', paid: 'info', refunded: 'warning', pending: 'default' }; return m[s] ?? 'default'; }
function tierLabel(t: string) { return { web: 'Web', desktop: 'Desktop', pro: 'Pro' }[t] ?? t; }
function tierPrice(t: string) { return { web: '免费', desktop: '$29/年', pro: '$79/年' }[t] ?? t; }
function formatDate(ts: number) { return new Date(ts).toLocaleDateString('zh-CN'); }

onMounted(fetchOrders);
</script>

<style scoped>
.page { padding: 1.5rem; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.page-desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.125rem; }

.order-list { display: flex; flex-direction: column; gap: 0.75rem; }
.order-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem; border-radius: var(--radius-md);
  background: var(--bg-card); border: 1px solid var(--border-default);
  transition: border-color 0.15s;
}
.order-card:hover { border-color: var(--border-strong); }
.order-icon {
  width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-active); color: var(--text-muted);
}
.order-icon--desktop { background: var(--accent-soft); color: var(--accent); }
.order-icon--pro { background: var(--accent-soft); color: #a78bfa; }
.order-tier { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
.order-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem; }
.order-price { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

.empty-state { text-align: center; padding: 5rem 1rem; }
.empty-icon {
  width: 3.5rem; height: 3.5rem; margin: 0 auto 1rem; border-radius: 1rem;
  background: var(--bg-active); display: flex; align-items: center; justify-content: center; color: var(--text-placeholder);
}
.empty-title { font-size: 0.875rem; color: var(--text-muted); }
.empty-desc { font-size: 0.75rem; color: var(--text-placeholder); margin-top: 0.25rem; }

.tier-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1rem; border-radius: var(--radius-md);
  border: 1px solid var(--border-default); cursor: pointer; transition: all 0.15s;
}
.tier-option:hover { border-color: var(--border-strong); }
.tier-option--selected { border-color: var(--accent); background: var(--accent-soft); }
.tier-option-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
.tier-option-desc { font-size: 0.75rem; color: var(--text-muted); }
.tier-option-price { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
</style>
