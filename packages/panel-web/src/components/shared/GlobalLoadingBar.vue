<script setup lang="ts">
import { globalRequestLoading } from '@/api/bff';
</script>

<template>
  <div
    class="global-loading-track"
    :class="{ 'is-loading': globalRequestLoading }"
    aria-hidden="true"
  >
    <div class="global-loading-bar" />
  </div>
</template>
