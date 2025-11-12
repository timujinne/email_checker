---
name: performance-optimizer
description: Expert in frontend performance optimization including bundle size reduction, virtual scrolling, lazy loading, code splitting, and runtime performance tuning. Specializes in vanilla JavaScript optimizations and Lighthouse-driven improvements for data-intensive applications. Invoke when optimizing slow pages, reducing bundle sizes, improving large list rendering, debugging bottlenecks, achieving Lighthouse targets, or optimizing mobile performance.
---

# Performance Optimizer

## Overview

This skill provides comprehensive frontend performance optimization expertise for data-intensive web applications. It covers the complete performance optimization lifecycle from initial analysis and profiling through implementation of optimizations like virtual scrolling, lazy loading, and code splitting, to ongoing monitoring and maintenance.

The skill emphasizes practical, vanilla JavaScript solutions that work across browsers without heavy framework dependencies. Special attention is given to optimizing applications that handle large datasets, such as email list managers displaying thousands of records, where traditional rendering approaches fail.

Performance optimization is treated as a systematic process: measure, identify bottlenecks, optimize, and verify. The skill provides tools and patterns for each phase, ensuring improvements are data-driven and measurable.

## Core Competencies

### Bundle Size Optimization
Expert in analyzing and reducing JavaScript bundle sizes through code splitting, tree-shaking, and dependency optimization. Can identify bloated dependencies, implement dynamic imports for route-based splitting, and configure build tools for optimal compression. Understands modern bundler capabilities (webpack, Rollup, esbuild) and can achieve significant size reductions without sacrificing functionality.

### Virtual Scrolling
Specializes in implementing efficient virtual scrolling for rendering large lists (1000+ items) by only rendering visible elements. Understands viewport calculations, scroll position tracking, buffer zones for smooth scrolling, and recycling DOM elements. Can build vanilla JavaScript implementations or integrate libraries, optimizing for 60fps scrolling performance.

### Lazy Loading Patterns
Implements progressive loading strategies for images, scripts, and components using Intersection Observer API and dynamic imports. Understands preloading strategies, critical resource prioritization, and balancing initial load time with user experience. Can implement sophisticated loading patterns including skeleton screens and progressive image loading.

### Performance Profiling
Expert in using browser DevTools Performance panel, Lighthouse, and Web Vitals to identify bottlenecks. Can interpret flame charts, identify layout thrashing, detect memory leaks, and pinpoint expensive operations. Understands JavaScript execution costs, rendering pipeline, and browser optimization strategies.

### Runtime Performance
Optimizes JavaScript execution through debouncing, throttling, requestAnimationFrame, and Web Workers. Understands event loop, task prioritization, and avoiding main thread blocking. Can refactor expensive operations, implement efficient algorithms, and optimize DOM manipulation patterns.

### Lighthouse Optimization
Systematically improves Core Web Vitals (LCP, FID, CLS) and Lighthouse scores across all categories. Understands scoring algorithms, optimization priorities, and category-specific fixes. Can achieve and maintain target scores through automated monitoring and performance budgets.

## When to Invoke This Skill

### Performance Issues
- Page load times exceed 3 seconds
- Scrolling feels janky or drops below 60fps
- UI becomes unresponsive during data processing
- Mobile devices show severe performance degradation
- Users report sluggish interactions or delays

### Technical Optimization Needs
- JavaScript bundle exceeds 200KB (gzipped)
- Need to render lists with 1000+ items efficiently
- Lighthouse Performance score below 90
- High bounce rates correlating with slow page loads
- Memory usage growing unbounded over time

### Implementation Requirements
- Implementing virtual scrolling for large datasets
- Setting up code splitting for multi-route applications
- Adding lazy loading for images and components
- Optimizing critical rendering path
- Establishing performance monitoring

### Analysis and Planning
- Performance audit before major feature launches
- Investigating reported performance issues
- Setting performance budgets for project
- Comparative analysis of optimization strategies
- Third-party script impact assessment

## Performance Budget for Email Checker

