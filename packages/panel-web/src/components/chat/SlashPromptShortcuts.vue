<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  CliCommandCoverage,
  CliCommandInventoryItem,
  CliCommandInventoryResponse,
} from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';

const props = defineProps<{ query: string }>();
const emit = defineEmits<{ (e: 'pick', prompt: string): void }>();

const { t } = useI18n();

const commandIds = ['help', 'model', 'local', 'tools', 'review', 'plan'] as const;

interface SlashShortcutItem {
  id: string;
  command: string;
  label: string;
  desc: string;
  prompt: string;
  coverage?: CliCommandCoverage;
  example?: string;
}

const cliCommands = ref<CliCommandInventoryItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const promptCommands = computed<SlashShortcutItem[]>(() => commandIds.map(id => ({
  id,
  command: `/${id}`,
  label: t(`chat.slash.${id}.label`),
  desc: t(`chat.slash.${id}.desc`),
  prompt: t(`chat.slash.${id}.prompt`),
})));

const cliPrompt = (cmd: CliCommandInventoryItem) =>
  t('chat.slash.cliPrompt', {
    command: cmd.command,
    example: cmd.example,
  });

const cliShortcutCommands = computed<SlashShortcutItem[]>(() =>
  cliCommands.value.map(cmd => ({
    id: `cli:${cmd.command}`,
    command: `/${cmd.command}`,
    label: `hermes ${cmd.command}`,
    desc: cmd.description,
    prompt: cliPrompt(cmd),
    coverage: cmd.coverage,
    example: cmd.example,
  })),
);

function matchesQuery(item: SlashShortcutItem, q: string): boolean {
  return item.id.toLowerCase().includes(q)
    || item.command.toLowerCase().includes(q)
    || item.label.toLowerCase().includes(q)
    || item.desc.toLowerCase().includes(q)
    || (item.example?.toLowerCase().includes(q) ?? false);
}

const filteredCliCommands = computed(() => {
  const q = props.query.trim().toLowerCase();
  if (!q) return cliShortcutCommands.value;
  return cliShortcutCommands.value.filter(item => matchesQuery(item, q));
});

const filteredPromptCommands = computed(() => {
  const q = props.query.trim().toLowerCase();
  if (!q) return promptCommands.value;
  return promptCommands.value.filter(item => matchesQuery(item, q));
});

const hasResults = computed(() =>
  filteredCliCommands.value.length > 0 || filteredPromptCommands.value.length > 0,
);

async function loadCliCommands(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const data = await bffFetch<CliCommandInventoryResponse>('/api/cli/commands', { silent: true });
    cliCommands.value = data.commands;
    error.value = data.error ?? null;
  } catch (err) {
    cliCommands.value = [];
    error.value = (err as Error).message ?? String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadCliCommands();
});
</script>

<template>
  <div
    class="slash-shortcuts mx-3 mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevate)] p-2"
  >
    <div class="mb-1 flex items-center justify-between px-2">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        {{ t('chat.slash.cliTitle') }}
      </span>
      <span class="text-[10px] text-[var(--text-3)]">
        {{ t('chat.slash.hint') }}
      </span>
    </div>

    <div
      v-if="loading"
      class="slash-status"
    >
      {{ t('chat.slash.loadingCli') }}
    </div>
    <div
      v-else-if="error"
      class="slash-status slash-status-warning"
    >
      {{ t('chat.slash.cliError', { error }) }}
    </div>

    <button
      v-for="item in filteredCliCommands"
      :key="item.id"
      type="button"
      class="slash-shortcut-row"
      @click="emit('pick', item.prompt)"
    >
      <code class="slash-command">{{ item.command }}</code>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium text-[var(--text-1)]">{{ item.label }}</span>
        <span class="block truncate text-[11px] text-[var(--text-3)]">{{ item.desc }}</span>
      </span>
      <span
        v-if="item.coverage"
        class="slash-coverage"
        :data-coverage="item.coverage"
      >
        {{ t(`developer.cliParity.coverage.${item.coverage}`) }}
      </span>
    </button>

    <div
      v-if="filteredPromptCommands.length"
      class="mt-2 border-t border-[var(--border)] pt-2"
    >
      <div class="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        {{ t('chat.slash.title') }}
      </div>
      <button
        v-for="item in filteredPromptCommands"
        :key="item.id"
        type="button"
        class="slash-shortcut-row"
        @click="emit('pick', item.prompt)"
      >
        <code class="slash-command">{{ item.command }}</code>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-medium text-[var(--text-1)]">{{ item.label }}</span>
          <span class="block truncate text-[11px] text-[var(--text-3)]">{{ item.desc }}</span>
        </span>
      </button>
    </div>

    <div
      v-if="!loading && !hasResults"
      class="slash-status"
    >
      {{ t('chat.slash.empty') }}
    </div>
  </div>
</template>

<style scoped>
.slash-shortcuts {
  max-height: min(360px, 55vh);
  overflow-y: auto;
}

.slash-shortcut-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 8px;
  text-align: left;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.slash-shortcut-row:hover {
  background: var(--bg-card);
}

.slash-command {
  flex: 0 0 auto;
  min-width: 56px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 3px 7px;
  color: var(--brand-600);
  font-size: 11px;
}

.slash-coverage {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 2px 6px;
  color: var(--text-3);
  font-size: 10px;
}

.slash-coverage[data-coverage='ready'] {
  color: var(--color-success);
}

.slash-coverage[data-coverage='partial'] {
  color: var(--color-warning);
}

.slash-coverage[data-coverage='missing'] {
  color: var(--color-error);
}

.slash-status {
  margin: 4px 8px 6px;
  border-radius: 8px;
  background: var(--bg-card);
  padding: 7px 9px;
  color: var(--text-3);
  font-size: 11px;
}

.slash-status-warning {
  color: var(--color-warning);
}

@media (max-width: 520px) {
  .slash-shortcut-row {
    gap: 6px;
  }

  .slash-command {
    min-width: 0;
  }

  .slash-coverage {
    display: none;
  }
}
</style>
