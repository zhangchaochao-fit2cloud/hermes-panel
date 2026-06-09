<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ query: string }>();
const emit = defineEmits<{ (e: 'pick', prompt: string): void }>();

const { t } = useI18n();

const commandIds = ['help', 'model', 'local', 'tools', 'review', 'plan'] as const;

const commands = computed(() => commandIds.map(id => ({
  id,
  command: `/${id}`,
  label: t(`chat.slash.${id}.label`),
  desc: t(`chat.slash.${id}.desc`),
  prompt: t(`chat.slash.${id}.prompt`),
})));

const filteredCommands = computed(() => {
  const q = props.query.trim().toLowerCase();
  if (!q) return commands.value;
  return commands.value.filter(item =>
    item.id.includes(q)
    || item.command.includes(q)
    || item.label.toLowerCase().includes(q)
    || item.desc.toLowerCase().includes(q),
  );
});
</script>

<template>
  <div
    v-if="filteredCommands.length"
    class="slash-shortcuts mx-3 mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevate)] p-2"
  >
    <div class="mb-1 flex items-center justify-between px-2">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
        {{ t('chat.slash.title') }}
      </span>
      <span class="text-[10px] text-[var(--text-3)]">
        {{ t('chat.slash.hint') }}
      </span>
    </div>
    <button
      v-for="item in filteredCommands"
      :key="item.id"
      type="button"
      class="slash-shortcut-row"
      @click="emit('pick', item.prompt)"
    >
      <code class="slash-command">{{ item.command }}</code>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium text-[var(--text-1)]">{{ item.label }}</span>
        <span class="block truncate text-[11px] text-[var(--text-3)]">{{ item.desc }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.slash-shortcut-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 8px;
  text-align: left;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.slash-shortcut-row:hover {
  background: var(--bg-card);
}

.slash-command {
  flex: 0 0 auto;
  min-width: 56px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 3px 7px;
  color: var(--brand-600);
  font-size: 11px;
}
</style>