### Bundle Size Targets
The email checker web interface should maintain strict bundle size limits to ensure fast loading even on slow networks:

- **Total JavaScript**: <200KB gzipped (<600KB uncompressed)
- **Vendor code**: <100KB gzipped (third-party libraries)
- **Application code**: <100KB gzipped
- **CSS**: <30KB gzipped
- **HTML**: <20KB

### Load Performance Targets
- **First Contentful Paint (FCP)**: <1.0s
- **Largest Contentful Paint (LCP)**: <2.0s
- **Time to Interactive (TTI)**: <2.5s
- **Total Blocking Time (TBT)**: <150ms
- **Cumulative Layout Shift (CLS)**: <0.1

### Runtime Performance Targets
- **Scrolling**: Maintain 60fps (16.67ms frame budget)
- **List rendering**: Virtual scroll handles 22,000+ items smoothly
- **Search/filter**: Results update in <100ms
- **API responses**: Process in <50ms
- **Memory usage**: <50MB after processing large lists

### Specific Optimizations Required
1. **Virtual scrolling** for blocklists (22K emails + 700 domains)
2. **Lazy loading** for metadata tables and reports
3. **Code splitting** for admin/user sections
4. **Debounced search** for filter inputs
5. **Web Worker** for email validation/parsing (if needed)

## Bundle Optimization

### Analysis Phase

Start every optimization effort with thorough bundle analysis:

```bash
# Generate bundle statistics
npx webpack-bundle-analyzer dist/stats.json

# Or for quick visualization
npx source-map-explorer dist/bundle.js
```

**Key metrics to examine:**
- Total bundle size (gzipped vs uncompressed)
- Largest dependencies (top 10)
- Duplicate modules across chunks
- Unused exports (tree-shaking opportunities)
- Third-party vs application code ratio

### Tree-Shaking Optimization

Ensure your build configuration enables effective tree-shaking:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
  // ES modules required for tree-shaking
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', { modules: false }]]
        }
      }
    }]
  }
};
```

**Common tree-shaking pitfalls:**
- Using CommonJS (`require`) instead of ES modules (`import`)
- Side effects in module initialization
- Default exports preventing granular imports
- Barrel exports (`index.js`) bundling entire modules

### Code Splitting Strategies

Implement strategic code splitting to reduce initial bundle size:

**Route-based splitting** (most impactful):
```javascript
// Instead of static imports
import AdminPanel from './admin/AdminPanel.js';
import UserDashboard from './user/Dashboard.js';

// Use dynamic imports
const routes = {
  '/admin': () => import('./admin/AdminPanel.js'),
  '/dashboard': () => import('./user/Dashboard.js'),
  '/reports': () => import('./reports/ReportViewer.js')
};

async function loadRoute(path) {
  const loader = routes[path];
  if (loader) {
    const module = await loader();
    return module.default;
  }
}
```

**Vendor splitting** (separates stable dependencies):
```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      },
      common: {
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true
      }
    }
  }
}
```

### Dynamic Imports

Use dynamic imports for features loaded on demand:

```javascript
// Heavy library loaded only when needed
async function processComplexData(data) {
  const { default: processor } = await import('./heavyProcessor.js');
  return processor.process(data);
}

// With error handling and loading state
async function loadChartLibrary() {
  try {
    showLoadingSpinner();
    const { Chart } = await import('chart.js');
    hideLoadingSpinner();
    return Chart;
  } catch (error) {
    console.error('Failed to load chart library:', error);
    showErrorMessage('Charts unavailable');
  }
}
```

### Dependency Optimization

Replace heavy dependencies with lighter alternatives:

- **Lodash**: Use individual imports (`lodash.debounce`) or ES6 alternatives
- **Moment.js**: Replace with `date-fns` or native `Intl.DateTimeFormat`
- **jQuery**: Vanilla JavaScript for DOM manipulation
- **Axios**: Native `fetch` API for HTTP requests

Audit dependencies regularly:
```bash
npx depcheck  # Find unused dependencies
npx bundlephobia axios  # Check dependency size impact
```

## Virtual Scrolling Implementation

### Core Algorithm

Virtual scrolling renders only visible items plus a buffer, dramatically reducing DOM nodes:

```javascript
class VirtualScroller {
  constructor(container, items, itemHeight, renderItem) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;

    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.bufferSize = 5; // Extra items above/below viewport

