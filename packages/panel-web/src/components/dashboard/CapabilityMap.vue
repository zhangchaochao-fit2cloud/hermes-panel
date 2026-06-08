<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

type CapabilityState = 'ready' | 'partial' | 'planned';

interface CapabilityItem {
  key: string;
  state: CapabilityState;
  route?: string;
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
      { key: 'tools', state: 'ready', route: '/tools' },
      { key: 'models', state: 'ready', route: '/settings#providers' },
      { key: 'gateway', state: 'ready', route: '/settings#system-health' },
      { key: 'memory', state: 'ready', route: '/memory' },
      { key: 'cron', state: 'ready', route: '/cron' },
      { key: 'files', state: 'ready', route: '/files' },
    ],
  },
  {
    key: 'panel',
    items: [
      { key: 'workspaces', state: 'ready', route: '/workspaces' },
      { key: 'goals', state: 'ready', route: '/goals' },
      { key: 'cost', state: 'ready', route: '/cost' },
      { key: 'developer', state: 'ready', route: '/developer' },
      { key: 'sandbox', state: 'ready', route: '/sandbox' },
      { key: 'channels', state: 'ready', route: '/channels' },
      { key: 'chatRoom', state: 'ready', route: '/chat-room' },
      { key: 'intent', state: 'ready', route: '/intent' },
    ],
  },
  {
    key: 'gaps',
    items: [
      { key: 'multiAgentControl', state: 'partial', route: '/goals' },
      { key: 'kanban', state: 'partial' },
      { key: 'approvalQueue', state: 'planned' },
      { key: 'terminalPanels', state: 'planned', route: '/sandbox' },
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
          <button
            v-for="item in section.items"
            :key="item.key"
            type="button"
            class="capability-item"
            :class="[statusClass(item.state), item.route ? 'can-open' : 'is-disabled']"
            :disabled="!item.route"
            @click="go(item.route)"
          >
            <span class="capability-dot" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-medium text-[var(--text-1)]">
                  {{ itemText(item, 'title') }}
                </span>
                <span class="capability-status">
                  {{ statusLabel(item.state) }}
                </span>
              </span>
              <span class="mt-1 block text-left text-xs leading-5 text-[var(--text-3)]">
                {{ itemText(item, 'desc') }}
              </span>
              <span class="mt-1 block text-left text-[11px] leading-4 text-[var(--text-2)]">
                {{ itemText(item, 'example') }}
              </span>
            </span>
          </button>
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

.capability-item {
  display: flex;
  width: 100%;
  min-height: 92px;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 11px;
  color: inherit;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.capability-item.can-open:hover {
  border-color: color-mix(in srgb, var(--brand-500) 44%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-card));
  transform: translateY(-1px);
}

.capability-item.is-disabled {
  cursor: default;
  opacity: 0.72;
}

.capability-dot {
  margin-top: 5px;
  height: 9px;
  width: 9px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--text-3);
}

.capability-item.is-ready .capability-dot {
  background: var(--color-success);
}

.capability-item.is-partial .capability-dot {
  background: var(--color-warning);
}

.capability-item.is-planned .capability-dot {
  background: var(--text-3);
}

.capability-status {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 2px 7px;
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.4;
}

.capability-item.is-ready .capability-status {
  border-color: color-mix(in srgb, var(--color-success) 40%, var(--border));
  color: var(--color-success);
}

.capability-item.is-partial .capability-status {
  border-color: color-mix(in srgb, var(--color-warning) 44%, var(--border));
  color: var(--color-warning);
}
</style>
