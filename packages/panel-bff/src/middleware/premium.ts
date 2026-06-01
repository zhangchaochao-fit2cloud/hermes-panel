/**
 * Premium feature gating middleware.
 *
 * Usage in any BFF route file:
 *   import { requirePremium } from '../middleware/premium.js';
 *   router.use(requirePremium('workspaces'));
 */

import type { PremiumFeature } from '@hermes-panel/shared';
import { getFeaturesForUser, resolveSession } from '../services/auth-store.js';
import { HEADERS } from '@hermes-panel/shared';

/**
 * Koa middleware that requires a specific premium feature to be unlocked.
 * Must run AFTER auth middleware (which injects ctx.state.user).
 *
 * Returns 402 Payment Required if the user's active license does not include
 * the requested feature.
 */
export function requirePremium(feature: PremiumFeature) {
  return async (ctx: any, next: any) => {
    const token = typeof ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()] === 'string'
      ? ctx.headers[HEADERS.PANEL_TOKEN.toLowerCase()]
      : '';
    const user = resolveSession(token);
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: { code: 'UNAUTHORIZED', message: 'authentication required' } };
      return;
    }
    const features = getFeaturesForUser(user.id);
    if (!features.includes(feature)) {
      ctx.status = 402;
      ctx.body = {
        error: {
          code: 'PREMIUM_REQUIRED',
          message: `Feature "${feature}" requires a premium license`,
          feature,
        },
      };
      return;
    }
    await next();
  };
}
