/**
 * Jest Configuration Template
 * Complete Jest setup for vanilla JavaScript projects
 *
 * USAGE: Copy to project root as jest.config.js
 * CUSTOMIZE: Adjust paths and thresholds for your project
 */

module.exports = {
  // Test environment - jsdom provides browser-like DOM
  testEnvironment: 'jsdom',

  // Coverage collection configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Include source files
    'web/assets/js/**/*.js',
    'src/**/*.js',

    // Exclude patterns
    '!web/assets/js/main.js',              // Entry point
    '!web/assets/js/**/*.test.js',         // Test files
    '!web/assets/js/**/*.spec.js',         // Spec files
    '!web/assets/js/**/__mocks__/**',      // Mock files
    '!**/node_modules/**',                 // Dependencies
    '!**/dist/**',                         // Build output
    '!**/coverage/**'                      // Coverage reports
  ],

  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',              // Console output
    'lcov',              // LCOV format for CI/CD
    'html',              // HTML report for viewing
    'json-summary'       // JSON summary for badges
  ],

  // Coverage thresholds - fail if not met
  coverageThresholds: {
    global: {
      branches: 80,      // 80% of if/else branches
      functions: 85,     // 85% of functions
      lines: 85,         // 85% of lines
      statements: 85     // 85% of statements
    },
    // Stricter thresholds for critical paths
    './web/assets/js/services/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './web/assets/js/components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',           // Tests in __tests__ directories
    '**/?(*.)+(spec|test).js',        // *.test.js or *.spec.js files
    '**/?(*.)+(spec|test).jsx'        // JSX if needed
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.cache/'
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/web/assets/js/$1',
    '^@components/(.*)$': '<rootDir>/web/assets/js/components/$1',
    '^@utils/(.*)$': '<rootDir>/web/assets/js/utils/$1',
    '^@services/(.*)$': '<rootDir>/web/assets/js/services/$1',
    // CSS/Asset imports (mock for tests)
    '\\.(css|less|scss|sass)$': '<rootDir>/test/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/test/__mocks__/fileMock.js'
  },

  // Setup files - run after environment setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.js'
  ],

  // Transform files with Babel
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@your-org|module-to-transform)/)'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Verbose output
  verbose: true,

  // Performance settings
  maxWorkers: '50%',              // Use 50% of CPU cores
  testTimeout: 10000,             // 10 second timeout per test
  slowTestThreshold: 5,           // Warn if test takes >5 seconds

  // Watch mode plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',    // Filter by filename
    'jest-watch-typeahead/testname'     // Filter by test name
  ],

  // Mock behavior
  clearMocks: true,               // Clear mock calls between tests
  restoreMocks: true,             // Restore original implementations
  resetMocks: false,              // Don't reset mock return values

  // Error handling
  bail: 0,                        // Run all tests (don't stop on first failure)
  errorOnDeprecated: true,        // Fail on deprecated API usage

  // Snapshot configuration
  snapshotSerializers: [],        // Custom snapshot serializers

  // Global variables
  globals: {
    NODE_ENV: 'test',
    __DEV__: true
  },

  // Filesystem caching for faster runs
  cache: true,
  cacheDirectory: '.jest-cache',

  // Notification settings (optional)
  notify: false,
  notifyMode: 'failure-change'
};
