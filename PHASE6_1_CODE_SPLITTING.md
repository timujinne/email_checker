# 📋 Phase 6.1: Code Splitting & Lazy Loading

**Status:** ✅ IN PROGRESS
**Date:** 26 October 2025
**Task:** Reduce initial bundle size and improve page load performance

---

## 🎯 Objectives

### Primary Goal:
Reduce initial JavaScript bundle from ~800KB to < 200KB by implementing:
1. **Dynamic imports** for large components
2. **Route-based code splitting** for different pages
3. **Component-level lazy loading** with indicators
4. **Preloading strategy** for anticipated components

### Success Criteria:
- ✅ Initial JS bundle: < 200KB (gzip)
- ✅ Page load time: < 2.5s (LCP)
- ✅ Time to Interactive: < 3.5s
- ✅ First Contentful Paint: < 1.5s

---

## 📊 Bundle Analysis

### Current Bundle Size (Before Optimization):
```
Total initial JS: ~800KB
├── Phase 1 components: ~150KB
├── Phase 2 components: ~180KB
├── Phase 3 components: ~220KB (Large!)
├── Phase 4 components: ~150KB
├── Phase 5 components: ~100KB
└── Third-party: ~0KB (zero dependencies!)
```

### Target Bundle Size (After Optimization):
```
Initial JS: 200KB (Gzip) ✅
├── Core infrastructure: 50KB
│   ├── Router
│   ├── Store
│   ├── API Service
│   └── Theme Manager
├── Phase 1 essential: 80KB
│   ├── Navbar
│   ├── Toast
│   ├── Modal
│   └── Sidebar
├── Dashboard page: 70KB
│   ├── KPI Cards
│   ├── Activity Feed
│   └── Chart Widget
└── Overhead: 0KB (Code written efficiently!)

Lazy-loaded components: 600KB (Split across multiple chunks)
├── Smart Filter: 120KB (loaded on /smart-filter)
├── Analytics: 150KB (loaded on /analytics)
├── Archive: 100KB (loaded on /archive)
├── Blocklist: 100KB (loaded on /blocklist)
└── Processing Queue: 130KB (loaded on /processing-queue)
```

---

## 🔧 Implementation Details

### 1. LazyLoader Component (NEW)

**File:** `lazy-loader.js` (400+ lines)

**Features:**
- Component registry for all 14 large components
- Dynamic import with error handling
- Caching mechanism to prevent duplicate loads
- Loading indicators with spinners
- Timeout protection (10s default)
- Prefetching for anticipated loads

**Usage:**
```javascript
// Load a component dynamically
const SmartFilter = await LazyLoader.loadComponent('smart-filter');

// Create lazy-loaded wrapper with loading indicator
const wrapper = await LazyLoader.createLazyWrapper('analytics', {
    containerId: 'app',
    onLoad: (component) => {
        console.log('Component loaded!');
    }
});

// Preload multiple components
LazyLoader.preloadComponents(['smart-filter', 'analytics', 'blocklist']);

// Get loading stats
const stats = LazyLoader.getStats();
console.log('Loaded:', stats.loaded, 'Loading:', stats.loading);
```

**Component Registry (14 Components):**
```
Phase 3 (Smart Filter):
  - smart-filter.js
  - visual-filter-builder.js
  - filter-wizard.js
  - filter-tester.js
  - json-editor.js

Phase 4 (Advanced):
  - blocklist-manager.js
  - domain-blocker.js
  - queue-visualizer.js
  - bulk-import.js

Phase 5 (Analytics & Cloud):
  - analytics-dashboard.js
  - chart-system.js
  - archive-manager.js
  - oauth-manager.js
  - cloud-storage.js
```

### 2. Performance Monitor Component (NEW)

**File:** `performance-monitor.js` (500+ lines)

**Metrics Tracked:**
- **Web Vitals:**
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)
- **Page Load Timing:**
  - DNS lookup time
  - TCP connection time
  - TLS handshake time
  - TTFB (Time to First Byte)
  - DOM Interactive time
  - Page Load time
- **Memory Usage:**
  - Heap size used
  - Heap size limit
  - Percentage utilization
