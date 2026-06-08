import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // BFF tests mutate process.env and use singleton DB/secure-store modules.
    // Running files in parallel creates cross-file route/auth pollution.
    fileParallelism: false,
  },
});
