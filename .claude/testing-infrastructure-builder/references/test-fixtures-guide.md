# Test Fixtures Guide

## Fixture Organization

Structure fixtures by domain and type:

```
test/
├── fixtures/
│   ├── api-responses/       # Mock API responses
│   │   ├── lists-success.json
│   │   ├── lists-error.json
│   │   ├── filter-results.json
│   │   └── metadata.json
│   ├── email-data/          # Email test data
│   │   ├── valid-emails.json
│   │   ├── blocked-emails.json
│   │   └── edge-cases.json
│   ├── factories/           # Data generation functions
│   │   ├── list-factory.js
│   │   ├── email-factory.js
│   │   └── user-factory.js
│   └── html/                # HTML fixtures
│       ├── form-page.html
│       └── table-page.html
```

## Factory Functions

### Basic Factory Pattern

```javascript
// test/fixtures/factories/list-factory.js

let listIdCounter = 1;

export function createMockList(overrides = {}) {
  const id = `list-${listIdCounter++}`;

  return {
    id,
    filename: `test-${id}.txt`,
    display_name: `Test List ${id}`,
    file_type: 'txt',
    country: 'IT',
    category: 'Automotive',
    priority: 1,
    processed: false,
    date_added: '2025-10-29T10:00:00Z',
    stats: {
      total: 1000,
      clean: 800,
      blocked: 150,
      invalid: 50
    },
    metadata: {
      source: 'import',
      notes: 'Test data'
    },
    ...overrides
  };
}

// Reset counter in tests
export function resetListCounter() {
  listIdCounter = 1;
}
```

### Usage in Tests

```javascript
import { createMockList, resetListCounter } from '../fixtures/factories/list-factory';

describe('Lists Manager', () => {
  beforeEach(() => {
    resetListCounter();
  });

  test('should display lists', () => {
    const lists = [
      createMockList(),
      createMockList({ country: 'DE', category: 'Manufacturing' })
    ];

    // Use in test
    expect(lists).toHaveLength(2);
    expect(lists[0].country).toBe('IT');
    expect(lists[1].country).toBe('DE');
  });
});
```

### Advanced Factory with Builder Pattern

```javascript
// test/fixtures/factories/email-factory.js

class EmailBuilder {
  constructor() {
    this.email = {
      address: 'test@example.com',
      domain: 'example.com',
      localPart: 'test',
      valid: true,
      blocked: false,
      metadata: {}
    };
  }

  withAddress(address) {
    this.email.address = address;
    const [localPart, domain] = address.split('@');
    this.email.localPart = localPart;
    this.email.domain = domain;
    return this;
  }

  asBlocked() {
    this.email.blocked = true;
    return this;
  }

  asInvalid() {
    this.email.valid = false;
    return this;
  }

  withMetadata(metadata) {
    this.email.metadata = { ...this.email.metadata, ...metadata };
    return this;
  }

  build() {
    return { ...this.email };
  }
}

export function createEmail() {
  return new EmailBuilder();
}

// Usage
const blockedEmail = createEmail()
  .withAddress('blocked@spam.com')
  .asBlocked()
  .build();

const validEmail = createEmail()
  .withAddress('valid@company.it')
  .withMetadata({ company: 'Test Corp', country: 'IT' })
  .build();
```

## JSON Fixtures

### API Response Fixtures

```json
// test/fixtures/api-responses/lists-success.json
{
  "success": true,
  "lists": [
    {
      "id": "list-1",
      "filename": "italy_contacts.txt",
      "display_name": "Italy Contacts",
      "file_type": "txt",
      "country": "IT",
      "category": "Hydraulics",
      "processed": true,
      "date_added": "2025-10-29T10:00:00Z",
      "stats": {
        "total": 1000,
        "clean": 800,
        "blocked": 150,
        "invalid": 50
      }
    }
  ],
  "metadata": {
    "total_lists": 1,
    "last_updated": "2025-10-29T10:00:00Z",
    "server_version": "1.0.0"
  }
}
```

```json
// test/fixtures/api-responses/lists-error.json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Internal server error",
    "details": "Database connection failed"
  }
}
```

### Loading JSON Fixtures

```javascript
import listsSuccess from '../fixtures/api-responses/lists-success.json';
import listsError from '../fixtures/api-responses/lists-error.json';

test('should handle API response', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(listsSuccess)
  });

  const result = await api.fetchLists();
  expect(result.lists).toHaveLength(1);
});

test('should handle API error', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve(listsError)
  });

  await expect(api.fetchLists()).rejects.toThrow();
});
```

## Deterministic Test Data

### Fixed Timestamps

