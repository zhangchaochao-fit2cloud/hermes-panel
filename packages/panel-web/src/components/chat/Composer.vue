<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ComposerFooter from './ComposerFooter.vue';

const { t } = useI18n();

const props = defineProps<{
  model: string;
  thinkingSpeed: 'fast' | 'extended' | 'auto';
  sending: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', text: string): void;
  (e: 'stop'): void;
  (e: 'update:model', v: string): void;
  (e: 'update:thinkingSpeed', v: 'fast' | 'extended' | 'auto'): void;
}>();

const text = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const canSend = computed(() => text.value.trim().length > 0 && !props.sending);

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
  }
}

function submit(): void {
  if (!canSend.value) return;
  emit('send', text.value.trim());
  text.value = '';
}

/** Prepend an @role mention so the user can keep typing the request. */
function prependMention(roleId: string): void {
  const prefix = `@${roleId} `;
  text.value = prefix + text.value.replace(/^@[\w-]+\s+/, '');
  focus();
}

/** Externally populate the composer (e.g. from VS Code draft, sample prompts). */
function setText(v: string): void {
  text.value = v;
  focus();
}

function focus(): void {
  // Wait a tick so the new value is rendered before we move the cursor
  setTimeout(() => {
    const el = textareaRef.value;
    if (!el) return;
    el.focus();
    // Place caret at the end so the user can keep typing
    el.setSelectionRange(text.value.length, text.value.length);
  }, 0);
}

defineExpose({ prependMention, setText, focus });
</script>

<template>
  <div class="border border-[var(--border)] rounded-md bg-[var(--bg-card)] shadow-[var(--shadow-1)]">
    <textarea
      ref="textareaRef"
      v-model="text"
      :placeholder="t('chat.composer.placeholder')"
      class="w-full resize-none outline-none bg-transparent p-3 text-sm font-sans max-h-[200px]"
      rows="2"
      @keydown="onKeydown"
    />
    <ComposerFooter
      :model="model"
      :thinking-speed="thinkingSpeed"
      :disabled="!canSend"
      :sending="sending"
      @update:model="$emit('update:model', $event)"
      @update:thinking-speed="$emit('update:thinkingSpeed', $event)"
      @send="submit"
      @stop="$emit('stop')"
    />
  </div>
</template>