    this.init();
  }

  init() {
    // Create scrollable container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.scrollContainer.style.position = 'relative';

    // Create viewport for visible items
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'absolute';
    this.viewport.style.top = '0';
    this.viewport.style.width = '100%';

    this.scrollContainer.appendChild(this.viewport);
    this.container.appendChild(this.scrollContainer);

    // Listen for scroll events
    this.container.addEventListener('scroll', () => this.onScroll());

    // Initial render
    this.render();
  }

  onScroll() {
    requestAnimationFrame(() => this.render());
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;

    // Calculate visible range
    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

    // Add buffer
    const startIndex = Math.max(0, this.visibleStart - this.bufferSize);
    const endIndex = Math.min(this.items.length, this.visibleEnd + this.bufferSize);

    // Clear and re-render visible items
    this.viewport.innerHTML = '';
    this.viewport.style.transform = `translateY(${startIndex * this.itemHeight}px)`;

    for (let i = startIndex; i < endIndex; i++) {
      const itemElement = this.renderItem(this.items[i], i);
      itemElement.style.height = `${this.itemHeight}px`;
      this.viewport.appendChild(itemElement);
    }
  }

  // Update items and re-render
  updateItems(newItems) {
    this.items = newItems;
    this.scrollContainer.style.height = `${this.items.length * this.itemHeight}px`;
    this.render();
  }

  // Scroll to specific item
  scrollToItem(index) {
    this.container.scrollTop = index * this.itemHeight;
  }
}
```

### Usage Example for Email Checker

```javascript
// Render 22,000 blocked emails efficiently
const blockedEmailsList = document.getElementById('blocked-emails-list');

const virtualScroller = new VirtualScroller(
  blockedEmailsList,
  blockedEmails, // Array of 22,000 emails
  40, // Item height in pixels
  (email, index) => {
    const div = document.createElement('div');
    div.className = 'email-item';
    div.innerHTML = `
      <span class="email-address">${email}</span>
      <span class="email-index">#${index + 1}</span>
    `;
    return div;
  }
);

// Update when filtering
function filterEmails(searchTerm) {
  const filtered = blockedEmails.filter(email =>
    email.includes(searchTerm.toLowerCase())
  );
  virtualScroller.updateItems(filtered);
}
```

### Performance Considerations

**Optimize rendering function:**
- Keep `renderItem` function fast (<1ms per item)
- Avoid heavy computations or API calls inside render
- Use CSS for styling instead of JavaScript
- Pre-process data before passing to virtual scroller

**Handle variable height items:**
```javascript
// Estimate heights, measure actual heights after render
class VariableHeightVirtualScroller extends VirtualScroller {
  constructor(container, items, estimateHeight, renderItem) {
    super(container, items, 0, renderItem);
    this.estimateHeight = estimateHeight;
    this.measuredHeights = new Map();
  }

  getItemHeight(index) {
    return this.measuredHeights.get(index) || this.estimateHeight(this.items[index]);
  }

  render() {
    // Calculate positions based on actual heights
    let offset = 0;
    for (let i = 0; i < this.visibleStart; i++) {
      offset += this.getItemHeight(i);
    }

    // Render and measure
    // (Implementation details omitted for brevity)
  }
}
```

### Recycling DOM Elements

For even better performance, recycle DOM elements instead of recreating:

```javascript
class RecyclingVirtualScroller extends VirtualScroller {
  constructor(...args) {
    super(...args);
    this.pool = [];
  }

  render() {
    // Reuse existing elements
    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i < endIndex; i++) {
      const element = this.pool.pop() || document.createElement('div');
      this.renderItem(this.items[i], i, element); // Update existing element
      fragment.appendChild(element);
    }

