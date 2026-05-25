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
</script>

<template>
  <div class="border border-[var(--border)] rounded-md bg-[var(--bg-card)] shadow-[var(--shadow-1)]">
    <textarea
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
