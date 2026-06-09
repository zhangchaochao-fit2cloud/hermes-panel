<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { CliCommandCoverage, CliCommandGroup, CliCommandGroupSummary, CliCommandInventoryItem, CliCommandInventoryResponse, CliCommandInventorySummary } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import { formatCliParityBacklogPlan, formatCliParityReport, selectCliParityBacklog } from '@/utils/cli-parity';
import CliCompletionPanel from './CliCompletionPanel.vue';
import CliParityBacklogPanel from './CliParityBacklogPanel.vue';
import CliParityCommandCard from './CliParityCommandCard.vue';
import CliParityFilters from './CliParityFilters.vue';
import CliParityHeader from './CliParityHeader.vue';
import CliUpdateReadinessPanel from './CliUpdateReadinessPanel.vue';

type CompletionShell = 'zsh' | 'bash' | 'fish' | 'powershell';

interface CliCompletionResponse { shell: string; source: string; generatedAt: number; stdout: string; stderr?: string; error?: string }

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
const backlogItems = computed(() => backlogCommands.value.map(cmd => ({
  ...cmd,
  displayDescription: descriptionFor(cmd),
})));
const backlogCount = computed(() => inventoryTotals.value.partial + inventoryTotals.value.missing);
const updateCommand = computed(() => commands.value.find(cmd => cmd.command === 'update') ?? null);

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

async function copyBacklogPlan(): Promise<void> {
  if (backlogItems.value.length === 0) {
    message.warning(t('developer.cliParity.reportEmpty'));
    return;
  }
  try {
    await navigator.clipboard.writeText(formatCliParityBacklogPlan(backlogItems.value));
    message.success(t('developer.cliParity.copiedBacklogPlan'));
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
    <CliParityHeader
      :source="source"
      :generated-at-label="generatedAtLabel"
      :loading="loading"
      :totals="inventoryTotals"
      :copy-disabled="filtered.length === 0"
      @copy-report="copyReport"
      @filter-coverage="coverageFilter = $event"
      @reload="loadInventory"
    />

    <CliCompletionPanel
      v-model:completion-shell="completionShell"
      :completion-error="completionError"
      :completion-loading="completionLoading"
      :completion-script="completionScript"
      :completion-shells="completionShells"
      @generate="loadCompletionScript"
    />

    <CliParityBacklogPanel
      v-if="commands.length > 0"
      :commands="backlogItems"
      :backlog-count="backlogCount"
      @copy-example="copyBacklogExample"
      @copy-plan="copyBacklogPlan"
      @filter-coverage="coverageFilter = $event"
      @focus-command="focusCommand"
    />

    <CliUpdateReadinessPanel
      v-if="updateCommand"
      :command="updateCommand"
      @focus-command="focusCommand"
    />

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
        <code class="error-command w-fit rounded border border-[color-mix(in_srgb,var(--color-warning)_36%,var(--border))] bg-[var(--bg-card)] px-[7px] py-0.5 text-[var(--text-1)]">hermes --help</code>
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
