<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import CapabilityMapItem from './CapabilityMapItem.vue';

type CapabilityState = 'ready' | 'partial' | 'planned';

interface CapabilityItem {
  key: string;
  state: CapabilityState;
  route?: string;
  useRoute?: string;
  promptKey?: string;
  pendingKey?: 'panel.pendingGoalObjective' | 'panel.pendingCronPrompt' | 'panel.pendingRoomPrompt';
}

interface CapabilitySection {
  key: string;
  items: CapabilityItem[];
}

const { t } = useI18n();
const router = useRouter();

const sections: CapabilitySection[] = [
  {
    key: 'cli',
    items: [
      { key: 'chat', state: 'ready', route: '/chat' },
      { key: 'sessions', state: 'ready', route: '/sessions' },
      { key: 'tools', state: 'ready', route: '/tools', useRoute: '/chat', promptKey: 'dashboard.capabilityMap.prompts.tools' },
      { key: 'models', state: 'ready', route: '/settings#providers', useRoute: '/settings#providers' },
      { key: 'gateway', state: 'ready', route: '/settings#system-health' },
      { key: 'cliParity', state: 'ready', route: '/developer#cli-parity' },
      { key: 'memory', state: 'ready', route: '/memory', useRoute: '/chat', promptKey: 'dashboard.capabilityMap.prompts.memory' },
      { key: 'cron', state: 'ready', route: '/cron', useRoute: '/cron', promptKey: 'dashboard.capabilityMap.prompts.cron', pendingKey: 'panel.pendingCronPrompt' },
      { key: 'files', state: 'ready', route: '/files' },
    ],
  },
  {
    key: 'panel',
    items: [
      { key: 'workspaces', state: 'ready', route: '/workspaces' },
      { key: 'goals', state: 'ready', route: '/goals', useRoute: '/goals', promptKey: 'dashboard.capabilityMap.prompts.goals', pendingKey: 'panel.pendingGoalObjective' },
      { key: 'cost', state: 'ready', route: '/cost', useRoute: '/chat', promptKey: 'dashboard.capabilityMap.prompts.cost' },
      { key: 'developer', state: 'ready', route: '/developer' },
      { key: 'sandbox', state: 'ready', route: '/sandbox' },
      { key: 'channels', state: 'ready', route: '/channels' },
      { key: 'chatRoom', state: 'ready', route: '/chat-room', useRoute: '/chat-room', promptKey: 'dashboard.capabilityMap.prompts.chatRoom', pendingKey: 'panel.pendingRoomPrompt' },
      { key: 'intent', state: 'ready', route: '/intent' },
    ],
  },
  {
    key: 'gaps',
    items: [
      { key: 'multiAgentControl', state: 'partial', route: '/goals' },
      { key: 'kanban', state: 'partial' },
      { key: 'approvalQueue', state: 'planned' },
      { key: 'terminalPanels', state: 'planned', route: '/sandbox', useRoute: '/sandbox' },
    ],
  },
];

const totals = computed(() => {
  const all = sections.flatMap(section => section.items);
  return {
    ready: all.filter(item => item.state === 'ready').length,
    partial: all.filter(item => item.state === 'partial').length,
    planned: all.filter(item => item.state === 'planned').length,
  };
});

function statusClass(state: CapabilityState): string {
  if (state === 'ready') return 'is-ready';
  if (state === 'partial') return 'is-partial';
  return 'is-planned';
}

function statusLabel(state: CapabilityState): string {
  return t(`dashboard.capabilityMap.status.${state}`);
}

function itemText(item: CapabilityItem, field: 'title' | 'desc' | 'example'): string {
  return t(`dashboard.capabilityMap.items.${item.key}.${field}`);
}

function sectionText(section: CapabilitySection, field: 'title' | 'desc'): string {
  return t(`dashboard.capabilityMap.sections.${section.key}.${field}`);
}

function go(route?: string): void {
  if (!route) return;
  void router.push(route);
}

function useCapability(item: CapabilityItem): void {
  if (!item.useRoute) {
    go(item.route);
    return;
  }
  if (item.promptKey) {
    const prompt = t(item.promptKey);
    try {
      if (item.pendingKey) sessionStorage.setItem(item.pendingKey, prompt);
      else localStorage.setItem('panel.chat.draft.new', prompt);
    } catch {
      /* route still works when storage is unavailable */
    }
  }
  if (item.useRoute === '/chat') {
    void router.push({ path: '/chat', query: { new: String(Date.now()) } });
    return;
  }
  go(item.useRoute);
}
</script>

<template>
  <section class="capability-map rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-1)]">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ t('dashboard.capabilityMap.eyebrow') }}
        </p>
        <h2 class="mt-1 text-lg font-semibold text-[var(--text-1)]">
          {{ t('dashboard.capabilityMap.title') }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-2)]">
          {{ t('dashboard.capabilityMap.desc') }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="capability-stat">
          <strong>{{ totals.ready }}</strong>
          <span>{{ t('dashboard.capabilityMap.status.ready') }}</span>
        </div>
        <div class="capability-stat">
          <strong>{{ totals.partial }}</strong>
          <span>{{ t('dashboard.capabilityMap.status.partial') }}</span>
        </div>
        <div class="capability-stat">
          <strong>{{ totals.planned }}</strong>
          <span>{{ t('dashboard.capabilityMap.status.planned') }}</span>
        </div>
      </div>
    </header>

    <div class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article
        v-for="section in sections"
        :key="section.key"
        class="capability-section"
      >
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-[var(--text-1)]">
            {{ sectionText(section, 'title') }}
          </h3>
          <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
            {{ sectionText(section, 'desc') }}
          </p>
        </div>

        <div class="space-y-2">
          <CapabilityMapItem
            v-for="item in section.items"
            :key="item.key"
            :state="item.state"
            :title="itemText(item, 'title')"
            :description="itemText(item, 'desc')"
            :example="itemText(item, 'example')"
            :status-label="statusLabel(item.state)"
            :status-class="statusClass(item.state)"
            :can-open="Boolean(item.route)"
            :can-use="Boolean(item.useRoute)"
            :open-label="t('dashboard.capabilityMap.open')"
            :use-label="t('dashboard.capabilityMap.use')"
            @open="go(item.route)"
            @use="useCapability(item)"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.capability-map {
  contain: layout style;
}

.capability-stat {
  min-width: 72px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 10px 12px;
}

.capability-stat strong,
.capability-stat span {
  display: block;
}

.capability-stat strong {
  color: var(--text-1);
  font-size: 20px;
  line-height: 1.1;
}

.capability-stat span {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 11px;
}

.capability-section {
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: color-mix(in srgb, var(--bg-elevate) 72%, transparent);
  padding: 14px;
}

</style>
