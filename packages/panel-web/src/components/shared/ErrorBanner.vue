<script setup lang="ts">
defineProps<{
  message: string;
  retryLabel?: string;
  surface?: 'page' | 'inline';
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div
    class="error-banner"
    :class="{ 'is-inline': surface === 'inline' }"
    role="alert"
    aria-live="polite"
  >
    <div class="error-banner-icon" aria-hidden="true">!</div>
    <div class="min-w-0 flex-1 truncate text-xs leading-5 text-[var(--text-2)]">
      {{ message }}
    </div>
    <button
      v-if="retryLabel"
      type="button"
      class="error-banner-action"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid color-mix(in srgb, #ef4444 22%, var(--border));
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, #ef4444 10%, var(--bg-card)),
      color-mix(in srgb, var(--bg-card) 92%, transparent)
    );
  padding: 7px 16px;
}

.error-banner.is-inline {
  border: 1px solid color-mix(in srgb, #ef4444 22%, var(--border));
  border-radius: var(--radius-md);
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, #ef4444 9%, var(--bg-card)),
      color-mix(in srgb, var(--bg-card) 96%, transparent)
    );
  padding: 8px 12px;
}

.error-banner-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, #ef4444 16%, var(--bg-card));
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.error-banner-action {
  flex: 0 0 auto;
  border-radius: 7px;
  padding: 3px 8px;
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 600;
  transition: background-color var(--dur-fast, 120ms) var(--ease, ease), transform var(--dur-fast, 120ms) var(--ease, ease);
}

.error-banner-action:hover {
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
}

.error-banner-action:active {
  transform: scale(0.98);
}
</style>
