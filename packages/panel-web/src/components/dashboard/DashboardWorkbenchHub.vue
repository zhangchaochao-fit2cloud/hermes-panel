<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { HealthStatus } from '@hermes-panel/shared';
import StatusBadge from '@/components/shared/StatusBadge.vue';
import GatewayControl from '@/components/shared/GatewayControl.vue';

type ActionTone = 'primary' | 'setup' | 'agent';
type ReadinessState = 'ready' | 'action' | 'checking';

interface HubAction {
  key: string;
  route: string;
  tone: ActionTone;
  draftKey?: string;
  forceNewChat?: boolean;
}

interface ReadinessItem {
  key: string;
  state: ReadinessState;
  route: string;
}

interface ModeItem {
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

const hermesReady = computed(() => !!props.health?.hermes.running);
const healthState = computed<'connected' | 'connecting' | 'disconnected' | 'unknown'>(() => {
  if (props.loading) return 'connecting';
  if (!props.health) return 'unknown';
  return hermesReady.value ? 'connected' : 'disconnected';
});
const healthLabel = computed(() => {
  if (props.loading) return t('status.connecting');
  if (!props.health) return t('status.connecting');
  return hermesReady.value
    ? `Hermes ${props.health.hermes.version ?? ''}`.trim()
    : t('error.hermes_not_found');
});

const primaryActions: HubAction[] = [
  {
    key: 'chat',
    route: '/chat',
    tone: 'primary',
    draftKey: 'dashboard.workbench.actions.chat.prompt',
    forceNewChat: true,
  },
  {
    key: 'freeModel',
    route: '/settings#providers',
    tone: 'setup',
  },
  {
    key: 'goal',
    route: '/goals',
    tone: 'agent',
  },
];

const readiness = computed<ReadinessItem[]>(() => [
  {
    key: 'cli',
    state: props.loading ? 'checking' : hermesReady.value ? 'ready' : 'action',
    route: '/settings#system-health',
  },
  {
    key: 'model',
    state: props.loading ? 'checking' : hermesReady.value ? 'ready' : 'action',
    route: '/settings#providers',
  },
  {
    key: 'parity',
    state: 'ready',
    route: '/developer#cli-parity',
  },
]);

const modes: ModeItem[] = [
  {
    key: 'direct',
    route: '/chat',
    draftKey: 'dashboard.workbench.modes.direct.prompt',
  },
  {
    key: 'team',
    route: '/chat-room',
  },
  {
    key: 'automation',
    route: '/cron',
  },
  {
    key: 'developer',
    route: '/developer#cli-parity',
  },
];

function writeDraft(draftKey?: string): void {
  if (!draftKey) return;
  try {
    localStorage.setItem('panel.chat.draft.new', t(draftKey));
  } catch {
    /* navigation still works when storage is unavailable */
  }
}

function go(action: HubAction | ModeItem | ReadinessItem): void {
  writeDraft('draftKey' in action ? action.draftKey : undefined);
  if ('forceNewChat' in action && action.forceNewChat) {
    void router.push({ path: action.route, query: { new: String(Date.now()) } });
    return;
  }
  void router.push(action.route);
}
</script>

<template>
  <section class="workbench-hub">
    <div class="workbench-main">
      <div class="min-w-0">
        <p class="workbench-eyebrow">{{ t('dashboard.workbench.eyebrow') }}</p>
        <h1 class="workbench-title">{{ t('dashboard.workbench.title') }}</h1>
        <p class="workbench-desc">{{ t('dashboard.workbench.desc') }}</p>
      </div>

      <div class="workbench-status-row">
        <StatusBadge :state="healthState" :label="healthLabel" />
        <GatewayControl />
      </div>
    </div>

    <div class="workbench-actions">
      <button
        v-for="action in primaryActions"
        :key="action.key"
        type="button"
        class="workbench-action"
        :class="`is-${action.tone}`"
        @click="go(action)"
      >
        <span class="action-title">{{ t(`dashboard.workbench.actions.${action.key}.title`) }}</span>
        <span class="action-desc">{{ t(`dashboard.workbench.actions.${action.key}.desc`) }}</span>
        <span class="action-cta">{{ t(`dashboard.workbench.actions.${action.key}.cta`) }}</span>
      </button>
    </div>

    <div class="workbench-lower">
      <div class="readiness-panel">
        <div class="panel-heading">
          <p>{{ t('dashboard.workbench.readiness.title') }}</p>
          <span>{{ t('dashboard.workbench.readiness.subtitle') }}</span>
        </div>
        <button
          v-for="item in readiness"
          :key="item.key"
          type="button"
          class="readiness-item"
          :class="`is-${item.state}`"
          @click="go(item)"
        >
          <span class="readiness-dot" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="readiness-title">{{ t(`dashboard.workbench.readiness.${item.key}.title`) }}</span>
            <span class="readiness-desc">{{ t(`dashboard.workbench.readiness.${item.key}.desc`) }}</span>
          </span>
          <span class="readiness-state">{{ t(`dashboard.workbench.state.${item.state}`) }}</span>
        </button>
      </div>

      <div class="mode-panel">
        <div class="panel-heading">
          <p>{{ t('dashboard.workbench.modes.title') }}</p>
          <span>{{ t('dashboard.workbench.modes.subtitle') }}</span>
        </div>
        <div class="mode-grid">
          <button
            v-for="mode in modes"
            :key="mode.key"
            type="button"
            class="mode-item"
            @click="go(mode)"
          >
            <span class="mode-title">{{ t(`dashboard.workbench.modes.${mode.key}.title`) }}</span>
            <span class="mode-desc">{{ t(`dashboard.workbench.modes.${mode.key}.desc`) }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./DashboardWorkbenchHub.css"></style>
