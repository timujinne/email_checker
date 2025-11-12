# E2E Test Patterns

## User Workflow Testing

Test complete user journeys from start to finish:

```javascript
describe('List Processing Workflow', () => {
  it('should process email list end-to-end', () => {
    // Navigate to lists page
    cy.visit('/');
    cy.get('a[href*="lists"]').click();

    // Select file
    cy.get('select[name="list"]').select('test_list.txt');

    // Start processing
    cy.get('button').contains('Process').click();

    // Wait for completion
    cy.get('.progress-bar', { timeout: 30000 }).should('not.exist');

    // Verify results
    cy.get('.results').should('be.visible');
    cy.get('.stats-clean').should('contain', 'Clean');
    cy.get('.stats-blocked').should('contain', 'Blocked');
  });
});
```

## Form Interaction Patterns

### Input Fields

```javascript
it('should handle form input', () => {
  cy.get('input[name="email"]')
    .type('test@example.com')
    .should('have.value', 'test@example.com');

  cy.get('input[name="email"]')
    .clear()
    .type('new@example.com');
});
```

### Dropdowns

```javascript
it('should select dropdown options', () => {
  cy.get('select[name="filter"]').select('italy_hydraulics');
  cy.get('select[name="filter"]').should('have.value', 'italy_hydraulics');
});
```

### Checkboxes and Radio Buttons

```javascript
it('should toggle checkboxes', () => {
  cy.get('input[type="checkbox"]').check();
  cy.get('input[type="checkbox"]').should('be.checked');

  cy.get('input[type="checkbox"]').uncheck();
  cy.get('input[type="checkbox"]').should('not.be.checked');
});

it('should select radio button', () => {
  cy.get('input[type="radio"][value="option1"]').check();
  cy.get('input[type="radio"][value="option1"]').should('be.checked');
});
```

## API Interception Patterns

### Mock Success Response

```javascript
cy.intercept('GET', '/api/lists', {
  statusCode: 200,
  body: { lists: [mockList] }
}).as('getLists');

cy.visit('/');
cy.wait('@getLists');
```

### Mock Error Response

```javascript
cy.intercept('GET', '/api/lists', {
  statusCode: 500,
  body: { error: 'Server error' }
});

cy.visit('/');
cy.get('.error-message').should('be.visible');
```

### Dynamic Responses

```javascript
cy.intercept('POST', '/api/process', (req) => {
  req.reply({
    statusCode: 200,
    body: { success: true, processed: req.body.count }
  });
});
```

### Response Delay

```javascript
cy.intercept('GET', '/api/lists', (req) => {
  req.reply({
    delay: 2000,
    statusCode: 200,
    body: { lists: [] }
  });
});
```

## Responsive Design Testing

### Viewport Presets

```javascript
describe('Responsive Design', () => {
  const viewports = [
    { device: 'iphone-x', width: 375, height: 812 },
    { device: 'ipad-2', width: 768, height: 1024 },
    { device: 'macbook-16', width: 1536, height: 960 }
  ];

  viewports.forEach(({ device, width, height }) => {
    it(`should display correctly on ${device}`, () => {
      cy.viewport(width, height);
      cy.visit('/');
      cy.get('.nav').should('be.visible');
    });
  });
});
```

### Custom Viewports

```javascript
it('should display on custom viewport', () => {
  cy.viewport(1920, 1080);
  cy.visit('/');
});
```

## Performance Testing

### Page Load Time

```javascript
it('should load within acceptable time', () => {
  cy.visit('/', {
    onBeforeLoad: (win) => {
      win.performance.mark('start');
    }
  });

  cy.window().then((win) => {
    win.performance.mark('end');
    win.performance.measure('pageLoad', 'start', 'end');

    const measure = win.performance.getEntriesByName('pageLoad')[0];
    expect(measure.duration).to.be.lessThan(3000); // < 3 seconds
  });
});
```

### Network Performance

```javascript
it('should make efficient API calls', () => {
  let apiCallCount = 0;

  cy.intercept('GET', '/api/**', () => {
    apiCallCount++;
  });

  cy.visit('/');

  cy.then(() => {
    expect(apiCallCount).to.be.lessThan(10); // < 10 API calls
  });
});
```

