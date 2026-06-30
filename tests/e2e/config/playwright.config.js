const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: path.join(__dirname, '..'),
  /* Timeout for each test, including setup and teardown */
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  /* Electron tests typically run in serial to avoid focus issues and CPU starvation on desktop environments */
  workers: 1,
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI or environment default */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: '../../playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
