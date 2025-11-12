# Bundle Optimization Guide

## Analyzing Your Bundle

### Initial Analysis

Start with comprehensive bundle analysis to understand composition:

```bash
# Generate webpack stats
npx webpack --profile --json > stats.json

# Visualize with webpack-bundle-analyzer
npx webpack-bundle-analyzer stats.json

# Alternative: source-map-explorer
npx source-map-explorer dist/*.js
```

### Key Metrics to Track

1. **Total Size**
   - Uncompressed size
   - Gzipped size (what users download)
   - Brotli size (even better compression)

2. **Composition**
   - node_modules vs application code ratio
   - Largest individual dependencies
   - Duplicate dependencies across chunks

3. **Chunking Strategy**
   - Number of chunks generated
   - Size distribution across chunks
   - Shared dependencies between chunks

### Red Flags

- Single bundle >500KB uncompressed
- node_modules >70% of total bundle
- Multiple versions of same library
- Unused exports included (tree-shaking failure)
- Large libraries for small features

## Tree-Shaking Optimization

### Prerequisites

Tree-shaking requires:
1. ES modules (not CommonJS)
2. Side-effect-free code
3. Static imports (not dynamic requires)

### Configuration

**package.json:**
```json
{
  "sideEffects": false,
  "module": "dist/index.esm.js"
}
```

**webpack.config.js:**
```javascript
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimize: true
  }
};
```

### Common Issues

**Issue: CommonJS imports**
```javascript
// BAD: Bundles entire lodash
const _ = require('lodash');

// GOOD: Tree-shakeable
import { debounce } from 'lodash-es';
```

**Issue: Barrel exports**
```javascript
// utils/index.js - BAD: Bundles all utils
export * from './email.js';
export * from './date.js';
export * from './string.js';

// BETTER: Import directly
import { validateEmail } from './utils/email.js';
```

**Issue: Side effects**
```javascript
// BAD: Side effect prevents tree-shaking
import './polyfills.js'; // Modifies global scope

// GOOD: Explicit import
import { polyfill } from './polyfills.js';
polyfill();
```

## Code Splitting Strategies

### 1. Route-Based Splitting

Most effective for multi-page applications:

```javascript
// router.js
const routes = {
  '/': () => import('./pages/Home.js'),
  '/admin': () => import('./pages/Admin.js'),
  '/reports': () => import('./pages/Reports.js')
};

async function navigate(path) {
  const loader = routes[path];
  if (!loader) {
    throw new Error(`Route not found: ${path}`);
  }

  showLoadingIndicator();
  try {
    const module = await loader();
    const page = new module.default();
    renderPage(page);
  } catch (error) {
    showErrorPage(error);
  } finally {
    hideLoadingIndicator();
  }
}
```

**Benefits:**
- Initial bundle only includes router logic
- Each route loads independently
- Browser caches routes separately
- Automatic code splitting by page

### 2. Feature-Based Splitting

Split large features loaded conditionally:

```javascript
// Lazy load smart filter feature
async function loadSmartFilter() {
  if (window.smartFilterModule) {
    return window.smartFilterModule;
  }

  const module = await import('./features/smart-filter.js');
  window.smartFilterModule = module;
  return module;
}

// Usage
document.getElementById('smart-filter-btn').addEventListener('click', async () => {
  const { SmartFilter } = await loadSmartFilter();
  const filter = new SmartFilter();
  filter.render();
});
```

### 3. Vendor Splitting

Separate stable dependencies from application code:

```javascript
// webpack.config.js
optimization: {
  splitChunks: {
    cacheGroups: {
      // Vendor bundle (node_modules)
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10
      },
      // Common code shared across routes
      common: {
        minChunks: 2,
        name: 'common',
        chunks: 'async',
        priority: 5,
        reuseExistingChunk: true
      }
    }
  }
}
```

**Benefits:**
- Vendor bundle cached long-term (rarely changes)
- Application code updates don't invalidate vendor cache
- Better cache hit rates

### 4. Dynamic Import with Prefetch

Load chunks before user needs them:

```javascript
// Prefetch next likely route
function prefetchAdminPanel() {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = '/dist/admin.chunk.js';
  document.head.appendChild(link);
}

// Prefetch on hover
adminLink.addEventListener('mouseenter', () => {
  prefetchAdminPanel();
}, { once: true });
```

## Dependency Optimization

### Audit Dependencies

```bash
# Find unused dependencies
npx depcheck

# Check dependency sizes
npx bundlephobia lodash moment
```

### Replace Heavy Dependencies

**Lodash → Native or lodash-es:**
```javascript
// Before: 70KB
import _ from 'lodash';
_.debounce(fn, 300);

// After: 2KB
import debounce from 'lodash-es/debounce';
debounce(fn, 300);

// Or native
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
```

