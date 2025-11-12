/**
 * Cypress E2E Test Configuration
 * Configuration for end-to-end and integration testing
 */

module.exports = {
    e2e: {
        baseUrl: 'http://localhost:8080',
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        setupNodeEvents(on, config) {
            // Implement node event listeners here
        },
    },
    component: {
        devServer: {
            framework: 'webpack',
            bundler: 'webpack',
        },
    },
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
};
