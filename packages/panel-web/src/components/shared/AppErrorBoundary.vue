<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { useI18n } from 'vue-i18n';

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

const captured = ref<Error | null>(null);

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

function reload(): void {
  window.location.reload();
}
</script>

<template>
  <slot v-if="!captured" />
  <div
    v-else
    class="flex items-center justify-center min-h-[60vh] w-full p-6"
    role="alert"
    aria-live="assertive"
  >
    <div
      class="max-w-lg w-full rounded-lg border border-[var(--border-1, rgba(0,0,0,0.1))] bg-[var(--bg-card, #fff)] p-6 shadow-sm text-center space-y-4"
    >
      <div class="text-4xl" aria-hidden="true">🔥</div>
      <h1 class="text-lg font-semibold">{{ t('error.boundaryTitle') }}</h1>
      <p class="text-sm opacity-70">{{ t('error.boundaryBody') }}</p>
      <details class="text-left text-xs opacity-70 rounded bg-black/5 dark:bg-white/5 p-3">
        <summary class="cursor-pointer select-none">{{ captured.message }}</summary>
        <pre class="mt-2 whitespace-pre-wrap break-words overflow-x-auto">{{ captured.stack || captured.message }}</pre>
      </details>
      <button
        type="button"
        class="px-4 py-2 rounded bg-[var(--primary, #1677ff)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        @click="reload"
      >
        {{ t('error.reload') }}
      </button>
    </div>
  </div>
</template>
