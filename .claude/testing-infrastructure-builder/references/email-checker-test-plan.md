# Email Checker Test Plan

## Testing Pyramid Breakdown

### Unit Tests (70%)
- **Components**: 40 tests
- **Services**: 25 tests
- **Utilities**: 15 tests
- **Total**: ~80 tests, <5 seconds execution

### Integration Tests (20%)
- **API + UI**: 15 tests
- **Multi-component**: 10 tests
- **Total**: ~25 tests, 5-15 seconds execution

### E2E Tests (10%)
- **Critical paths**: 8 tests
- **Total**: ~8 tests, 1-3 minutes execution

## Critical Paths

### 1. Dashboard Loading
**Priority**: Critical
**User Story**: User opens application and sees overview

**Test Scenarios**:
- Load dashboard with KPI cards
- Display processed/clean/blocked/queue counts
- Navigate between dashboard sections
- Refresh data on demand

**E2E Test**:
```javascript
describe('Dashboard Loading', () => {
  it('should load dashboard and display KPIs', () => {
    cy.visit('/');
    cy.get('[id="kpi-processed"]').should('be.visible');
    cy.get('[id="kpi-clean"]').should('contain', 'Clean');
    cy.get('[id="kpi-blocked"]').should('contain', 'Blocked');
  });
});
```

### 2. List Processing
**Priority**: Critical
**User Story**: User uploads email list and processes it

**Test Scenarios**:
- Select TXT file from dropdown
- Start processing
- Show progress indicator
- Display results (clean, blocked, invalid)
- Download processed files

**Integration Test**:
```javascript
describe('List Processing Integration', () => {
  test('should process list and show results', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        stats: { total: 1000, clean: 800, blocked: 200 }
      })
    });

    const manager = new ListsManager();
    await manager.processFile('test.txt');

    expect(manager.stats.clean).toBe(800);
    expect(manager.stats.blocked).toBe(200);
  });
});
```

### 3. Smart Filter Application
**Priority**: High
**User Story**: User applies smart filter to clean list

**Test Scenarios**:
- Select clean list file
- Choose filter (e.g., italy_hydraulics)
- Configure filter settings
- Apply filter
- View priority-segmented results
- Download HIGH/MEDIUM/LOW priority files

**E2E Test**:
```javascript
describe('Smart Filter Workflow', () => {
  it('should apply filter and segment results', () => {
    cy.visit('/smart-filter');

    cy.get('select[name="list"]').select('italy_contacts_clean.txt');
    cy.get('select[name="filter"]').select('italy_hydraulics');
    cy.get('button').contains('Apply Filter').click();

    cy.get('.results').should('be.visible');
    cy.get('.high-priority').should('contain', 'HIGH');
  });
});
```

### 4. Blocklist Management
**Priority**: High
**User Story**: User imports blocklist from CSV logs

**Test Scenarios**:
- Navigate to blocklist page
- Select CSV file(s)
- Preview import (dry-run)
- Confirm import
- View import report
- Search blocklist entries

**Integration Test**:
```javascript
describe('Blocklist Import', () => {
  test('should import CSV and add to blocklist', async () => {
    const csvData = 'email,status\nblocked@spam.com,Hard bounce';

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        imported: 1,
        duplicates: 0
      })
    });

    const manager = new BlocklistManager();
    const result = await manager.importCSV(csvData);

    expect(result.imported).toBe(1);
  });
});
```

### 5. Analytics Dashboard
**Priority**: Medium
**User Story**: User views analytics and charts

**Test Scenarios**:
- Load analytics page
- Display charts (processing trends, block rates)
- Filter by date range
- Export analytics data

**E2E Test**:
```javascript
describe('Analytics Dashboard', () => {
  it('should load analytics with charts', () => {
    cy.visit('/analytics.html');
    cy.get('.chart-container').should('be.visible');
    cy.get('canvas').should('exist');
  });
});
```

### 6. Archive Management
**Priority**: Medium
**User Story**: User manages archived lists

**Test Scenarios**:
- View archived lists
- Search archives
- Restore archived list
- Delete archived list
- Export archive

**E2E Test**:
```javascript
describe('Archive Management', () => {
  it('should display archived lists', () => {
    cy.visit('/archive.html');
    cy.get('.archive-list').should('be.visible');
  });
});
```

### 7. Error Recovery
**Priority**: Critical
**User Story**: Application recovers from errors gracefully

