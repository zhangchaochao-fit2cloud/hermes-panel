<script setup lang="ts">
import { computed } from 'vue';
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const props = withDefaults(defineProps<{
  code: string;
  lang?: string;
  maxHeight?: string;
  tone?: 'default' | 'warning' | 'error';
}>(), {
  lang: '',
  maxHeight: '520px',
  tone: 'default',
});

const { t } = useI18n();
const message = useMessage();

const blockStyle = computed(() => ({
  maxHeight: props.maxHeight,
}));

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code);
    message.success(t('common.copied'));
  } catch {
    message.error(t('common.copyFailed'));
  }
}
</script>

<template>
  <div class="code-block" :class="`is-${tone}`">
    <div class="code-block-toolbar">
      <span class="code-block-lang">{{ lang || 'text' }}</span>
      <button type="button" class="code-block-copy" @click="copy">
        {{ t('common.copy') }}
      </button>
    </div>
    <pre class="code-block-body" :style="blockStyle"><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code-block {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: var(--radius-md);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--bg-card) 94%, var(--bg-elevate)),
      var(--bg-elevate)
    );
}

.code-block.is-warning {
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
}

.code-block.is-error {
  border-color: color-mix(in srgb, #ef4444 28%, var(--border));
}

.code-block-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  padding: 0 8px 0 12px;
}

.code-block-lang {
  min-width: 0;
  overflow: hidden;
  color: var(--text-3);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-block-copy {
  border-radius: 7px;
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 5px 8px;
  transition:
    background-color var(--dur-fast, 120ms) var(--ease, ease),
    transform var(--dur-fast, 120ms) var(--ease, ease);
}

.code-block-copy:hover {
  background: color-mix(in srgb, var(--brand-500) 10%, transparent);
}

.code-block-copy:active {
  transform: scale(0.98);
}

.code-block-body {
  margin: 0;
  overflow: auto;
  padding: 12px;
  color: var(--text-1);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.65;
  tab-size: 2;
  white-space: pre;
}

.code-block.is-warning .code-block-body {
  color: color-mix(in srgb, #f59e0b 78%, var(--text-1));
}

.code-block.is-error .code-block-body {
  color: color-mix(in srgb, #ef4444 78%, var(--text-1));
}
</style>
