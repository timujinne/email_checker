# Cypress E2E Testing Setup Guide

## Installation

Install Cypress and dependencies:

```bash
npm install --save-dev cypress
```

## Configuration

### cypress.config.js

Create Cypress configuration:

```javascript
module.exports = {
  e2e: {
    // Base URL for tests
    baseUrl: 'http://localhost:8080',

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 60000,

    // Retry configuration
    retries: {
      runMode: 2,      // CI/CD retries
      openMode: 0      // Interactive mode retries
    },

    // Event listeners
    setupNodeEvents(on, config) {
      // Plugin setup here
      return config;
    },

    // Browser launch options
    chromeWebSecurity: false,  // Allow cross-origin requests
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true
  },

  // File patterns
  specPattern: 'cypress/e2e/**/*.cy.js',
  supportFile: 'cypress/support/e2e.js',
  fixturesFolder: 'cypress/fixtures',
  videosFolder: 'cypress/videos',
  screenshotsFolder: 'cypress/screenshots',

  // Environment variables
  env: {
    API_URL: 'http://localhost:8080/api'
  }
};
```

### Directory Structure

```
cypress/
├── e2e/                  # Test specs
│   ├── critical-paths.cy.js
│   ├── forms.cy.js
│   └── navigation.cy.js
├── fixtures/             # Test data
│   ├── lists.json
│   └── users.json
├── support/              # Custom commands
│   ├── e2e.js           # Global setup
│   └── commands.js      # Custom commands
└── videos/              # Test recordings
```

### Support File (cypress/support/e2e.js)

```javascript
// Import commands
import './commands';

// Global configuration
beforeEach(() => {
  // Reset state before each test
  cy.clearCookies();
  cy.clearLocalStorage();
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent test failure on uncaught exceptions
  // Useful for third-party script errors
  if (err.message.includes('third-party-error')) {
    return false;
  }
  return true;
});
```

## Custom Commands

### cypress/support/commands.js

```javascript
/**
 * Custom Cypress Commands
 * Reusable test actions
 */

// Login command
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

// Wait for loading spinner
Cypress.Commands.add('waitForLoading', () => {
  cy.get('.loading-spinner', { timeout: 10000 }).should('not.exist');
});

// API request wrapper
Cypress.Commands.add('apiRequest', (method, url, body = {}) => {
  return cy.request({
    method,
    url: `${Cypress.env('API_URL')}${url}`,
    body,
    failOnStatusCode: false
  });
});

// Check accessibility
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Custom assertion
Cypress.Commands.add('shouldBeVisible', { prevSubject: true }, (subject) => {
  cy.wrap(subject).should('be.visible');
});
```

## npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:run:chrome": "cypress run --browser chrome",
    "cy:run:headed": "cypress run --headed",
    "test:e2e": "start-server-and-test start http://localhost:8080 cy:run",
    "test:e2e:open": "start-server-and-test start http://localhost:8080 cy:open"
  },
  "devDependencies": {
    "start-server-and-test": "^2.0.0"
  }
}
```

## Writing E2E Tests

### Basic Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should perform expected behavior', () => {
    // Test implementation
  });
});
```

### Navigation Testing

```javascript
describe('Navigation', () => {
  it('should navigate between pages', () => {
    cy.visit('/');
    cy.get('a[href="/about"]').click();
    cy.url().should('include', '/about');
    cy.contains('About Page').should('be.visible');
  });
});
```

### Form Testing

```javascript
describe('Form Submission', () => {
  it('should submit form successfully', () => {
    cy.visit('/contact');

    cy.get('input[name="name"]').type('John Doe');
    cy.get('input[name="email"]').type('john@example.com');
    cy.get('textarea[name="message"]').type('Test message');

    cy.get('button[type="submit"]').click();

    cy.get('.success-message').should('be.visible');
    cy.get('.success-message').should('contain', 'Message sent');
  });
});
```

### API Interception

```javascript
describe('API Integration', () => {
  it('should load data from API', () => {
    // Intercept API call
    cy.intercept('GET', '/api/lists', {
      statusCode: 200,
      body: {
        lists: [
          { id: 1, name: 'List 1' },
          { id: 2, name: 'List 2' }
        ]
      }
    }).as('getLists');

    cy.visit('/lists');
    cy.wait('@getLists');

    cy.get('.list-item').should('have.length', 2);
  });

  it('should handle API errors', () => {
    cy.intercept('GET', '/api/lists', {
      statusCode: 500,
      body: { error: 'Server error' }
    });

    cy.visit('/lists');
    cy.get('.error-message').should('be.visible');
  });
});
```

## Best Practices

### 1. Use Data Attributes

```html
<button data-cy="submit-button">Submit</button>
```

```javascript
cy.get('[data-cy="submit-button"]').click();
```

### 2. Avoid Fixed Waits

```javascript
// Bad
cy.wait(1000);

// Good
cy.get('.data-loaded').should('exist');
```

### 3. Use Aliases

```javascript
cy.get('.list-item').as('items');
cy.get('@items').should('have.length', 3);
```

### 4. Chain Commands

```javascript
cy.get('input[name="email"]')
  .type('test@example.com')
  .should('have.value', 'test@example.com');
```

## Debugging

### Interactive Mode

```bash
npm run cy:open
```

### Screenshots and Videos

Automatically captured on test failure.

### Debug Command

```javascript
cy.get('.element').debug();
cy.pause();  // Pause test execution
```

### Console Logs

```javascript
cy.log('Custom debug message');
cy.wrap({ data: 'test' }).debug();
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

### Docker

```dockerfile
FROM cypress/included:latest
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "cy:run"]
```

## Common Issues

### Issue: Timeout Errors

Increase timeouts in configuration:

```javascript
{
  defaultCommandTimeout: 15000,
  pageLoadTimeout: 90000
}
```

### Issue: Element Not Found

Use better selectors and wait for elements:

```javascript
cy.get('[data-cy="element"]', { timeout: 10000 })
  .should('be.visible');
```

### Issue: Flaky Tests

Add explicit waits and use intercepts:

```javascript
cy.intercept('GET', '/api/data').as('getData');
cy.visit('/');
cy.wait('@getData');
```
