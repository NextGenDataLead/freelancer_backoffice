import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for E2E Tests
 *
 * Dual-mode execution:
 * - Local: headed mode, single worker, no retries, detailed debugging
 * - CI: headless mode, parallel workers, 2 retries, HTML + JSON reports
 *
 * Usage:
 * - Local: npx playwright test --headed
 * - CI: CI=true npx playwright test
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  testMatch: /.*\.spec\.ts/,

  // Run tests in parallel (except when explicitly using .serial)
  fullyParallel: true,

  // Prevent accidental .only() in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI for stability
  retries: process.env.CI ? 2 : 0,

  // Parallel execution: 4 workers in CI, 1 in local for easier debugging
  workers: process.env.CI ? 4 : 1,

  // Reporting: HTML for both, JSON in CI for artifact storage
  reporter: process.env.CI
    ? [['html'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html'], ['list']],

  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Trace on failure for debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',

    // Screenshots on failure
    screenshot: process.env.CI ? 'only-on-failure' : 'only-on-failure',

    // Video on failure (CI only to save space)
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Test timeout (60 seconds per test)
  timeout: 60000,

  // Global setup timeout
  globalTimeout: 600000, // 10 minutes

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Dual-mode: headed in local, headless in CI
        headless: process.env.CI === 'true',
        viewport: { width: 1920, height: 1080 },
        // Slower actions in headed mode for visibility
        slowMo: process.env.CI ? 0 : 100,
      },
    },
    // Firefox and Webkit disabled by default (enable for cross-browser testing)
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     headless: process.env.CI === 'true',
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     headless: process.env.CI === 'true',
    //   },
    // },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for dev server to start
  },
})