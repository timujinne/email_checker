# Unit Test Patterns for Vanilla JavaScript

## Test Structure: AAA Pattern

Follow **Arrange, Act, Assert** pattern for clear, readable tests:

```javascript
describe('ComponentName', () => {
  let component;
  let mockData;

  beforeEach(() => {
    // Arrange: Set up test environment
    mockData = { value: 'test' };
    component = new ComponentName(mockData);
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  describe('Feature Group', () => {
    test('should perform expected behavior', () => {
      // Arrange: Prepare specific test data
      const input = { id: 1, name: 'Test' };

      // Act: Execute the operation
      const result = component.process(input);

      // Assert: Verify expectations
      expect(result).toBe('expected');
      expect(component.state.changed).toBe(true);
    });
  });
});
```

## Naming Conventions

### Test File Names

- Unit tests: `component-name.test.js` or `component-name.spec.js`
- Place tests alongside source (`component.js` + `component.test.js`)
- Or in `test/` directory mirroring source structure

### Test Suite Names

- Use `describe()` for grouping related tests
- Name describes the unit being tested: `describe('ErrorBoundary', ...)`
- Nested describes for features: `describe('Error Capturing', ...)`

### Test Names

Use descriptive names starting with "should":

```javascript
// Good
test('should fetch lists successfully', async () => {});
test('should handle network errors gracefully', async () => {});
test('should update state and notify listeners', () => {});

// Avoid
test('fetchLists', async () => {});  // Too vague
test('works', () => {});              // Not descriptive
```

## Mocking Patterns

### Mock Functions

```javascript
// Create mock function
const mockCallback = jest.fn();

// Configure return value
mockCallback.mockReturnValue('result');

// Configure resolved promise
mockCallback.mockResolvedValue({ data: 'test' });

// Configure rejected promise
mockCallback.mockRejectedValue(new Error('Failed'));

// Verify calls
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
```

### Mock Modules

```javascript
// Mock entire module
jest.mock('./services/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mock' })),
  postData: jest.fn()
}));

// Import mocked module
import { fetchData, postData } from './services/api';

// Use in tests
test('should use mocked API', async () => {
  const result = await fetchData();
  expect(result.data).toBe('mock');
  expect(fetchData).toHaveBeenCalled();
});
```

### Partial Module Mocking

```javascript
// Mock only specific functions
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),  // Keep real implementations
  formatDate: jest.fn(() => '2025-01-01')  // Mock this one
}));
```

### Mock fetch API

```javascript
// Mock successful response
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: 'test' }),
    text: () => Promise.resolve('test'),
    headers: new Headers()
  })
);

// Test API call
test('should fetch data', async () => {
  const result = await apiClient.getData();

  expect(fetch).toHaveBeenCalledWith('/api/data', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  expect(result.data).toBe('test');
});

// Mock error response
fetch.mockImplementationOnce(() =>
  Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: 'Server error' })
  })
);

// Or reject promise
fetch.mockRejectedValueOnce(new Error('Network error'));
```

### Mock Browser APIs

```javascript
// localStorage
Storage.prototype.getItem = jest.fn((key) => {
  if (key === 'theme') return 'dark';
  return null;
});
Storage.prototype.setItem = jest.fn();

// Verify usage
test('should save to localStorage', () => {
  component.saveTheme('dark');
  expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
});

// performance.now()
performance.now = jest.fn(() => 1000);

// Date.now()
jest.spyOn(Date, 'now').mockImplementation(() => 1609459200000);
```

## Async Testing

### Testing Promises

```javascript
// Using async/await (recommended)
test('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('success');
});

// Testing rejection
test('should handle errors', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});

// Testing resolution
test('should resolve with data', async () => {
  await expect(successFunction()).resolves.toEqual({ data: 'test' });
});
```

### Testing Callbacks

```javascript
test('should call callback', (done) => {
  functionWithCallback((result) => {
    expect(result).toBe('done');
    done();  // Signal test completion
  });
});

// Or use promises
test('should call callback', () => {
  return new Promise((resolve) => {
    functionWithCallback((result) => {
      expect(result).toBe('done');
      resolve();
    });
  });
});
```

### Testing Timers

```javascript
// Use fake timers
jest.useFakeTimers();

test('should execute after delay', () => {
  const callback = jest.fn();

  setTimeout(callback, 1000);

  // Fast-forward time
  jest.advanceTimersByTime(1000);

  expect(callback).toHaveBeenCalled();
});

// Run all timers
test('should execute all timers', () => {
  const callback = jest.fn();

  setTimeout(callback, 100);
  setTimeout(callback, 500);

  jest.runAllTimers();

  expect(callback).toHaveBeenCalledTimes(2);
});

// Restore real timers
afterEach(() => {
  jest.useRealTimers();
});
```

## DOM Testing

### Creating Elements

```javascript
test('should create and append element', () => {
  const container = createElement('div', 'container');
  appendToBody(container);

  const component = new Component(container);
  component.render();

  expect(container.firstChild).toBeTruthy();
  expect(container.querySelector('.component')).toBeInTheDocument();
});
```

