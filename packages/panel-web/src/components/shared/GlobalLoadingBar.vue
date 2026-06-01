<script setup lang="ts">
import { computed } from 'vue';
import { globalRequestLoading } from '@/api/bff';
import { routeLoading } from '@/utils/route-loading';

const isLoading = computed(() => globalRequestLoading.value || routeLoading.value);
</script>

<template>
  <div
    class="global-loading-track"
    :class="{ 'is-loading': isLoading }"
    aria-hidden="true"
  >
    <div class="global-loading-bar" />
  </div>
</template>
