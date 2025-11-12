/**
 * Cache Manager
 * Multi-layer caching strategy: Memory → IndexedDB → localStorage
 * Implements LRU (Least Recently Used) eviction policy
 *
 * @module CacheManager
 */

class CacheManager {
    /**
     * Initialize cache manager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            maxMemoryItems: 100,
            maxMemorySize: 10 * 1024 * 1024, // 10MB
            ttl: 3600000, // 1 hour default TTL
            useIndexedDB: true,
            useLocalStorage: true,
            ...options
        };

        // Memory cache (LRU)
        this.memoryCache = new Map();
        this.accessOrder = []; // For LRU tracking
        this.memorySize = 0;

        // Observers for cache events
        this.observers = [];

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            setOperations: 0,
            deleteOperations: 0
        };

        console.log('✅ CacheManager initialized');
    }

    /**
     * Get value from cache
     * Checks memory → IndexedDB → localStorage
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached value or undefined
     */
    async get(key) {
        // 1. Check memory cache
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);

            // Check TTL
            if (item.expires && item.expires < Date.now()) {
                this.memoryCache.delete(key);
                this.stats.misses++;
                return undefined;
            }

            // Update LRU
            this._updateLRU(key);
            this.stats.hits++;

            console.log(`📦 Cache HIT (memory): ${key}`);
            return item.value;
        }

        // 2. Check IndexedDB
        if (this.options.useIndexedDB) {
            try {
                const value = await this._getFromIndexedDB(key);
                if (value !== undefined) {
                    // Store in memory for future access
                    this.set(key, value, 3600000);
                    this.stats.hits++;
                    console.log(`📦 Cache HIT (IndexedDB): ${key}`);
                    return value;
                }
            } catch (error) {
                console.warn(`⚠️ IndexedDB read failed for ${key}:`, error.message);
            }
        }

        // 3. Check localStorage
        if (this.options.useLocalStorage) {
            try {
                const stored = localStorage.getItem(`cache_${key}`);
                if (stored) {
                    const item = JSON.parse(stored);

                    // Check TTL
                    if (item.expires && item.expires < Date.now()) {
                        localStorage.removeItem(`cache_${key}`);
                        this.stats.misses++;
                        return undefined;
                    }

                    // Store in memory for future access
                    this.set(key, item.value, 3600000);
                    this.stats.hits++;
                    console.log(`📦 Cache HIT (localStorage): ${key}`);
                    return item.value;
                }
            } catch (error) {
                console.warn(`⚠️ localStorage read failed for ${key}:`, error.message);
            }
        }

        this.stats.misses++;
        console.log(`❌ Cache MISS: ${key}`);
        return undefined;
    }

    /**
     * Set value in cache
     * Stores in all available layers
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async set(key, value, ttl = this.options.ttl) {
        const item = {
            value,
            expires: Date.now() + ttl,
            size: this._estimateSize(value)
        };

        // 1. Store in memory
        this._setMemory(key, item);

        // 2. Store in IndexedDB
        if (this.options.useIndexedDB) {
            await this._setIndexedDB(key, item).catch(error => {
                console.warn(`⚠️ IndexedDB write failed for ${key}:`, error.message);
            });
        }

        // 3. Store in localStorage (if small enough)
        if (this.options.useLocalStorage && item.size < 1024 * 100) { // 100KB limit
            try {
                localStorage.setItem(`cache_${key}`, JSON.stringify(item));
            } catch (error) {
                console.warn(`⚠️ localStorage write failed for ${key}:`, error.message);
            }
        }

        this.stats.setOperations++;
        this._notifyObservers('set', { key, size: item.size });

        return true;
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - Success status
     */
    async delete(key) {
        // Remove from memory
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            this.memorySize -= item.size;
            this.memoryCache.delete(key);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        }

        // Remove from IndexedDB
        if (this.options.useIndexedDB) {
            await this._deleteFromIndexedDB(key).catch(error => {
                console.warn(`⚠️ IndexedDB delete failed for ${key}:`, error.message);
            });
        }

        // Remove from localStorage
        if (this.options.useLocalStorage) {
            try {
                localStorage.removeItem(`cache_${key}`);
            } catch (error) {
                console.warn(`⚠️ localStorage delete failed for ${key}:`, error.message);
            }
        }

        this.stats.deleteOperations++;
        return true;
    }

    /**
     * Clear entire cache
     * @returns {Promise<void>}
     */
    async clear() {
        // Clear memory
        this.memoryCache.clear();
        this.accessOrder = [];
        this.memorySize = 0;

        // Clear IndexedDB
        if (this.options.useIndexedDB) {
            await this._clearIndexedDB().catch(error => {
                console.warn('⚠️ IndexedDB clear failed:', error.message);
            });
        }

        // Clear localStorage
        if (this.options.useLocalStorage) {
            try {
                Object.keys(localStorage)
                    .filter(key => key.startsWith('cache_'))
                    .forEach(key => localStorage.removeItem(key));
            } catch (error) {
                console.warn('⚠️ localStorage clear failed:', error.message);
            }
        }

        console.log('🧹 Cache cleared');
        this._notifyObservers('clear', {});
    }

    /**
     * Cache API response
     * Useful for caching GET requests
     * @param {string} url - API endpoint URL
     * @param {Object} response - Response data
     * @param {number} ttl - Time to live
     */
    async cacheResponse(url, response, ttl) {
        const cacheKey = `api_${url}`;
        await this.set(cacheKey, response, ttl);
    }

    /**
     * Get cached API response
     * @param {string} url - API endpoint URL
     * @returns {Promise<any>} - Cached response or undefined
     */
    async getCachedResponse(url) {
        const cacheKey = `api_${url}`;
        return this.get(cacheKey);
    }

    /**
     * Store in memory cache
     * @private
     */
    _setMemory(key, item) {
        // Check if key exists and remove it first
        if (this.memoryCache.has(key)) {
            const oldItem = this.memoryCache.get(key);
            this.memorySize -= oldItem.size;
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        }

        // Check memory limit and evict if necessary
        if (this.memorySize + item.size > this.options.maxMemorySize ||
            this.memoryCache.size >= this.options.maxMemoryItems) {
            this._evictLRU();
        }

        // Store item
        this.memoryCache.set(key, item);
        this.memorySize += item.size;
        this._updateLRU(key);
    }

    /**
     * Evict least recently used item
     * @private
     */
    _evictLRU() {
        if (this.accessOrder.length === 0) return;

        const keyToEvict = this.accessOrder.shift();
        const item = this.memoryCache.get(keyToEvict);

        if (item) {
            this.memorySize -= item.size;
            this.memoryCache.delete(keyToEvict);
            this.stats.evictions++;
            console.log(`🧹 Evicted (LRU): ${keyToEvict}`);
            this._notifyObservers('evict', { key: keyToEvict });
        }
    }

    /**
     * Update LRU tracking
     * @private
     */
    _updateLRU(key) {
        // Move key to end (most recently used)
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
    }

    /**
     * Estimate object size in bytes
     * @private
     */
    _estimateSize(obj) {
        const jsonString = JSON.stringify(obj);
        return new Blob([jsonString]).size;
    }

    /**
     * Get from IndexedDB
     * @private
     */
    async _getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('EmailCheckerCache', 1);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['cache'], 'readonly');
                    const store = transaction.objectStore('cache');
                    const getRequest = store.get(key);

                    getRequest.onsuccess = () => {
                        const item = getRequest.result;
                        if (item && (!item.expires || item.expires > Date.now())) {
                            resolve(item.value);
                        } else {
                            resolve(undefined);
                        }
                    };

                    getRequest.onerror = () => reject(getRequest.error);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('cache')) {
                        db.createObjectStore('cache');
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Set in IndexedDB
     * @private
     */
    async _setIndexedDB(key, item) {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('EmailCheckerCache', 1);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['cache'], 'readwrite');
                    const store = transaction.objectStore('cache');
                    const putRequest = store.put(item, key);

                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('cache')) {
                        db.createObjectStore('cache');
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Delete from IndexedDB
     * @private
     */
    async _deleteFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('EmailCheckerCache', 1);

                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['cache'], 'readwrite');
                    const store = transaction.objectStore('cache');
                    const deleteRequest = store.delete(key);

                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clear IndexedDB
     * @private
     */
    async _clearIndexedDB() {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('EmailCheckerCache', 1);

                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['cache'], 'readwrite');
                    const store = transaction.objectStore('cache');
                    const clearRequest = store.clear();

                    clearRequest.onsuccess = () => resolve();
                    clearRequest.onerror = () => reject(clearRequest.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 ?
            ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) :
            0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            memorySize: `${(this.memorySize / 1024 / 1024).toFixed(2)}MB`,
            memoryItems: this.memoryCache.size,
            memoryCapacity: `${(this.options.maxMemorySize / 1024 / 1024).toFixed(0)}MB`
        };
    }

    /**
     * Display cache statistics
     */
    displayStats() {
        const stats = this.getStats();
        console.table(stats);
        return stats;
    }

    /**
     * Subscribe to cache events
     * @param {Function} callback - Observer function
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers of cache events
     * @private
     */
    _notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Cache observer error:', error);
            }
        });
    }
}

// Export for debugging
window.CacheManager = CacheManager;

console.log('✅ CacheManager loaded - Multi-layer caching strategy enabled');
