# Jest Setup Guide for Vanilla JavaScript

## Installation

Install Jest and required dependencies for vanilla JavaScript testing:

```bash
npm install --save-dev jest @babel/core @babel/preset-env babel-jest
npm install --save-dev jest-environment-jsdom
npm install --save-dev jest-watch-typeahead  # Optional: better watch mode
```

## Configuration Files

### package.json Scripts

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage:report": "jest --coverage && open coverage/index.html",
    "test:unit": "jest --testPathPattern=test/.*\\.test\\.js",
    "pretest": "npm run lint"
  }
}
```

### jest.config.js

Create complete Jest configuration:

```javascript
module.exports = {
  // Test environment (jsdom for browser-like DOM)
  testEnvironment: 'jsdom',

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'web/assets/js/**/*.js',
    '!web/assets/js/main.js',           // Entry point excluded
    '!web/assets/js/**/*.test.js',      // Test files excluded
    '!web/assets/js/**/__mocks__/**'    // Mock files excluded
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Quality thresholds (fail build if not met)
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Stricter for critical paths
    './web/assets/js/services/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/web/assets/js/components/$1',
    '^@utils/(.*)$': '<rootDir>/web/assets/js/utils/$1',
    '^@services/(.*)$': '<rootDir>/web/assets/js/services/$1'
  },

  // Setup files (run after environment setup)
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.js'
  ],

  // Transform files with Babel
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Verbose output
  verbose: true,

  // Performance
  maxWorkers: '50%',  // Use half of CPU cores
  testTimeout: 10000,  // 10 second timeout

  // Watch plugins for better UX
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};
```

### babel.config.js

Configure Babel for Jest:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'  // Target Node.js version for Jest
      }
    }]
  ]
};
```

### .babelrc (alternative)

Or use `.babelrc`:

```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": { "node": "current" }
    }]
  ]
}
```

## Test Setup File

Create `test/setup.js` for global test utilities:

```javascript
/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock fetch API
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: jest.fn(),
    onerror: jest.fn(),
    onupgradeneeded: jest.fn()
  })),
  deleteDatabase: jest.fn()
};

// Mock performance API
global.performance = {
  memory: {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 2000000,
    totalJSHeapSize: 1500000
  },
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  now: jest.fn(() => Date.now())
};

// Mock navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  onLine: true
};

// Mock window.matchMedia
global.matchMedia = jest.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Suppress console logs in tests unless explicitly testing them
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Preserve originals for debugging
  _originalLog: originalConsoleLog,
  _originalError: originalConsoleError,
  _originalWarn: originalConsoleWarn
};

// Helper to restore console for debugging
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Test utilities
global.wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// DOM helpers
global.createElement = (tag = 'div', id = null, classes = '') => {
  const element = document.createElement(tag);
  if (id) element.id = id;
  if (classes) element.className = classes;
  return element;
};

global.appendToBody = (element) => {
  document.body.appendChild(element);
  return element;
};

// Custom matchers
expect.extend({
  toBeInDocument(received) {
    const pass = document.body.contains(received);
    return {
      pass,
      message: () => pass
        ? `Expected element not to be in document`
        : `Expected element to be in document`
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Clear storage
  localStorage.clear();
  sessionStorage.clear();

  // Reset fetch mock
  fetch.mockReset();
});
```

## Common Issues and Solutions

### Issue: ES Modules Not Working

**Error**: `Cannot use import statement outside a module`

**Solution**: Add to `jest.config.js`:

```javascript
module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
```

And ensure Babel is configured correctly.

### Issue: jsdom Missing

**Error**: `Test environment jest-environment-jsdom cannot be found`

**Solution**: Install jsdom environment:

```bash
npm install --save-dev jest-environment-jsdom
```

### Issue: Slow Tests

**Solution**: Use parallel execution and filesystem caching:

```javascript
module.exports = {
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '.jest-cache'
};
```

### Issue: Coverage Not Collected

**Solution**: Verify `collectCoverageFrom` patterns match your files:

```javascript
collectCoverageFrom: [
  'web/assets/js/**/*.js',  // Adjust path to your source
  '!**/*.test.js'
];
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage --coverageReporters=text
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### GitLab CI

```yaml
test:
  image: node:18
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Best Practices

1. **Keep tests fast**: Mock external dependencies (APIs, file system)
2. **Isolate tests**: Clear state in `afterEach`, don't rely on test order
3. **Use descriptive names**: Test names should explain what behavior is tested
4. **Test behavior, not implementation**: Focus on what code does, not how
5. **Aim for high coverage**: 80%+ branches, 85%+ functions
6. **Watch mode during development**: Use `npm run test:watch` for instant feedback
7. **Run full suite before commit**: Ensure all tests pass, coverage meets thresholds