```javascript
// Always use fixed dates in tests
const FIXED_DATE = new Date('2025-10-29T10:00:00Z');

beforeEach(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => FIXED_DATE.getTime());
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('should use fixed date', () => {
  const timestamp = Date.now();
  expect(timestamp).toBe(FIXED_DATE.getTime());
});
```

### Sequential IDs

```javascript
let idCounter = 1;

function generateId() {
  return `id-${idCounter++}`;
}

beforeEach(() => {
  idCounter = 1; // Reset for each test
});

test('should generate sequential IDs', () => {
  expect(generateId()).toBe('id-1');
  expect(generateId()).toBe('id-2');
});
```

## Large Dataset Fixtures

### Generate Many Items

```javascript
function createMockLists(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `list-${i + 1}`,
    filename: `list-${i + 1}.txt`,
    stats: {
      total: Math.floor(Math.random() * 1000) + 100,
      clean: Math.floor(Math.random() * 800) + 50
    }
  }));
}

test('should handle 1000 lists', () => {
  const lists = createMockLists(1000);
  expect(lists).toHaveLength(1000);
});
```

### Realistic Random Data

```javascript
function createRealisticEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'company.it', 'business.de'];
  const names = ['john', 'jane', 'mario', 'luigi'];

  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];

  return {
    address: `${name}@${domain}`,
    domain,
    valid: Math.random() > 0.1,
    blocked: Math.random() > 0.9
  };
}

// Use seeded random for determinism
beforeEach(() => {
  Math.random = jest.fn(() => 0.5);
});
```

## HTML Fixtures

### Page Fixtures

```html
<!-- test/fixtures/html/form-page.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Test Form</title>
</head>
<body>
  <form id="test-form">
    <input type="text" name="name" />
    <input type="email" name="email" />
    <button type="submit">Submit</button>
  </form>
</body>
</html>
```

### Loading HTML Fixtures

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

function loadHTMLFixture(filename) {
  const path = join(__dirname, '../fixtures/html', filename);
  return readFileSync(path, 'utf-8');
}

test('should parse form HTML', () => {
  const html = loadHTMLFixture('form-page.html');
  document.body.innerHTML = html;

  const form = document.getElementById('test-form');
  expect(form).toBeTruthy();
});
```

## CSV Fixtures

```csv
# test/fixtures/email-data/valid-emails.csv
email,domain,country,valid
john@company.it,company.it,IT,true
maria@business.de,business.de,DE,true
invalid@,invalid,US,false
```

```javascript
import { readFileSync } from 'fs';

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {});
  });
}

test('should load CSV fixture', () => {
  const csv = readFileSync('./test/fixtures/email-data/valid-emails.csv', 'utf-8');
  const data = parseCSV(csv);

  expect(data).toHaveLength(3);
  expect(data[0].email).toBe('john@company.it');
});
```

## Mock Complex Objects

### Nested Objects

```javascript
function createComplexMock() {
  return {
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          push: false
        }
      }
    },
    metadata: {
      created: '2025-10-29T10:00:00Z',
      updated: '2025-10-29T11:00:00Z',
      version: 1
    }
  };
}
```

### Arrays of Objects

```javascript
function createMockEmailsWithMetadata() {
  return [
    {
      email: 'ceo@company.it',
      metadata: {
        position: 'CEO',
        department: 'Management',
        company: 'Test Corp',
        country: 'IT'
      }
    },
    {
      email: 'sales@company.it',
      metadata: {
        position: 'Sales Manager',
        department: 'Sales',
        company: 'Test Corp',
        country: 'IT'
      }
    }
  ];
}
```

## Fixture Utilities

### Deep Clone

```javascript
function cloneFixture(fixture) {
  return JSON.parse(JSON.stringify(fixture));
}

test('should not mutate original fixture', () => {
  const original = createMockList();
  const copy = cloneFixture(original);

  copy.filename = 'modified.txt';

  expect(original.filename).not.toBe('modified.txt');
});
```

### Merge Overrides

```javascript
function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], mergeDeep(target[key], source[key]));
    }
  }
  return Object.assign(target || {}, source);
}

const mockList = createMockList();
const customized = mergeDeep(mockList, {
  stats: { clean: 900 }  // Only override clean, keep other stats
});
```

## Best Practices

1. **Keep fixtures small**: Only include data needed for tests
2. **Use factories**: Generate data programmatically for flexibility
3. **Be deterministic**: Use fixed dates, sequential IDs
4. **Don't repeat**: Share fixtures across tests
5. **Version fixtures**: Update fixtures when data models change
6. **Document fixtures**: Add comments explaining complex fixtures
7. **Separate by concern**: Different fixtures for different test scenarios
