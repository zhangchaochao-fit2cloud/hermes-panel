<script setup lang="ts">
import type { ChatMessage } from '@hermes-panel/shared';
import { computed } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useBreakpoint } from '@/composables/use-breakpoint';
import { renderMarkdown } from '@/utils/markdown';
import ToolCallCard from './ToolCallCard.vue';

const props = defineProps<{ message: ChatMessage }>();

const emit = defineEmits<{
  (e: 'regenerate', id: string): void;
  (e: 'edit', content: string): void;
  (e: 'feedback', payload: { id: string; kind: 'up' | 'down' }): void;
}>();

const { t } = useI18n();
const toast = useMessage();
const { isMobile } = useBreakpoint();

// TODO: gate on appearance store's `showLocalMetrics` once that key lands.
// Hard-coded false for now to avoid racing another agent who's adding the key.
const showLocalMetrics = false as const;

const isUser = computed(() => props.message.role === 'user');
const isAssistant = computed(() => props.message.role === 'assistant');

/**
 * Render assistant content through markdown-it; leave user content as
 * plain text. User input rendering would mean a stray "# foo" turns
 * into a giant heading — surprising and rarely intended.
 *
 * markdown-it is robust against partial input, so streaming half-formed
 * fences still render gracefully (the unclosed token shows as text).
 */
const renderedHtml = computed(() =>
  isAssistant.value ? renderMarkdown(props.message.content) : '',
);
// Treat truthy `edited` as the marker. Field isn't on ChatMessage yet — soft read.
const isEdited = computed(
  () => (props.message as unknown as { edited?: boolean }).edited === true,
);

const tokenTotal = computed(() => props.message.tokenUsage?.total);
const tokenBreakdownTitle = computed(() => {
  const u = props.message.tokenUsage;
  if (!u) return undefined;
  const parts: string[] = [];
  if (u.input) parts.push(`In: ${u.input}`);
  if (u.output) parts.push(`Out: ${u.output}`);
  return parts.length ? parts.join(' · ') : undefined;
});

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function qualityColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 font-medium';
  if (score >= 60) return 'text-zinc-500';
  return 'text-orange-600 font-medium';
}

async function copyContent(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content);
    toast.success(t('chat.message.copied'));
  } catch {
    // Clipboard API can reject in non-secure contexts; stay silent on hover toolbar.
  }
}

function onRegenerate(): void {
  emit('regenerate', props.message.id);
}

function onEdit(): void {
  emit('edit', props.message.content);
}

function onFeedback(kind: 'up' | 'down'): void {
  emit('feedback', { id: props.message.id, kind });
}
</script>

<template>
  <div
    class="group relative flex w-full mb-4 message-enter"
    :class="isUser ? 'justify-end' : 'justify-start'"
  >
    <div class="relative max-w-[80%]">
      <!-- hover toolbar: floats above bubble, mirrored by role -->
      <div
        v-if="!isMobile"
        class="absolute -top-7 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10"
        :class="isUser ? 'left-0' : 'right-0'"
      >
        <NButton
          quaternary
          size="tiny"
          :title="t('chat.message.copy')"
          :aria-label="t('chat.message.copy')"
          @click="copyContent"
        >
          📋
        </NButton>

        <NButton
          v-if="isUser"
          quaternary
          size="tiny"
          :title="t('chat.message.edit')"
          :aria-label="t('chat.message.edit')"
          @click="onEdit"
        >
          ✏️
        </NButton>

        <template v-if="isAssistant">
          <NButton
            quaternary
            size="tiny"
            :title="t('chat.message.regenerate')"
            :aria-label="t('chat.message.regenerate')"
            @click="onRegenerate"
          >
            🔄
          </NButton>

          <template v-if="message.completed">
            <NButton
              quaternary
              size="tiny"
              :title="t('chat.message.feedbackUp')"
              :aria-label="t('chat.message.feedbackUp')"
              @click="onFeedback('up')"
            >
              👍
            </NButton>
            <NButton
              quaternary
              size="tiny"
              :title="t('chat.message.feedbackDown')"
              :aria-label="t('chat.message.feedbackDown')"
              @click="onFeedback('down')"
            >
              👎
            </NButton>
          </template>
        </template>
      </div>

      <div
        class="rounded-md px-4 py-3 shadow-[var(--shadow-1)]"
        :class="isUser
          ? 'bg-[var(--brand-500)] text-white'
          : 'bg-[var(--bg-card)] border border-[var(--border)]'"
      >
        <!-- reasoning (collapsed by default) -->
        <details v-if="message.reasoning" class="mb-2 text-xs opacity-70 reasoning-block">
          <summary class="cursor-pointer flex items-center gap-1 select-none list-none">
            <span class="chevron transition-transform inline-block">▸</span>
            <span>{{ t('chat.reasoning') }}</span>
          </summary>
          <div class="mt-1 whitespace-pre-wrap">{{ message.reasoning }}</div>
        </details>

        <!-- tool calls -->
        <div v-if="message.toolCalls?.length" class="mb-2 space-y-2">
          <ToolCallCard
            v-for="tc in message.toolCalls"
            :key="tc.id"
            :tool-call="tc"
          />
        </div>

        <!-- content -->
        <!--
          User text stays plain (whitespace-pre-wrap) so their literal
          input is preserved without accidental markdown rendering.
          Assistant content is markdown — rendered via markdown-it which
          handles partial / streaming input gracefully.
        -->
        <div v-if="isUser" class="whitespace-pre-wrap text-sm leading-relaxed">
          {{ message.content }}
        </div>
        <div v-else class="prose-md text-sm leading-relaxed">
          <!-- eslint-disable vue/no-v-html -->
          <div v-html="renderedHtml" />
          <!-- eslint-enable vue/no-v-html -->
          <span
            v-if="!message.completed"
            class="cursor-blink inline-block w-[2px] h-[1em] align-middle bg-current opacity-70 ml-0.5"
          />
        </div>

        <!-- footer (token usage, time, etc.) -->
        <div
          v-if="message.completed || message.tokenUsage || isEdited"
          class="mt-2 text-[11px] opacity-50 flex items-center gap-2 flex-wrap"
        >
          <span>{{ fmtTime(message.createdAt) }}</span>
          <template v-if="tokenTotal != null">
            <span>·</span>
            <span :title="tokenBreakdownTitle">{{ tokenTotal }} tokens</span>
          </template>
          <template v-if="isUser && isEdited">
            <span>·</span>
            <span class="italic">{{ t('chat.message.edited') }}</span>
          </template>
          <template v-if="showLocalMetrics && isAssistant && message.qualityScore != null">
            <span>·</span>
            <span
              :class="qualityColorClass(message.qualityScore)"
              :title="`本地估算 · 质量 ${message.qualityScore} / 100`"
            >
              q={{ message.qualityScore }}
            </span>
            <span
              v-if="message.hallucinationRisk != null && message.hallucinationRisk > 0.3"
              class="text-orange-600 font-medium"
              :title="`本地启发式估算 · 仅供参考`"
            >
              ⚠ 可能含幻觉 ({{ Math.round(message.hallucinationRisk * 100) }}%)
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reasoning-block summary::-webkit-details-marker {
  display: none;
}
.reasoning-block[open] .chevron {
  transform: rotate(90deg);
}
</style>
