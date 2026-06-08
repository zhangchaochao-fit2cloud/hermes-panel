<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type {
  CliCommandCoverage,
  CliCommandGroup,
  CliCommandHelpResponse,
  CliCommandInventoryItem,
  CliCommandInventoryResponse,
} from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import CodeBlock from '@/components/shared/CodeBlock.vue';

const { t, te, locale } = useI18n();
const router = useRouter();
const query = ref('');
const coverageFilter = ref<CliCommandCoverage | 'all'>('all');
const commands = ref<CliCommandInventoryItem[]>([]);
const source = ref('hermes --help');
const generatedAt = ref<number | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedHelpCommand = ref<string | null>(null);
const commandHelp = ref<CliCommandHelpResponse | null>(null);
const commandHelpLoading = ref(false);
const commandHelpError = ref<string | null>(null);

const groups: CliCommandGroup[] = ['core', 'config', 'extensions', 'ops', 'advanced'];
const coverages: CliCommandCoverage[] = ['ready', 'partial', 'missing'];

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return commands.value.filter((cmd) => {
    if (coverageFilter.value !== 'all' && cmd.coverage !== coverageFilter.value) return false;
    if (!q) return true;
    return `${cmd.command} ${cmd.description} ${cmd.example} ${descriptionFor(cmd)}`.toLowerCase().includes(q);
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
  all: commands.value.length,
  ready: commands.value.filter(cmd => cmd.coverage === 'ready').length,
  partial: commands.value.filter(cmd => cmd.coverage === 'partial').length,
  missing: commands.value.filter(cmd => cmd.coverage === 'missing').length,
}));

const generatedAtLabel = computed(() => {
  if (generatedAt.value === null) return '';
  return new Date(generatedAt.value).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const commandHelpGeneratedAtLabel = computed(() => {
  if (!commandHelp.value) return '';
  return new Date(commandHelp.value.generatedAt).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const commandHelpOutput = computed(() => commandHelp.value?.stdout.trimEnd() ?? '');

function coverageClass(coverage: CliCommandCoverage): string {
  if (coverage === 'ready') return 'is-ready';
  if (coverage === 'partial') return 'is-partial';
  return 'is-missing';
}

function descriptionFor(cmd: CliCommandInventoryItem): string {
  const key = `developer.cliParity.items.${cmd.command}`;
  return te(key) ? t(key) : cmd.description;
}

function go(route?: string): void {
  if (!route) return;
  void router.push(route);
}

async function loadCommandHelp(command: string): Promise<void> {
  selectedHelpCommand.value = command;
  commandHelp.value = null;
  commandHelpError.value = null;
  commandHelpLoading.value = true;
  try {
    const data = await bffFetch<CliCommandHelpResponse>(`/api/cli/commands/${encodeURIComponent(command)}/help`);
    commandHelp.value = data;
    commandHelpError.value = data.error ?? null;
  } catch (err) {
    commandHelpError.value = (err as Error).message ?? String(err);
  } finally {
    commandHelpLoading.value = false;
  }
}

async function loadInventory(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const data = await bffFetch<CliCommandInventoryResponse>('/api/cli/commands');
    commands.value = data.commands;
    source.value = data.source;
    generatedAt.value = data.generatedAt;
    error.value = data.error ?? null;
  } catch (err) {
    commands.value = [];
    generatedAt.value = Date.now();
    error.value = (err as Error).message ?? String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadInventory();
});
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
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <pre class="inline-flex rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1 text-xs text-[var(--text-2)]">{{ source }}</pre>
            <span v-if="generatedAtLabel" class="text-xs text-[var(--text-3)]">
              {{ t('developer.cliParity.lastUpdated', { time: generatedAtLabel }) }}
            </span>
            <button
              type="button"
              class="reload-button"
              :disabled="loading"
              @click="loadInventory"
            >
              {{ loading ? t('developer.cliParity.loading') : t('developer.cliParity.reload') }}
            </button>
          </div>
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
      v-if="error"
      class="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]"
    >
      {{ t('developer.cliParity.error', { error }) }}
    </section>

    <section
      v-if="loading && commands.length === 0"
      class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-8 text-center text-sm text-[var(--text-3)]"
    >
      {{ t('developer.cliParity.loading') }}
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
              {{ descriptionFor(cmd) }}
            </p>
            <pre class="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-xs text-[var(--text-2)]">{{ cmd.example }}</pre>
          </div>
          <div class="command-actions">
            <button
              type="button"
              class="open-button"
              :disabled="commandHelpLoading && selectedHelpCommand === cmd.command"
              @click="loadCommandHelp(cmd.command)"
            >
              {{
                commandHelpLoading && selectedHelpCommand === cmd.command
                  ? t('developer.cliParity.helpLoading')
                  : t('developer.cliParity.help')
              }}
            </button>
            <button
              type="button"
              class="open-button"
              :disabled="!cmd.route"
              @click="go(cmd.route)"
            >
              {{ cmd.route ? t('developer.cliParity.open') : t('developer.cliParity.noUi') }}
            </button>
          </div>

          <div
            v-if="selectedHelpCommand === cmd.command"
            class="command-help"
          >
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <h4 class="text-xs font-semibold text-[var(--text-1)]">
                  {{ t('developer.cliParity.helpTitle', { command: cmd.command }) }}
                </h4>
                <p v-if="commandHelp" class="mt-1 text-xs text-[var(--text-3)]">
                  {{ commandHelp.source }}
                  <span v-if="commandHelpGeneratedAtLabel">
                    - {{ t('developer.cliParity.lastUpdated', { time: commandHelpGeneratedAtLabel }) }}
                  </span>
                </p>
              </div>
            </div>
            <div
              v-if="commandHelpError"
              class="mb-2 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]"
            >
              {{ t('developer.cliParity.helpError', { error: commandHelpError }) }}
            </div>
            <div
              v-if="commandHelpLoading"
              class="rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-center text-xs text-[var(--text-3)]"
            >
              {{ t('developer.cliParity.helpLoading') }}
            </div>
            <CodeBlock
              v-else-if="commandHelpOutput"
              :code="commandHelpOutput"
              :lang="`hermes ${cmd.command} --help`"
              max-height="360px"
            />
            <div
              v-else
              class="rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-center text-xs text-[var(--text-3)]"
            >
              {{ t('developer.cliParity.helpEmpty') }}
            </div>
            <CodeBlock
              v-if="commandHelp?.stderr"
              class="mt-2"
              :code="commandHelp.stderr.trimEnd()"
              :lang="t('developer.cliParity.stderr')"
              max-height="160px"
              tone="warning"
            />
          </div>
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

.reload-button {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 36%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-card));
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 4px 8px;
}

.reload-button:disabled {
  opacity: 0.62;
  cursor: wait;
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

.command-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-help {
  grid-column: 1 / -1;
  min-width: 0;
  border-top: 1px solid var(--border);
  padding-top: 12px;
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
