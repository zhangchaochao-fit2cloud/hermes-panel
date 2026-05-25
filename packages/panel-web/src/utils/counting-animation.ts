import { ref, watch, type Ref } from 'vue';

/**
 * Eases a numeric ref from its current value to a new target using rAF.
 * - 600ms ease-out by default (per spec)
 * - Skips animation if user prefers reduced motion
 * - Cancels any in-flight animation when the target changes
 */
export interface UseCountingOptions {
  durationMs?: number;
  /** Easing function mapping t in [0, 1] to eased value in [0, 1]. */
  easing?: (t: number) => number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns a `displayed` ref that eases toward `source` whenever it changes.
 * Useful for StatCard mount-time count-up animation.
 */
export function useCountingAnimation(
  source: Ref<number>,
  opts: UseCountingOptions = {},
): Ref<number> {
  const duration = opts.durationMs ?? 600;
  const easing = opts.easing ?? easeOutCubic;

  const displayed = ref(0);
  let rafId: number | null = null;

  const cancel = (): void => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const animateTo = (target: number, from: number): void => {
    cancel();
    if (prefersReducedMotion() || duration <= 0) {
      displayed.value = target;
      return;
    }
    const start = performance.now();
    const delta = target - from;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      displayed.value = from + delta * easing(t);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(tick);
  };

  watch(
    source,
    (next, prev) => {
      const from = typeof prev === 'number' && Number.isFinite(prev) ? prev : 0;
      animateTo(Number.isFinite(next) ? next : 0, from);
    },
    { immediate: true },
  );

  return displayed;
}
