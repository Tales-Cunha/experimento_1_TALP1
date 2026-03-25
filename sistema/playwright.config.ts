import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'npm run dev:server',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:client',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
