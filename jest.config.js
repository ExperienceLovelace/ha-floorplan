/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }], // Enable ESM for ts-jest
    '^.+\\.js$': 'babel-jest', // Use Babel to transform plain JavaScript files
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Treat TypeScript files as ESM
  transformIgnorePatterns: [
    '/node_modules/(?!lit|@testing-library|@lit|home-assistant-js-websocket|oui-dom-events)', // Allow specific ESM dependencies to be transformed
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Fix imports with .js extensions
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/jest-dom'], // Ensure jest.setup.js and jest-dom are executed
  detectOpenHandles: true, // Detect open handles to avoid Jest hanging
  maxWorkers: 1, // Limit to one worker to avoid issues with ESM
  testPathIgnorePatterns: ['/tests/e2e/', '/tests/jest/tests/disabled'], // Ignore E2E tests for Jest
  testMatch: ['<rootDir>/tests/jest/tests/**/*.test.ts'], // Adjust to match your Jest test files
  testTimeout: 30000, // Extend timeout for tests
  testEnvironmentOptions: {
    url: 'http://localhost:8080',
  },
};