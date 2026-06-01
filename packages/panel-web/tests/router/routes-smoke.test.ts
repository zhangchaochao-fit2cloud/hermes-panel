import { describe, expect, it } from 'vitest';
import { router } from '@/router/index';

describe('router lazy views', () => {
  it('loads every menu route component without import errors', async () => {
    const routes = router
      .getRoutes()
      .filter((route) => route.path !== '/' && typeof route.components?.default === 'function');

    expect(routes.map((route) => route.path).sort()).toEqual([
      '/channels',
      '/chat',
      '/cron',
      '/dashboard',
      '/developer',
      '/files',
      '/login',
      '/memory',
      '/sessions',
      '/settings',
      '/tools',
      '/workspaces',
    ]);

    for (const route of routes) {
      const component = await (route.components!.default as () => Promise<unknown>)();
      expect(component, route.path).toBeTruthy();
    }
  }, 20_000);
});
