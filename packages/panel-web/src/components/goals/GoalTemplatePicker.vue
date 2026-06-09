<script setup lang="ts">
import { NButton } from 'naive-ui';
import type { GoalTemplate } from '@/data/goalTemplates';

defineProps<{
  templates: GoalTemplate[];
}>();

defineEmits<{
  select: [template: GoalTemplate];
}>();
</script>

<template>
  <section class="goal-template-picker" aria-label="Goal quick start templates">
    <div class="goal-template-picker__header">
      <div>
        <p class="goal-template-picker__eyebrow">{{ $t('goals.templates.eyebrow') }}</p>
        <h3>{{ $t('goals.templates.title') }}</h3>
      </div>
      <p>{{ $t('goals.templates.description') }}</p>
    </div>

    <div class="goal-template-picker__grid">
      <article v-for="template in templates" :key="template.key" class="goal-template-card">
        <div>
          <h4>{{ template.title }}</h4>
          <p>{{ template.description }}</p>
        </div>
        <NButton size="small" secondary type="primary" @click="$emit('select', template)">
          {{ $t('goals.templates.use') }}
        </NButton>
      </article>
    </div>
  </section>
</template>

<style scoped>
.goal-template-picker {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
  padding: 16px;
  margin-bottom: 18px;
}

.goal-template-picker__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.goal-template-picker__header h3 {
  color: var(--text-1);
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.goal-template-picker__header p {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  max-width: 520px;
}

.goal-template-picker__eyebrow {
  color: var(--brand-600) !important;
  font-size: 11px !important;
  font-weight: 700;
  letter-spacing: 0;
  margin-bottom: 3px !important;
  text-transform: uppercase;
}

.goal-template-picker__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.goal-template-card {
  align-items: flex-start;
  background: var(--bg-elevate);
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 142px;
  padding: 13px;
}

.goal-template-card h4 {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 6px;
}

.goal-template-card p {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
  margin: 0 0 12px;
}

@media (max-width: 960px) {
  .goal-template-picker__header {
    flex-direction: column;
  }

  .goal-template-picker__grid {
    grid-template-columns: 1fr;
  }
}
</style>
