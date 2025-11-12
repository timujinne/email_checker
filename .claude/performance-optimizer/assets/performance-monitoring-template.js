/**
 * PerformanceMonitor - Track and report real-world performance metrics
 *
 * Captures Core Web Vitals, Navigation Timing, and custom metrics.
 * Useful for understanding actual user experience and identifying bottlenecks.
 *
 * Usage:
 *   const monitor = new PerformanceMonitor();
 *   window.addEventListener('load', () => {
 *     monitor.captureMetrics();
 *     monitor.reportMetrics('/api/metrics');
 *   });
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.webVitals = {};
    this.customMarks = new Map();
  }

  /**
   * Capture navigation timing metrics
   */
  captureNavigationTiming() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    this.metrics.navigation = {
      // DNS lookup time
      dns: timing.domainLookupEnd - timing.domainLookupStart,

      // TCP connection time
      tcp: timing.connectEnd - timing.connectStart,

      // Request time
      request: timing.responseStart - timing.requestStart,

      // Response download time
      response: timing.responseEnd - timing.responseStart,

      // DOM processing time
      domProcessing: timing.domComplete - timing.domLoading,

      // DOM Content Loaded
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,

      // Full page load
      loadComplete: timing.loadEventEnd - navigationStart,

      // Time to first byte
      ttfb: timing.responseStart - navigationStart
    };

    return this.metrics.navigation;
  }

  /**
   * Capture resource timing (scripts, styles, images, etc.)
   */
  captureResourceTiming() {
    const resources = performance.getEntriesByType('resource');

    this.metrics.resources = resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: Math.round(resource.duration),
      size: resource.transferSize,
      cached: resource.transferSize === 0,
      timing: {
        dns: Math.round(resource.domainLookupEnd - resource.domainLookupStart),
        tcp: Math.round(resource.connectEnd - resource.connectStart),
        request: Math.round(resource.responseStart - resource.requestStart),
        response: Math.round(resource.responseEnd - resource.responseStart)
      }
    }));

    return this.metrics.resources;
  }

  /**
   * Capture Core Web Vitals
   */
  captureWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.webVitals.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            this.webVitals.fid = Math.round(entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          });
          this.webVitals.cls = Math.round(clsScore * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS not supported');
      }
    }

    return this.webVitals;
  }

  /**
   * Create custom performance marks
   */
  mark(name) {
    performance.mark(name);
    this.customMarks.set(name, performance.now());
  }

  /**
   * Measure duration between marks
   */
  measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      return Math.round(measure.duration);
    } catch (e) {
      console.warn(`Failed to measure ${name}:`, e);
      return null;
    }
  }

  /**
   * Capture all metrics
   */
  captureMetrics() {
    this.captureNavigationTiming();
    this.captureResourceTiming();
    this.captureWebVitals();

    return {
      navigation: this.metrics.navigation,
      resources: this.metrics.resources,
      webVitals: this.webVitals,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  /**
   * Report metrics to server
   */
  reportMetrics(endpoint = '/api/metrics') {
    const data = this.captureMetrics();

    // Use sendBeacon for reliable reporting (survives page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback to fetch with keepalive
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(error => console.error('Failed to report metrics:', error));
    }
  }

  /**
   * Log metrics to console (for debugging)
   */
  logMetrics() {
    console.group('Performance Metrics');

    if (this.metrics.navigation) {
      console.group('Navigation Timing');
      Object.entries(this.metrics.navigation).forEach(([key, value]) => {
        console.log(`${key}: ${value}ms`);
      });
      console.groupEnd();
    }

    if (this.webVitals && Object.keys(this.webVitals).length > 0) {
      console.group('Core Web Vitals');
      if (this.webVitals.lcp) console.log(`LCP: ${this.webVitals.lcp}ms`);
      if (this.webVitals.fid) console.log(`FID: ${this.webVitals.fid}ms`);
      if (this.webVitals.cls) console.log(`CLS: ${this.webVitals.cls}`);
      console.groupEnd();
    }

    if (this.metrics.resources) {
      console.group('Resources');
      console.log(`Total: ${this.metrics.resources.length}`);

      const totalSize = this.metrics.resources.reduce((sum, r) => sum + r.size, 0);
      console.log(`Size: ${(totalSize / 1024).toFixed(2)}KB`);

      const cached = this.metrics.resources.filter(r => r.cached).length;
      console.log(`Cached: ${cached} (${((cached / this.metrics.resources.length) * 100).toFixed(1)}%)`);
      console.groupEnd();
    }

    console.groupEnd();
  }
}

/**
 * Example usage for email checker
 */

// Initialize monitor
const monitor = new PerformanceMonitor();

// Capture metrics when page loads
window.addEventListener('load', () => {
  // Wait a bit for Web Vitals to settle
  setTimeout(() => {
    monitor.captureMetrics();
    monitor.logMetrics();
    monitor.reportMetrics('/api/performance-metrics');
  }, 0);
});

// Track custom operations
async function processEmailList(emails) {
  monitor.mark('process-start');

  // Process emails
  const results = await validateEmails(emails);

  monitor.mark('process-end');
  const duration = monitor.measure('email-processing', 'process-start', 'process-end');

  console.log(`Processed ${emails.length} emails in ${duration}ms`);
  return results;
}

// Track API calls
async function fetchBlocklist() {
  monitor.mark('fetch-blocklist-start');

  const response = await fetch('/api/blocklist');
  const data = await response.json();

  monitor.mark('fetch-blocklist-end');
  monitor.measure('fetch-blocklist', 'fetch-blocklist-start', 'fetch-blocklist-end');

  return data;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceMonitor };
}
