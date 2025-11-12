---
name: testing-infrastructure-builder
description: Specialist in building comprehensive testing infrastructure including unit tests (Jest), end-to-end tests (Cypress), test fixtures, mocking strategies, and coverage reporting. Focuses on practical test patterns for vanilla JavaScript applications with API integrations. Invoke when setting up testing, adding test coverage, implementing E2E tests, creating fixtures/mocks, debugging flaky tests, or optimizing test performance.
---

# Testing Infrastructure Builder

## Overview

This skill provides comprehensive expertise in testing infrastructure for vanilla JavaScript applications. It covers the complete testing lifecycle from unit test setup (Jest) to end-to-end testing (Cypress), with specialized knowledge of fixtures, mocking strategies, coverage reporting, and test optimization for API-driven applications like Email Checker.

## Core Competencies

**Unit Testing with Jest**
- Jest configuration for vanilla JavaScript with jsdom environment
- Component testing patterns for DOM manipulation and state management
- API client mocking with fetch and async/await patterns
- Test organization and naming conventions
- Custom matchers and test utilities
- Coverage configuration with thresholds

**End-to-End Testing with Cypress**
- E2E test setup and configuration for web applications
- User workflow testing patterns (navigation, forms, interactions)
- API interception and response mocking
- Visual regression testing integration
- Performance testing and metrics collection
- Cross-browser compatibility testing

**Test Fixtures and Mocking**
- Test data organization and fixture management
- Factory patterns for test data generation
- API response mocking strategies
- LocalStorage/IndexedDB test utilities
- Browser API mocks (fetch, WebSocket, performance)
- Deterministic test data for reproducibility

**Coverage and Quality Metrics**
- Coverage target definition (branch, function, line, statement)
- Coverage reporting with lcov, HTML, and text formats
- Quality gates and CI/CD integration
- Mutation testing concepts
- Test performance profiling
- Flaky test detection and resolution

**Testing Pyramid Strategy**
- Unit tests (70%): Fast, isolated component tests
- Integration tests (20%): API and service integration
- E2E tests (10%): Critical user workflows
- Balance between speed, confidence, and maintenance

## When to Invoke This Skill

Invoke this skill when you encounter any of these scenarios:

**New Project Setup**
- Setting up Jest from scratch for vanilla JavaScript
- Configuring Cypress for E2E testing
- Establishing test directory structure
- Creating test utilities and helpers
- Setting up CI/CD test integration

**Adding Test Coverage**
- Writing unit tests for existing components
- Adding integration tests for API clients
- Creating E2E tests for user workflows
- Achieving coverage thresholds (80%+ branches, 85%+ functions)
- Testing error handling and edge cases

**Test Infrastructure Issues**
- Debugging failing tests (timing, state, mocks)
- Fixing flaky tests that pass/fail intermittently
- Optimizing slow test suites (>5 seconds per file)
- Resolving mock/stub configuration issues
- Handling async test timing problems

**Mocking and Fixtures**
- Creating realistic test fixtures for API responses
- Mocking external dependencies (APIs, databases, browser APIs)
- Building factory functions for test data generation
- Simulating error conditions and edge cases
- Creating deterministic test environments

**Coverage and Quality**
- Increasing test coverage to meet thresholds
- Identifying untested code paths
- Setting up coverage reporting in CI/CD
- Analyzing coverage gaps
- Implementing quality gates

## Testing Strategy for Email Checker

Email Checker is a web application with complex API interactions, background processing, and rich UI components. The testing strategy follows a pyramid approach:

### Unit Tests (70% of tests)

**Target**: Components, utilities, services
**Speed**: <5 seconds total execution
**Coverage**: 85% functions, 80% branches

Test in isolation:
- **API Client** (`services/api.js`): Mock fetch, test request/response handling, error cases
- **State Management** (`utils/state.js`): Test state updates, persistence, event emission
- **Components** (error-boundary, cache-manager, retry-manager): Test initialization, methods, event handlers
- **Utilities** (theme, router): Pure logic without side effects

**Example**: Error Boundary tests verify initialization, error capturing, UI rendering, recovery, and statistics tracking - all without hitting real APIs or requiring a browser.

### Integration Tests (20% of tests)

**Target**: API + component interactions
**Speed**: 5-15 seconds execution
**Coverage**: Critical user flows

