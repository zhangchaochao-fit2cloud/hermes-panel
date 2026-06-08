<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type {
  CliCommandCoverage,
  CliCommandGroup,
  CliCommandGroupSummary,
  CliCommandInventoryItem,
  CliCommandInventoryResponse,
  CliCommandInventorySummary,
} from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import { formatCliParityReport, selectCliParityBacklog } from '@/utils/cli-parity';
import CodeBlock from '@/components/shared/CodeBlock.vue';
import CliParityCommandCard from './CliParityCommandCard.vue';
import CliParityFilters from './CliParityFilters.vue';

type CompletionShell = 'zsh' | 'bash' | 'fish' | 'powershell';

interface CliCompletionResponse {
  shell: string;
  source: string;
  generatedAt: number;
  stdout: string;
  stderr?: string;
  error?: string;
}

const { t, te, locale } = useI18n();
const message = useMessage();
const query = ref('');
const coverageFilter = ref<CliCommandCoverage | 'all'>('all');
const groupFilter = ref<CliCommandGroup | 'all'>('all');
const commands = ref<CliCommandInventoryItem[]>([]);
const source = ref('hermes --help');
const generatedAt = ref<number | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const summary = ref<CliCommandInventorySummary | null>(null);
const completionShell = ref<CompletionShell>('zsh');
const completionScript = ref<CliCompletionResponse | null>(null);
const completionLoading = ref(false);
const completionError = ref<string | null>(null);

