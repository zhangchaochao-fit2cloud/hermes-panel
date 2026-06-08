<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

type Coverage = 'ready' | 'partial' | 'missing';
type Group = 'core' | 'ops' | 'config' | 'extensions' | 'advanced';

interface CliCommand {
  command: string;
  group: Group;
  coverage: Coverage;
  route?: string;
  example: string;
}

const { t } = useI18n();
const router = useRouter();
const query = ref('');
const coverageFilter = ref<Coverage | 'all'>('all');

const commands: CliCommand[] = [
  { command: 'chat', group: 'core', coverage: 'ready', route: '/chat', example: 'hermes chat -q "Summarize this repo"' },
  { command: 'model', group: 'config', coverage: 'ready', route: '/settings#providers', example: 'hermes model' },
  { command: 'gateway', group: 'ops', coverage: 'ready', route: '/settings#system-health', example: 'hermes gateway run' },
  { command: 'setup', group: 'config', coverage: 'partial', route: '/settings#system-health', example: 'hermes setup' },
  { command: 'whatsapp', group: 'ops', coverage: 'partial', route: '/channels', example: 'hermes whatsapp' },
  { command: 'login', group: 'config', coverage: 'partial', route: '/settings#providers', example: 'hermes login openai' },
  { command: 'logout', group: 'config', coverage: 'partial', route: '/settings#providers', example: 'hermes logout openai' },
  { command: 'auth', group: 'config', coverage: 'ready', route: '/settings#providers', example: 'hermes auth list' },
  { command: 'status', group: 'ops', coverage: 'ready', route: '/settings#system-health', example: 'hermes status' },
  { command: 'cron', group: 'core', coverage: 'ready', route: '/cron', example: 'hermes cron list' },
  { command: 'webhook', group: 'ops', coverage: 'ready', route: '/developer#webhook', example: 'hermes webhook list' },
  { command: 'doctor', group: 'ops', coverage: 'ready', route: '/developer#doctor', example: 'hermes doctor' },
  { command: 'dump', group: 'ops', coverage: 'partial', route: '/developer#doctor', example: 'hermes dump' },
  { command: 'debug', group: 'ops', coverage: 'partial', route: '/developer#logs', example: 'hermes debug share' },
  { command: 'backup', group: 'ops', coverage: 'ready', route: '/settings#backup', example: 'hermes backup' },
  { command: 'import', group: 'ops', coverage: 'ready', route: '/settings#backup', example: 'hermes import backup.zip' },
  { command: 'config', group: 'config', coverage: 'partial', route: '/settings', example: 'hermes config set model gpt-4' },
  { command: 'pairing', group: 'ops', coverage: 'partial', route: '/channels', example: 'hermes pairing list' },
  { command: 'skills', group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes skills list' },
  { command: 'plugins', group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes plugins list' },
  { command: 'memory', group: 'core', coverage: 'ready', route: '/memory', example: 'hermes memory' },
  { command: 'tools', group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes tools list' },
  { command: 'mcp', group: 'extensions', coverage: 'ready', route: '/tools', example: 'hermes mcp list' },
  { command: 'sessions', group: 'core', coverage: 'ready', route: '/sessions', example: 'hermes sessions list' },
  { command: 'insights', group: 'advanced', coverage: 'partial', route: '/cost', example: 'hermes insights' },
  { command: 'claw', group: 'advanced', coverage: 'missing', example: 'hermes claw --help' },
  { command: 'version', group: 'ops', coverage: 'ready', route: '/settings#about', example: 'hermes version' },
  { command: 'update', group: 'ops', coverage: 'missing', example: 'hermes update' },
  { command: 'uninstall', group: 'ops', coverage: 'missing', example: 'hermes uninstall' },
  { command: 'acp', group: 'advanced', coverage: 'missing', example: 'hermes acp' },
  { command: 'profile', group: 'config', coverage: 'ready', route: '/workspaces', example: 'hermes profile list' },
  { command: 'completion', group: 'advanced', coverage: 'missing', example: 'hermes completion zsh' },
  { command: 'logs', group: 'ops', coverage: 'ready', route: '/developer#logs', example: 'hermes logs --since 1h' },
];

const groups: Group[] = ['core', 'config', 'extensions', 'ops', 'advanced'];
const coverages: Coverage[] = ['ready', 'partial', 'missing'];

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return commands.filter((cmd) => {
    if (coverageFilter.value !== 'all' && cmd.coverage !== coverageFilter.value) return false;
    if (!q) return true;
    return `${cmd.command} ${cmd.example} ${t(`developer.cliParity.items.${cmd.command}`)}`.toLowerCase().includes(q);
  });
});

const grouped = computed(() =>
  groups
    .map(group => ({
      group,
      commands: filtered.value.filter(cmd => cmd.group === group),
    }))
    .filter(section => section.commands.length > 0),
);

const totals = computed(() => ({
  all: commands.length,
  ready: commands.filter(cmd => cmd.coverage === 'ready').length,
  partial: commands.filter(cmd => cmd.coverage === 'partial').length,
  missing: commands.filter(cmd => cmd.coverage === 'missing').length,
}));

function coverageClass(coverage: Coverage): string {
  if (coverage === 'ready') return 'is-ready';
  if (coverage === 'partial') return 'is-partial';
  return 'is-missing';
}

function go(route?: string): void {
  if (!route) return;
  void router.push(route);
}
</script>

<template>
  <div class="cli-parity flex flex-col gap-4">
    <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
            {{ t('developer.cliParity.eyebrow') }}
          </p>
          <h2 class="mt-1 text-base font-semibold text-[var(--text-1)]">
            {{ t('developer.cliParity.title') }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-[var(--text-3)]">
            {{ t('developer.cliParity.desc') }}
          </p>
          <pre class="mt-3 inline-flex rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1 text-xs text-[var(--text-2)]">hermes --help</pre>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center">
          <button class="cli-count" type="button" @click="coverageFilter = 'all'">
            <strong>{{ totals.all }}</strong>
            <span>{{ t('developer.cliParity.coverage.all') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'ready'">
            <strong>{{ totals.ready }}</strong>
            <span>{{ t('developer.cliParity.coverage.ready') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'partial'">
            <strong>{{ totals.partial }}</strong>
            <span>{{ t('developer.cliParity.coverage.partial') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'missing'">
            <strong>{{ totals.missing }}</strong>
            <span>{{ t('developer.cliParity.coverage.missing') }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4 md:flex-row md:items-center md:justify-between">
      <label class="min-w-0 flex-1">
        <span class="sr-only">{{ t('developer.cliParity.search') }}</span>
        <input
          v-model="query"
          class="cli-search"
          type="search"
          :placeholder="t('developer.cliParity.search')"
        >
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="filter-chip"
          :class="coverageFilter === 'all' ? 'is-active' : ''"
          @click="coverageFilter = 'all'"
        >
          {{ t('developer.cliParity.coverage.all') }}
        </button>
        <button
          v-for="coverage in coverages"
          :key="coverage"
          type="button"
          class="filter-chip"
          :class="coverageFilter === coverage ? 'is-active' : ''"
          @click="coverageFilter = coverage"
        >
          {{ t(`developer.cliParity.coverage.${coverage}`) }}
        </button>
      </div>
    </section>

    <section
      v-for="section in grouped"
      :key="section.group"
      class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
    >
      <header class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-[var(--text-1)]">
            {{ t(`developer.cliParity.groups.${section.group}`) }}
          </h3>
          <p class="mt-1 text-xs text-[var(--text-3)]">
            {{ t('developer.cliParity.groupCount', { n: section.commands.length }) }}
          </p>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <article
          v-for="cmd in section.commands"
          :key="cmd.command"
          class="cli-command"
          :class="coverageClass(cmd.coverage)"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <code class="command-name">hermes {{ cmd.command }}</code>
              <span class="coverage-badge">
                {{ t(`developer.cliParity.coverage.${cmd.coverage}`) }}
              </span>
            </div>
            <p class="mt-2 text-xs leading-5 text-[var(--text-3)]">
              {{ t(`developer.cliParity.items.${cmd.command}`) }}
            </p>
            <pre class="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-xs text-[var(--text-2)]">{{ cmd.example }}</pre>
          </div>
          <button
            type="button"
            class="open-button"
            :disabled="!cmd.route"
            @click="go(cmd.route)"
          >
            {{ cmd.route ? t('developer.cliParity.open') : t('developer.cliParity.noUi') }}
          </button>
        </article>
      </div>
    </section>

    <section
      v-if="grouped.length === 0"
      class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-8 text-center text-sm text-[var(--text-3)]"
    >
      {{ t('developer.cliParity.empty') }}
    </section>
  </div>
</template>

<style scoped>
.cli-count {
  min-width: 72px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 9px 10px;
}

.cli-count strong,
.cli-count span {
  display: block;
}

.cli-count strong {
  color: var(--text-1);
  font-size: 18px;
  line-height: 1.1;
}

.cli-count span {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 11px;
}

.cli-search {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-1);
  font-size: 13px;
  line-height: 20px;
  outline: none;
  padding: 8px 10px;
}

.cli-search:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-500) 18%, transparent);
}

.filter-chip {
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-2);
  font-size: 12px;
  line-height: 18px;
  padding: 6px 10px;
}

.filter-chip.is-active {
  border-color: color-mix(in srgb, var(--brand-500) 52%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-elevate));
  color: var(--brand-600);
}

.cli-command {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 126px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 12px;
}

.command-name {
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-1);
  font-size: 12px;
  padding: 3px 7px;
}

.coverage-badge {
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11px;
  line-height: 16px;
  padding: 2px 7px;
}

.cli-command.is-ready .coverage-badge {
  border-color: color-mix(in srgb, var(--color-success) 46%, var(--border));
  color: var(--color-success);
}

.cli-command.is-partial .coverage-badge {
  border-color: color-mix(in srgb, var(--color-warning) 46%, var(--border));
  color: var(--color-warning);
}

.cli-command.is-missing .coverage-badge {
  border-color: color-mix(in srgb, var(--color-error) 40%, var(--border));
  color: var(--color-error);
}

.open-button {
  align-self: start;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 6px 9px;
}

.open-button:disabled {
  border-color: var(--border);
  background: var(--bg-card);
  color: var(--text-3);
  cursor: default;
}
</style>
