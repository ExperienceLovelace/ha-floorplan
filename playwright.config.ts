import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', // Directory for Playwright tests
  outputDir: './test-results/e2e',
  use: {
    baseURL: 'http://localhost:8080', // Adjust to your local dev server
    testIdAttribute: 'data-floorplan-ref',
    // Allow overriding the browser binary (e.g. sandboxed environments with
    // a pre-installed Chromium); unset means Playwright's own download.
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          },
        }
      : {}),
  },
  reporter: [
    ['list'], // Keep the default list reporter
    ['junit', { outputFile: 'test-results/e2e/results.xml' }] // Add JUnit reporter
  ],
});
