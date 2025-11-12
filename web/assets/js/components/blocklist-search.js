/**
 * Blocklist Search & Index
 * Provides O(1) lookups for emails and domains with intelligent indexing
 *
 * @module BlocklistSearch
 */

class BlocklistSearch {
    /**
     * Create BlocklistSearch instance
     */
    constructor() {
        this.items = [];
        this.emailIndex = new Map();        // email → index
        this.domainIndex = new Map();       // domain → [indices]
        this.statusIndex = {
            blocked: new Set(),
            allowed: new Set(),
            new: new Set()
        };
        this.tagsIndex = new Map();         // tag → [indices]
        this.lastUpdate = null;

        console.log('🔍 BlocklistSearch initialized');
    }

    /**
     * Build index from items
     * @param {Array} items - Items to index
     * @example
     * search.buildIndex([
     *   { email: 'user@example.com', domain: 'example.com', status: 'blocked' },
     *   ...
     * ])
     */
    buildIndex(items) {
        console.log(`📊 Building index for ${items.length} items...`);
        const startTime = performance.now();

        this.items = items;
        this.emailIndex.clear();
        this.domainIndex.clear();
        this.tagsIndex.clear();

        // Reset status index
        this.statusIndex = {
            blocked: new Set(),
            allowed: new Set(),
            new: new Set()
        };

        // Build indices
        items.forEach((item, index) => {
            // Email index
            const email = item.email?.toLowerCase();
            if (email) {
                this.emailIndex.set(email, index);
            }

            // Domain index
            const domain = item.domain?.toLowerCase();
            if (domain) {
                if (!this.domainIndex.has(domain)) {
                    this.domainIndex.set(domain, []);
                }
                this.domainIndex.get(domain).push(index);
            }

            // Status index
            const status = item.status?.toLowerCase() || 'new';
            if (this.statusIndex[status]) {
                this.statusIndex[status].add(index);
            }

            // Tags index
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    const tagLower = tag.toLowerCase();
                    if (!this.tagsIndex.has(tagLower)) {
                        this.tagsIndex.set(tagLower, []);
                    }
                    this.tagsIndex.get(tagLower).push(index);
                });
            }
        });

        this.lastUpdate = new Date();
        const buildTime = performance.now() - startTime;
        console.log(`✅ Index built in ${buildTime.toFixed(2)}ms`);
    }

    /**
     * Search for email (O(1) lookup)
     * @param {string} query - Email to search
     * @returns {Object|null} Item or null
     */
    searchEmail(query) {
        const email = query.toLowerCase();
        const index = this.emailIndex.get(email);
        return index !== undefined ? this.items[index] : null;
    }

    /**
     * Search for domain (O(1) lookup)
     * @param {string} domain - Domain to search
     * @returns {Array} Items with this domain
     */
    searchDomain(domain) {
        const domainLower = domain.toLowerCase();
        const indices = this.domainIndex.get(domainLower) || [];
        return indices.map(i => this.items[i]);
    }

    /**
     * Filter by status
     * @param {string} status - 'blocked', 'allowed', or 'new'
     * @returns {Array} Items with this status
     */
    filterByStatus(status) {
        const indices = this.statusIndex[status.toLowerCase()] || new Set();
        return Array.from(indices).map(i => this.items[i]);
    }

    /**
     * Filter by multiple statuses
     * @param {Array} statuses - Status array
     * @returns {Array} Items with any of these statuses
     */
    filterByStatuses(statuses) {
        let result = [];
        statuses.forEach(status => {
            result = result.concat(this.filterByStatus(status));
        });
        return [...new Set(result.map(item => JSON.stringify(item)))].map(JSON.parse);
    }

    /**
     * Filter by tag
     * @param {string} tag - Tag name
     * @returns {Array} Items with this tag
     */
    filterByTag(tag) {
        const indices = this.tagsIndex.get(tag.toLowerCase()) || [];
        return indices.map(i => this.items[i]);
    }

    /**
     * Apply multiple filters (AND logic)
     * @param {Object} filters - Filter config
     * @returns {Array} Filtered items
     * @example
     * search.applyFilters({
     *   status: ['blocked', 'new'],
     *   domain: 'gmail.com',
     *   tags: ['important']
     * })
     */
    applyFilters(filters) {
        let result = this.items;

        // Filter by status (OR)
        if (filters.statuses && filters.statuses.length > 0) {
            const statusSet = new Set();
            filters.statuses.forEach(status => {
                this.filterByStatus(status).forEach(item => {
                    statusSet.add(JSON.stringify(item));
                });
            });
            result = result.filter(item => statusSet.has(JSON.stringify(item)));
        }

        // Filter by domain (exact match)
        if (filters.domain) {
            const domainItems = this.searchDomain(filters.domain);
            const domainSet = new Set(domainItems.map(i => JSON.stringify(i)));
            result = result.filter(item => domainSet.has(JSON.stringify(item)));
        }

        // Filter by text search (any field)
        if (filters.search) {
            const query = filters.search.toLowerCase();
            result = result.filter(item => {
                return JSON.stringify(item).toLowerCase().includes(query);
            });
        }

        // Filter by tags (OR)
        if (filters.tags && filters.tags.length > 0) {
            const tagSet = new Set();
            filters.tags.forEach(tag => {
                this.filterByTag(tag).forEach(item => {
                    tagSet.add(JSON.stringify(item));
                });
            });
            result = result.filter(item => tagSet.has(JSON.stringify(item)));
        }

        return result;
    }

    /**
     * Full-text search
     * @param {string} query - Search query
     * @returns {Array} Matching items
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.items.filter(item => {
            return (item.email?.toLowerCase().includes(lowerQuery)) ||
                   (item.domain?.toLowerCase().includes(lowerQuery)) ||
                   JSON.stringify(item).toLowerCase().includes(lowerQuery);
        });
    }

    /**
     * Advanced search with ranking
     * @param {string} query - Search query
     * @returns {Array} Items sorted by relevance
     */
    searchWithRanking(query) {
        const lowerQuery = query.toLowerCase();
        const results = this.items
            .map(item => {
                let score = 0;

                // Exact email match
                if (item.email?.toLowerCase() === lowerQuery) score += 100;
                // Email starts with
                else if (item.email?.toLowerCase().startsWith(lowerQuery)) score += 50;
                // Email contains
                else if (item.email?.toLowerCase().includes(lowerQuery)) score += 25;

                // Domain matches
                if (item.domain?.toLowerCase().includes(lowerQuery)) score += 20;

                return { item, score };
            })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.item);

        return results;
    }

    /**
     * Get statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            total: this.items.length,
            blocked: this.statusIndex.blocked.size,
            allowed: this.statusIndex.allowed.size,
            new: this.statusIndex.new.size,
            uniqueDomains: this.domainIndex.size,
            uniqueTags: this.tagsIndex.size,
            indexedAt: this.lastUpdate
        };
    }

    /**
     * Get top domains by blocked count
     * @param {number} limit - Max results
     * @returns {Array} Top domains with counts
     */
    getTopDomains(limit = 10) {
        const domains = Array.from(this.domainIndex.entries())
            .map(([domain, indices]) => ({
                domain,
                count: indices.length,
                blockedCount: indices.filter(i => {
                    const item = this.items[i];
                    return item.status?.toLowerCase() === 'blocked';
                }).length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return domains;
    }

    /**
     * Get domain risk score
     * @param {string} domain - Domain to analyze
     * @returns {Object} Risk assessment
     */
    getDomainRisk(domain) {
        const domainLower = domain.toLowerCase();
        const indices = this.domainIndex.get(domainLower) || [];
        const items = indices.map(i => this.items[i]);

        const blockedCount = items.filter(item => item.status?.toLowerCase() === 'blocked').length;
        const totalCount = items.length;
        const blockedRatio = totalCount > 0 ? blockedCount / totalCount : 0;

        // Determine risk level
        let riskLevel = 'low';
        if (blockedRatio >= 0.8) riskLevel = 'high';
        else if (blockedRatio >= 0.5) riskLevel = 'medium';

        return {
            domain,
            totalEmails: totalCount,
            blockedEmails: blockedCount,
            blockedRatio: (blockedRatio * 100).toFixed(2),
            riskLevel,
            riskScore: Math.round(blockedRatio * 100)
        };
    }

    /**
     * Check if email exists
     * @param {string} email - Email to check
     * @returns {boolean}
     */
    hasEmail(email) {
        return this.emailIndex.has(email.toLowerCase());
    }

    /**
     * Get duplicates (multiple entries for same email)
     * @returns {Array} Duplicate emails with counts
     */
    getDuplicates() {
        const emailCounts = new Map();

        this.items.forEach(item => {
            const email = item.email?.toLowerCase();
            if (email) {
                emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
            }
        });

        return Array.from(emailCounts.entries())
            .filter(([_, count]) => count > 1)
            .map(([email, count]) => ({ email, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get items by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Items in date range
     */
    getByDateRange(startDate, endDate) {
        return this.items.filter(item => {
            const itemDate = new Date(item.addedAt);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    /**
     * Export index statistics
     * @returns {Object} Index info
     */
    getIndexStats() {
        return {
            itemCount: this.items.length,
            emailIndexSize: this.emailIndex.size,
            domainIndexSize: this.domainIndex.size,
            statusIndexSizes: {
                blocked: this.statusIndex.blocked.size,
                allowed: this.statusIndex.allowed.size,
                new: this.statusIndex.new.size
            },
            tagsIndexSize: this.tagsIndex.size,
            estimatedMemory: (
                this.items.length * 200 +  // Items ~200 bytes each
                this.emailIndex.size * 50 +
                this.domainIndex.size * 100 +
                this.tagsIndex.size * 100
            ),
            lastUpdated: this.lastUpdate
        };
    }

    /**
     * Rebuild index (call after data modification)
     */
    rebuildIndex() {
        this.buildIndex(this.items);
    }

    /**
     * Clear all indices
     */
    clear() {
        this.items = [];
        this.emailIndex.clear();
        this.domainIndex.clear();
        this.tagsIndex.clear();
        this.statusIndex = {
            blocked: new Set(),
            allowed: new Set(),
            new: new Set()
        };
        this.lastUpdate = null;
    }
}
