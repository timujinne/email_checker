/**
 * Lazy Loader Component
 * Handles dynamic component loading and caching for performance
 */

class LazyLoader {
    static cache = new Map();
    static loadingPromises = new Map();
    static preloadedComponents = new Set();

    /**
     * Dynamically load a component
     * @param {string} componentName - Name of the component to load
     * @returns {Promise} - Resolves when component is loaded
     */
    static async loadComponent(componentName) {
        // Return from cache if available
        if (this.cache.has(componentName)) {
            return this.cache.get(componentName);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(componentName)) {
            return this.loadingPromises.get(componentName);
        }

        // Create new loading promise
        const loadPromise = this._loadComponentFile(componentName);
        this.loadingPromises.set(componentName, loadPromise);

        try {
            const result = await loadPromise;
            this.cache.set(componentName, result);
            return result;
        } finally {
            this.loadingPromises.delete(componentName);
        }
    }

    /**
     * Load component file
     * @private
     */
    static async _loadComponentFile(componentName) {
        const script = document.createElement('script');
        script.src = `/assets/js/components/${componentName}.js`;
        script.type = 'text/javascript';
        script.async = true;

        return new Promise((resolve, reject) => {
            script.onload = () => {
                console.log(`✅ Component loaded: ${componentName}`);
                resolve(window[this._toCamelCase(componentName)]);
            };

            script.onerror = () => {
                reject(new Error(`Failed to load component: ${componentName}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Preload multiple components
     * @param {string[]} componentNames - Array of component names to preload
     * @returns {Promise<void>}
     */
    static async preloadComponents(componentNames) {
        const promises = componentNames
            .filter(name => !this.preloadedComponents.has(name))
            .map(name => {
                this.preloadedComponents.add(name);
                return this.loadComponent(name).catch(error => {
                    console.warn(`⚠️ Failed to preload ${name}:`, error);
                });
            });

        await Promise.all(promises);
        console.log(`🚀 Preloaded ${componentNames.length} components`);
    }

    /**
     * Clear component cache
     */
    static clearCache() {
        const cacheSize = this.cache.size;
        this.cache.clear();
        console.log(`🧹 Cleared ${cacheSize} cached components`);
    }

    /**
     * Clear specific component from cache
     * @param {string} componentName - Component to clear
     */
    static clearComponent(componentName) {
        if (this.cache.has(componentName)) {
            this.cache.delete(componentName);
            this.preloadedComponents.delete(componentName);
            console.log(`🧹 Cleared component: ${componentName}`);
        }
    }

    /**
     * Get cache status
     */
    static getCacheStatus() {
        return {
            cachedComponents: Array.from(this.cache.keys()),
            preloadedComponents: Array.from(this.preloadedComponents),
            cacheSize: this.cache.size,
            preloadedCount: this.preloadedComponents.size
        };
    }

    /**
     * Convert kebab-case to camelCase
     * @private
     */
    static _toCamelCase(str) {
        return str
            .split('-')
            .map((word, index) => {
                if (index === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join('');
    }
}

// Export to window
window.LazyLoader = LazyLoader;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LazyLoader };
}