Test with mocked APIs:
- **Lists Manager + API**: Fetch lists, process, display results
- **Smart Filter + API**: Apply filters, score emails, generate reports
- **Analytics Dashboard + API**: Load data, render charts, export
- **Blocklist Manager + API**: Import, search, bulk operations

**Example**: Lists Manager integration test loads mock list data, processes through UI, and verifies correct API calls and state updates.

### E2E Tests (10% of tests)

**Target**: Complete user workflows
**Speed**: 1-3 minutes execution
**Coverage**: Critical paths only

Test real browser interactions:
- **Dashboard workflow**: Load app → View KPIs → Navigate pages
- **List processing**: Upload file → Process → View results
- **Smart filter workflow**: Select clean list → Configure filter → Apply → Download results
- **Error recovery**: Network failure → Retry → Success

**Example**: Critical path E2E test verifies user can load dashboard, see KPIs, navigate to lists page, and view processing results without errors.

## Jest Unit Testing Patterns

### Configuration Best Practices

**jest.config.js** should define:

```javascript
module.exports = {
  testEnvironment: 'jsdom',  // Browser-like environment

  // Coverage collection
  collectCoverage: true,
  collectCoverageFrom: [
    'web/assets/js/**/*.js',
    '!web/assets/js/main.js',        // Entry point
    '!web/assets/js/**/*.test.js'    // Test files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Quality thresholds (fail if not met)
  coverageThresholds: {
    global: {
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

  // Setup and transforms
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'  // Transpile modern JS
  },

  // Performance
  maxWorkers: '50%',
  testTimeout: 10000
};
```

**test/setup.js** provides global test utilities:
- Mock browser APIs (fetch, localStorage, IndexedDB, performance)
- Suppress console output in tests
- Helper functions (createElement, wait, flushPromises)
- Automatic cleanup after each test

### Test Structure Pattern

Follow AAA pattern (Arrange, Act, Assert):

```javascript
describe('ComponentName', () => {
  let component;
  let mockData;

  beforeEach(() => {
    // Arrange: Set up test environment
    mockData = createMockData();
    component = new ComponentName(mockData);
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  describe('Feature Group', () => {
    test('should perform expected behavior', () => {
      // Arrange: Prepare specific test data
      const input = { value: 'test' };

      // Act: Execute the operation
      const result = component.doSomething(input);

      // Assert: Verify expectations
      expect(result).toBe('expected');
      expect(component.state).toEqual({ changed: true });
    });
  });
});
```

### Mocking External Dependencies

**API Mocking** (fetch requests):

```javascript
// Mock successful response
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'test' })
  })
);

// Test API call
const result = await apiClient.getData();
expect(fetch).toHaveBeenCalledWith('/api/data');
expect(result.data).toBe('test');

// Mock error response
fetch.mockRejectedValueOnce(new Error('Network error'));
await expect(apiClient.getData()).rejects.toThrow('Network error');
```

**Component Mocking** (dependencies):

```javascript
// Mock module
jest.mock('./services/api', () => ({
  fetchLists: jest.fn(() => Promise.resolve([mockList])),
  processFile: jest.fn()
}));

import { fetchLists, processFile } from './services/api';

test('should handle API data', async () => {
  const component = new ListsManager();
  await component.loadLists();

  expect(fetchLists).toHaveBeenCalled();
  expect(component.lists).toEqual([mockList]);
});
```

### Async Testing Patterns

**Testing Promises**:

```javascript
test('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('success');
});

test('should handle rejection', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

**Testing Timers**:

```javascript
jest.useFakeTimers();