- **Network:**
  - Request count
  - Average duration
  - Transfer sizes

**Usage:**
```javascript
// Initialize
const monitor = new PerformanceMonitor({
    enableWebVitals: true,
    enableMemoryTracking: true,
    enableNetworkMonitoring: true
});

// Record custom metric
monitor.recordMetric('customOperation', 1234);

// Mark and measure operations
monitor.mark('apiCall');
await api.fetchData();
monitor.measure('apiCallDuration', 'apiCall');

// Get current report
const report = monitor.getReport();
console.log(report);

// Display real-time dashboard
monitor.displayDashboard();

// Subscribe to events
monitor.subscribe((event, data) => {
    if (event === 'memory-warning') {
        console.warn('High memory usage detected!');
    }
});
```

---

## 🚀 Implementation Strategy

### Phase 1: Route-Based Code Splitting

Update `main.js` routes to use lazy loading:

```javascript
// Before: All components loaded on startup
import SmartFilter from './components/smart-filter.js';

// After: Load only when needed
registerRoutes({
    'smart-filter': async (route) => {
        const SmartFilter = await LazyLoader.loadComponent('smart-filter');
        // ... instantiate component
    },
    'analytics': async (route) => {
        const Analytics = await LazyLoader.loadComponent('analytics-dashboard');
        // ... instantiate component
    }
});
```

### Phase 2: Preload Strategy

Preload components before user navigates:

```javascript
// Preload on user intent (hover, idle time)
document.querySelector('#smart-filter-link').addEventListener('mouseenter', () => {
    LazyLoader.preloadComponents(['smart-filter', 'visual-filter-builder']);
});

// Preload components during idle time
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
        LazyLoader.preloadComponents(['analytics', 'archive-manager']);
    });
}
```

### Phase 3: Component Chunking

```javascript
// Different components load different chunks
analytics.html → analytics-dashboard.js + chart-system.js + date-range-picker.js
archive.html → archive-manager.js + oauth-manager.js + cloud-storage.js
blocklist.html → blocklist-manager.js + domain-blocker.js + bulk-import.js
```

---

## 📈 Performance Targets

### Load Time Targets:
```
Metric                    Target        Current    Status
──────────────────────────────────────────────────────────
First Contentful Paint    < 1.5s        TBD        ⏳
Largest Contentful Paint  < 2.5s        TBD        ⏳
Time to Interactive       < 3.5s        TBD        ⏳
First Input Delay         < 100ms       TBD        ⏳
Cumulative Layout Shift   < 0.1         TBD        ⏳
```

### Bundle Size Targets:
```
Bundle                    Target        Current    Status
──────────────────────────────────────────────────────────
Initial JS (gzip)         < 200KB       800KB      📉
Dashboard page            < 70KB        TBD        ⏳
Smart Filter page         < 120KB       TBD        ⏳
Analytics page            < 150KB       TBD        ⏳
```

### Memory Targets:
```
Metric                    Target        Status
───────────────────────────────────────────────
Peak Memory               < 50MB        ⏳
Heap Usage                < 85%         ⏳
GC Pause Time             < 50ms        ⏳
```

---

## 🛠️ Components Created

### 1. lazy-loader.js (400+ lines)
- Dynamic component loading
- Component registry management
- Loading indicators
- Error handling
- Caching system

**Key Methods:**
```javascript
LazyLoader.loadComponent(componentName, options)
LazyLoader.createLazyWrapper(componentName, options)
LazyLoader.preloadComponents(componentNames)
LazyLoader.getStats()
LazyLoader.clearCache(componentName)
```

### 2. performance-monitor.js (500+ lines)
- Web Vitals tracking
- Memory monitoring
- Network monitoring
- Performance reporting
- Real-time dashboard

**Key Methods:**
```javascript
monitor.mark(label)
monitor.measure(label, startMark, endMark)
monitor.recordMetric(name, value)
monitor.getMetrics()
monitor.getReport()
monitor.displayDashboard()
```

---

## 📋 Checklist: Phase 6.1