const groups: CliCommandGroup[] = ['core', 'config', 'extensions', 'ops', 'advanced'];
const coverages: CliCommandCoverage[] = ['ready', 'partial', 'missing'];
const completionShells: CompletionShell[] = ['zsh', 'bash', 'fish', 'powershell'];

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return commands.value.filter((cmd) => {
    if (coverageFilter.value !== 'all' && cmd.coverage !== coverageFilter.value) return false;
    if (groupFilter.value !== 'all' && cmd.group !== groupFilter.value) return false;
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

const inventoryTotals = computed(() => summary.value ?? totals.value);

const coverageCounts = computed<Record<CliCommandCoverage | 'all', number>>(() => ({
  all: inventoryTotals.value.all,
  ready: inventoryTotals.value.ready,
  partial: inventoryTotals.value.partial,
  missing: inventoryTotals.value.missing,
}));

const groupCounts = computed<CliCommandGroupSummary>(() => {
  if (summary.value?.groups) return summary.value.groups;
  return groups.reduce<CliCommandGroupSummary>((acc, group) => {
    acc[group] = commands.value.filter(cmd => cmd.group === group).length;
    return acc;
  }, {} as CliCommandGroupSummary);
});

const generatedAtLabel = computed(() => {
  if (generatedAt.value === null) return '';
  return new Date(generatedAt.value).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const reportCommands = computed(() =>
  filtered.value.map(cmd => ({
    ...cmd,
    displayDescription: descriptionFor(cmd),
  })),
);

const backlogCommands = computed(() => selectCliParityBacklog(commands.value, 3));
const backlogCount = computed(() => inventoryTotals.value.partial + inventoryTotals.value.missing);

function descriptionFor(cmd: CliCommandInventoryItem): string {
  const key = `developer.cliParity.items.${cmd.command}`;
  return te(key) ? t(key) : cmd.description;
}

function focusCommand(cmd: CliCommandInventoryItem): void {
  query.value = cmd.command;
  coverageFilter.value = cmd.coverage;
  groupFilter.value = cmd.group;
}

async function copyBacklogExample(cmd: CliCommandInventoryItem): Promise<void> {
  try {
    await navigator.clipboard.writeText(cmd.example);
    message.success(t('developer.cliParity.copiedExample'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

async function copyReport(): Promise<void> {
  if (reportCommands.value.length === 0) {
    message.warning(t('developer.cliParity.reportEmpty'));
    return;
  }
  try {
    await navigator.clipboard.writeText(formatCliParityReport(reportCommands.value));
    message.success(t('developer.cliParity.copiedReport'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

async function loadCompletionScript(): Promise<void> {
  completionLoading.value = true;
  completionError.value = null;
  completionScript.value = null;
  try {
    const shell = encodeURIComponent(completionShell.value);
    const data = await bffFetch<CliCompletionResponse>(`/api/cli/completion/${shell}`);
    completionScript.value = data;
    completionError.value = data.error ?? null;
  } catch (err) {
    completionError.value = (err as Error).message ?? String(err);
  } finally {
    completionLoading.value = false;
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
    summary.value = data.summary ?? null;
    error.value = data.error ?? null;
  } catch (err) {
    commands.value = [];
    summary.value = null;
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
            <button
              type="button"
              class="reload-button"
              :disabled="filtered.length === 0"
              @click="copyReport"
            >
              {{ t('developer.cliParity.copyReport') }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 text-center">
          <button class="cli-count" type="button" @click="coverageFilter = 'all'">
            <strong>{{ inventoryTotals.all }}</strong>
            <span>{{ t('developer.cliParity.coverage.all') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'ready'">
            <strong>{{ inventoryTotals.ready }}</strong>
            <span>{{ t('developer.cliParity.coverage.ready') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'partial'">
            <strong>{{ inventoryTotals.partial }}</strong>
            <span>{{ t('developer.cliParity.coverage.partial') }}</span>
          </button>
          <button class="cli-count" type="button" @click="coverageFilter = 'missing'">
            <strong>{{ inventoryTotals.missing }}</strong>
            <span>{{ t('developer.cliParity.coverage.missing') }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
            {{ t('developer.cliParity.completionEyebrow') }}
          </p>
          <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
            {{ t('developer.cliParity.completionTitle') }}
          </h3>
          <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
            {{ t('developer.cliParity.completionDesc') }}
          </p>
        </div>
        <div class="completion-controls">
          <label>
            <span class="sr-only">{{ t('developer.cliParity.completionShell') }}</span>
            <select v-model="completionShell" class="completion-select">
              <option
                v-for="shell in completionShells"
                :key="shell"
                :value="shell"
              >
                {{ shell }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="reload-button"
            :disabled="completionLoading"
            @click="loadCompletionScript"
          >
            {{ completionLoading ? t('developer.cliParity.completionLoading') : t('developer.cliParity.completionGenerate') }}
          </button>
        </div>
      </div>

      <div
        v-if="completionError"
        class="mt-3 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]"
      >
        {{ t('developer.cliParity.completionError', { error: completionError }) }}
      </div>
      <CodeBlock
        v-if="completionScript?.stdout"
        class="mt-3"
        :code="completionScript.stdout.trimEnd()"
        :lang="completionScript.source"
        max-height="260px"
      />
      <CodeBlock
        v-if="completionScript?.stderr"
        class="mt-3"
        :code="completionScript.stderr.trimEnd()"
        :lang="t('developer.cliParity.stderr')"
        max-height="120px"
        tone="warning"
      />
    </section>

    <section
      v-if="commands.length > 0"
      class="cli-backlog rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
            {{ t('developer.cliParity.backlogEyebrow', { n: backlogCount }) }}
          </p>
          <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
            {{ backlogCommands.length > 0 ? t('developer.cliParity.backlogTitle') : t('developer.cliParity.backlogEmptyTitle') }}
          </h3>
          <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
            {{ backlogCommands.length > 0 ? t('developer.cliParity.backlogDesc') : t('developer.cliParity.backlogEmptyDesc') }}
          </p>
        </div>
        <div
          v-if="backlogCommands.length > 0"
          class="backlog-actions"
        >
          <button
            type="button"
            class="reload-button"
            @click="coverageFilter = 'partial'"
          >
            {{ t('developer.cliParity.coverage.partial') }}
          </button>
          <button
            type="button"
            class="reload-button"
            @click="coverageFilter = 'missing'"
          >
            {{ t('developer.cliParity.coverage.missing') }}
          </button>
        </div>
      </div>

      <div
        v-if="backlogCommands.length > 0"
        class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3"
      >
        <article
          v-for="cmd in backlogCommands"
          :key="cmd.command"
          class="backlog-item"
        >
          <div class="flex flex-wrap items-center gap-2">
            <code>hermes {{ cmd.command }}</code>
            <span>{{ t(`developer.cliParity.coverage.${cmd.coverage}`) }}</span>
          </div>
          <p class="mt-2 text-xs leading-5 text-[var(--text-3)]">
            {{ descriptionFor(cmd) }}
          </p>
          <pre class="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-xs text-[var(--text-2)]">{{ cmd.example }}</pre>
          <div class="backlog-card-actions">
            <button
              type="button"
              class="backlog-action"
              @click="copyBacklogExample(cmd)"
            >
              {{ t('developer.cliParity.copyExample') }}
            </button>
            <button
              type="button"
              class="backlog-action"
              @click="focusCommand(cmd)"
            >
              {{ t('developer.cliParity.focusCommand') }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <CliParityFilters
      v-model:query="query"
      v-model:coverage-filter="coverageFilter"
      v-model:group-filter="groupFilter"
      :coverages="coverages"
      :groups="groups"
      :coverage-counts="coverageCounts"
      :group-counts="groupCounts"
      :visible-count="filtered.length"
      :total-count="commands.length"
    />

    <section
      v-if="error"
      class="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]"
    >
      <p class="font-medium">
        {{ t('developer.cliParity.error', { error }) }}
      </p>
      <div class="mt-2 grid gap-1 text-xs leading-5">
        <p>{{ t('developer.cliParity.errorHintTitle') }}</p>
        <code class="error-command">hermes --help</code>
        <p>{{ t('developer.cliParity.errorHintShell') }}</p>
        <p>{{ t('developer.cliParity.errorHintBin') }}</p>
      </div>
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
        <CliParityCommandCard
          v-for="cmd in section.commands"
          :key="cmd.command"
          :cmd="cmd"
          :description="descriptionFor(cmd)"
        />
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

.completion-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.completion-select {
  min-width: 132px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-1);
  font-size: 12px;
  line-height: 18px;
  padding: 4px 8px;
}

.backlog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.backlog-item {
  min-width: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 10px;
}

.backlog-item code {
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-1);
  font-size: 12px;
  padding: 3px 7px;
}

.backlog-item span {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-500) 36%, var(--border));
  color: var(--brand-600);
  font-size: 11px;
  line-height: 16px;
  padding: 2px 7px;
}

.backlog-card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.backlog-action {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 34%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-card));
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 5px 8px;
}

.backlog-action:hover {
  background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card));
}

.error-command {
  width: fit-content;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--color-warning) 36%, var(--border));
  background: var(--bg-card);
  color: var(--text-1);
  padding: 2px 7px;
}

</style>