test('should execute after delay', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);

  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
});
```

### Coverage-Driven Testing

Write tests to cover:
1. **Happy path**: Expected behavior with valid inputs
2. **Error handling**: Invalid inputs, API failures, edge cases
3. **State transitions**: Component lifecycle, event handlers
4. **Branch coverage**: if/else, switch, ternary operators

**Example**: Error Boundary tests achieve 95%+ coverage by testing initialization, error capture, recursive prevention, UI rendering, retry logic, and statistics.

## Cypress E2E Testing

### Configuration Structure

**cypress.config.js** defines E2E settings:

```javascript
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,

    setupNodeEvents(on, config) {
      // Plugins and event handlers
    },
  },

  // Recording and debugging
  video: true,
  videoCompression: 32,
  screenshotOnRunFailure: true,

  // File patterns
  specPattern: 'cypress/e2e/**/*.cy.js',
  supportFile: 'cypress/support/e2e.js'
};
```

**cypress/support/e2e.js** provides custom commands and global setup.

### E2E Test Patterns

**Navigation Testing**:

```javascript
describe('Dashboard Navigation', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should navigate between pages', () => {
    cy.get('a[href*="#lists"]').click();
    cy.url().should('include', '#lists');

    cy.get('a[href*="#dashboard"]').click();
    cy.url().should('include', '#dashboard');
  });
});
```

**Form Interaction Testing**:

```javascript
it('should submit form with validation', () => {
  cy.get('input[name="email"]').type('test@example.com');
  cy.get('select[name="priority"]').select('high');
  cy.get('button[type="submit"]').click();

  cy.get('.success-message').should('be.visible');
  cy.get('.success-message').should('contain', 'Success');
});
```

**API Interception**:

```javascript
it('should load data from API', () => {
  // Intercept and mock API response
  cy.intercept('GET', '/api/lists', {
    statusCode: 200,
    body: { lists: [mockList] }
  }).as('getLists');

  cy.visit('/');
  cy.wait('@getLists');

  cy.get('.list-item').should('have.length', 1);
});

it('should handle API errors', () => {
  cy.intercept('GET', '/api/lists', {
    statusCode: 500,
    body: { error: 'Server error' }
  });

  cy.visit('/');
  cy.get('.error-message').should('be.visible');
});
```

**Responsive Design Testing**:

```javascript
it('should display on mobile', () => {
  cy.viewport('iphone-x');
  cy.visit('/');
  cy.get('.mobile-menu').should('be.visible');
});

it('should display on desktop', () => {
  cy.viewport(1920, 1080);
  cy.visit('/');
  cy.get('.desktop-nav').should('be.visible');
});
```

### Custom Cypress Commands

Define reusable commands in `cypress/support/commands.js`:

```javascript
// Login command
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Wait for loading to finish
Cypress.Commands.add('waitForLoading', () => {
  cy.get('.loading-spinner', { timeout: 10000 }).should('not.exist');
});

// Usage in tests
cy.login('admin', 'password123');
cy.waitForLoading();
```

## Test Fixtures and Mocking

### Fixture Organization

Structure fixtures by domain:

```
test/
├── fixtures/
│   ├── api-responses/
│   │   ├── lists-success.json
│   │   ├── lists-error.json
│   │   └── filter-results.json
│   ├── email-data/
│   │   ├── valid-emails.json
│   │   └── blocked-emails.json
│   └── factories/
│       ├── list-factory.js
│       └── email-factory.js
```

### Factory Functions

Create factory functions for test data generation:

```javascript
// test/fixtures/factories/list-factory.js
export function createMockList(overrides = {}) {
  return {
    id: 'list-1',
    filename: 'test.txt',
    display_name: 'Test List',
    file_type: 'txt',
    country: 'IT',
    category: 'Automotive',
    processed: false,
    date_added: '2025-10-29',
    stats: {
      total: 1000,
      clean: 800,
      blocked: 200
    },
    ...overrides
  };
}

// Usage in tests
const italyList = createMockList({
  country: 'IT',
  category: 'Hydraulics'
});
```

### API Response Mocking

**JSON Fixtures**:

```json
{
  "lists": [
    {
      "id": "list-1",
      "filename": "italy_contacts.txt",
      "stats": { "total": 1000, "clean": 800, "blocked": 200 }
    }
  ],
  "metadata": {
    "total_lists": 1,
    "last_updated": "2025-10-29T10:00:00Z"
  }
}
```

**Loading in Tests**:

```javascript
import listsResponse from '../fixtures/api-responses/lists-success.json';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(listsResponse)
  })
);
```

### Browser API Mocks

Mock browser APIs in `test/setup.js`:

```javascript
// localStorage mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// IndexedDB mock
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: jest.fn(),
    onerror: jest.fn()
  }))
};

// Performance API mock
global.performance = {
  memory: {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 2000000
  },
  mark: jest.fn(),
  measure: jest.fn()
};
```

## Coverage and Quality Metrics

### Coverage Targets

**Industry Standards**:
- Branches: 80%+ (all if/else, switch, ternary covered)
- Functions: 85%+ (all functions executed at least once)
- Lines: 85%+ (code actually run)
- Statements: 85%+ (individual expressions executed)

**Critical Paths**: Aim for 95%+ coverage on critical components (API clients, error handlers, security functions).

### Coverage Reporting

**Generate Reports**:

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html

# CI/CD integration (text output)
npm test -- --coverage --coverageReporters=text
```

