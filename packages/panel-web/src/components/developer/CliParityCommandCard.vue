<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type {
  CliCommandCoverage,
  CliCommandHelpResponse,
  CliCommandInventoryItem,
} from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';
import CodeBlock from '@/components/shared/CodeBlock.vue';

const props = defineProps<{
  cmd: CliCommandInventoryItem;
  description: string;
}>();

const { t, locale } = useI18n();
const message = useMessage();
const router = useRouter();

const commandHelp = ref<CliCommandHelpResponse | null>(null);
const commandHelpLoading = ref(false);
const commandHelpOpen = ref(false);
const commandHelpError = ref<string | null>(null);

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

function go(route?: string): void {
  if (!route) return;
  void router.push(route);
}

async function copyExample(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.cmd.example);
    message.success(t('developer.cliParity.copiedExample'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

async function loadCommandHelp(): Promise<void> {
  commandHelpOpen.value = true;
  commandHelp.value = null;
  commandHelpError.value = null;
  commandHelpLoading.value = true;
  try {
    const command = encodeURIComponent(props.cmd.command);
    const data = await bffFetch<CliCommandHelpResponse>(`/api/cli/commands/${command}/help`);
    commandHelp.value = data;
    commandHelpError.value = data.error ?? null;
  } catch (err) {
    commandHelpError.value = (err as Error).message ?? String(err);
  } finally {
    commandHelpLoading.value = false;
  }
}
</script>

<template>
  <article
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
        {{ description }}
      </p>
      <pre class="mt-2 overflow-x-auto rounded border border-[var(--border)] bg-[var(--bg-elevate)] px-2 py-1.5 text-xs text-[var(--text-2)]">{{ cmd.example }}</pre>
    </div>

    <div class="command-actions">
      <button
        type="button"
        class="open-button"
        @click="copyExample"
      >
        {{ t('developer.cliParity.copyExample') }}
      </button>
      <button
        type="button"
        class="open-button"
        :disabled="commandHelpLoading"
        @click="loadCommandHelp"
      >
        {{ commandHelpLoading ? t('developer.cliParity.helpLoading') : t('developer.cliParity.help') }}
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
      v-if="commandHelpOpen"
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
</template>

<style scoped>
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
