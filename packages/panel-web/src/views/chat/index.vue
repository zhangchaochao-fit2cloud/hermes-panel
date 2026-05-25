<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';
import { useChatStreamStore } from '@/stores/chat-stream';
import { useSystemStore } from '@/stores/system';
import MessageBubble from '@/components/chat/MessageBubble.vue';
import Composer from '@/components/chat/Composer.vue';
import EmptyState from '@/components/shared/EmptyState.vue';

const { t } = useI18n();
const session = useSessionStore();
const stream = useChatStreamStore();
const system = useSystemStore();
const { messages } = storeToRefs(session);
const { state } = storeToRefs(stream);

const model = ref('hermes-agent');
const thinkingSpeed = ref<'fast' | 'extended' | 'auto'>('auto');
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);

onMounted(async () => {
  await system.refresh();
  await system.loadToken();
});

watch(messages, async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}, { deep: true });

watch(state, (s) => {
  sending.value = s === 'creating' || s === 'streaming' || s === 'reconnecting';
});

async function onSend(text: string): Promise<void> {
  await stream.send(text, model.value);
}

function onStop(): void {
  stream.abort();
}
</script>

<template>
  <div class="flex h-full w-full">
    <main class="flex-1 flex flex-col min-w-0">
      <div ref="scroller" class="flex-1 overflow-y-auto px-6 py-4">
        <EmptyState
          v-if="messages.length === 0"
          icon="💬"
          :title="t('chat.empty.title')"
          :subtitle="t('chat.empty.subtitle', { model })"
        />
        <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
      </div>
      <div class="px-6 pb-4">
        <Composer
          v-model:model="model"
          v-model:thinking-speed="thinkingSpeed"
          :sending="sending"
          @send="onSend"
          @stop="onStop"
        />
      </div>
    </main>
  </div>
</template>
