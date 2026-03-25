// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:4004',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer:
    !process.env.TEST_URL || process.env.TEST_URL.includes('4004')
      ? {
          command: 'npm run hybrid:cds',
          url: (process.env.TEST_URL || 'http://localhost:4004').replace(/\/$/, '') + '/policies/AgentPolicies/view',
          reuseExistingServer: !process.env.CI,
          timeout: 90000,
        }
      : undefined,
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.js/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'connection-management',
      testMatch: /connection-management\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://connection-managment-sdyz.bolt.host',
      },
    },
  ],
});