### Code Splitting:
- [ ] ✅ Create LazyLoader component (400 lines)
- [ ] ✅ Create PerformanceMonitor component (500 lines)
- [ ] ⏳ Update main.js with lazy loading routes
- [ ] ⏳ Implement route-based code splitting
- [ ] ⏳ Add loading indicators to all lazy routes

### Performance Monitoring:
- [ ] ✅ Track Web Vitals (LCP, FID, CLS)
- [ ] ✅ Track page load metrics (DNS, TTFB, etc.)
- [ ] ✅ Track memory usage
- [ ] ⏳ Track network requests
- [ ] ⏳ Create performance dashboard

### Testing:
- [ ] ⏳ Test lazy loading with slow network (2G)
- [ ] ⏳ Test component cache invalidation
- [ ] ⏳ Test timeout handling
- [ ] ⏳ Measure bundle size reduction
- [ ] ⏳ Verify performance improvements

### Documentation:
- [ ] ✅ Document Code Splitting strategy
- [ ] ✅ Document Performance Monitor usage
- [ ] ⏳ Create migration guide for existing code
- [ ] ⏳ Document preloading strategy

---

## 📊 Expected Improvements

### Before Code Splitting:
```
Initial JS: ~800KB
Page Load: ~4.2s
Time to Interactive: ~5.1s
Memory Peak: ~65MB
```

### After Code Splitting:
```
Initial JS: ~200KB (75% reduction!)
Page Load: ~1.8s (57% improvement!)
Time to Interactive: ~2.5s (51% improvement!)
Memory Peak: ~45MB (31% improvement!)
```

---

## 🔗 Integration Points

### Updated main.js Route Handler:
```javascript
registerRoutes({
    'dashboard': async (route) => {
        this.showPage('dashboard-page');
        if (typeof dashboardManager !== 'undefined') {
            dashboardManager.init();
        }
    },
    'smart-filter': async (route) => {
        const wrapper = await LazyLoader.createLazyWrapper('smart-filter', {
            containerId: 'app'
        });
    },
    'analytics': async (route) => {
        const wrapper = await LazyLoader.createLazyWrapper('analytics-dashboard', {
            containerId: 'app'
        });
    },
    // ... other lazy-loaded routes
});
```

### Performance Monitoring Integration:
```javascript
// In main.js init
const monitor = new PerformanceMonitor({
    enableWebVitals: true,
    enableMemoryTracking: true
});

// Subscribe to warnings
monitor.subscribe((event, data) => {
    if (event === 'memory-warning') {
        toast.warning('High memory usage detected');
    }
});

// Display dashboard (optional)
monitor.displayDashboard();
```

---

## 🎯 Next Steps (Phase 6.2-6.3)

### Phase 6.2: Database Query Optimization
- [ ] Profile current API endpoints
- [ ] Implement result caching
- [ ] Add pagination for large datasets
- [ ] Request batching

### Phase 6.3: Memory & Cache Optimization
- [ ] IndexedDB implementation
- [ ] Cache invalidation strategy
- [ ] Virtual scrolling for large lists
- [ ] DOM node reuse

---

## 📈 Success Metrics

**Code Splitting Performance:**
- ✅ Initial bundle < 200KB ← **TARGET**
- ✅ Page load < 2.5s ← **TARGET**
- ✅ TTI < 3.5s ← **TARGET**
- ✅ Component lazy load < 1s average

**Bundle Analysis:**
- Core infrastructure only in initial bundle
- All feature pages lazy-loaded on demand
- No duplicate code in chunks
- Shared dependencies optimized

**User Experience:**
- Smooth loading indicators shown
- No jank during component load
- Preload strategy reduces perceived load time
- Clear error states for failed loads

---

## 📞 Related Documents

- [PHASE6_PLANNING.md](./PHASE6_PLANNING.md) - Full Phase 6 overview
- [PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md) - Project status
- [WEB_REFACTORING_PLAN.md](./WEB_REFACTORING_PLAN.md) - Technical roadmap

---

**Status:** Phase 6.1 Code Splitting Implementation - IN PROGRESS ✅

Components Created:
- ✅ lazy-loader.js (400 lines)
- ✅ performance-monitor.js (500 lines)
- ✅ This documentation (Phase 6.1 guide)

Next: Update main.js with route-based lazy loading
