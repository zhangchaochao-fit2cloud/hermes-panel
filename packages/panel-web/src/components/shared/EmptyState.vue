<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; icon?: string }>();
</script>

<template>
  <div class="empty-state flex flex-col items-center justify-center gap-3 py-12 text-center">
    <slot name="icon">
      <div v-if="icon" class="empty-state-icon" aria-hidden="true">{{ icon }}</div>
    </slot>
    <h2 class="text-base font-semibold text-[var(--text-1)]">{{ title }}</h2>
    <p v-if="subtitle" class="max-w-md text-sm leading-6 text-[var(--text-3)]">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-500) 18%, var(--border));
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--brand-500) 14%, var(--bg-card)),
      color-mix(in srgb, var(--bg-elevate) 86%, transparent)
    );
  color: var(--brand-600);
  font-size: 22px;
  line-height: 1;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--brand-500) 10%, transparent);
}
</style>
