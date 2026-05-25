import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Reactive viewport breakpoint helpers.
 *
 * Breakpoints (matches spec §21.1.6):
 *   - mobile: < 768px
 *   - tablet: 768px – 1023.98px
 *   - desktop: >= 1024px (derive as !mobile && !tablet)
 *
 * Uses `window.matchMedia` so we stay in sync with viewport changes
 * (orientation flips, devtools resizing, etc.) without polling.
 */
export function useBreakpoint(): {
  isMobile: ReturnType<typeof ref<boolean>>;
  isTablet: ReturnType<typeof ref<boolean>>;
} {
  const isMobile = ref(false);
  const isTablet = ref(false);
  let mqMobile: MediaQueryList | null = null;
  let mqTablet: MediaQueryList | null = null;

  function update(): void {
    isMobile.value = mqMobile?.matches ?? false;
    isTablet.value = mqTablet?.matches ?? false;
  }

  onMounted(() => {
    mqMobile = window.matchMedia('(max-width: 767.98px)');
    mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023.98px)');
    mqMobile.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
    update();
  });

  onUnmounted(() => {
    mqMobile?.removeEventListener('change', update);
    mqTablet?.removeEventListener('change', update);
  });

  return { isMobile, isTablet };
}
