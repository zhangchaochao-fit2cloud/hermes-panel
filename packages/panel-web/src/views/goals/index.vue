<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { NButton, NInput, NModal, NTag, NPopconfirm, NSpin, useMessage, NProgress } from 'naive-ui';
import { bffFetch } from '@/api/bff';
import { useWorkspacesStore } from '@/stores/workspaces';
import { teamFor } from '@/data/roles';
import EmptyState from '@/components/shared/EmptyState.vue';

interface Goal {
  id: string; objective: string; scopeBoundary: string;
  doneWhen: string[]; stopIf: string[];
  tokenBudgetK: number; tokensUsed: number;
  turnBudget: number; turnsUsed: number;
  status: 'active' | 'paused' | 'budget_limited' | 'completed' | 'failed';
  auditLog: Array<{ turn: number; action: string; result: string; tokensThisTurn: number; timestamp: number }>;
  createdAt: number; updatedAt: number;
}

const msg = useMessage();
const workspaces = useWorkspacesStore();
const goals = ref<Goal[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const selectedGoal = ref<Goal | null>(null);

const form = ref({
  objective: '',
  scopeBoundary: '不要修改与目标无关的文件',
  doneWhen: '',
  stopIf: '',
  tokenBudgetK: '100',
  turnBudget: '8',
});

const roles = computed(() => workspaces.activeId ? teamFor(workspaces.activeId) : []);

onMounted(async () => { await fetchGoals(); });

async function fetchGoals(): Promise<void> {
  loading.value = true;
  try { goals.value = await bffFetch<Goal[]>('/api/goals'); }
  finally { loading.value = false; }
}

async function handleCreate(): Promise<void> {
  if (!form.value.objective) return;
  const doneWhen = String(form.value.doneWhen || '').split('\n').filter(Boolean);
  const stopIf = String(form.value.stopIf || '').split('\n').filter(Boolean);
  await bffFetch('/api/goals', {
    method: 'POST',
    body: JSON.stringify({ ...form.value, doneWhen, stopIf, tokenBudgetK: Number(form.value.tokenBudgetK)||100, turnBudget: Number(form.value.turnBudget)||8 }),
  });
  showCreate.value = false;
  form.value = { objective: '', scopeBoundary: '不要修改与目标无关的文件', doneWhen: '', stopIf: '', tokenBudgetK: '100', turnBudget: '8' };
  await fetchGoals();
  msg.success('目标已创建');
}

async function handlePause(id: string): Promise<void> {
  await bffFetch(`/api/goals/${id}/pause`, { method: 'POST' });
  await fetchGoals();
}

async function handleResume(id: string): Promise<void> {
  await bffFetch(`/api/goals/${id}/resume`, { method: 'POST' });
  await fetchGoals();
}

async function handleDelete(id: string): Promise<void> {
  await bffFetch(`/api/goals/${id}`, { method: 'DELETE' });
  await fetchGoals();
}

function selectGoal(g: Goal): void { selectedGoal.value = g; }

function statusColor(s: string): 'info' | 'warning' | 'error' | 'success' | 'default' {
  const map: Record<string, 'info' | 'warning' | 'error' | 'success' | 'default'> = { active: 'info', paused: 'warning', budget_limited: 'error', completed: 'success', failed: 'error' };
  return map[s] || 'default';
}
function statusLabel(s: string): string {
  const map: Record<string, string> = { active: '执行中', paused: '已暂停', budget_limited: '预算耗尽', completed: '已完成', failed: '失败' };
  return map[s] || s;
}

function budgetPct(g: Goal): number {
  return Math.min(100, Math.round((g.tokensUsed / (g.tokenBudgetK * 1000)) * 100));
}
</script>

<template>
  <div class="goals-page px-6 py-6 max-w-[1400px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-bold text-[var(--text-1)] mb-1">🎯 目标管理</h2>
        <p class="text-sm text-[var(--text-3)]">创建自主执行目标，设置预算和验收条件，让 AI 自己完成</p>
      </div>
      <NButton type="primary" @click="showCreate = true">+ 新建目标</NButton>
    </div>

    <!-- Goal Grid -->
    <NSpin v-if="loading" size="small" class="flex justify-center py-12" />
    <div v-else-if="goals.length === 0" class="py-16">
      <EmptyState title="还没有目标" description="创建一个目标，AI 将自动规划并执行，直到达成验收条件或预算耗尽" icon="🎯" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="g in goals"
        :key="g.id"
        class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 cursor-pointer hover:shadow-md transition-shadow"
        :class="g.status === 'active' ? 'border-[color-mix(in_srgb,var(--brand-500)_30%,var(--border))]' : ''"
        @click="selectGoal(g)"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="text-sm font-semibold text-[var(--text-1)] line-clamp-2 flex-1 mr-2">{{ g.objective }}</h3>
          <NTag :type="statusColor(g.status)" size="tiny">{{ statusLabel(g.status) }}</NTag>
        </div>

        <!-- Budget bar -->
        <div class="mb-3">
          <div class="flex justify-between text-[10px] text-[var(--text-3)] mb-1">
            <span>Token 预算</span>
            <span>{{ (g.tokensUsed / 1000).toFixed(1) }}K / {{ g.tokenBudgetK }}K</span>
          </div>
          <NProgress
            :percentage="budgetPct(g)"
            :color="budgetPct(g) > 80 ? '#ef4444' : '#6366f1'"
            :height="6"
            :border-radius="3"
            :show-indicator="false"
          />
        </div>

        <div class="flex items-center gap-4 text-xs text-[var(--text-3)]">
          <span>轮次 {{ g.turnsUsed }}/{{ g.turnBudget || '∞' }}</span>
          <span>{{ g.auditLog.length }} 条审计</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <NButton v-if="g.status === 'active'" size="tiny" @click.stop="handlePause(g.id)">⏸ 暂停</NButton>
          <NButton v-if="g.status === 'paused'" size="tiny" type="primary" @click.stop="handleResume(g.id)">▶ 继续</NButton>
          <NPopconfirm @positive-click="handleDelete(g.id)">
            <template #trigger><NButton size="tiny" type="error" @click.stop>删除</NButton></template>
            确定删除此目标？
          </NPopconfirm>
        </div>
      </div>
    </div>

    <!-- Detail modal -->
    <NModal :show="!!selectedGoal" @update:show="selectedGoal = null">
      <div v-if="selectedGoal" class="goal-detail">
        <h3 class="text-base font-bold text-[var(--text-1)] mb-1">{{ selectedGoal.objective }}</h3>
        <NTag :type="statusColor(selectedGoal.status)" size="small" class="mb-3">{{ statusLabel(selectedGoal.status) }}</NTag>

        <div class="space-y-2 text-sm">
          <p><span class="text-[var(--text-3)]">范围限制:</span> {{ selectedGoal.scopeBoundary }}</p>
          <div v-if="selectedGoal.doneWhen.length">
            <p class="text-[var(--text-3)] mb-1">验收条件:</p>
            <ul class="list-disc list-inside text-[var(--text-2)]">
              <li v-for="(d, i) in selectedGoal.doneWhen" :key="i">{{ d }}</li>
            </ul>
          </div>
          <div v-if="selectedGoal.stopIf.length">
            <p class="text-[var(--text-3)] mb-1">停止条件:</p>
            <ul class="list-disc list-inside text-[var(--text-2)]">
              <li v-for="(s, i) in selectedGoal.stopIf" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>

        <!-- Audit trail -->
        <div v-if="selectedGoal.auditLog.length" class="mt-4 pt-4 border-t border-[var(--border)]">
          <p class="text-sm font-semibold text-[var(--text-1)] mb-2">审计记录</p>
          <div class="max-h-[300px] overflow-y-auto space-y-2">
            <div v-for="a in selectedGoal.auditLog" :key="a.turn" class="text-xs p-2 rounded-lg bg-[var(--bg-elevate)]">
              <div class="flex justify-between text-[var(--text-3)] mb-1">
                <span class="font-semibold">第 {{ a.turn }} 轮</span>
                <span>{{ a.tokensThisTurn.toLocaleString() }} tokens</span>
              </div>
              <p class="text-[var(--text-2)] font-medium">{{ a.action.slice(0, 200) }}</p>
              <p class="text-[var(--text-3)] mt-0.5">{{ a.result.slice(0, 200) }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-4 justify-end">
          <NButton v-if="selectedGoal.status === 'active'" size="small" @click="handlePause(selectedGoal.id)">暂停</NButton>
          <NButton v-if="selectedGoal.status === 'paused'" size="small" type="primary" @click="handleResume(selectedGoal.id)">继续</NButton>
          <NButton size="small" @click="selectedGoal = null">关闭</NButton>
        </div>
      </div>
    </NModal>

    <!-- Create modal -->
    <NModal :show="showCreate" @update:show="showCreate = $event">
      <div class="goal-create-modal">
        <h3 class="text-base font-bold mb-4">新建目标</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">目标描述 *</label>
            <NInput v-model:value="form.objective" placeholder="一句话描述要达成的目标" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">范围限制</label>
            <NInput v-model:value="form.scopeBoundary" placeholder="不要修改与目标无关的文件" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">Token 预算 (K)</label>
              <NInput v-model:value="form.tokenBudgetK" />
            </div>
            <div>
              <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">回合上限</label>
              <NInput v-model:value="form.turnBudget" />
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">验收条件 (每行一个)</label>
            <NInput v-model:value="form.doneWhen" type="textarea" placeholder="所有测试通过&#10;PR 已合并&#10;无 lint 错误" :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
          <div>
            <label class="text-xs font-semibold text-[var(--text-2)] mb-1 block">停止条件 (每行一个)</label>
            <NInput v-model:value="form.stopIf" type="textarea" placeholder="超过 30 分钟&#10;发现安全问题" :autosize="{ minRows: 2, maxRows: 4 }" />
          </div>
          <div v-if="roles.length" class="text-xs text-[var(--text-3)]">
            可用角色: <span class="text-[var(--brand-600)]">{{ roles.map(r => r.icon + ' ' + r.name).join(', ') }}</span>
          </div>
        </div>
        <div class="flex gap-2 mt-4 justify-end">
          <NButton @click="showCreate = false">取消</NButton>
          <NButton type="primary" :disabled="!form.objective" @click="handleCreate">创建目标</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.goals-page { min-height: calc(100vh - 140px); }
.goal-detail { background: var(--bg-card); border-radius: 16px; padding: 24px; width: 560px; max-height: 80vh; overflow-y: auto; }
.goal-create-modal { background: var(--bg-card); border-radius: 16px; padding: 24px; width: 500px; max-height: 80vh; overflow-y: auto; }
</style>
