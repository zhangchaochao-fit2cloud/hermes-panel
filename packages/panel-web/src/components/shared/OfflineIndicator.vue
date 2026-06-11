<script setup lang="ts">
import { useNotification } from 'naive-ui';
import { watch } from 'vue';
import { useOffline } from '@/composables/useOffline';

const notification = useNotification();
let offlineNotification: ReturnType<typeof notification.warning> | null = null;

const { isOffline } = useOffline(() => {
  if (offlineNotification) {
    offlineNotification.destroy();
    offlineNotification = null;
  }
  notification.success({
    content: 'Back online',
    duration: 3000,
  });
});

watch(isOffline, (offline) => {
  if (offline) {
    offlineNotification = notification.warning({
      content: 'You are offline',
      duration: 0,
    });
  }
});
</script>

<template>
  <div class="offline-indicator" :class="{ visible: isOffline }">
    <span class="offline-dot" />
    <span>Offline</span>
  </div>
</template>

<style scoped>
.offline-indicator {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%) translateY(60px);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid color-mix(in srgb, #f87171 30%, var(--border));
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #f87171;
  opacity: 0;
  transition: transform 0.3s var(--ease, ease), opacity 0.3s var(--ease, ease);
  z-index: 9999;
  pointer-events: none;
}

.offline-indicator.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.offline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f87171;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
