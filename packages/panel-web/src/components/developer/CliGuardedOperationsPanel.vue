<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { CliCommandInventoryItem, HealthStatus } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';

const props = defineProps<{
  commands: CliCommandInventoryItem[];
}>();

const emit = defineEmits<{
  focusCommand: [command: CliCommandInventoryItem];
}>();

const { t } = useI18n();
const message = useMessage();
const health = ref<HealthStatus | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);
const uninstallAcknowledged = ref(false);

const updateCommand = computed(() => props.commands.find(cmd => cmd.command === 'update') ?? null);
const uninstallCommand = computed(() => props.commands.find(cmd => cmd.command === 'uninstall') ?? null);
const hasGuardedCommands = computed(() => updateCommand.value !== null || uninstallCommand.value !== null);
const versionLabel = computed(() => health.value?.hermes.version || t('developer.cliParity.guarded.unknownVersion'));
const hermesReachable = computed(() => health.value?.hermes.running === true);

function fallbackFor(command: CliCommandInventoryItem, fallback: string): string {
  return command.fallback ?? fallback;
}

async function copyCommand(value: string, key: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    message.success(t(key));
  } catch {
    message.error(t('common.copyFailed'));
  }
}

async function loadHealth(): Promise<void> {
  healthLoading.value = true;
  healthError.value = null;
  try {
    health.value = await bffFetch<HealthStatus>('/api/system/health', { silent: true });
  } catch (err) {
    health.value = null;
    healthError.value = (err as Error).message ?? String(err);
  } finally {
    healthLoading.value = false;
  }
}

watch(hasGuardedCommands, (hasCommands) => {
  if (hasCommands && !health.value && !healthLoading.value) void loadHealth();
}, { immediate: true });
</script>

