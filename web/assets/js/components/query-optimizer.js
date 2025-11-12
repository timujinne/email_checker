/**
 * Query Optimizer
 * Implements smart query optimization strategies:
 * - Request batching
 * - Response caching
 * - Pagination
 * - Field selection
 * - Request deduplication
 *
 * @module QueryOptimizer
 */

class QueryOptimizer {
    /**
     * Initialize query optimizer
     * @param {Object} cacheManager - CacheManager instance
     * @param {Object} options - Configuration options
     */
    constructor(cacheManager, options = {}) {
        this.cache = cacheManager;
        this.options = {
            batchSize: 10,           // Max requests to batch
            batchWaitTime: 50,       // Wait time before executing batch (ms)
            defaultPageSize: 50,     // Default pagination size
            cacheTTL: 3600000,       // Cache TTL (1 hour)
            deduplicateWindow: 1000, // Deduplicate window (1s)
            ...options
        };

        // Request batching
        this.requestBatch = [];
        this.batchTimeout = null;
        this.pendingRequests = new Map();

        // Request deduplication
        this.recentRequests = new Map();

        // Statistics
        this.stats = {
            batchedRequests: 0,
            cachedRequests: 0,
            deduplicatedRequests: 0,
            totalRequests: 0
        };

        console.log('✅ QueryOptimizer initialized');
    }

    /**
     * Execute optimized API request
     * Applies all optimization strategies
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<any>} - API response
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            body = null,
            cache = true,
            cacheTTL = this.options.cacheTTL,
            batch = false,
            deduplicate = true,
            fields = null,
            page = 1,
            pageSize = this.options.defaultPageSize
        } = options;

        this.stats.totalRequests++;

        // 1. Check request deduplication
        if (deduplicate && method === 'GET') {
            const dedupeKey = `${method}:${url}`;
            if (this.recentRequests.has(dedupeKey)) {
                const pending = this.recentRequests.get(dedepeKey);
                this.stats.deduplicatedRequests++;
                console.log(`🔄 Deduplicated request: ${url}`);
                return pending;
            }
        }

        // 2. Check cache
        if (cache && method === 'GET') {
            const cacheKey = this._buildCacheKey(url, options);
            const cached = await this.cache.get(cacheKey);
            if (cached !== undefined) {
                this.stats.cachedRequests++;
                console.log(`📦 Using cached response: ${url}`);
                return cached;
            }
        }

        // 3. Apply field selection
        const optimizedUrl = fields ? this._addFieldSelection(url, fields) : url;

        // 4. Apply pagination
        const paginatedUrl = this._addPagination(optimizedUrl, page, pageSize);

        // 5. Execute request (with batching if enabled)
        let response;
        if (batch && method === 'GET') {
            response = await this._batchRequest(paginatedUrl, options);
        } else {
            response = await this._executeRequest(paginatedUrl, { method, body });
        }

        // 6. Cache response
        if (cache && method === 'GET') {
            const cacheKey = this._buildCacheKey(url, options);
            await this.cache.set(cacheKey, response, cacheTTL);
        }

        // 7. Track deduplicate
        if (deduplicate && method === 'GET') {
            const dedupeKey = `${method}:${url}`;
            this.recentRequests.set(dedupeKey, response);

            // Clear deduplicate entry after window
            setTimeout(() => {
                this.recentRequests.delete(dedupeKey);
            }, this.options.deduplicateWindow);
        }

        return response;
    }

    /**
     * Batch multiple requests
     * Reduces number of network round-trips
     * @param {Array} requests - Array of { url, options } objects
     * @returns {Promise<Array>} - Batch results
     */
    async batchRequests(requests) {
        console.log(`🔄 Batching ${requests.length} requests...`);

        // Split into chunks if exceeds batch size
        const chunks = [];
        for (let i = 0; i < requests.length; i += this.options.batchSize) {
            chunks.push(requests.slice(i, i + this.options.batchSize));
        }

        // Execute chunks sequentially
        const results = [];
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(
                chunk.map(req => this.request(req.url, { ...req.options, batch: false }))
            );
            results.push(...chunkResults);
            this.stats.batchedRequests += chunk.length;
        }

