<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { CliCommandInventoryItem, HealthStatus } from '@hermes-panel/shared';
import { bffFetch } from '@/api/bff';

const props = defineProps<{
  command: CliCommandInventoryItem;
}>();

const emit = defineEmits<{
  focusCommand: [command: CliCommandInventoryItem];
}>();

const { t } = useI18n();
const message = useMessage();
const health = ref<HealthStatus | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);

const fallbackCommand = computed(() => props.command.fallback ?? 'hermes update --help');
const versionLabel = computed(() => health.value?.hermes.version || t('developer.cliParity.update.unknownVersion'));
const hermesReachable = computed(() => health.value?.hermes.running === true);

async function copyCommand(value: string, key: 'copiedExample' | 'copiedFallback'): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    message.success(t(`developer.cliParity.update.${key}`));
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

onMounted(() => {
  void loadHealth();
});
</script>

<template>
  <section class="update-readiness">
    <div class="update-copy">
      <p class="eyebrow">
        {{ t('developer.cliParity.update.eyebrow') }}
      </p>
      <h3>{{ t('developer.cliParity.update.title') }}</h3>
      <p class="desc">
        {{ t('developer.cliParity.update.desc') }}
      </p>
    </div>

    <div class="status-grid">
      <div class="status-cell">
        <span>{{ t('developer.cliParity.update.currentVersion') }}</span>
        <strong>{{ healthLoading ? t('developer.cliParity.update.loadingHealth') : versionLabel }}</strong>
      </div>
      <div class="status-cell">
        <span>{{ t('developer.cliParity.update.hermesStatus') }}</span>
        <strong :class="hermesReachable ? 'is-ok' : 'is-warn'">
          {{ hermesReachable ? t('developer.cliParity.update.reachable') : t('developer.cliParity.update.notReachable') }}
        </strong>
      </div>
      <div class="status-cell">
        <span>{{ t('developer.cliParity.update.officialFallback') }}</span>
        <code>{{ fallbackCommand }}</code>
      </div>
    </div>

    <div
      v-if="healthError"
      class="health-error"
    >
      {{ t('developer.cliParity.update.healthError', { error: healthError }) }}
    </div>

    <ol class="checklist">
      <li>{{ t('developer.cliParity.update.checkBackup') }}</li>
      <li>{{ t('developer.cliParity.update.checkHelp') }}</li>
      <li>{{ t('developer.cliParity.update.checkRun') }}</li>
    </ol>

    <div class="update-actions">
      <button
        type="button"
        class="update-button primary"
        @click="copyCommand(command.example, 'copiedExample')"
      >
        {{ t('developer.cliParity.update.copyCommand') }}
      </button>
      <button
        type="button"
        class="update-button"
        @click="copyCommand(fallbackCommand, 'copiedFallback')"
      >
        {{ t('developer.cliParity.update.copyFallback') }}
      </button>
      <button
        type="button"
        class="update-button"
        @click="emit('focusCommand', command)"
      >
        {{ t('developer.cliParity.update.focusHelp') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.update-readiness {
  display: grid;
  gap: 12px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 5%, var(--bg-card));
  padding: 14px;
}

.eyebrow {
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h3 {
  margin-top: 4px;
  color: var(--text-1);
  font-size: 15px;
  font-weight: 700;
}

.desc {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 18px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.status-cell {
  min-width: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  padding: 9px;
}

.status-cell span {
  display: block;
  color: var(--text-3);
  font-size: 11px;
  line-height: 16px;
}

.status-cell strong,
.status-cell code {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--text-1);
  font-size: 12px;
  line-height: 18px;
}

.status-cell .is-ok {
  color: var(--color-success);
}

.status-cell .is-warn {
  color: var(--color-warning);
}

.health-error {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-warning) 40%, var(--border));
  background: color-mix(in srgb, var(--color-warning) 9%, var(--bg-card));
  color: var(--color-warning);
  font-size: 12px;
  line-height: 18px;
  padding: 8px 10px;
}

.checklist {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 18px;
}

.update-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.update-button {
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 34%, var(--border));
  background: var(--bg-card);
  color: var(--brand-600);
  font-size: 12px;
  line-height: 18px;
  padding: 6px 9px;
}

.update-button.primary {
  background: color-mix(in srgb, var(--brand-500) 12%, var(--bg-card));
}

.update-button:hover {
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-card));
}

@media (max-width: 860px) {
  .status-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .update-button {
    flex: 1 1 150px;
  }
}
</style>