<template>
  <section
    v-if="hasGuardedCommands"
    class="guarded-panel"
  >
    <div class="panel-head">
      <div class="min-w-0">
        <p class="eyebrow">
          {{ t('developer.cliParity.guarded.eyebrow') }}
        </p>
        <h3>{{ t('developer.cliParity.guarded.title') }}</h3>
        <p class="desc">
          {{ t('developer.cliParity.guarded.desc') }}
        </p>
      </div>
      <button
        type="button"
        class="guarded-button"
        :disabled="healthLoading"
        @click="loadHealth"
      >
        {{ healthLoading ? t('developer.cliParity.guarded.loadingHealth') : t('developer.cliParity.guarded.refreshHealth') }}
      </button>
    </div>

    <div class="status-grid">
      <div class="status-cell">
        <span>{{ t('developer.cliParity.guarded.currentVersion') }}</span>
        <strong>{{ healthLoading ? t('developer.cliParity.guarded.loadingHealth') : versionLabel }}</strong>
      </div>
      <div class="status-cell">
        <span>{{ t('developer.cliParity.guarded.hermesStatus') }}</span>
        <strong :class="hermesReachable ? 'is-ok' : 'is-warn'">
          {{ hermesReachable ? t('developer.cliParity.guarded.reachable') : t('developer.cliParity.guarded.notReachable') }}
        </strong>
      </div>
    </div>

    <div
      v-if="healthError"
      class="inline-error"
    >
      {{ t('developer.cliParity.guarded.healthError', { error: healthError }) }}
    </div>

    <article
      v-if="updateCommand"
      class="operation-card"
    >
      <div class="operation-copy">
        <h4>{{ t('developer.cliParity.update.title') }}</h4>
        <p>{{ t('developer.cliParity.update.desc') }}</p>
      </div>
      <ol class="checklist">
        <li>{{ t('developer.cliParity.update.checkBackup') }}</li>
        <li>{{ t('developer.cliParity.update.checkHelp') }}</li>
        <li>{{ t('developer.cliParity.update.checkRun') }}</li>
      </ol>
      <div class="operation-actions">
        <button
          type="button"
          class="guarded-button primary"
          @click="copyCommand(updateCommand.example, 'developer.cliParity.update.copiedExample')"
        >
          {{ t('developer.cliParity.update.copyCommand') }}
        </button>
        <button
          type="button"
          class="guarded-button"
          @click="copyCommand(fallbackFor(updateCommand, 'hermes update --help'), 'developer.cliParity.update.copiedFallback')"
        >
          {{ t('developer.cliParity.update.copyFallback') }}
        </button>
        <button
          type="button"
          class="guarded-button"
          @click="emit('focusCommand', updateCommand)"
        >
          {{ t('developer.cliParity.update.focusHelp') }}
        </button>
      </div>
    </article>

    <article
      v-if="uninstallCommand"
      class="operation-card destructive"
    >
      <div class="operation-copy">
        <h4>{{ t('developer.cliParity.uninstall.title') }}</h4>
        <p>{{ t('developer.cliParity.uninstall.desc') }}</p>
      </div>
      <ol class="checklist">
        <li>{{ t('developer.cliParity.uninstall.checkBackup') }}</li>
        <li>{{ t('developer.cliParity.uninstall.checkHelp') }}</li>
        <li>{{ t('developer.cliParity.uninstall.checkTerminal') }}</li>
      </ol>
      <label class="ack-row">
        <input
          v-model="uninstallAcknowledged"
          type="checkbox"
        >
        <span>{{ t('developer.cliParity.uninstall.acknowledge') }}</span>
      </label>
      <div class="operation-actions">
        <button
          type="button"
          class="guarded-button danger"
          :disabled="!uninstallAcknowledged"
          @click="copyCommand(uninstallCommand.example, 'developer.cliParity.uninstall.copiedExample')"
        >
          {{ t('developer.cliParity.uninstall.copyCommand') }}
        </button>
        <button
          type="button"
          class="guarded-button"
          @click="copyCommand(fallbackFor(uninstallCommand, 'hermes uninstall --help'), 'developer.cliParity.uninstall.copiedFallback')"
        >
          {{ t('developer.cliParity.uninstall.copyFallback') }}
        </button>
        <button
          type="button"
          class="guarded-button"
          @click="emit('focusCommand', uninstallCommand)"
        >
          {{ t('developer.cliParity.uninstall.focusHelp') }}
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.guarded-panel { display: grid; gap: 12px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--brand-500) 28%, var(--border)); background: color-mix(in srgb, var(--brand-500) 5%, var(--bg-card)); padding: 14px; }
.panel-head, .operation-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.panel-head { justify-content: space-between; }
.eyebrow { color: var(--brand-600); font-size: 11px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
h3, h4 { color: var(--text-1); font-weight: 700; }
h3 { margin-top: 4px; font-size: 15px; }
h4 { font-size: 13px; }
.desc, .operation-copy p { margin-top: 4px; color: var(--text-3); font-size: 12px; line-height: 18px; }
.status-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.status-cell, .operation-card { min-width: 0; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-elevate); padding: 10px; }
.operation-card { display: grid; gap: 10px; }
.operation-card.destructive { border-color: color-mix(in srgb, var(--color-error) 35%, var(--border)); }
.status-cell span { display: block; color: var(--text-3); font-size: 11px; line-height: 16px; }
.status-cell strong { display: block; margin-top: 4px; color: var(--text-1); font-size: 12px; line-height: 18px; }
.status-cell .is-ok { color: var(--color-success); }
.status-cell .is-warn { color: var(--color-warning); }
.inline-error { border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-warning) 40%, var(--border)); background: color-mix(in srgb, var(--color-warning) 9%, var(--bg-card)); color: var(--color-warning); font-size: 12px; line-height: 18px; padding: 8px 10px; }
.checklist { display: grid; gap: 6px; margin: 0; padding-left: 18px; color: var(--text-2); font-size: 12px; line-height: 18px; }
.ack-row { display: flex; gap: 8px; align-items: flex-start; color: var(--text-2); font-size: 12px; line-height: 18px; }
.operation-actions { gap: 8px; }
.guarded-button { border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--brand-500) 34%, var(--border)); background: var(--bg-card); color: var(--brand-600); font-size: 12px; line-height: 18px; padding: 6px 9px; }
.guarded-button.primary { background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card)); }
.guarded-button.danger { border-color: color-mix(in srgb, var(--color-error) 42%, var(--border)); color: var(--color-error); }
.guarded-button:disabled { border-color: var(--border); background: var(--bg-card); color: var(--text-3); cursor: default; }
@media (max-width: 860px) { .status-grid { grid-template-columns: minmax(0, 1fr); } .guarded-button { flex: 1 1 150px; } }
</style>
