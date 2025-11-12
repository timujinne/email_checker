/**
 * Main Entry Point
 * Initializes the application with performance monitoring and code splitting
 */

class EmailCheckerApp {
    constructor() {
        this.initialized = false;
        this.performanceMonitor = null;
        this.preloadQueue = [];
        this.routesRegistered = false;
    }

    /**
     * Initialize application
     */
    async init() {
        console.log(`🚀 ${window.APP_CONFIG?.APP_NAME || 'Email Checker'} v${window.APP_CONFIG?.VERSION || '1.0.2'} - Initializing...`);

        try {
            // 0. Initialize performance monitoring
            this.initializePerformanceMonitoring();

            // 1. Initialize theme
            this.initializeTheme();

            // 2. Initialize UI components
            this.initializeUI();

            // 3. Register routes
            this.registerRoutes();
            this.routesRegistered = true;

            // 4. Initialize WebSocket
            this.initializeWebSocket();

            // 5. Setup event listeners
            this.setupEventListeners();

            // 6. Load initial data
            await this.loadInitialData();

            // 7. Setup preloading strategy
            this.setupPreloading();

            // 8. Navigate to initial route
            this.navigateToInitialRoute();

            this.initialized = true;
            console.log('✅ Application initialized successfully');
            console.log('📊 Performance monitoring enabled - Use window.debug.monitor() to view metrics');
            
            if (typeof toast !== 'undefined') {
                toast.success('Application ready');
            }
        } catch (error) {
            console.error('❌ Application initialization error:', error);
            if (typeof toast !== 'undefined') {
                toast.error('Failed to initialize application: ' + error.message);
            }
        }
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if (typeof PerformanceMonitor === 'undefined') {
            console.warn('⚠️ PerformanceMonitor not available');
            return;
        }

        this.performanceMonitor = new PerformanceMonitor({
            enableWebVitals: true,
            enableMemoryTracking: true,
            enableNetworkMonitoring: true,
            reportInterval: 60000  // Report every 60 seconds
        });

        // Subscribe to memory warnings
        this.performanceMonitor.subscribe((event, data) => {
            if (event === 'memory-warning') {
                console.warn('⚠️ High memory usage detected, clearing component cache...');
                if (typeof LazyLoader !== 'undefined') {
                    LazyLoader.clearCache();
                }
                if (typeof toast !== 'undefined') {
                    toast.warning('Cleared cache to free up memory');
                }
            }
        });

        console.log('✅ Performance monitoring initialized');
    }

    /**
     * Initialize theme
     */
    initializeTheme() {
        if (typeof themeManager === 'undefined') {
            console.warn('⚠️ Theme manager not available');
            return;
        }

        const theme = themeManager.get();
        console.log(`🎨 Theme: ${theme}`);

        // Subscribe to theme changes
        themeManager.subscribe((newTheme) => {
            console.log(`🎨 Theme changed to: ${newTheme}`);
        });
    }

    /**
     * Initialize UI components (navbar, sidebar)
     */
    initializeUI() {
        try {
            // Initialize navbar
            if (typeof NavBarRenderer !== 'undefined') {
                NavBarRenderer.init();
                console.log('✅ NavBar initialized');
            } else {
                console.warn('⚠️ NavBarRenderer not available');
            }

            // Initialize sidebar
            if (typeof SidebarRenderer !== 'undefined') {
                SidebarRenderer.init();
                console.log('✅ Sidebar initialized');
            } else {
                console.warn('⚠️ SidebarRenderer not available');
            }
        } catch (error) {
            console.error('❌ UI initialization error:', error);
        }
    }

