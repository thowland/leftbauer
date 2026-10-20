import { defineConfig, devices } from '@playwright/test';

/**
 * E2E projects — Implementation Plan §2.2 (exit criterion 4).
 * iPhone and iPad run on WebKit, the engine behind iOS Safari.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 landscape'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
    // `?e2e` already keeps the app silent; Chrome is muted as well. WebKit has no such switch.
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--mute-audio'] } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