    // Store unused elements for reuse
    while (this.viewport.firstChild) {
      this.pool.push(this.viewport.firstChild);
      this.viewport.removeChild(this.viewport.firstChild);
    }

    this.viewport.appendChild(fragment);
  }
}
```

## Lazy Loading Patterns

### Image Lazy Loading

Use Intersection Observer API for efficient image lazy loading:

```javascript
class LazyImageLoader {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.rootMargin = options.rootMargin || '50px';

    this.observer = new IntersectionObserver(
      entries => this.handleIntersection(entries),
      {
        threshold: this.threshold,
        rootMargin: this.rootMargin
      }
    );
  }

  observe(img) {
    this.observer.observe(img);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Show loading placeholder
    img.classList.add('loading');

    // Create temporary image to load
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('loading');
      img.classList.add('loaded');
    };
    tempImg.onerror = () => {
      img.classList.add('error');
    };
    tempImg.src = src;
  }

  // Lazy load all images with data-src attribute
  observeAll(container = document) {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => this.observe(img));
  }
}

// Usage
const lazyLoader = new LazyImageLoader({ rootMargin: '100px' });
lazyLoader.observeAll();
```

### Module Lazy Loading

Load JavaScript modules on demand:

```javascript
// Module loader with caching
class ModuleLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  async load(modulePath) {
    // Return cached module
    if (this.cache.has(modulePath)) {
      return this.cache.get(modulePath);
    }

    // Wait for in-progress load
    if (this.loading.has(modulePath)) {
      return this.loading.get(modulePath);
    }

    // Start new load
    const loadPromise = import(modulePath)
      .then(module => {
        this.cache.set(modulePath, module);
        this.loading.delete(modulePath);
        return module;
      })
      .catch(error => {
        this.loading.delete(modulePath);
        throw error;
      });

    this.loading.set(modulePath, loadPromise);
    return loadPromise;
  }

  // Preload module without blocking
  preload(modulePath) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = modulePath;
    document.head.appendChild(link);
  }
}

// Usage for email checker features
const loader = new ModuleLoader();

document.getElementById('show-smart-filter').addEventListener('click', async () => {
  const { SmartFilterUI } = await loader.load('./smart-filter.js');
  const ui = new SmartFilterUI();
  ui.render();
});
```

### Progressive Enhancement Pattern

Load features progressively based on user interaction:

```javascript
class ProgressiveFeatureLoader {
  constructor() {
    this.features = new Map();
  }

  register(featureName, loader, dependencies = []) {
    this.features.set(featureName, { loader, dependencies, loaded: false });
  }

  async load(featureName) {
    const feature = this.features.get(featureName);
    if (!feature) {
      throw new Error(`Feature not found: ${featureName}`);
    }

    if (feature.loaded) {
      return feature.module;
    }

    // Load dependencies first
    for (const dep of feature.dependencies) {
      await this.load(dep);
    }

    // Load feature
    feature.module = await feature.loader();
    feature.loaded = true;
    return feature.module;
  }
}

// Email checker feature registration
const features = new ProgressiveFeatureLoader();

features.register('charts', () => import('./charts.js'));
features.register('metadata-viewer', () => import('./metadata-viewer.js'));
features.register('advanced-filters', () => import('./filters.js'), ['metadata-viewer']);

// Load on demand
document.getElementById('view-charts-btn').addEventListener('click', async () => {
  const charts = await features.load('charts');
  charts.renderStatistics(data);
});
```

### Skeleton Screens

Show meaningful placeholders while loading:

```javascript
function showSkeletonScreen(container) {
  container.innerHTML = `
    <div class="skeleton-item">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-text">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>
  `.repeat(5);
  container.classList.add('loading');
}

