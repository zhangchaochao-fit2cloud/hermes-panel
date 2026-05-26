import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5666,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
    // Raised after splitting vendors into discrete chunks below; naive-ui by
    // itself sits just under this and is unavoidable without per-component
    // tree-shaking work.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy third-party libs out of the app bootstrap so first paint
        // only loads what views actually need. View chunks remain dynamically
        // imported from src/router/index.ts.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/node_modules/naive-ui/') || id.includes('/node_modules/vooks/')
            || id.includes('/node_modules/vueuc/') || id.includes('/node_modules/seemly/')
            || id.includes('/node_modules/treemate/') || id.includes('/node_modules/css-render/')
            || id.includes('/node_modules/@css-render/') || id.includes('/node_modules/@juggle/')
            || id.includes('/node_modules/evtd/') || id.includes('/node_modules/async-validator/')
            || id.includes('/node_modules/vdirs/')) {
            return 'naive-ui';
          }

          if (id.includes('/node_modules/markdown-it/') || id.includes('/node_modules/highlight.js/')
            || id.includes('/node_modules/entities/') || id.includes('/node_modules/linkify-it/')
            || id.includes('/node_modules/mdurl/') || id.includes('/node_modules/punycode')
            || id.includes('/node_modules/uc.micro/')) {
            return 'markdown';
          }

          if (id.includes('/node_modules/echarts/') || id.includes('/node_modules/vue-echarts/')
            || id.includes('/node_modules/zrender/') || id.includes('/node_modules/tslib/')) {
            return 'charts';
          }

          if (id.includes('/node_modules/vue/') || id.includes('/node_modules/@vue/')
            || id.includes('/node_modules/vue-router/') || id.includes('/node_modules/vue-i18n/')
            || id.includes('/node_modules/@intlify/') || id.includes('/node_modules/pinia/')
            || id.includes('/node_modules/vue-demi/')) {
            return 'vue-core';
          }

          return 'vendor';
        },
      },
    },
  },
});
