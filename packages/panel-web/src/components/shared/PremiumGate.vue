<script setup lang="ts">
import { computed } from 'vue';
import type { PremiumFeature } from '@hermes-panel/shared';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  feature: PremiumFeature;
}>();

const auth = useAuthStore();
const enabled = computed(() => auth.isFeatureEnabled(props.feature));
</script>

<template>
  <slot v-if="enabled" />
  <div v-else class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div class="text-3xl opacity-40">&#128274;</div>
    <p class="text-sm text-[var(--text-3)] max-w-xs">
      此功能需要 License 激活。
    </p>
    <RouterLink
      to="/settings"
      class="text-sm text-[var(--brand-600)] hover:underline"
    >
      前往设置激活 License
    </RouterLink>
  </div>
</template>