async function loadEmailList() {
  const container = document.getElementById('email-list');
  showSkeletonScreen(container);

  try {
    const emails = await fetchEmails();
    renderEmails(container, emails);
    container.classList.remove('loading');
  } catch (error) {
    showError(container, error);
  }
}
```

## Runtime Performance

### Event Optimization

**Debouncing** for user input:
```javascript
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage for search input
const searchInput = document.getElementById('search');
const handleSearch = debounce((e) => {
  const results = filterEmails(e.target.value);
  displayResults(results);
}, 300);

searchInput.addEventListener('input', handleSearch);
```

**Throttling** for scroll/resize:
```javascript
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage for scroll events
window.addEventListener('scroll', throttle(() => {
  updateScrollIndicator();
}, 100));
```

### RequestAnimationFrame

Use RAF for visual updates:

```javascript
class SmoothUpdater {
  constructor() {
    this.pending = false;
    this.updates = [];
  }

  schedule(updateFn) {
    this.updates.push(updateFn);

    if (!this.pending) {
      this.pending = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    const updates = this.updates;
    this.updates = [];
    this.pending = false;

    updates.forEach(fn => fn());
  }
}

// Usage for batching DOM updates
const updater = new SmoothUpdater();

function updateProgress(value) {
  updater.schedule(() => {
    progressBar.style.width = `${value}%`;
    progressText.textContent = `${value}%`;
  });
}
```

### Avoiding Layout Thrashing

Batch reads and writes separately:

```javascript
// BAD: Causes multiple reflows
elements.forEach(el => {
  const height = el.offsetHeight; // Read
  el.style.height = height * 2 + 'px'; // Write
});

// GOOD: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All reads
heights.forEach((height, i) => {
  elements[i].style.height = height * 2 + 'px'; // All writes
});
```

Use `fastdom` pattern for complex updates:

```javascript
class FastDOM {
  constructor() {
    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }

  measure(fn) {
    this.reads.push(fn);
    this.schedule();
  }

  mutate(fn) {
    this.writes.push(fn);
    this.schedule();
  }

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      this.flush();
    });
  }

  flush() {
    // Execute all reads
    const reads = this.reads;
    this.reads = [];
    reads.forEach(fn => fn());

    // Execute all writes
    const writes = this.writes;
    this.writes = [];
    writes.forEach(fn => fn());

    this.scheduled = false;
  }
}

const fastdom = new FastDOM();

// Usage
fastdom.measure(() => {
  const height = element.offsetHeight;
  fastdom.mutate(() => {
    element.style.height = height * 2 + 'px';
  });
});
```

### Web Workers

Offload heavy processing to Web Workers:

```javascript
// email-processor.worker.js
self.addEventListener('message', (e) => {
  const { action, data } = e.data;

  if (action === 'validate') {
    const results = validateEmails(data.emails);
    self.postMessage({ action: 'validated', results });
  }

  if (action === 'filter') {
    const filtered = filterEmails(data.emails, data.blocklist);
    self.postMessage({ action: 'filtered', results: filtered });
  }
});

