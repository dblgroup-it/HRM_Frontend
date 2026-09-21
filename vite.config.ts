// `vitest/config` re-exports Vite's own defineConfig with the `test` block
// typed. A triple-slash reference is not enough here: tsc type-checks this
// file directly and would reject `test` as an unknown property.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.lottie'],
  build: {
    // Never inline .lottie files as data: URIs. The player fetch()es its
    // src, and production's CSP (connect-src 'self') blocks data: fetches.
    assetsInlineLimit: (file) => (file.endsWith('.lottie') ? false : undefined),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  preview: {
    port: 3000,
  },
  test: {
    // Node environment: the units under test are pure functions (URL
    // resolution, formatting). Nothing here needs a DOM.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