    /**
     * Register routes
     */
    registerRoutes() {
        if (typeof router === 'undefined') {
            console.error('❌ Router not available');
            return;
        }

        console.log('📍 Registering routes...');

        router.registerRoutes({
            'dashboard': (route) => {
                console.log('🔀 Navigating to: dashboard');
                this.showPage('dashboard-page');
                
                // Initialize dashboard if available
                if (typeof dashboardManager !== 'undefined') {
                    try {
                        dashboardManager.init();
                    } catch (error) {
                        console.error('Dashboard init error:', error);
                    }
                }
            },

            'lists': (route) => {
                console.log('🔀 Navigating to: lists');
                this.showPage('lists-page');

                // Initialize lists manager if available
                if (typeof listsManager !== 'undefined') {
                    try {
                        listsManager.init();
                    } catch (error) {
                        console.error('Lists manager init error:', error);
                    }
                }
            },

            'email-list': async (route) => {
                console.log('🔀 Navigating to: email-list');
                this.showPage('email-list-page');

                // Initialize email list view if available
                if (typeof EmailListViewComponent !== 'undefined') {
                    try {
                        if (!window.emailListView) {
                            console.log('📧 Creating new EmailListViewComponent instance...');
                            window.emailListView = new EmailListViewComponent();
                        }
                        await window.emailListView.init();
                        console.log('✅ Email list view initialized');
                    } catch (error) {
                        console.error('Email list view init error:', error);
                        if (typeof toast !== 'undefined') {
                            toast.error('Ошибка инициализации Email List View: ' + error.message);
                        }
                    }
                } else {
                    console.warn('⚠️ EmailListViewComponent not available');
                    if (typeof toast !== 'undefined') {
                        toast.warning('Email List View component not loaded');
                    }
                }
            },

            'smart-filter': async (route) => {
                console.log('🔀 Navigating to: smart-filter');
                this.showPage('smart-filter-page');

                // Wait for DOM to be fully ready
                await new Promise(resolve => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve, { once: true });
                    }
                });

                // Small additional delay to ensure all scripts are executed
                await new Promise(resolve => setTimeout(resolve, 50));

                // Initialize smart filter if available
                if (typeof SmartFilter !== 'undefined') {
                    try {
                        if (!window.smartFilter) {
                            console.log('🎯 Initializing SmartFilter...');
                            window.smartFilter = new SmartFilter();
                            window.smartFilterInstance = window.smartFilter; // For global functions
                            console.log('✅ SmartFilter initialized successfully');
                        }
                    } catch (error) {
                        console.error('❌ Smart filter init error:', error);
                    }
                } else {
                    console.warn('⚠️ SmartFilter class not available');
                }
            },

            'blocklists': async (route) => {
                console.log('🔀 Navigating to: blocklists');
                this.showPage('blocklists-page');

                // Initialize blocklist manager if available
                if (typeof BlocklistManager !== 'undefined') {
                    try {
                        if (!window.blocklistManager) {
                            console.log('📋 Initializing BlocklistManager...');
                            window.blocklistManager = new BlocklistManager('blocklist-manager-container', {
                                enableUndo: true,
                                enableBulkOps: true,
                                enableStats: true,
                                enableCsvImport: true
                            });

                            // Load data from API
                            console.log('📥 Loading blocklist data from API...');
                            try {
                                const response = await fetch('/api/blocklist');
                                const data = await response.json();

                                if (data.status === 'success' && data.items) {
                                    console.log(`✅ Loaded ${data.items.length} blocklist items`);
                                    window.blocklistManager.loadItems(data.items);
                                } else {
                                    console.error('❌ Failed to load blocklist data:', data);
                                    if (typeof toast !== 'undefined') {
                                        toast.error('Failed to load blocklist data');
                                    }
                                }
                            } catch (error) {
                                console.error('❌ Blocklist API error:', error);
                                if (typeof toast !== 'undefined') {
                                    toast.error('Failed to connect to blocklist API: ' + error.message);
                                }
                            }
                        } else {
                            // Refresh data if already initialized
                            console.log('🔄 Refreshing blocklist data...');
                            try {
                                const response = await fetch('/api/blocklist');
                                const data = await response.json();

                                if (data.status === 'success' && data.items) {
                                    window.blocklistManager.loadItems(data.items);
                                }
                            } catch (error) {
                                console.error('❌ Blocklist refresh error:', error);
                            }
                        }
                    } catch (error) {
                        console.error('Blocklist manager init error:', error);
                        if (typeof toast !== 'undefined') {
                            toast.error('Failed to initialize blocklist manager: ' + error.message);
                        }
                    }
                }
            },

            'processing': (route) => {
                console.log('🔀 Navigating to: processing');
                this.showPage('processing-page');

                // Initialize processing queue if available
                if (typeof ProcessingQueue !== 'undefined') {
                    try {
                        if (!window.processingQueue) {
                            // Use dynamic WebSocket URL based on current page location
                            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
                            console.log('🔗 Using WebSocket URL:', wsUrl);
                            window.processingQueue = new ProcessingQueue('processing-queue-container', wsUrl);
                        }
                    } catch (error) {
                        console.error('Processing queue init error:', error);
                    }
                }
            },

