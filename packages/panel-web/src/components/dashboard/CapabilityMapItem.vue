<script setup lang="ts">
defineProps<{
  state: 'ready' | 'partial' | 'planned';
  title: string;
  description: string;
  example: string;
  statusLabel: string;
  statusClass: string;
  canOpen: boolean;
  canUse: boolean;
  openLabel: string;
  useLabel: string;
}>();

defineEmits<{
  open: [];
  use: [];
}>();
</script>

<template>
  <article class="capability-item" :class="[statusClass, canOpen || canUse ? 'can-act' : 'is-disabled']">
    <span class="capability-dot" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <h4 class="truncate text-sm font-medium text-[var(--text-1)]">
          {{ title }}
        </h4>
        <span class="capability-status">
          {{ statusLabel }}
        </span>
      </div>
      <p class="mt-1 text-left text-xs leading-5 text-[var(--text-3)]">
        {{ description }}
      </p>
      <p class="mt-1 text-left text-[11px] leading-4 text-[var(--text-2)]">
        {{ example }}
      </p>
      <div class="capability-actions">
        <button
          v-if="canUse"
          type="button"
          class="capability-action is-primary"
          @click="$emit('use')"
        >
          {{ useLabel }}
        </button>
        <button
          v-if="canOpen"
          type="button"
          class="capability-action"
          @click="$emit('open')"
        >
          {{ openLabel }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.capability-item {
  display: flex;
  width: 100%;
  min-height: 122px;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 11px;
  color: inherit;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.capability-item.can-act:hover {
  border-color: color-mix(in srgb, var(--brand-500) 44%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 7%, var(--bg-card));
  transform: translateY(-1px);
}

.capability-item.is-disabled {
  opacity: 0.72;
}

.capability-dot {
  margin-top: 5px;
  height: 9px;
  width: 9px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--text-3);
}

.capability-item.is-ready .capability-dot {
  background: var(--color-success);
}

.capability-item.is-partial .capability-dot {
  background: var(--color-warning);
}

.capability-status {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 2px 7px;
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.4;
}

.capability-item.is-ready .capability-status {
  border-color: color-mix(in srgb, var(--color-success) 40%, var(--border));
  color: var(--color-success);
}

.capability-item.is-partial .capability-status {
  border-color: color-mix(in srgb, var(--color-warning) 44%, var(--border));
  color: var(--color-warning);
}

.capability-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.capability-action {
  min-height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-elevate);
  color: var(--text-2);
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 680;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.capability-action:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-500) 46%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 8%, var(--bg-elevate));
  color: var(--brand-600);
}

.capability-action.is-primary {
  border-color: color-mix(in srgb, var(--brand-500) 54%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 10%, var(--bg-elevate));
  color: var(--brand-600);
}

</style>
