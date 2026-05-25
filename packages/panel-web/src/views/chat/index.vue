<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useMessage } from 'naive-ui';
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
const message = useMessage();

const { messages } = storeToRefs(session);
const { state, lastError, lastErrorCode } = storeToRefs(stream);

const model = ref('hermes-agent');
const thinkingSpeed = ref<'fast' | 'extended' | 'auto'>('auto');
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);

onMounted(async () => {
  console.info('[chat] onMounted: calling system.refresh + system.loadToken');
  await system.refresh();
  console.info('[chat] system.refresh done. health=', system.health, 'error=', system.error);
  await system.loadToken();
  console.info('[chat] system.loadToken done. hermesApiBase=', system.hermesApiBase, 'hermesApiKey=', system.hermesApiKey ? '<set>' : '<null>', 'error=', system.error);

  if (system.error) {
    message.error(`Init failed: ${system.error}`, { duration: 0, closable: true });
  }
});

watch(messages, async () => {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
}, { deep: true });

watch(state, (s, prev) => {
  sending.value = s === 'creating' || s === 'streaming' || s === 'reconnecting';

  if (s === 'error' && prev !== 'error') {
    const code = lastErrorCode.value ?? 'UNKNOWN';
    const detail = lastError.value ?? t('error.unknown');
    const headline = {
      HERMES_API_UNREACHABLE: t('error.hermes_not_found'),
      HERMES_API_UNAUTHORIZED: '认证失败：API key 无效或缺失',
      HERMES_API_SERVER_ERROR: 'Hermes 内部错误',
      HERMES_API_BAD_REQUEST: '请求被拒绝',
      HERMES_RUN_ERROR: '运行失败',
      UNKNOWN: '出错了',
    }[code] ?? '出错了';

    // Show the raw error detail so users can self-diagnose (dev-friendly).
    const full = `${headline}\n${detail}`;
    console.error('[chat] error', { code, detail });
    message.error(full, { duration: 10000, closable: true });
  }
});

const sampleQuestions = [
  '帮我查下今天的天气',
  '用 Vue 3 写一个 todo 组件',
  '解释一下 Tauri 和 Electron 的区别',
];

async function onSend(text: string): Promise<void> {
  await stream.send(text, model.value);
}

function onStop(): void {
  stream.abort();
}

function trySample(q: string): void {
  void onSend(q);
}
</script>

<template>
  <div class="flex h-full w-full bg-[var(--bg-page)]">
    <main class="flex-1 flex flex-col min-w-0">
      <div ref="scroller" class="flex-1 overflow-y-auto px-6 py-4">
        <div class="max-w-3xl mx-auto">
          <EmptyState
            v-if="messages.length === 0"
            icon="💬"
            :title="t('chat.empty.title')"
            :subtitle="t('chat.empty.subtitle', { model })"
          >
            <div class="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              <button
                v-for="q in sampleQuestions"
                :key="q"
                class="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-card)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] transition-colors"
                @click="trySample(q)"
              >
                {{ q }}
              </button>
            </div>
          </EmptyState>
          <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
        </div>
      </div>
      <div class="px-6 pb-4">
        <div class="max-w-3xl mx-auto">
          <Composer
            v-model:model="model"
            v-model:thinking-speed="thinkingSpeed"
            :sending="sending"
            @send="onSend"
            @stop="onStop"
          />
        </div>
      </div>
    </main>
  </div>
</template>