**Test Scenarios**:
- Handle network errors
- Handle API timeouts
- Handle invalid data
- Retry failed operations
- Display error messages

**E2E Test**:
```javascript
describe('Error Recovery', () => {
  it('should recover from network error', () => {
    cy.intercept('GET', '/api/**', { forceNetworkError: true });
    cy.visit('/');

    cy.get('.error-message').should('be.visible');

    cy.intercept('GET', '/api/**', { statusCode: 200, body: {} });
    cy.get('button').contains('Retry').click();

    cy.get('.error-message').should('not.exist');
  });
});
```

### 8. Theme Switching
**Priority**: Low
**User Story**: User switches between light/dark themes

**Test Scenarios**:
- Toggle theme
- Persist theme preference
- Apply theme on reload

**Unit Test**:
```javascript
describe('Theme Manager', () => {
  test('should toggle theme', () => {
    const theme = new ThemeManager();

    theme.toggle();
    expect(theme.current).toBe('dark');

    theme.toggle();
    expect(theme.current).toBe('light');
  });
});
```

## Component Test Coverage

### API Client (`services/api.js`)
**Target**: 95% coverage

**Tests**:
- Fetch lists successfully
- Handle 404 errors
- Handle 500 errors
- Handle network errors
- Process file successfully
- Apply smart filter successfully
- POST with body
- GET with query params

### Error Boundary (`components/error-boundary.js`)
**Target**: 95% coverage

**Tests**:
- Initialize error boundary
- Capture error
- Increment error count
- Prevent recursive errors
- Render error UI
- Show/hide error details
- Retry operation
- Reset error state
- Notify observers
- Track statistics

### Cache Manager (`components/cache-manager.js`)
**Target**: 90% coverage

**Tests**:
- Initialize cache
- Get cached value
- Set cache value
- Clear cache
- Handle cache expiration
- Persist to localStorage
- Restore from localStorage

### Retry Manager (`components/retry-manager.js`)
**Target**: 90% coverage

**Tests**:
- Execute with retry
- Retry on failure
- Max retry attempts
- Exponential backoff
- Success on retry
- Fail after max retries

## Edge Cases

### Email Validation
- Empty string
- Null/undefined
- MD5/SHA1 hashes
- UUID format
- Very long emails (>100 chars)
- Special characters
- International characters
- Multiple @ symbols

### File Processing
- Empty file
- Single email
- Large file (10K+ emails)
- Duplicate emails
- Mixed TXT/LVP files
- Invalid file format

### API Responses
- Empty response
- Malformed JSON
- Missing fields
- Extra fields
- Null values
- Very large responses

### State Management
- Concurrent updates
- Race conditions
- State persistence
- State recovery

## Performance Benchmarks

### Unit Tests
- Total execution: <5 seconds
- Single test: <100ms
- Setup time: <50ms

### Integration Tests
- Total execution: 5-15 seconds
- Single test: <1 second

### E2E Tests
- Total execution: 1-3 minutes
- Single test: 10-30 seconds
- Page load: <3 seconds

## Coverage Targets

### Global
- Branches: 80%
- Functions: 85%
- Lines: 85%
- Statements: 85%

### Critical Paths (Services)
- Branches: 90%
- Functions: 95%
- Lines: 90%
- Statements: 90%

### Components
- Branches: 80%
- Functions: 85%
- Lines: 85%
- Statements: 85%

## Test Data Requirements

### Mock Lists
- Italian hydraulics list (1000 emails)
- German automotive list (800 emails)
- Mixed country list (500 emails)

### Mock Emails
- Valid corporate emails (100)
- Blocked emails (50)
- Invalid emails (30)
- Edge case emails (20)

### Mock API Responses
- Success responses (lists, filters, metadata)
- Error responses (400, 404, 500)
- Partial responses
- Empty responses

## CI/CD Integration

### Pre-commit
- Run unit tests
- Check coverage thresholds

### Pull Request
- Run all tests
- Generate coverage report
- Upload to Codecov

### Main Branch
- Run E2E tests
- Deploy if tests pass
- Archive test artifacts

## Flaky Test Prevention

### Guidelines
- Always mock external dependencies
- Use deterministic test data
- Clear state between tests
- Avoid fixed waits (use assertions)
- Mock timers
- Use unique IDs

### Common Issues
- **Timing**: Always await async operations
- **State**: Clear localStorage/sessionStorage
- **DOM**: Clean up elements in afterEach
- **Mocks**: Reset mocks between tests
