import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vitest config for panel-web frontend tests.
 *
 * Notes:
 * - environment: 'happy-dom' is intentional (panel-bff uses 'node', but the
 *   panel-web stores read `localStorage`, `window.matchMedia` and apply DOM
 *   attributes via `document.documentElement`, so a DOM is required). happy-dom
 *   is already in devDependencies — see package.json.
 * - The '@' alias mirrors tsconfig.json's path mapping so test files can
 *   `import { useAppearanceStore } from '@/stores/appearance'` just like
 *   production code.
 * - globals: false matches the BFF config — tests must import describe/it/expect
 *   explicitly. This keeps the bar high and discoverable.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
