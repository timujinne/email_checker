/**
 * Cypress E2E Test Configuration Template
 * Complete Cypress setup for end-to-end testing
 *
 * USAGE: Copy to project root as cypress.config.js
 * CUSTOMIZE: Adjust baseUrl, viewports, and timeouts for your project
 */

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // E2E Testing Configuration
  e2e: {
    // Base URL for tests
    baseUrl: 'http://localhost:8080',

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeout configurations (in milliseconds)
    defaultCommandTimeout: 10000,      // Command timeout (e.g., cy.get())
    requestTimeout: 10000,             // HTTP request timeout
    responseTimeout: 10000,            // HTTP response timeout
    pageLoadTimeout: 60000,            // Page load timeout
    execTimeout: 60000,                // cy.exec() timeout

    // Retry configuration
    retries: {
      runMode: 2,      // CI/CD mode: retry failed tests 2 times
      openMode: 0      // Interactive mode: no retries
    },

    // Browser settings
    chromeWebSecurity: false,          // Allow cross-origin requests
    experimentalSessionAndOrigin: true, // Enable session commands

    // Video and screenshot settings
    video: true,                       // Record videos
    videoCompression: 32,              // Compression quality (0-51)
    videoUploadOnPasses: false,        // Only upload videos on failures
    screenshotOnRunFailure: true,      // Auto-screenshot on failure
    trashAssetsBeforeRuns: true,       // Clean up old assets

    // Test isolation
    testIsolation: true,               // Reset state between tests

    // Wait for animations
    waitForAnimations: true,
    animationDistanceThreshold: 5,

    // Node event listeners
    setupNodeEvents(on, config) {
      // Plugin setup here

      // Example: Code coverage plugin
      // require('@cypress/code-coverage/task')(on, config);

      // Example: Custom task
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(data) {
          console.table(data);
          return null;
        }
      });

      // Return config
      return config;
    },

    // Spec pattern (test files)
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Exclude patterns
    excludeSpecPattern: [
      '**/__snapshots__/*',
      '**/__image_snapshots__/*'
    ],

    // Support file
    supportFile: 'cypress/support/e2e.{js,jsx,ts,tsx}',

    // Fixtures
    fixturesFolder: 'cypress/fixtures',

    // Artifacts
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    downloadsFolder: 'cypress/downloads',

    // Slow test threshold
    slowTestThreshold: 10000,          // Warn if test takes >10s
  },

  // Component Testing Configuration (optional)
  component: {
    devServer: {
      framework: 'webpack',
      bundler: 'webpack'
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.{js,jsx,ts,tsx}'
  },

  // Environment variables
  env: {
    API_URL: 'http://localhost:8080/api',
    API_TIMEOUT: 10000,
    // Add custom env vars here
  },

  // Reporter configuration
  reporter: 'spec',                    // Built-in reporter
  reporterOptions: {
    // Custom reporter options
  },

  // Debugging
  watchForFileChanges: true,           // Watch files in open mode
  numTestsKeptInMemory: 50,           // Memory management

  // Project settings
  projectId: undefined,                // Add for Cypress Dashboard

  // Additional options
  userAgent: undefined,                // Custom user agent
  blockHosts: [],                      // Block specific hosts
  modifyObstructiveCode: true,         // Handle obstructive code

  // Response handling
  responseTimeout: 30000,              // Overall response timeout

  // Download behavior
  downloadsFolder: 'cypress/downloads',

  // File server settings
  fileServerFolder: '.',               // Root folder for static files

  // Browser launch options
  experimentalStudio: false,           // Cypress Studio feature
});
