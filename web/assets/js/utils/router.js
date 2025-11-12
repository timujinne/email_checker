/**
 * Client-side Router
 * Hash-based routing without server changes
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.listeners = [];
        this.init();
    }

    /**
     * Initialize router
     */
    init() {
        console.log('📍 Router initializing...');

        // Listen to hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Don't handle initial route yet - wait for routes to be registered
        console.log('📍 Router initialized (waiting for route registration)');
    }

    /**
     * Register a route
     */
    register(path, handler) {
        console.log(`📍 Registering route: "${path}"`);
        this.routes.set(path, handler);
    }

    /**
     * Register multiple routes
     */
    registerRoutes(routes) {
        console.log(`📍 Registering ${Object.keys(routes).length} routes:`, Object.keys(routes));
        for (const [path, handler] of Object.entries(routes)) {
            this.register(path, handler);
        }
        console.log(`✅ Total registered routes: ${this.routes.size}`);

        // Now handle the initial route (was delayed in init)
        console.log('📍 Routes registered, handling initial route...');
        this.handleRoute();
    }

    /**
     * Get current hash
     */
    getCurrentHash() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        // Get path without query params
        return hash.split('?')[0];
    }

    /**
     * Get query parameters
     */
    getQueryParams() {
        const hash = window.location.hash.slice(1);
        const [, queryString] = hash.split('?');

        if (!queryString) return {};

        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Navigate to route
     */
    navigate(path, params = {}) {
        let url = `#${path}`;

        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        window.location.hash = url;
    }

    /**
     * Handle route change
     */
    handleRoute() {
        const path = this.getCurrentHash();
        console.log(`🔀 Router handling path: "${path}"`);
        console.log(`🔀 Registered routes:`, Array.from(this.routes.keys()));

        const handler = this.routes.get(path);

        if (handler && typeof handler === 'function') {
            console.log(`✅ Found handler for: "${path}"`);
            try {
                handler({
                    path,
                    params: this.getQueryParams()
                });

                // Update state
                if (typeof store !== 'undefined') {
                    store.set('currentPage', path);
                }

                this.currentRoute = path;
                this.notifyListeners(path);
            } catch (error) {
                console.error('Route handler error:', error);
            }
        } else {
            console.warn(`❌ No handler for route: "${path}"`);
            console.warn(`📋 Available routes:`, Array.from(this.routes.keys()));
        }
    }

    /**
     * Subscribe to route changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    /**
     * Notify listeners
     */
    notifyListeners(path) {
        for (const listener of this.listeners) {
            try {
                listener(path);
            } catch (error) {
                console.error('Route listener error:', error);
            }
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Global instance
const router = new Router();

// Export to window for browser environment
window.router = router;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Router, router };
}
