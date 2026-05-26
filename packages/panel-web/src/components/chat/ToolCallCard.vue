<script setup lang="ts">
import type { ToolCall } from '@hermes-panel/shared';
import { NButton, NTooltip, useMessage } from 'naive-ui';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ toolCall: ToolCall }>();
const { t } = useI18n();
const message = useMessage();

const statusLabel = computed(() => t(`chat.toolCall.${props.toolCall.status}`));
const durationMs = computed(() =>
  props.toolCall.completedAt ? props.toolCall.completedAt - props.toolCall.startedAt : null,
);
const hasInput = computed(
  () => props.toolCall.input && Object.keys(props.toolCall.input).length > 0,
);
const inputText = computed(() => JSON.stringify(props.toolCall.input ?? {}, null, 2));
const outputText = computed(() => {
  const out = props.toolCall.output;
  if (out === undefined) return '';
  return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
});

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('chat.message.copied'));
  } catch {
    // clipboard may be unavailable (e.g. insecure context); silently ignore.
  }
}
</script>

<template>
  <details
    class="tool-call rounded-md border-l-4 px-3 py-2 text-xs transition-colors"
    :class="{
      'border-emerald-500': toolCall.status === 'done',
      'border-red-500': toolCall.status === 'error',
      'border-amber-500': toolCall.status === 'running',
      'border-zinc-400': toolCall.status === 'pending',
    }"
  >
    <summary class="cursor-pointer flex items-center gap-2 select-none">
      <span class="flex-shrink-0 inline-flex items-center justify-center w-4 h-4">
        <!-- running: rotating arc -->
        <svg
          v-if="toolCall.status === 'running'"
          class="w-4 h-4 animate-spin text-amber-500"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
          <path
            d="M14 8a6 6 0 0 0-6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <!-- done: check -->
        <svg
          v-else-if="toolCall.status === 'done'"
          class="w-4 h-4 text-emerald-500"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- error: x -->
        <svg
          v-else-if="toolCall.status === 'error'"
          class="w-4 h-4 text-red-500"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <!-- pending: clock -->
        <svg
          v-else
          class="w-4 h-4 text-zinc-400"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M8 4.5V8l2.25 1.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="font-mono font-medium">{{ toolCall.name }}</span>
      <span v-if="toolCall.preview" class="opacity-60 truncate max-w-[60ch]">
        {{ toolCall.preview }}
      </span>
      <span class="opacity-60 ml-auto flex-shrink-0 tabular-nums">
        <span v-if="durationMs != null">{{ (durationMs / 1000).toFixed(1) }}s</span>
        <span v-else>{{ statusLabel }}</span>
      </span>
    </summary>
    <div class="mt-2 space-y-2">
      <div v-if="hasInput">
        <div class="flex items-center justify-between mb-1">
          <span class="opacity-60">{{ t('chat.toolCall.input') }}</span>
          <NTooltip :delay="300" trigger="hover">
            <template #trigger>
              <NButton size="tiny" quaternary @click="copy(inputText)">
                {{ t('chat.toolCall.copyInput') }}
              </NButton>
            </template>
            {{ t('chat.toolCall.copyInput') }}
          </NTooltip>
        </div>
        <div class="tool-block tool-block--sm">
          <pre class="tool-pre bg-[var(--bg-elevate)] p-2 rounded font-mono whitespace-pre-wrap break-words">{{ inputText }}</pre>
        </div>
      </div>
      <div v-if="toolCall.output !== undefined">
        <div class="flex items-center justify-between mb-1">
          <span class="opacity-60">{{ t('chat.toolCall.output') }}</span>
          <NTooltip :delay="300" trigger="hover">
            <template #trigger>
              <NButton size="tiny" quaternary @click="copy(outputText)">
                {{ t('chat.toolCall.copyOutput') }}
              </NButton>
            </template>
            {{ t('chat.toolCall.copyOutput') }}
          </NTooltip>
        </div>
        <div class="tool-block tool-block--lg">
          <pre class="tool-pre bg-[var(--bg-elevate)] p-2 rounded font-mono whitespace-pre-wrap break-words">{{ outputText }}</pre>
        </div>
      </div>
      <div v-if="toolCall.errorMessage" class="text-red-600">
        {{ toolCall.errorMessage }}
      </div>
    </div>
  </details>
</template>

<style scoped>
/* Capped, scrollable code blocks with a soft fade at the bottom so the user
   knows there's more content below the visible area. */
.tool-block {
  position: relative;
}
.tool-block--sm .tool-pre {
  max-height: 140px;
  overflow-y: auto;
}
.tool-block--lg .tool-pre {
  max-height: 280px;
  overflow-y: auto;
  /* Soft gradient fade at the bottom edge of the scroll viewport. */
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(to bottom, black calc(100% - 24px), transparent 100%);
}
.tool-block--sm .tool-pre {
  -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%);
  mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%);
}
/* Drop the mask once the content fits — we use a child marker via :has if
   available, but keep the fallback simple: when scrolled to bottom, the
   browser still shows the fade. This is acceptable. */
.tool-pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}
</style>
