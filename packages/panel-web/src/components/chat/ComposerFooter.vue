<script setup lang="ts">
import { computed } from 'vue';
import ContextRing from './ContextRing.vue';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto';
  disabled: boolean;
  sending: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto'): void;
  (e: 'send'): void;
  (e: 'stop'): void;
}>();

const speedLabel = computed(() => ({
  fast: '⚡ 快速',
  extended: '🧠 深度',
  auto: '🤖 自动',
}[props.thinkingSpeed]));

function cycleSpeed(): void {
  const order: Array<'fast' | 'auto' | 'extended'> = ['fast', 'auto', 'extended'];
  const next = order[(order.indexOf(props.thinkingSpeed as 'fast' | 'auto' | 'extended') + 1) % order.length];
  emit('update:thinkingSpeed', next);
}
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]">
    <button
      class="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevate)]"
      :title="model"
    >
      {{ model }} ▾
    </button>
    <button
      class="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevate)]"
      @click="cycleSpeed"
    >
      {{ speedLabel }}
    </button>
    <span class="flex-1" />
    <ContextRing
      :used="session.tokenUsage.total"
      :limit="session.contextLimit"
      :cost="session.tokenUsage.cost"
    />
    <button
      v-if="sending"
      class="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm hover:bg-red-600"
      @click="emit('stop')"
    >
      ⏹ 停止
    </button>
    <button
      v-else
      class="px-3 py-1.5 rounded-md bg-[var(--brand-500)] text-white text-sm hover:bg-[var(--brand-600)] disabled:opacity-50"
      :disabled="disabled"
      @click="emit('send')"
    >
      ➤ 发送
    </button>
  </div>
</template>
