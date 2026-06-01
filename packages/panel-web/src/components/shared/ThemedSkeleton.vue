<script setup lang="ts">
/**
 * 主题感知的占位 loading — 替代裸 NSkeleton 的"灰色矩形"。
 *
 * 各主题的视觉策略：
 *   - dark:             深灰底 + 缓慢光带扫过
 *   - glass-*:          毛玻璃 + 柔光晕动画（与玻璃主题的 backdrop-filter 呼应）
 *   - 其它（light默认）: 浅灰底 + 轻微 shimmer
 *
 * 主题判断走 data-theme 属性 — 与 stores/appearance.ts 保持一致。
 * 不引入额外依赖，纯 CSS 动画。
 */
defineProps<{
  /** 高度，默认 48px。可以传 '48px' / '2rem' 等任何 CSS 值。 */
  height?: string;
  /** 重复行数，默认 1 */
  repeat?: number;
  /** 圆角，默认走 var(--radius-md) */
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}>();
</script>

<template>
  <div class="themed-skeleton-group flex flex-col gap-2">
    <div
      v-for="i in (repeat ?? 1)"
      :key="i"
      class="themed-skeleton"
      :class="{
        'rounded-sm': rounded === 'sm',
        'rounded-md': !rounded || rounded === 'md',
        'rounded-lg': rounded === 'lg',
        'rounded-full': rounded === 'full',
      }"
      :style="{ height: height ?? '48px' }"
      role="status"
      aria-busy="true"
    />
  </div>
</template>

<style scoped>
.themed-skeleton {
  position: relative;
  width: 100%;
  background: color-mix(in srgb, var(--bg-elevate) 70%, var(--border));
  overflow: hidden;
  animation: ts-pulse 1.6s ease-in-out infinite;
}
.themed-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--text-1) 6%, transparent) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: ts-shimmer 1.8s linear infinite;
}
@keyframes ts-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.72; }
}
@keyframes ts-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%);  }
}

/* dark — 深底 + 蓝调 shimmer */
:global(:root[data-theme='dark']) .themed-skeleton {
  background: color-mix(in srgb, var(--bg-elevate) 88%, black);
}
:global(:root[data-theme='dark']) .themed-skeleton::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--brand-500) 18%, transparent) 50%,
    transparent 100%
  );
}

/* glass-* — 半透明 + 柔光晕扫过 */
:global(:root[data-theme^='glass-']) .themed-skeleton {
  background: color-mix(in srgb, var(--bg-card) 50%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
:global(:root[data-theme^='glass-']) .themed-skeleton::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, white 25%, transparent) 50%,
    transparent 100%
  );
  animation-duration: 2.4s;
}

/* 用户偏好减少动画 — 完全停掉 */
@media (prefers-reduced-motion: reduce) {
  .themed-skeleton,
  .themed-skeleton::after {
    animation: none !important;
  }
}
</style>
