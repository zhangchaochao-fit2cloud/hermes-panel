import { describe, expect, it } from 'vitest';
import {
  finishRouteLoading,
  resetRouteLoading,
  routeLoading,
  startRouteLoading,
} from '@/utils/route-loading';

describe('route loading state', () => {
  it('tracks active route transitions and clamps at idle', () => {
    resetRouteLoading();
    expect(routeLoading.value).toBe(false);

    startRouteLoading();
    expect(routeLoading.value).toBe(true);

    finishRouteLoading();
    expect(routeLoading.value).toBe(false);

    finishRouteLoading();
    expect(routeLoading.value).toBe(false);
  });
});