        console.log(`✅ Batch complete: ${results.length} requests`);
        return results;
    }

    /**
     * Paginated request
     * Automatically fetch and combine results
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<Array>} - All paginated results combined
     */
    async paginatedRequest(url, options = {}) {
        const { pageSize = this.options.defaultPageSize } = options;
        const allResults = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await this.request(url, {
                ...options,
                page,
                pageSize
            });

            if (Array.isArray(response)) {
                allResults.push(...response);
                hasMore = response.length === pageSize;
            } else if (response.data) {
                allResults.push(...response.data);
                hasMore = response.data.length === pageSize;
            } else {
                hasMore = false;
            }

            page++;
        }

        console.log(`📄 Fetched ${allResults.length} total results across ${page - 1} pages`);
        return allResults;
    }

    /**
     * Batch request implementation
     * @private
     */
    async _batchRequest(url, options) {
        // Add to batch queue
        this.requestBatch.push({ url, options });

        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        // Check if batch should execute immediately
        if (this.requestBatch.length >= this.options.batchSize) {
            return this._executeBatch();
        }

        // Otherwise wait for batch window
        return new Promise((resolve, reject) => {
            this.batchTimeout = setTimeout(() => {
                this._executeBatch()
                    .then(results => resolve(results[0]))
                    .catch(reject);
            }, this.options.batchWaitTime);
        });
    }

    /**
     * Execute batch of requests
     * @private
     */
    async _executeBatch() {
        const batch = this.requestBatch.splice(0, this.requestBatch.length);
        if (batch.length === 0) return [];

        console.log(`📤 Executing batch of ${batch.length} requests`);

        const results = await Promise.all(
            batch.map(req => this._executeRequest(req.url, req.options))
        );

        this.stats.batchedRequests += batch.length;
        return results;
    }

    /**
     * Execute actual HTTP request
     * @private
     */
    async _executeRequest(url, options = {}) {
        const { method = 'GET', body = null } = options;

        try {
            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                fetchOptions.body = JSON.stringify(body);
            }

            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`❌ Request failed: ${url}`, error.message);
            throw error;
        }
    }

    /**
     * Add field selection to URL
     * Reduces response size
     * @private
     */
    _addFieldSelection(url, fields) {
        const fieldList = Array.isArray(fields) ? fields.join(',') : fields;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}fields=${encodeURIComponent(fieldList)}`;
    }

    /**
     * Add pagination parameters to URL
     * @private
     */
    _addPagination(url, page, pageSize) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}page=${page}&pageSize=${pageSize}`;
    }

    /**
     * Build cache key from URL and options
     * @private
     */
    _buildCacheKey(url, options) {
        const { fields = '', page = 1, pageSize = 50 } = options;
        return `query_${url}_${fields}_p${page}_ps${pageSize}`;
    }

    /**
     * Prefetch likely needed data
     * Based on user patterns
     * @param {Array} urls - URLs to prefetch
     */
    async prefetch(urls) {
        console.log(`🚀 Prefetching ${urls.length} endpoints...`);
        await Promise.all(
            urls.map(url => this.request(url, { batch: false }))
        );
        console.log('✅ Prefetch complete');
    }

    /**
     * Invalidate cache for specific URL
     * @param {string} url - URL to invalidate
     */
    async invalidateCache(url) {
        const keys = [];
        // Find all cache keys matching URL pattern
        // Note: This is simplified; full implementation would search cache
        console.log(`🔄 Invalidating cache for: ${url}`);
    }

    /**
     * Clear all query cache
     */
    async clearCache() {
        await this.cache.clear();
        this.recentRequests.clear();
        console.log('🧹 Query cache cleared');
    }

    /**
     * Get optimization statistics
     * @returns {Object} - Statistics about query optimization
     */
    getStats() {
        const cacheStats = this.cache.getStats();
        return {
            ...this.stats,
            cacheThroughput: `${cacheStats.hitRate} hit rate`,
            cacheMemory: cacheStats.memorySize,
            pendingBatches: this.requestBatch.length,
            recentRequests: this.recentRequests.size
        };
    }

    /**
     * Display statistics
     */
    displayStats() {
        const stats = this.getStats();
        console.table(stats);
        return stats;
    }
}

// Export for debugging
window.QueryOptimizer = QueryOptimizer;

console.log('✅ QueryOptimizer loaded - Smart query optimization enabled');
