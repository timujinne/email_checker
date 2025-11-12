/**
 * Jest Configuration
 * Test framework setup for Email Checker application
 */

module.exports = {
    // Test environment
    testEnvironment: 'jsdom',

    // Coverage configuration
    collectCoverage: true,
    collectCoverageFrom: [
        'web/assets/js/**/*.js',
        '!web/assets/js/main.js', // Entry point
        '!web/assets/js/**/*.test.js' // Test files
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
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
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],

    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@components/(.*)$': '<rootDir>/web/assets/js/components/$1',
        '^@utils/(.*)$': '<rootDir>/web/assets/js/utils/$1'
    },

    // Setup files
    setupFilesAfterEnv: [
        '<rootDir>/test/setup.js'
    ],

    // Transform files
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Module file extensions
    moduleFileExtensions: ['js', 'json'],

    // Verbose output
    verbose: true,

    // Max workers
    maxWorkers: '50%',

    // Timeout
    testTimeout: 10000,

    // Watch plugins
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ]
};
