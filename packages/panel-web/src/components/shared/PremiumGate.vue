<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PremiumFeature } from '@hermes-panel/shared';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();

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
      {{ t('settings.license.premiumRequired') }}
    </p>
    <RouterLink
      to="/settings"
      class="text-sm text-[var(--brand-600)] hover:underline"
    >
      {{ t('settings.license.goActivate') }}
    </RouterLink>
  </div>
</template>
