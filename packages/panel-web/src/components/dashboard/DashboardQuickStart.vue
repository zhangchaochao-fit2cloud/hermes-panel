<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { HealthStatus } from '@hermes-panel/shared';
import { useTaskDraft } from '@/composables/useTaskDraft';
import DashboardFirstRunPath from './DashboardFirstRunPath.vue';

type StepState = 'recommended' | 'ready' | 'attention';

interface QuickStartStep {
  key: string;
  route: string;
  state: StepState;
}

interface FirstRunAction {
  key: string;
  route: string;
  draftKey?: string;
}

const props = defineProps<{
  health: HealthStatus | null;
  loading: boolean;
}>();

const { t } = useI18n();
const router = useRouter();
const { openChatDraft } = useTaskDraft();

const hermesReady = computed(() => !!props.health?.hermes.running);
const needsSetup = computed(() => !props.loading && !hermesReady.value);

const steps = computed<QuickStartStep[]>(() => [
  {
    key: 'configure',
    route: '/settings#providers',
    state: needsSetup.value ? 'recommended' : 'ready',
  },
  {
    key: 'chat',
    route: '/chat',
    state: hermesReady.value ? 'recommended' : 'attention',
  },
  {
    key: 'channels',
    route: '/channels',
    state: 'ready',
  },
  {
    key: 'diagnose',
    route: needsSetup.value ? '/settings#system-health' : '/developer#doctor',
    state: needsSetup.value ? 'attention' : 'ready',
  },
]);

const firstRunActions: FirstRunAction[] = [
  {
    key: 'freeLocal',
    route: '/chat',
    draftKey: 'dashboard.quickStart.firstRun.freeLocal.prompt',
  },
  {
    key: 'cloudModel',
    route: '/settings#providers',
  },
  {
    key: 'conversation',
    route: '/chat-room',
  },
];

const summaryKey = computed(() => {
  if (props.loading) return 'checking';
  if (needsSetup.value) return 'needsSetup';
  return 'ready';
});

function go(route: string, draftKey?: string): void {
  if (draftKey) {
    void openChatDraft(t(draftKey));
    return;
  }
  void router.push(route);
}

function selectFirstRun(action: FirstRunAction): void {
  go(action.route, action.draftKey);
}
</script>

<template>
  <section class="quick-start rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-1)]">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('dashboard.quickStart.eyebrow') }}
        </p>
        <h2 class="mt-1 text-lg font-semibold text-[var(--text-1)]">
          {{ t('dashboard.quickStart.title') }}
        </h2>
        <p class="mt-1 text-sm leading-6 text-[var(--text-2)]">
          {{ t(`dashboard.quickStart.summary.${summaryKey}`) }}
        </p>
      </div>
      <div class="quick-start-status" :class="`is-${summaryKey}`">
        <span class="quick-start-pulse" aria-hidden="true" />
        <span>{{ t(`dashboard.quickStart.status.${summaryKey}`) }}</span>
      </div>
    </div>

    <DashboardFirstRunPath :actions="firstRunActions" @select="selectFirstRun" />

    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <button
        v-for="(step, index) in steps"
        :key="step.key"
        type="button"
        class="quick-start-step"
        :class="`is-${step.state}`"
        @click="go(step.route)"
      >
        <span class="step-index">{{ index + 1 }}</span>
        <span class="min-w-0 flex-1">
          <span class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold text-[var(--text-1)]">
              {{ t(`dashboard.quickStart.steps.${step.key}.title`) }}
            </span>
            <span class="step-state">
              {{ t(`dashboard.quickStart.state.${step.state}`) }}
            </span>
          </span>
          <span class="mt-1 block text-left text-xs leading-5 text-[var(--text-3)]">
            {{ t(`dashboard.quickStart.steps.${step.key}.desc`) }}
          </span>
          <span class="mt-3 inline-flex text-xs font-medium text-[var(--brand-600)]">
            {{ t(`dashboard.quickStart.steps.${step.key}.cta`) }}
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-start {
  contain: layout style;
}

.quick-start-status {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 7px 10px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.quick-start-pulse {
  height: 8px;
  width: 8px;
  border-radius: 999px;
  background: var(--text-3);
}

.quick-start-status.is-ready .quick-start-pulse {
  background: var(--color-success);
}

.quick-start-status.is-checking .quick-start-pulse {
  background: var(--color-warning);
}

.quick-start-status.is-needsSetup .quick-start-pulse {
  background: var(--color-error);
}

.quick-start-step {
  display: flex;
  min-height: 132px;
  width: 100%;
  gap: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 13px;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.quick-start-step:hover {
  border-color: color-mix(in srgb, var(--brand-500) 44%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-elevate));
  transform: translateY(-1px);
}

.step-index {
  display: inline-flex;
  height: 24px;
  width: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
}

.quick-start-step.is-recommended .step-index {
  background: var(--brand-500);
  color: white;
}

.quick-start-step.is-attention .step-index {
  background: color-mix(in srgb, var(--color-warning) 18%, var(--bg-card));
  color: var(--color-warning);
}

.step-state {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 2px 7px;
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.4;
}

.quick-start-step.is-recommended .step-state {
  border-color: color-mix(in srgb, var(--brand-500) 45%, var(--border));
  color: var(--brand-600);
}

.quick-start-step.is-attention .step-state {
  border-color: color-mix(in srgb, var(--color-warning) 45%, var(--border));
  color: var(--color-warning);
}
</style>