**Coverage Output**:

```
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
services/api.js       |   92.31 |    85.71 |     100 |   92.31 |
components/modal.js   |   88.89 |    75.00 |     100 |   88.89 |
utils/state.js        |   95.45 |    90.00 |     100 |   95.45 |
```

### Quality Gates

Fail builds if coverage drops below thresholds:

```javascript
// jest.config.js
coverageThresholds: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  },
  './web/assets/js/services/': {
    // Stricter for critical services
    branches: 90,
    functions: 95
  }
}
```

### Identifying Coverage Gaps

**Uncovered Lines**: Red highlights in HTML report show untested code.

**Branch Coverage**: Identify missing if/else branches:
- Test both true and false conditions
- Test all switch cases
- Test ternary operator branches

**Function Coverage**: Find functions never called:
- Add tests for utility functions
- Test error handlers
- Verify event callbacks execute

### Mutation Testing Concepts

Mutation testing verifies test quality by introducing code changes (mutations) and checking if tests fail:

**Example Mutation**: Change `if (x > 5)` to `if (x >= 5)` - do tests catch this?

**Tools**: Stryker Mutator for JavaScript (advanced usage, not included by default).

## Common Testing Scenarios

### Testing Async API Calls

```javascript
test('should fetch and display data', async () => {
  const mockData = { lists: [createMockList()] };

  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockData)
  });

  const component = new ListsManager();
  await component.loadLists();

  expect(fetch).toHaveBeenCalledWith('/api/lists');
  expect(component.lists).toEqual(mockData.lists);
});
```

### Testing Error Handling

```javascript
test('should handle network errors gracefully', async () => {
  const consoleErrorSpy = jest.spyOn(console, 'error');

  fetch.mockRejectedValueOnce(new Error('Network error'));

  const component = new ListsManager();
  await component.loadLists();

  expect(component.error).toBeDefined();
  expect(component.lists).toEqual([]);
  expect(consoleErrorSpy).toHaveBeenCalled();
});
```

### Testing State Changes

```javascript
test('should update state and notify listeners', () => {
  const listener = jest.fn();
  const state = new StateManager();

  state.subscribe('lists', listener);
  state.set('lists', [mockList]);

  expect(listener).toHaveBeenCalledWith([mockList]);
  expect(state.get('lists')).toEqual([mockList]);
});
```

### Testing DOM Manipulation

```javascript
test('should render component to DOM', () => {
  const container = createElement('div', 'container');
  appendToBody(container);

  const component = new Modal(container);
  component.render();

  expect(container.querySelector('.modal')).toBeInTheDocument();
  expect(container.querySelector('.modal-title')).toHaveTextContent('Modal');
});
```

### Testing Event Handlers

