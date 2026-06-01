import type { PremiumFeature } from '@hermes-panel/shared';
import { useAuthStore } from '@/stores/auth';

/**
 * Composable for checking premium feature access.
 * Uses the reactive auth store so it updates automatically when license state changes.
 */
export function usePremium() {
  const auth = useAuthStore();

  function isFeatureEnabled(feature: PremiumFeature): boolean {
    return auth.isFeatureEnabled(feature);
  }

  /** True if any premium features are unlocked. */
  const hasPremium = () => auth.features.length > 0;

  return { isFeatureEnabled, hasPremium };
}
