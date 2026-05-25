<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; icon?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div v-if="icon" class="text-4xl">{{ icon }}</div>
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="subtitle" class="text-sm opacity-60">{{ subtitle }}</p>
    <slot />
  </div>
</template>
