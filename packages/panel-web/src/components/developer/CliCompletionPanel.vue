<script setup lang="ts">
import CodeBlock from '@/components/shared/CodeBlock.vue';

interface CliCompletionResponse {
  shell: string;
  source: string;
  generatedAt: number;
  stdout: string;
  stderr?: string;
  error?: string;
}

defineProps<{
  completionError: string | null;
  completionLoading: boolean;
  completionScript: CliCompletionResponse | null;
  completionShell: string;
  completionShells: string[];
}>();

const emit = defineEmits<{
  generate: [];
  'update:completionShell': [shell: string];
}>();

function onShellChange(event: Event): void {
  emit('update:completionShell', (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <section class="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">
          {{ $t('developer.cliParity.completionEyebrow') }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-[var(--text-1)]">
          {{ $t('developer.cliParity.completionTitle') }}
        </h3>
        <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
          {{ $t('developer.cliParity.completionDesc') }}
        </p>
      </div>
      <div class="completion-controls">
        <label>
          <span class="sr-only">{{ $t('developer.cliParity.completionShell') }}</span>
          <select
            :value="completionShell"
            class="completion-select"
            @change="onShellChange"
          >
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
          @click="$emit('generate')"
        >
          {{ completionLoading ? $t('developer.cliParity.completionLoading') : $t('developer.cliParity.completionGenerate') }}
        </button>
      </div>
    </div>

    <div
      v-if="completionError"
      class="mt-3 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]"
    >
      {{ $t('developer.cliParity.completionError', { error: completionError }) }}
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
      :lang="$t('developer.cliParity.stderr')"
      max-height="120px"
      tone="warning"
    />
  </section>
</template>

<style scoped>
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
</style>
