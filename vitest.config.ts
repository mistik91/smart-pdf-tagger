import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'dist-electron/**', 'e2e/**', 'e2e-electron/**'],
  },
});
