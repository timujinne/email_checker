# 👨‍💻 Developer & Admin Guide

**Version:** 1.0.1
**Last Updated:** 26 October 2025

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Component Development](#component-development)
5. [Testing](#testing)
6. [API Integration](#api-integration)
7. [Deployment](#deployment)
8. [Admin Operations](#admin-operations)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### System Architecture

```
Frontend (Web Browser)
├── HTML Pages (8 pages)
├── JavaScript Components (57 components)
├── CSS (Tailwind + Custom)
└── WebSocket Connection

Backend APIs
├── Email Processing
├── Analytics
├── Archive/Cloud
└── User Management

External Services
├── Google OAuth
├── Google Cloud Storage
└── Third-party APIs
```

### Technology Stack

- **Frontend:** Vanilla JavaScript (No frameworks)
- **Styling:** Tailwind CSS + daisyUI
- **Charts:** Chart.js 3.9+
- **Testing:** Jest + Cypress
- **Build:** Webpack
- **Version Control:** Git

### Design Patterns

- **Observable/Pub-Sub:** Event handling
- **Lazy Loading:** Code splitting
- **LRU Caching:** Memory management
- **Circuit Breaker:** Error handling
- **Bulkhead:** Resource isolation

---

## 🚀 Getting Started

### Development Setup

```bash
# Clone repository
git clone <repo-url>
cd email_checker

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

### Project Requirements

- **Node.js:** >= 14.0.0
- **npm:** >= 6.0.0
- **Python:** >= 3.6 (for backend)
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 📁 Project Structure

```
email_checker/
├── web/                           # Frontend code
│   ├── index.html                # Main page
│   ├── analytics.html            # Analytics page
│   ├── archive.html              # Archive page
│   ├── assets/
│   │   ├── css/
│   │   │   ├── custom.css       # Custom styles
│   │   │   └── ...
│   │   └── js/
│   │       ├── main.js          # Entry point
│   │       ├── components/      # 57 components
│   │       │   ├── Phase 1/     # Foundation (15)
│   │       │   ├── Phase 2/     # Core (4)
│   │       │   ├── Phase 3/     # Smart Filter (9)
│   │       │   ├── Phase 4/     # Advanced (13)
│   │       │   ├── Phase 5/     # Analytics (8)
│   │       │   └── Phase 6/     # Polish (8)
│   │       └── utils/
│   └── ...
├── test/                          # Unit tests
│   ├── setup.js                 # Test configuration
│   ├── error-boundary.test.js   # Error tests
│   ├── cache-manager.test.js    # Cache tests
│   └── ...
├── cypress/                       # E2E tests
│   ├── e2e/
│   │   └── critical-paths.cy.js
│   └── support/
├── backend/                       # Backend code (optional)
│   ├── api/
│   └── ...
├── jest.config.js                # Jest configuration
├── cypress.config.js             # Cypress configuration
├── package.json                  # npm dependencies
├── .env.example                  # Environment variables
└── documentation/                # Documentation files
    ├── USER_GUIDE.md
    ├── DEVELOPER_GUIDE.md
    ├── PHASE6_9_PERFORMANCE_BENCHMARKS.md
    └── ...
```

---

## 🧩 Component Development

### Creating a New Component

```javascript
/**
 * MyComponent
 * Description of component functionality
 *
 * @module MyComponent
 */

class MyComponent {
    constructor(options = {}) {
        this.options = {
            // Default options
            ...options
        };

        this.observers = [];
        this.init();
    }

    init() {
        // Initialize component
        console.log('✅ MyComponent initialized');
    }

    // Public methods
    doSomething() {
        // Implementation
    }

    // Observable pattern
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    _notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }
}
```

### Component Best Practices

1. **Single Responsibility:** Each component has one job
2. **Observable Pattern:** Use pub/sub for communication
3. **Error Handling:** Wrap operations in try/catch
4. **Documentation:** JSDoc comments for all methods
5. **Testing:** Write unit tests for critical logic

---

## 🧪 Testing

### Unit Tests (Jest)

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests (Cypress)

```bash
# Run E2E tests
npm run test:e2e

# Open Cypress UI
npm run test:e2e:open
```

### Test Coverage Requirements

- **Statements:** >= 85%
- **Branches:** >= 80%
- **Functions:** >= 85%
- **Lines:** >= 85%

### Writing Tests

```javascript
describe('MyComponent', () => {
    let component;

    beforeEach(() => {
        component = new MyComponent();
    });

    test('should do something', () => {
        expect(component.doSomething()).toBe('expected');
    });

    test('should handle errors', () => {
        expect(() => {
            component.doSomething();
        }).toThrow();
    });
});
```

---

## 🔌 API Integration

### Backend API Endpoints

**Analytics:**
```
GET  /api/analytics/data
GET  /api/analytics/trends
POST /api/analytics/export
```

**Archive:**
```
GET  /api/archive/local
GET  /api/archive/cloud
POST /api/archive/sync
```

**Processing:**
```
POST /api/process
GET  /api/status
```

### Making API Calls

```javascript
// Using built-in api service
const data = await api.get('/api/lists');
const result = await api.post('/api/process', { listId: '123' });

// With error handling
try {
    const data = await api.get('/api/data');
} catch (error) {
    console.error('API Error:', error.message);
    toast.error('Failed to fetch data');
}
```

### Query Optimization

```javascript
// Cache responses
const data = await queryOptimizer.request('/api/data', {
    cache: true,
    cacheTTL: 3600000
});

// Batch requests
const results = await queryOptimizer.batchRequests([
    { url: '/api/data1', options: {} },
    { url: '/api/data2', options: {} }
]);
```

---

## 🚀 Deployment

### Build for Production

```bash
# Build optimized bundle
npm run build

# Result: dist/ directory with minified code
```

### Deployment Checklist

- ✅ All tests passing
- ✅ Code coverage > 85%
- ✅ Lighthouse score > 90
- ✅ No console errors
- ✅ Environment variables set
- ✅ SSL certificate valid
- ✅ Monitoring configured
- ✅ Backups prepared

### Server Configuration

```nginx
# Production server (nginx example)
server {
    listen 443 ssl http2;
    server_name emailchecker.com;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://backend:8080;
    }
}
```

---

## 🔧 Admin Operations

### User Management

```bash
# Create admin user (via backend)
python manage.py create_user --admin --email admin@example.com

# View users
python manage.py list_users

# Delete user
python manage.py delete_user --id user_id
```

### Database Maintenance

```bash
# Backup database
pg_dump emailchecker > backup_$(date +%Y%m%d).sql

# Restore database
psql emailchecker < backup_20251026.sql

# Optimize database
VACUUM ANALYZE;
```

### Monitoring

Access monitoring dashboard:
- Performance Monitor: `window.PerformanceMonitor`
- Error Tracking: `window.errorBoundaryManager`
- Logging Service: `window.loggingService`

### Logs

```bash
# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log

# Clear old logs
find logs/ -name "*.log" -mtime +30 -delete
```

---

## 🆘 Troubleshooting

### Build Issues

**Problem:** Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run build
```

**Problem:** Missing dependencies
```bash
# Check npm audit
npm audit

# Install missing packages
npm install missing-package@latest
```

### Runtime Issues

**Problem:** Component not loading
```javascript
// Check lazy loading
LazyLoader.getStats()

// Check cache
CacheManager.getStats()

// Monitor errors
window.errorBoundaryManager.displayStats()
```

**Problem:** Memory leak
```javascript
// Check memory usage
performance.memory

// Clear cache if needed
LazyLoader.clearCache()

// Monitor garbage collection
window.PerformanceMonitor.displayDashboard()
```

### Testing Issues

**Problem:** Tests failing
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test
npm test -- error-boundary.test.js

# Update snapshots
npm test -- -u
```

---

## 📞 Support

- **Documentation:** See USER_GUIDE.md and PHASE6_*.md files
- **Issues:** GitHub Issues
- **Email:** support@emailchecker.com
- **Slack:** #engineering channel

---

**Last Updated:** 26 October 2025
✅ **Version 1.0.0 - Complete**
