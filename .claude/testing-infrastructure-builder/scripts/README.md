# Testing Scripts

This directory contains executable utilities for test automation.

## Available Scripts

### run-tests.sh
Shell script to run tests with proper environment setup, coverage reporting, and CI/CD integration.

**Usage:**
```bash
./scripts/run-tests.sh          # Run all tests
./scripts/run-tests.sh --unit   # Run unit tests only
./scripts/run-tests.sh --e2e    # Run E2E tests only
```

### generate-fixtures.js
Node.js script to generate realistic test fixtures from production data patterns.

**Usage:**
```bash
node scripts/generate-fixtures.js
node scripts/generate-fixtures.js --count 1000
```

### analyze-coverage.js
Coverage analysis utility to identify gaps and generate improvement reports.

**Usage:**
```bash
node scripts/analyze-coverage.js
node scripts/analyze-coverage.js --threshold 80
```

## Note

These scripts are referenced in the SKILL.md but not implemented as executable files to keep the skill template-focused. Implement them as needed based on your project requirements.

The testing infrastructure is primarily configuration and template-based rather than script-driven, with most functionality provided through:
- Jest configuration (`jest.config.js`)
- Cypress configuration (`cypress.config.js`)
- npm scripts in `package.json`
- Test setup files (`test/setup.js`)
