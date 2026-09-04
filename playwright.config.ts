import { defineConfig, devices } from '@playwright/test';

const useLocalServer = process.env.E2E_LOCAL === '1';
const localServerCommand = process.env.E2E_LOCAL === '1'
  ? 'npm run preview -- --host 127.0.0.1 --port 4173'
  : 'npm run dev -- --host 127.0.0.1 --port 4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: useLocalServer || !process.env.E2E_BASE_URL ? {
    command: localServerCommand,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  } : undefined,
});
