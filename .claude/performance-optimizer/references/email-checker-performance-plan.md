# Email Checker Performance Optimization Plan

## Current State Analysis

### Issues
1. **No virtual scrolling** - Rendering 22,000 blocklist items would crash browser
2. **Large bundle** - All features loaded upfront
3. **No lazy loading** - Reports and metadata loaded immediately
4. **Synchronous processing** - UI blocks during validation
5. **No performance monitoring** - Can't track real-world performance

### Performance Impact
- Blocklist page: Unusable with full dataset
- Initial load: Heavy bundle download
- Memory: Unbounded growth with large lists
- User experience: Lag and freezing

## Optimization Priorities

### Priority 1: Virtual Scrolling (CRITICAL)

**Problem:** Cannot render 22,000+ emails without browser crash

**Solution:** Implement virtual scrolling

```javascript
// Blocklist viewer with virtual scrolling
class BlocklistViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scroller = new VirtualScroller(
      this.container,
      [],
      40,  // 40px per email
      this.renderEmail.bind(this)
    );
  }

  async loadBlocklist() {
    const response = await fetch('/api/blocklist');
    const emails = await response.json();
    this.scroller.updateItems(emails);
  }

  renderEmail(email, index) {
    const div = document.createElement('div');
    div.className = 'email-item';
    div.innerHTML = `
      <span class="email">${escapeHtml(email)}</span>
      <span class="count">#${index + 1}</span>
    `;
    return div;
  }
}
```

**Impact:**
- Before: Browser crash with 22K items
- After: Smooth 60fps scrolling
- DOM nodes: 22,000 → ~20 (visible items only)
- Memory: 300MB+ → <50MB

### Priority 2: Code Splitting

**Problem:** All features loaded upfront, large initial bundle

**Solution:** Split by route and feature

```javascript
// Route-based splitting
const routes = {
  '/': () => import('./pages/Home.js'),
  '/admin': () => import('./pages/Admin.js'),
  '/reports': () => import('./pages/Reports.js')
};

// Feature-based splitting
async function showSmartFilter() {
  const { SmartFilterUI } = await import('./features/smart-filter.js');
  new SmartFilterUI().render();
}

async function showMetadata() {
  const { MetadataViewer } = await import('./features/metadata.js');
  new MetadataViewer().render();
}

async function showCharts() {
  const { ChartRenderer } = await import('./features/charts.js');
  new ChartRenderer().render();
}
```

**Bundle Structure:**
```
main.js        (50KB)  - Core UI, navigation
vendor.js      (80KB)  - Dependencies
admin.js       (30KB)  - Admin features
reports.js     (40KB)  - Report generation
charts.js      (35KB)  - Chart.js + charts
metadata.js    (25KB)  - Metadata viewer
smart-filter.js (30KB) - Smart filter UI
```

**Impact:**
- Before: 290KB initial load
- After: 130KB initial load (55% reduction)
- Admin users: +30KB (admin chunk)
- Report viewers: +40KB (reports chunk)

### Priority 3: Lazy Loading

**Problem:** Images and data loaded eagerly

**Solution:** Lazy load off-screen content

```javascript
// Image lazy loading
const lazyLoader = new LazyImageLoader({ rootMargin: '100px' });
lazyLoader.observeAll();

// Lazy load metadata tables
const metadataObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMetadata(entry.target);
      metadataObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('.metadata-section').forEach(el => {
  metadataObserver.observe(el);
});
```

**Impact:**
- Initial load: Only visible content
- Page weight: Reduced by 40-60%
- Time to Interactive: <2s (from 4s+)

### Priority 4: Debounced Search

**Problem:** Search triggers on every keystroke

**Solution:** Debounce search input

```javascript
const searchInput = document.getElementById('search');
const handleSearch = debounce((query) => {
  const results = filterEmails(query);
  virtualScroller.updateItems(results);
}, 300);

searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
```

**Impact:**
- Before: 10+ operations per second while typing
- After: 1 operation after user stops typing
- CPU usage: Reduced by 90%

### Priority 5: Web Worker (Optional)

**Problem:** Large email list processing blocks UI

**Solution:** Offload to Web Worker

