<script setup lang="ts">
import { computed, ref, onErrorCaptured, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { clearRouteError, routeError } from '@/utils/route-error';

/**
 * App-level error boundary.
 *
 * Wrap the root layout in <AppErrorBoundary> so that any uncaught render
 * error in a descendant view shows a soft fallback card instead of a
 * blank screen. The boundary stops propagation (returns false from
 * onErrorCaptured) — Vue's global errorHandler still sees it via the
 * console.error we emit, but the rest of the app keeps running.
 *
 * This is deliberately a single top-level boundary; we don't sprinkle
 * boundaries per-view. Per-view recovery is handled by the existing
 * empty/error states inside each view (e.g. sessions retry button).
 */

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const captured = ref<Error | null>(null);
const activeError = computed(() => captured.value || routeError.value);

onErrorCaptured((err) => {
  // Normalize to Error — Vue can pass anything thrown by user code.
  captured.value = err instanceof Error ? err : new Error(String(err));
  // Log with the same `[panel]` prefix used by use-error-handler so a
  // single `grep '\[panel'` covers boundary + handler events.
  console.error('[panel:boundary] captured render error', captured.value);
  // Returning false stops the error from bubbling further (would
  // otherwise reach app.config.errorHandler which would re-toast it).
  return false;
});

watch(
  () => route.fullPath,
  () => {
    captured.value = null;
    clearRouteError();
  },
);

function retryView(): void {
  captured.value = null;
  clearRouteError();
}

function reload(): void {
  window.location.reload();
}

function goChat(): void {
  captured.value = null;
  clearRouteError();
  void router.replace('/chat');
}
</script>

<template>
  <slot v-if="!activeError" />
  <div
    v-else
    class="flex items-center justify-center min-h-full w-full p-6"
    role="alert"
    aria-live="assertive"
  >
    <div
      class="max-w-xl w-full rounded-lg border border-[var(--border-1, rgba(0,0,0,0.1))] bg-[var(--bg-card, #fff)] p-6 shadow-sm text-center space-y-5"
    >
      <div
        class="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--danger-soft,#fee2e2)] text-[var(--danger,#dc2626)]"
        aria-hidden="true"
      >
        !
      </div>
      <div class="space-y-2">
        <h1 class="text-lg font-semibold text-[var(--text-1)]">{{ t('error.boundaryTitle') }}</h1>
        <p class="text-sm leading-6 text-[var(--text-2)]">{{ t('error.boundaryBody') }}</p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="h-9 rounded-lg bg-[var(--primary,#1677ff)] px-4 text-sm font-medium text-white transition hover:brightness-105 active:scale-[0.98]"
          @click="retryView"
        >
          {{ t('error.retryView') }}
        </button>
        <button
          type="button"
          class="h-9 rounded-lg border border-[var(--border-2,rgba(0,0,0,0.12))] bg-[var(--bg-card,#fff)] px-4 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-elevated,#f7f7f8)] active:scale-[0.98]"
          @click="reload"
        >
          {{ t('error.reload') }}
        </button>
        <button
          type="button"
          class="h-9 rounded-lg border border-[var(--border-2,rgba(0,0,0,0.12))] bg-[var(--bg-card,#fff)] px-4 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-elevated,#f7f7f8)] active:scale-[0.98]"
          @click="goChat"
        >
          {{ t('error.goChat') }}
        </button>
      </div>
      <details class="rounded-lg bg-black/[0.04] p-3 text-left text-xs text-[var(--text-2)] dark:bg-white/[0.06]">
        <summary class="cursor-pointer select-none">{{ t('error.details') }}: {{ activeError.message }}</summary>
        <pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words">{{ activeError.stack || activeError.message }}</pre>
      </details>
    </div>
  </div>
</template>
