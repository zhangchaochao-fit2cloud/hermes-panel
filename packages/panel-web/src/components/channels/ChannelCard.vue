<script setup lang="ts">
import type { ChannelStatus, ChannelName } from '@hermes-panel/shared';
import { CHANNEL_META } from '@hermes-panel/shared';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  channel: ChannelStatus;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'configure', name: ChannelName): void;
}>();

const meta = CHANNEL_META[props.channel.name];

/** Whether this channel supports binding (backend reports bound status) */
const supportsBinding = props.channel.bound !== undefined;

function bindLabel(): string {
  if (!supportsBinding) return '';
  return props.channel.bound ? t('channels.card.bound') : t('channels.card.notBound');
}

function bindClass(): string {
  if (!supportsBinding || !props.channel.enabled) return '';
  return props.channel.bound
    ? 'bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] text-[var(--color-success)]'
    : 'bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] text-[var(--color-warning)]';
}
</script>

<template>
  <div
    class="channel-card group rounded-xl border p-4 transition-all cursor-pointer"
    :class="[
      channel.enabled
        ? 'border-[color-mix(in_srgb,var(--brand-500)_30%,var(--border))] bg-[color-mix(in_srgb,var(--brand-500)_3%,var(--bg-card))]'
        : 'border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[var(--bg-card)] hover:border-[color-mix(in_srgb,var(--border)_80%,transparent)]',
    ]"
    @click="emit('configure', channel.name)"
  >
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2.5">
        <span class="text-xl leading-none">{{ meta.icon }}</span>
        <div>
          <div class="text-sm font-semibold text-[var(--text-1)]">{{ meta.label }}</div>
          <div class="text-xs text-[var(--text-3)]">{{ meta.labelEn }}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span
          v-if="saving"
          class="w-3.5 h-3.5 border-2 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin"
        />
        <span
          v-else
          class="inline-block w-2 h-2 rounded-full"
          :class="channel.enabled ? 'bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]' : 'bg-[var(--text-3)]'"
        />
        <span class="text-xs text-[var(--text-3)]">{{ channel.enabled ? t('channels.card.enabled') : t('channels.card.disabled') }}</span>
      </div>
    </div>
    <p class="text-xs text-[var(--text-3)] leading-relaxed line-clamp-2">{{ meta.description }}</p>

    <!-- Bind status badge -->
    <div v-if="supportsBinding && channel.enabled" class="mt-2.5">
      <span class="inline-block text-xs px-2 py-0.5 rounded-full font-medium" :class="bindClass()">
        {{ bindLabel() }}
      </span>
    </div>
  </div>
</template>