## Accessibility Testing

```javascript
describe('Accessibility', () => {
  it('should have no a11y violations', () => {
    cy.visit('/');
    cy.injectAxe();
    cy.checkA11y();
  });

  it('should be keyboard navigable', () => {
    cy.visit('/');
    cy.get('body').tab();
    cy.focused().should('have.attr', 'href');
  });
});
```

## Authentication Testing

```javascript
describe('Authentication', () => {
  it('should login successfully', () => {
    cy.login('user@example.com', 'password123');
    cy.url().should('include', '/dashboard');
    cy.get('.user-profile').should('contain', 'user@example.com');
  });

  it('should handle invalid credentials', () => {
    cy.login('user@example.com', 'wrongpassword');
    cy.get('.error-message').should('contain', 'Invalid credentials');
  });

  it('should logout successfully', () => {
    cy.login('user@example.com', 'password123');
    cy.get('.logout-button').click();
    cy.url().should('include', '/login');
  });
});
```

## File Upload Testing

```javascript
it('should upload file', () => {
  cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt');
  cy.get('.file-name').should('contain', 'test-file.txt');

  cy.get('button').contains('Upload').click();
  cy.get('.success-message').should('be.visible');
});
```

## Multi-Step Form Testing

```javascript
describe('Multi-Step Form', () => {
  it('should complete all steps', () => {
    cy.visit('/wizard');

    // Step 1
    cy.get('input[name="name"]').type('John Doe');
    cy.get('button').contains('Next').click();

    // Step 2
    cy.get('input[name="email"]').type('john@example.com');
    cy.get('button').contains('Next').click();

    // Step 3
    cy.get('textarea[name="message"]').type('Test message');
    cy.get('button').contains('Submit').click();

    // Verify completion
    cy.get('.success-message').should('be.visible');
  });
});
```

## Error Recovery Testing

```javascript
describe('Error Recovery', () => {
  it('should recover from network error', () => {
    // Simulate network failure
    cy.intercept('GET', '/api/data', { forceNetworkError: true }).as('failedRequest');

    cy.visit('/');
    cy.wait('@failedRequest');

    // Error should be displayed
    cy.get('.error-message').should('be.visible');

    // Mock successful retry
    cy.intercept('GET', '/api/data', {
      statusCode: 200,
      body: { data: 'success' }
    }).as('successRequest');

    // Click retry
    cy.get('button').contains('Retry').click();
    cy.wait('@successRequest');

    // Should recover
    cy.get('.error-message').should('not.exist');
    cy.get('.data-display').should('be.visible');
  });
});
```

## Data-Driven Testing

```javascript
describe('Smart Filter', () => {
  const testCases = [
    { filter: 'italy_hydraulics', expectedCount: 150 },
    { filter: 'germany_automotive', expectedCount: 200 }
  ];

  testCases.forEach(({ filter, expectedCount }) => {
    it(`should apply ${filter} filter`, () => {
      cy.visit('/smart-filter');
      cy.get('select[name="filter"]').select(filter);
      cy.get('button').contains('Apply').click();
      cy.get('.result-count').should('contain', expectedCount);
    });
  });
});
```

## Session Management

```javascript
describe('Session Persistence', () => {
  it('should persist session across page reloads', () => {
    cy.login('user@example.com', 'password123');

    cy.reload();

    cy.get('.user-profile').should('be.visible');
  });

  it('should clear session on logout', () => {
    cy.login('user@example.com', 'password123');
    cy.get('.logout-button').click();

    cy.reload();

    cy.url().should('include', '/login');
  });
});
```

## Real-Time Updates Testing

```javascript
describe('Real-Time Updates', () => {
  it('should update progress in real-time', () => {
    cy.visit('/processing');

    cy.get('.progress-bar').should('have.attr', 'value', '0');

    // Simulate progress updates
    cy.intercept('GET', '/api/progress', {
      statusCode: 200,
      body: { progress: 50 }
    });

    cy.wait(1000);
    cy.get('.progress-bar').should('have.attr', 'value', '50');
  });
});
```