```javascript
test('should handle click events', () => {
  const onClick = jest.fn();
  const button = createElement('button');

  button.addEventListener('click', onClick);
  button.click();

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

## Debugging and Optimization

### Debugging Failing Tests

**Isolation**: Run single test file:
```bash
npm test -- error-boundary.test.js
```

**Verbose Output**: Enable detailed logging:
```bash
npm test -- --verbose
```

**Restore Console**: Debug with console output:
```javascript
beforeEach(() => {
  restoreConsole();  // From test/setup.js
});
```

**Breakpoints**: Use `debugger;` statement in tests (run with `--inspect`).

### Fixing Flaky Tests

**Problem**: Tests pass/fail intermittently.

**Common Causes**:
1. **Timing**: Async operations not awaited properly
2. **State**: Tests not properly isolated, shared state
3. **Randomness**: Non-deterministic test data (dates, random IDs)
4. **External**: Network requests, file system access

**Solutions**:
- Always `await` async operations
- Clear state in `afterEach` hooks
- Use deterministic fixtures (fixed dates, sequential IDs)
- Mock all external dependencies

### Optimizing Test Performance

**Slow Test Suite** (>30 seconds):

**Optimizations**:
1. **Parallel Execution**: Jest runs tests in parallel by default (maxWorkers: '50%')
2. **Selective Tests**: Run changed tests only: `jest --onlyChanged`
3. **Watch Mode**: Incremental runs: `jest --watch`
4. **Mock Heavy Operations**: Don't actually write files, hit APIs, or render charts
5. **Reduce Setup**: Minimize `beforeEach` operations, lazy initialize

**Example**: Email Checker unit tests run in <5 seconds with 100+ tests by mocking all API calls and DOM operations.

## Resources

This skill includes comprehensive testing resources organized by type:

### references/

Reference documentation loaded into context for detailed guidance:

- **`jest-setup-guide.md`**: Complete Jest configuration for vanilla JavaScript projects including babel setup, jsdom environment, coverage configuration, and test utilities

- **`unit-test-patterns.md`**: Unit testing patterns including test structure (AAA pattern), mocking strategies, async testing, DOM testing, and coverage-driven development

- **`cypress-setup-guide.md`**: Cypress E2E testing installation, configuration, custom commands, plugins, and CI/CD integration

- **`e2e-test-patterns.md`**: End-to-end testing patterns for user workflows, API interception, responsive testing, and performance validation

- **`test-fixtures-guide.md`**: Fixture organization, factory functions, deterministic test data, and mock API response patterns

- **`email-checker-test-plan.md`**: Email Checker-specific test plan including critical paths, test scenarios for all major features, edge cases, and testing pyramid breakdown

### assets/

Template files ready to be adapted for immediate use:

- **`jest.config.template.js`**: Annotated Jest configuration with coverage thresholds, test patterns, and transforms for vanilla JavaScript projects

- **`cypress.config.template.js`**: Cypress configuration with viewport settings, timeouts, video/screenshot configuration, and plugin setup

- **`test-template-unit.js`**: Complete unit test template demonstrating API client testing with mocks, async patterns, and error handling

- **`test-template-e2e.cy.js`**: Full E2E test template showing navigation, form interaction, API interception, and responsive design testing

- **`test-fixtures-template.js`**: Factory functions and fixtures for email data, API responses, and list metadata generation

### scripts/

Executable utilities for test automation:

- **`run-tests.sh`**: Shell script to run tests with proper environment setup, coverage reporting, and CI/CD integration

- **`generate-fixtures.js`**: Node.js script to generate realistic test fixtures from production data patterns

- **`analyze-coverage.js`**: Coverage analysis utility to identify gaps and generate improvement reports

---

## Email Checker Testing Examples

### Unit Test Example: API Client

```javascript
describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('should fetch lists successfully', async () => {
    const mockLists = [createMockList()];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ lists: mockLists })
    });

    const result = await API.fetchLists();

    expect(fetch).toHaveBeenCalledWith('/api/lists');
    expect(result.lists).toEqual(mockLists);
  });

  test('should handle fetch errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(API.fetchLists()).rejects.toThrow('Network error');
  });
});
```

### E2E Test Example: Smart Filter Workflow

```javascript
describe('Smart Filter Workflow', () => {
  it('should apply filter and download results', () => {
    // Mock API responses
    cy.intercept('GET', '/api/smart-filter/available', {
      body: { filters: ['italy_hydraulics'] }
    });

    cy.intercept('POST', '/api/smart-filter/process', {
      body: { success: true, file: 'results.txt' }
    });

    // Navigate to smart filter page
    cy.visit('/');
    cy.get('a[href*="smart-filter"]').click();

    // Select clean list
    cy.get('select[name="list"]').select('italy_contacts_clean.txt');

    // Select filter
    cy.get('select[name="filter"]').select('italy_hydraulics');

    // Apply filter
    cy.get('button').contains('Apply Filter').click();

    // Verify success
    cy.get('.success-message').should('be.visible');
    cy.get('.success-message').should('contain', 'Filter applied');

    // Download results
    cy.get('a[download]').should('exist');
  });
});
```

## Integration Notes

When this skill is loaded into a Task Agent, it provides comprehensive testing expertise without requiring the orchestrator to understand low-level testing configuration details. The agent can:

- Set up complete testing infrastructure (Jest + Cypress)
- Write unit tests following best practices
- Create E2E tests for critical user workflows
- Generate test fixtures and mocks
- Debug failing or flaky tests
- Optimize test performance
- Achieve coverage targets with quality tests

This enables the orchestrator to delegate entire testing setup or test writing tasks with confidence that modern testing best practices will be followed.