**Moment.js → date-fns or native:**
```javascript
// Before: 230KB
import moment from 'moment';
moment().format('YYYY-MM-DD');

// After: 10KB
import { format } from 'date-fns';
format(new Date(), 'yyyy-MM-dd');

// Or native
new Intl.DateTimeFormat('en-US').format(new Date());
```

**jQuery → Vanilla JS:**
```javascript
// Before: 87KB
$('#element').addClass('active');
$('.items').each((i, el) => { ... });

// After: 0KB
document.getElementById('element').classList.add('active');
document.querySelectorAll('.items').forEach(el => { ... });
```

### Conditional Polyfills

Only load polyfills when needed:

```javascript
// Check feature support
if (!window.IntersectionObserver) {
  await import('intersection-observer');
}

// Or use dynamic polyfill service
<script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver"></script>
```

## Compression

### Enable Gzip/Brotli

**Server-side (Express):**
```javascript
const compression = require('compression');
app.use(compression());
```

**Build-time (webpack):**
```javascript
const CompressionPlugin = require('compression-webpack-plugin');

plugins: [
  new CompressionPlugin({
    algorithm: 'gzip',
    test: /\.(js|css|html|svg)$/,
    threshold: 10240, // Only compress >10KB
    minRatio: 0.8
  }),
  new CompressionPlugin({
    algorithm: 'brotliCompress',
    filename: '[path][base].br',
    test: /\.(js|css|html|svg)$/,
    threshold: 10240,
    minRatio: 0.8
  })
]
```

### Size Comparison

Typical compression ratios:
- Uncompressed: 600KB
- Gzip: 180KB (70% reduction)
- Brotli: 150KB (75% reduction)

## Performance Budget

### Define Targets

```javascript
// performance-budget.json
{
  "budgets": [{
    "resourceSizes": [{
      "resourceType": "script",
      "budget": 200000 // 200KB gzipped
    }, {
      "resourceType": "stylesheet",
      "budget": 30000 // 30KB gzipped
    }, {
      "resourceType": "total",
      "budget": 300000 // 300KB total gzipped
    }]
  }]
}
```

### Enforce in CI

```javascript
// .github/workflows/performance-budget.yml
name: Performance Budget
on: [pull_request]
jobs:
  check-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run build
      - run: npx bundlesize
```

```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/bundle.js",
      "maxSize": "200 kB"
    },
    {
      "path": "./dist/vendor.js",
      "maxSize": "100 kB"
    }
  ]
}
```

## Email Checker Specific Optimizations

### Target Bundle Sizes

- **Main bundle**: <100KB gzipped (core functionality)
- **Vendor bundle**: <80KB gzipped (dependencies)
- **Admin chunk**: <50KB gzipped (admin features)
- **Charts chunk**: <40KB gzipped (visualization)
- **Total initial load**: <200KB gzipped

### Splitting Strategy

```javascript
// Recommended chunk structure
entry: {
  main: './src/index.js',        // Core UI
},
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      },
      admin: {
        test: /[\\/]src[\\/]admin[\\/]/,
        name: 'admin',
        chunks: 'async',
        priority: 5
      },
      charts: {
        test: /chart|graph/i,
        name: 'charts',
        chunks: 'async',
        priority: 5
      }
    }
  }
}
```

### Lazy Load Heavy Features

- Smart filter UI (only when button clicked)
- Metadata viewer (only when viewing metadata)
- Chart library (only when viewing reports)
- LVP parser (only when processing LVP files)

## Monitoring

### Track Bundle Size Over Time

```javascript
// Generate size report on each build
const { writeFileSync } = require('fs');
const { gzipSync } = require('zlib');
const { readFileSync } = require('fs');

const bundle = readFileSync('dist/bundle.js');
const gzipped = gzipSync(bundle).length;

const report = {
  timestamp: Date.now(),
  uncompressed: bundle.length,
  gzipped: gzipped,
  date: new Date().toISOString()
};

// Append to size history
const history = JSON.parse(readFileSync('size-history.json'));
history.push(report);
writeFileSync('size-history.json', JSON.stringify(history, null, 2));

console.log(`Bundle size: ${gzipped / 1024}KB gzipped`);
```

### Alert on Size Regressions

```javascript
// Check if size increased significantly
const previous = history[history.length - 2];
const current = history[history.length - 1];

const increase = current.gzipped - previous.gzipped;
const percentIncrease = (increase / previous.gzipped) * 100;

if (percentIncrease > 5) {
  console.warn(`⚠️ Bundle size increased by ${percentIncrease.toFixed(2)}%`);
  process.exit(1); // Fail CI
}
```
