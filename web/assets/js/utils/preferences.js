/**
 * Preferences Manager
 * Centralized system for managing all user preferences and settings
 *
 * Features:
 * - Single source of truth for all user preferences
 * - Auto-save on changes
 * - Versioning with migration support
 * - Namespaced storage per component
 * - Backward compatibility with existing localStorage keys
 */

class PreferencesManager {
    constructor() {
        this.VERSION = 1;
        this.STORAGE_KEY = `email-checker-preferences-v${this.VERSION}`;

        // Default preferences structure
        this.defaults = {
            version: this.VERSION,

            // UI preferences
            ui: {
                theme: 'dark',  // Managed by ThemeManager, kept for reference
                sidebarCollapsed: false,
                compactMode: false,
                animationsEnabled: true
            },

            // Table settings (per component)
            tables: {
                lists: {
                    sortBy: 'date_added',
                    sortOrder: 'desc',
                    pageSize: 100
                },
                blocklist: {
                    sortBy: 'email',
                    sortOrder: 'asc',
                    pageSize: 500
                },
                emailList: {
                    sortBy: 'added',
                    sortOrder: 'desc',
                    pageSize: 100
                }
            },

            // Filter states (per page)
            filters: {
                lists: {
                    search: '',
                    country: '',
                    category: '',
                    status: ''
                },
                blocklist: {
                    search: '',
                    status: 'all',
                    type: 'all'
                },
                emailList: {
                    search: '',
                    category: 'all'
                }
            },

            // Search history (last 10 searches per component)
            searchHistory: {
                blocklist: [],
                lists: [],
                emailList: []
            },

            // Active UI states
            activeStates: {
                smartFilter: {
                    activeTab: 'visual'  // visual, json, wizard, test
                },
                analytics: {
                    activeChart: 'trends',
                    dateRange: null
                }
            },

            // Scroll positions (optional, may be heavy)
            scrollPositions: {
                // 'page-id': scrollTop
            },

            // Performance settings
            performance: {
                virtualScrollBufferSize: 10,
                autoRefresh: true,
                refreshInterval: 30000
            }
        };

        // Load preferences from storage
        this.preferences = this.loadPreferences();

        // Listen for changes from other tabs
        this.setupStorageListener();

        console.log('⚙️ PreferencesManager initialized (v' + this.VERSION + ')');
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);

            if (stored) {
                const parsed = JSON.parse(stored);

                // Check version and migrate if needed
                if (parsed.version !== this.VERSION) {
                    return this.migrate(parsed);
                }

                // Merge with defaults (in case new fields were added)
                return this.deepMerge(this.defaults, parsed);
            }

            // No stored preferences, use defaults
            return { ...this.defaults };

        } catch (error) {
            console.error('⚠️ Error loading preferences:', error);
            return { ...this.defaults };
        }
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            this.preferences.version = this.VERSION;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));

            // Emit event for reactive updates
            window.dispatchEvent(new CustomEvent('preferences:updated', {
                detail: this.preferences
            }));

        } catch (error) {
            console.error('⚠️ Error saving preferences:', error);

            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            }
        }
    }

    /**
     * Get preference value by path (dot notation)
     * Example: get('tables.lists.sortBy')
     */
    get(path) {
        return this.getNestedValue(this.preferences, path);
    }

    /**
     * Set preference value by path (dot notation)
     * Example: set('tables.lists.sortBy', 'name')
     */
    set(path, value) {
        this.setNestedValue(this.preferences, path, value);
        this.savePreferences();
    }

    /**
     * Update multiple preferences at once
     * Example: update({ 'tables.lists.sortBy': 'name', 'ui.compactMode': true })
     */
    update(updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.setNestedValue(this.preferences, path, value);
        }
        this.savePreferences();
    }

    /**
     * Reset preferences to defaults
     */
    reset() {
        this.preferences = { ...this.defaults };
        this.savePreferences();
        console.log('✅ Preferences reset to defaults');
    }

    /**
     * Reset specific section
     */
    resetSection(section) {
        if (this.defaults[section]) {
            this.preferences[section] = { ...this.defaults[section] };
            this.savePreferences();
            console.log(`✅ Section "${section}" reset to defaults`);
        }
    }

    /**
     * Add search query to history
     */
    addToSearchHistory(component, query) {
        if (!query || query.trim() === '') return;

        const history = this.preferences.searchHistory[component] || [];

        // Remove duplicates
        const filtered = history.filter(item => item !== query);

        // Add to beginning, limit to 10
        filtered.unshift(query);
        this.preferences.searchHistory[component] = filtered.slice(0, 10);

        this.savePreferences();
    }

    /**
     * Get search history for component
     */
    getSearchHistory(component) {
        return this.preferences.searchHistory[component] || [];
    }

    /**
     * Clear search history for component
     */
    clearSearchHistory(component) {
        if (this.preferences.searchHistory[component]) {
            this.preferences.searchHistory[component] = [];
            this.savePreferences();
        }
    }

    /**
     * Export preferences as JSON
     */
    export() {
        return JSON.stringify(this.preferences, null, 2);
    }

    /**
     * Import preferences from JSON
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);

            // Validate structure
            if (typeof imported !== 'object' || !imported.version) {
                throw new Error('Invalid preferences format');
            }

            // Merge with defaults
            this.preferences = this.deepMerge(this.defaults, imported);
            this.savePreferences();

            console.log('✅ Preferences imported successfully');
            return true;

        } catch (error) {
            console.error('⚠️ Error importing preferences:', error);
            return false;
        }
    }

    // ========== Helper Methods ==========

    /**
     * Get nested object value by path string
     */
    getNestedValue(obj, path) {
        const keys = path.split('.');
        let value = obj;

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
     * Set nested object value by path string
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = obj;

        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        target[lastKey] = value;
    }

    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Migrate preferences from old version
     */
    migrate(oldPreferences) {
        console.log(`🔄 Migrating preferences from v${oldPreferences.version} to v${this.VERSION}`);

        // Migration logic for future versions
        switch (oldPreferences.version) {
            case 0:
            case undefined:
                // Migrate from unversioned to v1
                return this.deepMerge(this.defaults, oldPreferences);

            default:
                // Unknown version, use defaults
                console.warn('⚠️ Unknown preferences version, using defaults');
                return { ...this.defaults };
        }
    }

    /**
     * Handle localStorage quota exceeded
     */
    handleQuotaExceeded() {
        console.warn('⚠️ localStorage quota exceeded, clearing scroll positions...');

        // Clear scroll positions (least important data)
        this.preferences.scrollPositions = {};

        // Try saving again
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
        } catch (error) {
            console.error('⚠️ Still cannot save, clearing search history...');

            // Clear search history
            for (const key in this.preferences.searchHistory) {
                this.preferences.searchHistory[key] = [];
            }

            // Final attempt
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
            } catch (finalError) {
                console.error('❌ Cannot save preferences even after cleanup');
            }
        }
    }

    /**
     * Listen for storage changes from other tabs
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY && e.newValue) {
                try {
                    this.preferences = JSON.parse(e.newValue);
                    console.log('🔄 Preferences updated from another tab');

                    // Emit event for components to react
                    window.dispatchEvent(new CustomEvent('preferences:updated', {
                        detail: this.preferences
                    }));
                } catch (error) {
                    console.error('⚠️ Error parsing preferences from storage event:', error);
                }
            }
        });
    }
}

// Create global instance
const preferencesManager = new PreferencesManager();

// Export to window for easy access
window.preferencesManager = preferencesManager;

// Also create short alias
window.prefs = preferencesManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PreferencesManager, preferencesManager };
}