            'analytics': (route) => {
                console.log('🔀 Navigating to: analytics');
                this.showPage('analytics-page');

                // Initialize analytics dashboard if available
                if (typeof AnalyticsDashboard !== 'undefined') {
                    try {
                        if (!window.analyticsDashboard) {
                            window.analyticsDashboard = new AnalyticsDashboard('analytics-dashboard-container');
                        }
                    } catch (error) {
                        console.error('Analytics dashboard init error:', error);
                    }
                }
            },

            'archive': (route) => {
                console.log('🔀 Navigating to: archive');
                this.showPage('archive-page');

                // Initialize archive manager if available
                if (typeof ArchiveManager !== 'undefined') {
                    try {
                        if (!window.archiveManager) {
                            window.archiveManager = new ArchiveManager('archive-manager-container');
                        }
                    } catch (error) {
                        console.error('Archive manager init error:', error);
                    }
                }
            },

            'settings': (route) => {
                console.log('🔀 Navigating to: settings');
                this.showPage('settings-page');

                // Initialize settings if available
                if (typeof SettingsComponent !== 'undefined') {
                    try {
                        if (!window.settingsComponent) {
                            window.settingsComponent = new SettingsComponent('settings-container');
                        }
                    } catch (error) {
                        console.error('Settings init error:', error);
                    }
                }
            }
        });

        console.log('✅ Routes registered');
    }

    /**
     * Show specific page
     */
    showPage(pageId) {
        try {
            // Hide all pages
            document.querySelectorAll('.page-content').forEach(page => {
                page.classList.add('hidden');
            });

            // Show selected page
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.remove('hidden');
                console.log(`📄 Showed page: ${pageId}`);
            } else {
                console.warn(`⚠️ Page not found: ${pageId}`);
            }
        } catch (error) {
            console.error('Error showing page:', error);
        }
    }

    /**
     * Initialize WebSocket
     */
    initializeWebSocket() {
        if (typeof ws === 'undefined') {
            console.warn('⚠️ WebSocket service not available');
            return;
        }

        try {
            // Enable and connect WebSocket
            console.info('ℹ️ WebSocket enabled - connecting to server...');
            ws.enabled = true;
            ws.connect();

            // Subscribe to WebSocket events
            ws.on('connected', () => {
                console.log('🔌 WebSocket connected');
                if (typeof store !== 'undefined') {
                    store.set('wsConnected', true);
                }
            });

            ws.on('disconnected', () => {
                console.log('🔌 WebSocket disconnected');
                if (typeof store !== 'undefined') {
                    store.set('wsConnected', false);
                }
            });

            ws.on('error', (error) => {
                console.error('🔌 WebSocket error:', error);
            });

            // Listen for specific events
            ws.on('task.started', (data) => {
                console.log('📥 Task started:', data);
                if (typeof toast !== 'undefined') {
                    toast.info(`Task started: ${data.name}`);
                }
            });

            ws.on('task.progress', (data) => {
                console.log('📊 Task progress:', data);
            });

            ws.on('task.completed', (data) => {
                console.log('✅ Task completed:', data);
                if (typeof toast !== 'undefined') {
                    toast.success(`Task completed: ${data.name}`);
                }

                // Refresh email list view if it's active
                if (window.emailListView && typeof window.emailListView.loadEmails === 'function') {
                    console.log('🔄 Refreshing email list after task completion');
                    window.emailListView.loadEmails().catch(err => {
                        console.error('Failed to refresh email list:', err);
                    });
                }
            });

            ws.on('notification', (data) => {
                console.log('📢 Notification:', data);
                if (typeof toast !== 'undefined') {
                    toast.show(data.message, data.type || 'info');
                }
            });

            console.log('✅ WebSocket initialized');
        } catch (error) {
            console.error('WebSocket init error:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K for quick search/command
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                console.log('🎹 Command palette triggered');
            }

            // Esc to dismiss modals/notifications
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => modal.remove());
            }
        });

        // Listen for API errors
        if (typeof api !== 'undefined') {
            api.addResponseInterceptor((response) => {
                if (response.status >= 500) {
                    if (typeof toast !== 'undefined') {
                        toast.error('Server error occurred');
                    }
                }
            });
        }

        // Subscribe to state changes
        if (typeof store !== 'undefined') {
            store.subscribe((newState) => {
                // Update KPI on page
                this.updateKPI(newState.stats);
            });
        }

        console.log('✅ Event listeners setup');
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            console.log('📥 Loading initial data...');

            if (typeof store === 'undefined') {
                console.warn('⚠️ Store not available');
                return;
            }

            // Simulate loading stats (API endpoints not yet fully implemented)
            store.set('stats', {
                processed: 0,
                clean: 0,
                blocked: 0,
                queueLength: 0
            });

            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }

    /**
     * Setup preloading strategy
     */
    setupPreloading() {
        if (typeof LazyLoader === 'undefined') {
            console.warn('⚠️ LazyLoader not available');
            return;
        }

        // Preload on idle time
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                console.log('🚀 Preloading anticipated components...');
                LazyLoader.preloadComponents([
                    'filter-wizard',
                    'analytics-dashboard',
                    'archive-manager'
                ]).catch(() => {
                    // Silently fail preloading
                });
            }, { timeout: 5000 });
        }

        // Preload on link hover (mouseenter)
        document.addEventListener('mouseenter', (e) => {
            // Guard: check if target has closest method
            if (!e.target || typeof e.target.closest !== 'function') return;

            const link = e.target.closest('a[href*="#"]');
            if (!link) return;

            const hash = link.getAttribute('href').split('#')[1];
            this._preloadForRoute(hash);
        }, true);
    }

    /**
     * Preload components for specific route
     * @private
     */
    _preloadForRoute(route) {
        if (typeof LazyLoader === 'undefined') return;

        const preloadMap = {
            'smart-filter': ['filter-wizard', 'visual-filter-builder'],
            'blocklist': ['blocklist-manager', 'domain-blocker'],
            'processing': ['queue-visualizer', 'job-tracker'],
            'analytics': ['analytics-dashboard', 'chart-system'],
            'archive': ['archive-manager', 'cloud-storage']
        };

        const componentsToLoad = preloadMap[route];
        if (componentsToLoad && !this.preloadQueue.includes(route)) {
            this.preloadQueue.push(route);
            LazyLoader.preloadComponents(componentsToLoad).catch(() => {
                // Silently fail preloading
            });
        }
    }

    /**
     * Navigate to initial route
     */
    navigateToInitialRoute() {
        if (typeof router === 'undefined') {
            console.error('❌ Router not available');
            return;
        }

        // Check if hash is already set
        if (!window.location.hash || window.location.hash === '#') {
            window.location.hash = '#dashboard';
        } else {
            // Trigger route handler for current hash
            router.handleRoute();
        }
    }

    /**
     * Update KPI display
     */
    updateKPI(stats) {
        if (!stats) return;

        const processedEl = document.getElementById('kpi-processed');
        const cleanEl = document.getElementById('kpi-clean');
        const blockedEl = document.getElementById('kpi-blocked');
        const queueEl = document.getElementById('kpi-queue');

        if (processedEl) processedEl.textContent = stats.processed.toLocaleString();
        if (cleanEl) cleanEl.textContent = stats.clean.toLocaleString();
        if (blockedEl) blockedEl.textContent = stats.blocked.toLocaleString();
        if (queueEl) queueEl.textContent = stats.queueLength.toLocaleString();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new EmailCheckerApp();
        app.init();
        window.emailCheckerApp = app;
    });
} else {
    const app = new EmailCheckerApp();
    app.init();
    window.emailCheckerApp = app;
}

// Export for debugging
window.EmailCheckerApp = EmailCheckerApp;
window.debug = {
    store: () => typeof store !== 'undefined' ? store.debug() : console.warn('Store not available'),
    theme: () => typeof themeManager !== 'undefined' ? console.log(`Current theme: ${themeManager.get()}`) : console.warn('ThemeManager not available'),
    route: () => typeof router !== 'undefined' ? console.log(`Current route: ${router.getCurrentRoute()}`) : console.warn('Router not available'),
    ws: () => typeof ws !== 'undefined' ? console.log('WebSocket status:', ws.getStatus()) : console.warn('WebSocket not available'),
    state: () => typeof store !== 'undefined' ? console.log('Full state:', store.getState()) : console.warn('Store not available'),
    monitor: () => window.emailCheckerApp?.performanceMonitor?.report()
};

console.log('💡 Tip: Use window.debug object for debugging. Example: debug.state()');
