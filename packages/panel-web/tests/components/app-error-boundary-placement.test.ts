import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appVuePath = join(process.cwd(), 'src/App.vue');

describe('AppErrorBoundary placement', () => {
  it('keeps the shell visible by wrapping only the route outlet', () => {
    const source = readFileSync(appVuePath, 'utf8').replace(/\s+/g, ' ');

    // With v-if="isChrome" the collapsed string reads:
    // <DefaultLayout v-if="isChrome"> <AppErrorBoundary> <RouterView /> ...
    expect(source).toMatch(/<DefaultLayout[^>]*> <AppErrorBoundary> <RouterView \/> <\/AppErrorBoundary> <\/DefaultLayout>/);
    expect(source).not.toContain('<AppErrorBoundary> <DefaultLayout>');
  });
});