function validateEmails(emails) {
  return emails.filter(email => {
    // Complex validation logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });
}

// main.js
class EmailWorker {
  constructor() {
    this.worker = new Worker('email-processor.worker.js');
    this.callbacks = new Map();
    this.messageId = 0;

    this.worker.addEventListener('message', (e) => this.handleMessage(e));
  }

  handleMessage(e) {
    const { action, results, messageId } = e.data;
    const callback = this.callbacks.get(messageId);

    if (callback) {
      callback(results);
      this.callbacks.delete(messageId);
    }
  }

  validate(emails) {
    return new Promise(resolve => {
      const messageId = this.messageId++;
      this.callbacks.set(messageId, resolve);
      this.worker.postMessage({ action: 'validate', data: { emails }, messageId });
    });
  }
}
```

## Lighthouse Optimization

### Running Audits

**Chrome DevTools:**
1. Open DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select categories (Performance, Accessibility, Best Practices, SEO)
4. Choose device (Mobile/Desktop)
5. Click "Generate report"

**Lighthouse CLI:**
```bash
# Install globally
npm install -g lighthouse

# Run audit
lighthouse http://localhost:8080 --output html --output-path ./report.html

# Run with specific config
lighthouse http://localhost:8080 --only-categories=performance --view
```

**CI Integration:**
```javascript
// .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:8080
            http://localhost:8080/admin
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Core Web Vitals Optimization

**Largest Contentful Paint (LCP) <2.5s:**
- Optimize server response time
- Eliminate render-blocking resources
- Preload critical resources
- Use CDN for static assets
- Optimize images (WebP, proper sizing)

**First Input Delay (FID) <100ms:**
- Reduce JavaScript execution time
- Break up long tasks (>50ms)
- Use code splitting
- Defer non-critical JavaScript
- Implement Web Workers for heavy processing

**Cumulative Layout Shift (CLS) <0.1:**
- Set explicit dimensions for images/videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS aspect-ratio for responsive media
- Preload fonts to prevent FOIT/FOUT

### Category-Specific Fixes

**Performance:**
- Minify and compress assets (gzip/brotli)
- Implement caching strategies
- Use modern image formats
- Reduce unused JavaScript
- Optimize third-party scripts

**Accessibility:**
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios ≥4.5:1
- Focus indicators

**Best Practices:**
- HTTPS everywhere
- No console errors
- Updated dependencies
- Proper DOCTYPE
- Valid HTML

**SEO:**
- Meta descriptions
- Proper heading hierarchy
- Descriptive link text
- Mobile-friendly viewport
- Valid structured data

## Monitoring and Metrics

### Performance API

Track real-world performance:

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  captureNavigationTiming() {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    this.metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      domProcessing: timing.domComplete - timing.domLoading,
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
      loadComplete: timing.loadEventEnd - navigationStart
    };

    return this.metrics;
  }

  captureResourceTiming() {
    const resources = performance.getEntriesByType('resource');

    return resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration,
      size: resource.transferSize,
      cached: resource.transferSize === 0
    }));
  }

  measureUserTiming(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    return measure.duration;
  }

  reportMetrics(endpoint = '/api/metrics') {
    const data = {
      navigation: this.captureNavigationTiming(),
      resources: this.captureResourceTiming(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };

    // Use sendBeacon for reliable reporting
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true
      });
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

window.addEventListener('load', () => {
  setTimeout(() => {
    monitor.reportMetrics();
  }, 0);
});
```

### Custom Marks and Measures

```javascript
// Mark critical points
performance.mark('emails-fetch-start');
await fetchEmails();
performance.mark('emails-fetch-end');

// Measure duration
performance.measure('emails-fetch', 'emails-fetch-start', 'emails-fetch-end');

// Get measurement
const measure = performance.getEntriesByName('emails-fetch')[0];
console.log(`Email fetch took ${measure.duration}ms`);
```

### Real User Monitoring (RUM)

Track actual user experience:

```javascript
// Track Core Web Vitals
function reportWebVitals() {
  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // FID
  new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      console.log('FID:', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // CLS
  let clsScore = 0;
  new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) {
        clsScore += entry.value;
      }
    });
    console.log('CLS:', clsScore);
  }).observe({ entryTypes: ['layout-shift'] });
}
```

## Resources

### Tools
- **Chrome DevTools**: Performance panel, Lighthouse, Coverage
- **WebPageTest**: Comprehensive performance testing
- **Lighthouse CI**: Automated performance testing
- **webpack-bundle-analyzer**: Bundle size analysis
- **source-map-explorer**: Bundle visualization

### Specifications
- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### Best Practices
- [web.dev Performance](https://web.dev/performance/)
- [Chrome Performance Best Practices](https://developer.chrome.com/docs/devtools/performance/)
- [JavaScript Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

### Email Checker Specific
- Virtual scrolling required for 22K+ item lists
- Bundle target: <200KB gzipped
- Lighthouse Performance target: >90
- Mobile-first optimization approach

### Skill Resources

This skill includes reference documentation and reusable code templates:

**references/** - In-depth optimization guides and checklists
**assets/** - Reusable code templates for virtual scrolling, lazy loading, and performance monitoring
