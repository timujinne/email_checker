/**
 * Performance Monitor Component
 * Tracks performance metrics, memory usage, and network activity
 */

class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableWebVitals: true,
            enableMemoryTracking: true,
            enableNetworkMonitoring: true,
            reportInterval: 60000,
            ...options
        };

        this.metrics = {
            webVitals: {},
            memory: [],
            network: [],
            navigation: {},
            resources: []
        };

        this.listeners = [];
        this.reportTimer = null;

        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        console.log('📊 Performance Monitor initializing...');

        // Track Web Vitals (LCP, FID, CLS)
        if (this.options.enableWebVitals) {
            this.trackWebVitals();
        }

        // Track Memory Usage
        if (this.options.enableMemoryTracking) {
            this.trackMemory();
        }

        // Track Network Activity
        if (this.options.enableNetworkMonitoring) {
            this.trackNetwork();
        }

        // Track Navigation Timing
        this.trackNavigation();

        // Setup periodic reporting
        if (this.options.reportInterval > 0) {
            this.reportTimer = setInterval(() => {
                this.report();
            }, this.options.reportInterval);
        }

        console.log('✅ Performance Monitor initialized');
    }

    /**
     * Track Web Vitals (LCP, FID, CLS)
     * @private
     */
    trackWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.webVitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
                    if (this.metrics.webVitals.lcp > 2500) {
                        this.emit('metric-warning', {
                            metric: 'LCP',
                            value: this.metrics.webVitals.lcp,
                            threshold: 2500
                        });
                    }
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.warn('⚠️ LCP tracking not available');
            }

            // First Input Delay (FID)
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        this.metrics.webVitals.fid = entry.processingDuration;
                        if (this.metrics.webVitals.fid > 100) {
                            this.emit('metric-warning', {
                                metric: 'FID',
                                value: this.metrics.webVitals.fid,
                                threshold: 100
                            });
                        }
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.warn('⚠️ FID tracking not available');
            }

            // Cumulative Layout Shift (CLS)
            try {
                const clsObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (!entry.hadRecentInput) {
                            this.metrics.webVitals.cls =
                                (this.metrics.webVitals.cls || 0) + entry.value;
                            if (this.metrics.webVitals.cls > 0.1) {
                                this.emit('metric-warning', {
                                    metric: 'CLS',
                                    value: this.metrics.webVitals.cls,
                                    threshold: 0.1
                                });
                            }
                        }
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                console.warn('⚠️ CLS tracking not available');
            }
        }
    }

    /**
     * Track memory usage
     * @private
     */
    trackMemory() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = {
                    timestamp: Date.now(),
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    usagePercent:
                        (performance.memory.usedJSHeapSize /
                            performance.memory.jsHeapSizeLimit) *
                        100
                };

                this.metrics.memory.push(memory);

                // Keep only last 100 samples
                if (this.metrics.memory.length > 100) {
                    this.metrics.memory.shift();
                }

                // Emit warning if memory usage > 80%
                if (memory.usagePercent > 80) {
                    this.emit('memory-warning', memory);
                }
            }, 5000); // Check every 5 seconds
        }
    }

    /**
     * Track network activity
     * @private
     */
    trackNetwork() {
        if ('PerformanceObserver' in window) {
            try {
                const networkObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        const networkData = {
                            name: entry.name,
                            type: entry.initiatorType,
                            duration: entry.duration,
                            transferSize: entry.transferSize,
                            decodedBodySize: entry.decodedBodySize,
                            timestamp: entry.fetchStart
                        };

                        this.metrics.network.push(networkData);

                        // Keep only last 50 entries
                        if (this.metrics.network.length > 50) {
                            this.metrics.network.shift();
                        }
                    });
                });

                networkObserver.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('⚠️ Network tracking not available');
            }
        }
    }

    /**
     * Track navigation timing
     * @private
     */
    trackNavigation() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            this.metrics.navigation = {
                domContentLoaded:
                    timing.domContentLoadedEventEnd -
                    timing.domContentLoadedEventStart,
                loadComplete: timing.loadEventEnd - timing.loadEventStart,
                domInteractive: timing.domInteractive - timing.navigationStart,
                firstPaint:
                    timing.responseEnd - timing.navigationStart
            };
        }
    }

    /**
     * Emit metric event
     * @private
     */
    emit(event, data) {
        this.listeners.forEach((listener) => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Performance listener error:', error);
            }
        });
    }

    /**
     * Subscribe to performance events
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(
                (listener) => listener !== callback
            );
        };
    }

    /**
     * Get all metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: Date.now()
        };
    }

    /**
     * Get memory stats
     */
    getMemoryStats() {
        if (this.metrics.memory.length === 0) return null;

        const samples = this.metrics.memory;
        const usagePercents = samples.map((m) => m.usagePercent);

        return {
            current: samples[samples.length - 1],
            average:
                usagePercents.reduce((a, b) => a + b) / usagePercents.length,
            max: Math.max(...usagePercents),
            min: Math.min(...usagePercents),
            samples: samples.length
        };
    }

    /**
     * Get network stats
     */
    getNetworkStats() {
        if (this.metrics.network.length === 0) return null;

        const totalDuration = this.metrics.network.reduce(
            (sum, item) => sum + item.duration,
            0
        );
        const totalSize = this.metrics.network.reduce(
            (sum, item) => sum + (item.transferSize || 0),
            0
        );

        return {
            requestCount: this.metrics.network.length,
            totalDuration,
            averageDuration: totalDuration / this.metrics.network.length,
            totalTransferSize: totalSize,
            averageRequestSize: totalSize / this.metrics.network.length
        };
    }

    /**
     * Report metrics
     */
    report() {
        const metrics = this.getMetrics();
        console.log('📊 Performance Report:', {
            webVitals: metrics.webVitals,
            memory: this.getMemoryStats(),
            network: this.getNetworkStats(),
            navigation: metrics.navigation
        });
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }
        console.log('⏹️ Performance Monitor stopped');
    }
}

// Export to window
window.PerformanceMonitor = PerformanceMonitor;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor };
}
