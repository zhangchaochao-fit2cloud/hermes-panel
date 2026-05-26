<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import {
  NButton,
  NTag,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NSpin,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useDoctorStore, type DoctorStatus } from '@/stores/doctor';
import { absoluteTime } from '@/utils/relative-time';

const { t } = useI18n();
const store = useDoctorStore();
const { lastRun, raw, loading, error, counts, grouped } = storeToRefs(store);

const hasRun = computed(() => lastRun.value !== null);

function statusDotClass(status: DoctorStatus): string {
  switch (status) {
    case 'ok': return 'bg-emerald-500';
    case 'warn': return 'bg-amber-500';
    case 'fail': return 'bg-red-500';
    default: return 'bg-[var(--text-3)]';
  }
}

function statusTextClass(status: DoctorStatus): string {
  switch (status) {
    case 'ok': return 'text-emerald-500';
    case 'warn': return 'text-amber-500';
    case 'fail': return 'text-red-500';
    default: return 'text-[var(--text-3)]';
  }
}

function statusGlyph(status: DoctorStatus): string {
  switch (status) {
    case 'ok': return '✓';
    case 'warn': return '⚠';
    case 'fail': return '✗';
    default: return '·';
  }
}

async function onRun(): Promise<void> {
  await store.run();
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header: run button + counts -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
    >
      <div class="flex items-center gap-3">
        <NButton type="primary" size="small" :loading="loading" @click="onRun">
          {{ hasRun ? t('developer.doctor.runAgain') : t('developer.doctor.run') }}
        </NButton>
        <span v-if="lastRun !== null" class="text-xs text-[var(--text-3)]">
          {{ t('developer.doctor.lastRun', { time: absoluteTime(lastRun) }) }}
        </span>
        <span v-else class="text-xs text-[var(--text-3)]">
          {{ t('developer.doctor.notRunYet') }}
        </span>
      </div>

      <div v-if="hasRun" class="flex items-center gap-2">
        <NTag :bordered="false" size="small" type="success">
          {{ t('developer.doctor.counts.ok', { n: counts.ok }) }}
        </NTag>
        <NTag :bordered="false" size="small" type="warning">
          {{ t('developer.doctor.counts.warn', { n: counts.warn }) }}
        </NTag>
        <NTag :bordered="false" size="small" type="error">
          {{ t('developer.doctor.counts.fail', { n: counts.fail }) }}
        </NTag>
        <NTag v-if="counts.info > 0" :bordered="false" size="small">
          {{ t('developer.doctor.counts.info', { n: counts.info }) }}
        </NTag>
      </div>
    </div>

    <!-- Error banner (e.g. HERMES_CLI_NOT_FOUND). We still render any
         partial results below if checks were parsed. -->
    <div
      v-if="error"
      class="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500"
    >
      {{ t('developer.doctor.errorPrefix') }} {{ error }}
    </div>

    <!-- Loading state with no prior data -->
    <div v-if="loading && !hasRun" class="flex justify-center py-12">
      <NSpin size="medium" />
    </div>

    <!-- Empty (never run) -->
    <NEmpty
      v-else-if="!hasRun"
      size="medium"
      :description="t('developer.doctor.emptyHint')"
      class="py-12"
    />

    <!-- Results -->
    <template v-else>
      <div
        v-if="grouped.length > 0"
        class="rounded-md border border-[var(--border)] bg-[var(--bg-card)]"
      >
        <div
          v-for="(group, gi) in grouped"
          :key="group.category ?? `__nocat_${gi}`"
          :class="['px-4 py-3', gi > 0 ? 'border-t border-[var(--border)]' : '']"
        >
          <h3 class="text-sm font-semibold text-[var(--text-1)] mb-2">
            {{ group.category || t('developer.doctor.uncategorized') }}
          </h3>
          <ul class="space-y-1.5">
            <li
              v-for="(check, idx) in group.items"
              :key="`${gi}-${idx}-${check.name}`"
              class="flex items-start gap-2 text-sm"
            >
              <span
                :class="['mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0', statusDotClass(check.status)]"
                :aria-label="check.status"
              />
              <span :class="['flex-shrink-0 font-mono text-xs leading-5', statusTextClass(check.status)]">
                {{ statusGlyph(check.status) }}
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-[var(--text-1)] break-words">{{ check.name }}</span>
                <span
                  v-if="check.message"
                  class="block text-xs text-[var(--text-3)] mt-0.5 break-words"
                >
                  {{ check.message }}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- No structured checks parsed but we still have raw output -->
      <div
        v-else-if="raw"
        class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500"
      >
        {{ t('developer.doctor.noStructured') }}
      </div>
      <NEmpty
        v-else
        size="small"
        :description="t('developer.doctor.noChecks')"
        class="py-8"
      />

      <!-- Raw output (collapsible) -->
      <NCollapse v-if="raw" arrow-placement="right" :default-expanded-names="[]">
        <NCollapseItem :title="t('developer.doctor.rawOutput')" name="raw">
          <pre
            class="rounded-md bg-[var(--bg-elevate)] p-3 text-xs overflow-auto"
            style="max-height: 480px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;"
          ><code>{{ raw }}</code></pre>
        </NCollapseItem>
      </NCollapse>
    </template>
  </div>
</template>
