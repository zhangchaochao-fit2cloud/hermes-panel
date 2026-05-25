<script setup lang="ts">
defineProps<{ code: string; lang?: string }>();
</script>

<template>
  <pre class="rounded-md bg-[var(--bg-elevate)] p-3 text-xs font-mono overflow-x-auto"><code>{{ code }}</code></pre>
</template>
