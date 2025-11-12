/**
 * Global State Management
 * Simple, object-based store without external dependencies
 */

class StateManager {
    constructor() {
        this.state = {
            // User & Auth
            user: null,
            isAuthenticated: false,

            // Theme
            theme: localStorage.getItem('theme') || 'light',

            // Data
            lists: [],
            filters: [],
            blocklists: {
                emails: [],
                domains: []
            },
            processingQueue: [],

            // UI State
            currentPage: 'dashboard',
            loading: false,
            error: null,

            // WebSocket
            wsConnected: false,

            // Notifications
            notifications: [],

            // System Stats
            stats: {
                processed: 0,
                clean: 0,
                blocked: 0,
                queueLength: 0
            }
        };

        this.listeners = [];
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state value
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Update state (immutable)
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();

        let current = this.state;
        for (const key of keys) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
        this.notifyListeners();
    }

    /**
     * Update nested object (merge)
     */
    update(path, updates) {
        const current = this.get(path);
        if (typeof current === 'object' && current !== null) {
            this.set(path, { ...current, ...updates });
        }
    }

    /**
     * Reset state
     */
    reset() {
        this.state = {
            user: null,
            isAuthenticated: false,
            theme: localStorage.getItem('theme') || 'light',
            lists: [],
            filters: [],
            blocklists: { emails: [], domains: [] },
            processingQueue: [],
            currentPage: 'dashboard',
            loading: false,
            error: null,
            wsConnected: false,
            notifications: [],
            stats: { processed: 0, clean: 0, blocked: 0, queueLength: 0 }
        };
        this.notifyListeners();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.getState());
            } catch (error) {
                console.error('State listener error:', error);
            }
        }
    }

    /**
     * Debug: Log current state
     */
    debug() {
        console.table(this.state);
    }
}

// Global instance
const store = new StateManager();

// Export to window for browser environment
window.store = store;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateManager, store };
}
