<script setup lang="ts">
interface FirstRunAction {
  key: string;
  route: string;
  draftKey?: string;
}

defineProps<{
  actions: FirstRunAction[];
}>();

defineEmits<{
  select: [action: FirstRunAction];
}>();
</script>

<template>
  <div class="first-run-path mt-4">
    <div class="min-w-0">
      <p class="text-sm font-semibold text-[var(--text-1)]">
        {{ $t('dashboard.quickStart.firstRun.title') }}
      </p>
      <p class="mt-1 text-xs leading-5 text-[var(--text-3)]">
        {{ $t('dashboard.quickStart.firstRun.desc') }}
      </p>
    </div>
    <div class="first-run-actions">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="first-run-action"
        @click="$emit('select', action)"
      >
        <span class="first-run-action-title">
          {{ $t(`dashboard.quickStart.firstRun.${action.key}.title`) }}
        </span>
        <span class="first-run-action-desc">
          {{ $t(`dashboard.quickStart.firstRun.${action.key}.desc`) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.first-run-path {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--brand-500) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 5%, var(--bg-elevate));
  padding: 12px;
}

.first-run-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.first-run-action {
  min-height: 74px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 10px;
  text-align: left;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.first-run-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 48%, var(--border));
  transform: translateY(-1px);
}

.first-run-action-title {
  display: block;
  color: var(--text-1);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.first-run-action-desc {
  display: block;
  margin-top: 4px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.35;
}

@media (max-width: 1024px) {
  .first-run-path,
  .first-run-actions {
    grid-template-columns: 1fr;
  }
}
</style>
