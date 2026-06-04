<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ToolCall } from '@hermes-panel/shared';

const props = defineProps<{
  toolCall: ToolCall;
}>();

const { t } = useI18n();
const showDetails = ref(false);

// 格式化工具调用的输入参数
const formattedInput = computed(() => {
  const input = props.toolCall.input;
  if (!input || typeof input !== 'object') return JSON.stringify(input);
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
});

// 格式化工具调用的输出结果
const formattedOutput = computed(() => {
  const output = props.toolCall.output;
  if (output === undefined || output === null) return null;
  if (typeof output === 'string') return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
});

// 格式化执行时长
const executionDuration = computed(() => {
  if (!props.toolCall.completedAt) return null;
  const ms = props.toolCall.completedAt - props.toolCall.startedAt;
  if (ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
});

// 状态样式
const statusClass = computed(() => {
  const { status } = props.toolCall;
  return {
    'pending': 'status-pending',
    'running': 'status-running',
    'done': 'status-done',
    'error': 'status-error',
  }[status] || 'status-pending';
});

// 状态标签
const statusLabel = computed(() => {
  const { status } = props.toolCall;
  return {
    'pending': t('chat.toolCall.status.pending'),
    'running': t('chat.toolCall.status.running'),
    'done': t('chat.toolCall.status.done'),
    'error': t('chat.toolCall.status.error'),
  }[status] || status;
});
</script>

<template>
  <div class="tool-call-card">
    <!-- Header: Tool name + status + duration -->
    <div class="tool-call-header" @click="showDetails = !showDetails">
      <div class="tool-call-header-left">
        <span class="tool-call-name">🔧 {{ toolCall.name }}</span>
        <span :class="['tool-call-status', statusClass]">
          {{ statusLabel }}
        </span>
        <span v-if="executionDuration" class="tool-call-duration">
          {{ executionDuration }}
        </span>
      </div>
      <svg class="tool-call-chevron" :class="{ open: showDetails }" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <!-- Details: Arguments + Result (expandable) -->
    <transition name="tool-call-expand">
      <div v-if="showDetails" class="tool-call-details">
        <!-- Arguments section -->
        <div class="tool-call-section">
          <div class="tool-call-section-title">
            📥 {{ t('chat.toolCall.arguments') }}
          </div>
          <pre class="tool-call-code">{{ formattedInput }}</pre>
        </div>

        <!-- Result section -->
        <div v-if="formattedOutput || toolCall.status === 'done'" class="tool-call-section">
          <div class="tool-call-section-title">
            📤 {{ t('chat.toolCall.result') }}
          </div>
          <pre v-if="formattedOutput" class="tool-call-code">{{ formattedOutput }}</pre>
          <div v-else class="tool-call-empty">{{ t('chat.toolCall.noResult') }}</div>
        </div>

        <!-- Error section -->
        <div v-if="toolCall.status === 'error' && toolCall.errorMessage" class="tool-call-section">
          <div class="tool-call-section-title tool-call-section-title--error">
            ⚠️ {{ t('chat.toolCall.error') }}
          </div>
          <pre class="tool-call-code tool-call-code--error">{{ toolCall.errorMessage }}</pre>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tool-call-card {
  border: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card) 48%, transparent);
  overflow: hidden;
  transition: background-color var(--dur-fast) var(--ease);
}

.tool-call-card:hover {
  background: color-mix(in srgb, var(--bg-card) 68%, transparent);
}

.tool-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--dur-fast) var(--ease);
}

.tool-call-header:hover {
  background: color-mix(in srgb, var(--bg-elevate) 42%, transparent);
}

.tool-call-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.tool-call-name {
  font-weight: 600;
  color: var(--text-1);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-call-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  flex-shrink: 0;
  white-space: nowrap;
}

.tool-call-status.status-pending {
  background: color-mix(in srgb, var(--brand-400) 18%, transparent);
  color: var(--brand-600);
}

.tool-call-status.status-running {
  background: color-mix(in srgb, var(--brand-500) 22%, transparent);
  color: var(--brand-600);
  animation: pulse-running 1.6s ease-in-out infinite;
}

.tool-call-status.status-done {
  background: color-mix(in srgb, var(--color-success) 18%, transparent);
  color: #059669;
}

.tool-call-status.status-error {
  background: color-mix(in srgb, var(--color-error) 18%, transparent);
  color: #dc2626;
}

@keyframes pulse-running {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.tool-call-duration {
  font-size: 11px;
  color: var(--text-3);
  flex-shrink: 0;
}

.tool-call-chevron {
  width: 16px;
  height: 16px;
  color: var(--text-3);
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease);
}

.tool-call-chevron.open {
  transform: rotate(180deg);
}

.tool-call-details {
  padding: 12px 14px;
  border-top: 1px solid color-mix(in srgb, var(--border) 48%, transparent);
  background: color-mix(in srgb, var(--bg-page) 42%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-call-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-call-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.tool-call-section-title--error {
  color: #dc2626;
}

.tool-call-code {
  margin: 0;
  padding: 8px 11px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-page) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 54%, transparent);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-2);
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-call-code--error {
  border-color: color-mix(in srgb, #dc2626 22%, var(--border));
  background: color-mix(in srgb, #dc2626 8%, var(--bg-page));
  color: #991b1b;
}

.tool-call-empty {
  padding: 8px 11px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-page) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 54%, transparent);
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
}

.tool-call-expand-enter-active,
.tool-call-expand-leave-active {
  transition: all var(--dur-fast) var(--ease);
  overflow: hidden;
}

.tool-call-expand-enter-from,
.tool-call-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.tool-call-expand-enter-to,
.tool-call-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>