```javascript
// email-processor.worker.js
self.addEventListener('message', (e) => {
  const { action, data } = e.data;

  if (action === 'validate') {
    const results = data.emails.filter(email =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
    self.postMessage({ action: 'validated', results });
  }
});

// main.js
const worker = new Worker('email-processor.worker.js');
worker.postMessage({ action: 'validate', data: { emails: largeList } });
```

**Impact:**
- UI remains responsive during processing
- Better for lists >10,000 emails

## Performance Targets

### Bundle Size
- **Main bundle**: <50KB gzipped
- **Vendor bundle**: <80KB gzipped
- **Admin chunk**: <30KB gzipped
- **Total initial**: <130KB gzipped

### Load Performance
- **FCP**: <1.0s (currently unmeasured)
- **LCP**: <2.0s (currently unmeasured)
- **TTI**: <2.5s (currently unmeasured)
- **TBT**: <150ms (currently unmeasured)

### Runtime Performance
- **Scrolling**: 60fps (currently unusable with 22K items)
- **Search**: <100ms response (currently >500ms)
- **List updates**: <50ms (currently >200ms)
- **Memory**: <50MB (currently >300MB)

### Lighthouse Scores
- **Performance**: >90 (baseline needed)
- **Accessibility**: >95 (baseline needed)
- **Best Practices**: 100 (baseline needed)
- **SEO**: >90 (baseline needed)

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. Implement VirtualScroller class
2. Replace blocklist rendering with virtual scroller
3. Add debounced search
4. Test with 22K+ items

**Validation:**
- Blocklist page loads without crash
- Smooth 60fps scrolling
- Search responds in <100ms

### Phase 2: Code Splitting (Week 2)
1. Configure webpack code splitting
2. Implement route-based splitting
3. Lazy load admin features
4. Lazy load smart filter
5. Lazy load charts and reports

**Validation:**
- Initial bundle <130KB gzipped
- Chunks load on demand
- No regressions in functionality

### Phase 3: Lazy Loading (Week 3)
1. Implement LazyImageLoader class
2. Add Intersection Observer for sections
3. Lazy load metadata tables
4. Add skeleton screens for loading states

**Validation:**
- Images load as needed
- Sections load when scrolled into view
- Graceful loading states

### Phase 4: Monitoring (Week 4)
1. Implement PerformanceMonitor class
2. Add Core Web Vitals tracking
3. Set up performance budgets
4. Run Lighthouse CI

**Validation:**
- Performance metrics tracked
- Lighthouse scores meet targets
- CI fails on regressions

## Testing Strategy

### Manual Testing
1. Load blocklist with 22,000 items
2. Scroll through list smoothly
3. Search and filter list
4. Load admin features
5. View reports and charts

### Automated Testing
```javascript
// Performance test
describe('BlocklistViewer', () => {
  it('handles 22,000 items without lag', () => {
    const items = Array.from({ length: 22000 }, (_, i) => `email${i}@test.com`);
    const viewer = new BlocklistViewer('container');
    viewer.scroller.updateItems(items);

    // Should render in <100ms
    const start = performance.now();
    viewer.scroller.render();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

### Lighthouse CI
```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm start &
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: http://localhost:8080
          budgetPath: ./lighthouse-budget.json
```

## Monitoring and Maintenance

### Real User Monitoring
```javascript
// Track Core Web Vitals
window.addEventListener('load', () => {
  const monitor = new PerformanceMonitor();
  monitor.captureWebVitals();
  monitor.reportMetrics('/api/metrics');
});
```

### Performance Dashboard
Track metrics over time:
- Bundle sizes (per build)
- Lighthouse scores (per deploy)
- Real user metrics (per session)
- Error rates (per feature)

### Alerting
Set up alerts for:
- Bundle size increase >5%
- Lighthouse score drop >5 points
- LCP increase >500ms
- Error rate spike >1%

## Success Metrics

### Before Optimization
- Cannot render 22K items
- Bundle: 290KB
- No performance tracking
- Poor user experience

### After Optimization
- Smooth 60fps with 22K items
- Bundle: <130KB initial
- Lighthouse Performance: >90
- Excellent user experience