### Testing Event Handlers

```javascript
test('should handle click event', () => {
  const onClick = jest.fn();
  const button = createElement('button');

  button.addEventListener('click', onClick);
  button.click();

  expect(onClick).toHaveBeenCalledTimes(1);
});

test('should handle input change', () => {
  const input = createElement('input');
  appendToBody(input);

  input.value = 'test';
  input.dispatchEvent(new Event('input'));

  expect(input.value).toBe('test');
});
```

### Testing DOM Queries

```javascript
test('should find elements', () => {
  document.body.innerHTML = `
    <div class="container">
      <button id="submit">Submit</button>
      <span class="message">Hello</span>
    </div>
  `;

  expect(document.getElementById('submit')).toBeTruthy();
  expect(document.querySelector('.message').textContent).toBe('Hello');
  expect(document.querySelectorAll('button')).toHaveLength(1);
});
```

## Testing Error Handling

```javascript
test('should throw error for invalid input', () => {
  expect(() => {
    component.validate(null);
  }).toThrow('Invalid input');
});

test('should catch and handle errors', async () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  fetch.mockRejectedValueOnce(new Error('Network error'));

  await component.loadData();

  expect(component.error).toBeDefined();
  expect(component.error.message).toBe('Network error');
  expect(consoleErrorSpy).toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});
```

## Testing State Management

```javascript
describe('StateManager', () => {
  let state;

  beforeEach(() => {
    state = new StateManager();
  });

  test('should initialize with default state', () => {
    expect(state.get('count')).toBe(0);
  });

  test('should update state', () => {
    state.set('count', 5);
    expect(state.get('count')).toBe(5);
  });

  test('should notify subscribers on change', () => {
    const subscriber = jest.fn();
    state.subscribe('count', subscriber);

    state.set('count', 10);

    expect(subscriber).toHaveBeenCalledWith(10);
  });
});
```

## Coverage-Driven Development

### Branch Coverage

Test all conditional branches:

```javascript
// Source code
function process(value) {
  if (value > 10) {
    return 'high';
  } else {
    return 'low';
  }
}

// Tests
test('should return "high" for values > 10', () => {
  expect(process(15)).toBe('high');
});

test('should return "low" for values <= 10', () => {
  expect(process(5)).toBe('low');
});
```

### Edge Cases

Test boundary values and edge cases:

```javascript
describe('validation', () => {
  test('should accept empty array', () => {
    expect(validate([])).toBe(true);
  });

  test('should accept single item', () => {
    expect(validate([1])).toBe(true);
  });

  test('should handle null', () => {
    expect(validate(null)).toBe(false);
  });

  test('should handle undefined', () => {
    expect(validate(undefined)).toBe(false);
  });
});
```

### Error Paths

Test error handling and recovery:

```javascript
test('should handle API failure gracefully', async () => {
  fetch.mockRejectedValueOnce(new Error('Failed'));

  const result = await component.loadData();

  expect(result).toBeNull();
  expect(component.error).toBeDefined();
});

test('should retry on failure', async () => {
  fetch
    .mockRejectedValueOnce(new Error('Failed'))
    .mockResolvedValueOnce({ ok: true, json: () => ({ data: 'success' }) });

  const result = await component.loadDataWithRetry();

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result.data).toBe('success');
});
```

## Test Organization

### Group Related Tests

```javascript
describe('API Client', () => {
  describe('GET requests', () => {
    test('should fetch data successfully', async () => {});
    test('should handle 404 errors', async () => {});
  });

  describe('POST requests', () => {
    test('should submit data successfully', async () => {});
    test('should handle validation errors', async () => {});
  });
});
```

### Shared Setup

```javascript
describe('Component Tests', () => {
  let component;
  let container;

  beforeEach(() => {
    container = createElement('div');
    appendToBody(container);
    component = new Component(container);
  });

  afterEach(() => {
    component.destroy();
  });

  // Tests use shared setup
  test('should initialize', () => {
    expect(component).toBeDefined();
  });
});
```

## Snapshot Testing (Optional)

```javascript
test('should render correctly', () => {
  const component = new Component();
  const html = component.render();

  expect(html).toMatchSnapshot();
});

// Update snapshots with: npm test -- -u
```

## Performance Testing in Unit Tests

```javascript
test('should complete within time limit', async () => {
  const start = performance.now();

  await component.processLargeData();

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000);  // < 1 second
});
```

## Common Assertions

```javascript
// Equality
expect(value).toBe(expected);              // Strict equality (===)
expect(value).toEqual(expected);           // Deep equality
expect(value).toStrictEqual(expected);     // Strictest equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThanOrEqual(5);
expect(value).toBeCloseTo(0.3, 2);  // Floating point

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(array).toContainEqual({ id: 1 });

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith('arg');
expect(fn).toHaveReturned();
expect(fn).toHaveReturnedWith('value');

// Promises
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
expect(() => fn()).toThrow(TypeError);
```
