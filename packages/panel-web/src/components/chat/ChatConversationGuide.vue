<script setup lang="ts">
interface ConversationGuideAction {
  key: string;
  route?: string;
  promptKey?: string;
}

defineProps<{
  actions: ConversationGuideAction[];
}>();

defineEmits<{
  select: [action: ConversationGuideAction];
}>();
</script>

<template>
  <div class="conversation-guide mt-4">
    <div class="conversation-guide-header">
      <p>{{ $t('chat.readiness.conversationTitle') }}</p>
      <span>{{ $t('chat.readiness.conversationDesc') }}</span>
    </div>
    <div class="conversation-guide-actions">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="conversation-guide-action"
        @click="$emit('select', action)"
      >
        <span class="conversation-guide-action-title">
          {{ $t(`chat.readiness.conversation.${action.key}.title`) }}
        </span>
        <span class="conversation-guide-action-desc">
          {{ $t(`chat.readiness.conversation.${action.key}.desc`) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.conversation-guide {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevate);
  padding: 12px;
}

.conversation-guide-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.conversation-guide-header p {
  color: var(--text-1);
  font-size: 12px;
  font-weight: 700;
  margin: 0;
}

.conversation-guide-header span {
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.45;
  max-width: 360px;
}

.conversation-guide-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 10px;
}

.conversation-guide-action {
  min-height: 72px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  padding: 10px;
  text-align: left;
  transition: border-color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}

.conversation-guide-action:hover {
  border-color: color-mix(in srgb, var(--brand-500) 42%, var(--border));
  background: color-mix(in srgb, var(--brand-500) 5%, var(--bg-card));
}

.conversation-guide-action-title {
  color: var(--text-1);
  display: block;
  font-size: 12px;
  font-weight: 700;
}

.conversation-guide-action-desc {
  color: var(--text-3);
  display: block;
  font-size: 11px;
  line-height: 1.4;
  margin-top: 4px;
}

@media (max-width: 640px) {
  .conversation-guide-header,
  .conversation-guide-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
