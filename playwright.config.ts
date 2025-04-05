import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', // Directory for Playwright tests
  use: {
    baseURL: 'http://localhost:8080', // Adjust to your local dev server
    testIdAttribute: 'data-floorplan-ref',
  },
});
