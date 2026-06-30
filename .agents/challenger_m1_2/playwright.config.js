const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: __dirname,
  /* Timeout for each test, including setup and teardown */
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  /* Electron tests typically run in serial to avoid focus issues and CPU starvation on desktop environments */
  workers: 1,
  fullyParallel: false,
  /* Reporter to use */
  reporter: [
    ['list']
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
