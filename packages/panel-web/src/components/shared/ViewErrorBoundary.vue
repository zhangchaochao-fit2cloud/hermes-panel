<script setup lang="ts">
import { ref, onErrorCaptured, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{ name: string }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const error = ref<Error | null>(null);
const renderKey = ref(0);

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err));
  console.error(`[panel:view-boundary:${props.name}]`, error.value);
  return false;
});

watch(() => route.fullPath, () => { error.value = null; });

function retry(): void {
  error.value = null;
  renderKey.value++;
}

function goChat(): void {
  error.value = null;
  void router.replace('/chat');
}
</script>

<template>
  <slot v-if="!error" :key="renderKey" />
  <div
    v-else
    class="flex items-center justify-center min-h-[320px] w-full p-6"
    role="alert"
    aria-live="assertive"
  >
    <div class="max-w-md w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm text-center space-y-4">
      <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--danger-soft,#fee2e2)] text-[var(--danger,#dc2626)]" aria-hidden="true">!</div>
      <h2 class="text-base font-semibold text-[var(--text-1)]">{{ t('error.boundaryTitle') }}</h2>
      <p class="text-xs text-[var(--text-3)] break-all">{{ error.message }}</p>
      <div class="flex items-center justify-center gap-2">
        <button
          type="button"
          class="h-8 rounded-lg bg-[var(--primary,#1677ff)] px-3 text-sm font-medium text-white transition hover:brightness-105 active:scale-[0.98]"
          @click="retry"
        >{{ t('error.retryView') }}</button>
        <button
          type="button"
          class="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--bg-elevated,#f7f7f8)] active:scale-[0.98]"
          @click="goChat"
        >{{ t('error.goChat') }}</button>
      </div>
    </div>
  </div>
</template>
