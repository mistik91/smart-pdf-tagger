import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-electron',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
