<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { SandboxOutput } from '@/stores/sandbox';

const props = defineProps<{ lines: SandboxOutput[] }>();

const container = ref<HTMLElement | null>(null);

watch(
  () => props.lines.length,
  async () => {
    await nextTick();
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight;
    }
  },
);

function lineClass(type: SandboxOutput['type']): string {
  switch (type) {
    case 'stdout': return 'terminal-stdout';
    case 'stderr': return 'terminal-stderr';
    case 'system': return 'terminal-system';
  }
}
</script>

<template>
  <div ref="container" class="terminal-container">
    <div v-if="lines.length === 0" class="terminal-empty">
      <slot name="empty" />
    </div>
    <div v-for="(line, i) in lines" :key="i" :class="['terminal-line', lineClass(line.type)]">
      <span class="terminal-text">{{ line.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.terminal-container {
  background: #1a1b26;
  border-radius: 8px;
  padding: 12px 16px;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-y: auto;
  min-height: 300px;
  max-height: 60vh;
  border: 1px solid #2a2b3d;
}

.terminal-empty {
  color: #565f89;
  text-align: center;
  padding: 40px 0;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-stdout {
  color: #9ece6a;
}

.terminal-stderr {
  color: #f7768e;
}

.terminal-system {
  color: #565f89;
  font-style: italic;
}

.terminal-text {
  display: inline;
}
</style>
