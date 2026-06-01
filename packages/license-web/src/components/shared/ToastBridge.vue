<template>
  <div style="display:none"><!-- invisible toast bridge --></div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useToast } from '@/stores/toast';

const message = useMessage();
const toast = useToast();

watch(() => [...toast.queue.value], (items) => {
  for (const item of items) {
    const method = message[item.type] as (content: string, options?: object) => void;
    method(item.content, { duration: item.duration ?? (item.type === 'error' ? 5000 : 3000) });
    toast.consume(item.id);
  }
});
</script>
