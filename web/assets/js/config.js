/**
 * Application Configuration
 * Central configuration file for Email Checker Web UI
 *
 * This file should be loaded FIRST before all other scripts
 * to ensure APP_CONFIG is available globally.
 */

window.APP_CONFIG = {
    // Application version (single source of truth)
    VERSION: '1.0.2',

    // Application metadata
    APP_NAME: 'Email Checker',
    APP_DESCRIPTION: 'High-performance email list validation tool',

    // API configuration
    API_BASE_URL: window.location.origin,
    WS_URL: `ws://${window.location.host}/ws`,

    // Feature flags
    FEATURES: {
        SMART_FILTER: true,
        ML_ANALYTICS: true,
        CLOUD_STORAGE: false,  // Not implemented yet
        BATCH_PROCESSING: true
    },

    // UI configuration
    UI: {
        THEME_DEFAULT: 'dark',
        SIDEBAR_COLLAPSED: false,
        VIRTUAL_SCROLL_ROW_HEIGHT: 40,
        VIRTUAL_SCROLL_VISIBLE_ROWS: 20
    },

    // Performance settings
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,
        AUTO_SAVE_DELAY: 1000,
        REFRESH_INTERVAL: 30000  // 30 seconds
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(window.APP_CONFIG);
Object.freeze(window.APP_CONFIG.FEATURES);
Object.freeze(window.APP_CONFIG.UI);
Object.freeze(window.APP_CONFIG.PERFORMANCE);

console.log(`📦 Config loaded: ${window.APP_CONFIG.APP_NAME} v${window.APP_CONFIG.VERSION}`);
