/**
 * Theme Manager
 * Handles dark/light mode switching with localStorage persistence
 */

class ThemeManager {
    constructor() {
        this.THEMES = {
            LIGHT: 'light',
            DARK: 'dark'
        };

        this.STORAGE_KEY = 'theme';
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.listeners = [];

        this.init();
    }

    /**
     * Initialize theme system
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.watchSystemTheme();
    }

    /**
     * Get theme from localStorage
     */
    getStoredTheme() {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    /**
     * Get system theme preference
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.THEMES.DARK;
        }
        return this.THEMES.LIGHT;
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        const html = document.documentElement;
        html.setAttribute('data-theme', theme);

        // Update CSS variables
        if (theme === this.THEMES.DARK) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem(this.STORAGE_KEY, theme);

        // Update state
        if (typeof store !== 'undefined') {
            store.set('theme', theme);
        }

        this.currentTheme = theme;
        this.notifyListeners();
    }

    /**
     * Toggle theme
     */
    toggle() {
        const newTheme = this.currentTheme === this.THEMES.LIGHT
            ? this.THEMES.DARK
            : this.THEMES.LIGHT;
        this.applyTheme(newTheme);
    }

    /**
     * Set specific theme
     */
    set(theme) {
        if (theme in Object.values(this.THEMES)) {
            this.applyTheme(theme);
        }
    }

    /**
     * Get current theme
     */
    get() {
        return this.currentTheme;
    }

    /**
     * Check if dark mode
     */
    isDark() {
        return this.currentTheme === this.THEMES.DARK;
    }

    /**
     * Watch for system theme changes
     */
    watchSystemTheme() {
        if (!window.matchMedia) return;

        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        darkModeQuery.addListener((e) => {
            // Only apply system theme if no user preference saved
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.applyTheme(e.matches ? this.THEMES.DARK : this.THEMES.LIGHT);
            }
        });
    }

    /**
     * Subscribe to theme changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    /**
     * Notify theme change listeners
     */
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.currentTheme);
            } catch (error) {
                console.error('Theme listener error:', error);
            }
        }
    }
}

// Global instance
const themeManager = new ThemeManager();

// Export to window for browser environment
window.themeManager = themeManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, themeManager };
}
