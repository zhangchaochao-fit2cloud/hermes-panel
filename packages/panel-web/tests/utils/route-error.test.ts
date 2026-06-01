import { describe, expect, it } from 'vitest';
import { clearRouteError, routeError, setRouteError } from '@/utils/route-error';

describe('route error state', () => {
  it('normalizes unknown router errors and can clear them', () => {
    setRouteError('chunk load failed');

    expect(routeError.value).toBeInstanceOf(Error);
    expect(routeError.value?.message).toBe('chunk load failed');

    clearRouteError();
    expect(routeError.value).toBeNull();
  });
});
