/**
 * Bulk Operations Manager
 * Handles bulk add, remove, update operations with progress tracking
 *
 * @module BulkOperations
 */

class BulkOperations {
    /**
     * Create BulkOperations instance
     * @param {Object} options - Configuration
     * @param {number} options.chunkSize - Items per batch (default: 100)
     * @param {number} options.delayBetweenChunks - Delay in ms (default: 10)
     */
    constructor(options = {}) {
        this.options = {
            chunkSize: 100,
            delayBetweenChunks: 10,
            ...options
        };

        this.currentOperation = null;
        this.observers = [];

        console.log('⚙️ BulkOperations initialized');
    }

    /**
     * Add multiple items
     * @param {Array} items - Items to add
     * @param {Function} callback - Called for each added item
     * @returns {Promise} Operation result
     * @example
     * await bulkOps.addItems(emails, (item, progress) => {
     *   console.log(`Added ${item.email}, ${progress}% done`);
     * });
     */
    async addItems(items, callback) {
        if (!items.length) {
            console.warn('⚠️ No items to add');
            return { added: 0, failed: 0, results: [] };
        }

        return this.executeOperation('add', items, async (items) => {
            const results = [];
            const failed = [];

            for (let i = 0; i < items.length; i += this.options.chunkSize) {
                const chunk = items.slice(i, i + this.options.chunkSize);
                const progress = Math.round((i / items.length) * 100);

                // Process chunk
                chunk.forEach(item => {
                    try {
                        results.push({
                            ...item,
                            status: 'allowed',
                            addedAt: new Date().toISOString()
                        });

                        if (callback) {
                            callback(item, progress);
                        }
                    } catch (error) {
                        failed.push({ item, error: error.message });
                    }
                });

                // Delay between chunks
                await this.sleep(this.options.delayBetweenChunks);
            }

            return { added: results.length, failed: failed.length, results };
        });
    }

    /**
     * Remove multiple items
     * @param {Array} items - Items to remove
     * @param {Function} callback - Called for each removed item
     * @returns {Promise} Operation result
     */
    async removeItems(items, callback) {
        if (!items.length) {
            console.warn('⚠️ No items to remove');
            return { removed: 0, failed: 0 };
        }

        return this.executeOperation('remove', items, async (items) => {
            const removed = [];
            const failed = [];

            for (let i = 0; i < items.length; i += this.options.chunkSize) {
                const chunk = items.slice(i, i + this.options.chunkSize);
                const progress = Math.round((i / items.length) * 100);

                chunk.forEach(item => {
                    try {
                        removed.push(item);

                        if (callback) {
                            callback(item, progress);
                        }
                    } catch (error) {
                        failed.push({ item, error: error.message });
                    }
                });

                await this.sleep(this.options.delayBetweenChunks);
            }

            return { removed: removed.length, failed: failed.length, removed };
        });
    }

    /**
     * Update multiple items
     * @param {Array} items - Items to update
     * @param {Object} updates - Updates to apply
     * @param {Function} callback - Called for each updated item
     * @returns {Promise} Operation result
     */
    async updateItems(items, updates, callback) {
        if (!items.length) {
            console.warn('⚠️ No items to update');
            return { updated: 0, failed: 0, results: [] };
        }

        return this.executeOperation('update', items, async (items) => {
            const results = [];
            const failed = [];

            for (let i = 0; i < items.length; i += this.options.chunkSize) {
                const chunk = items.slice(i, i + this.options.chunkSize);
                const progress = Math.round((i / items.length) * 100);

                chunk.forEach(item => {
                    try {
                        const updated = { ...item, ...updates };
                        results.push(updated);

                        if (callback) {
                            callback(updated, progress);
                        }
                    } catch (error) {
                        failed.push({ item, error: error.message });
                    }
                });

                await this.sleep(this.options.delayBetweenChunks);
            }

            return { updated: results.length, failed: failed.length, results };
        });
    }

    /**
     * Bulk change status
     * @param {Array} items - Items to update
     * @param {string} newStatus - New status value
     * @param {Function} callback - Progress callback
     * @returns {Promise}
     */
    async changeStatus(items, newStatus, callback) {
        return this.updateItems(items, { status: newStatus }, callback);
    }

    /**
     * Bulk add tags
     * @param {Array} items - Items to tag
     * @param {Array} tags - Tags to add
     * @param {Function} callback - Progress callback
     * @returns {Promise}
     */
    async addTags(items, tags, callback) {
        return this.updateItems(items, (item) => {
            const currentTags = item.tags || [];
            const newTags = [...new Set([...currentTags, ...tags])];
            return { tags: newTags };
        }, callback);
    }

    /**
     * Execute bulk operation
     * @private
     * @param {string} type - Operation type
     * @param {Array} items - Items to process
     * @param {Function} operation - Operation function
     * @returns {Promise}
     */
    async executeOperation(type, items, operation) {
        if (this.currentOperation) {
            throw new Error('Another operation is in progress');
        }

        const startTime = Date.now();
        const operationId = this.generateId();

        this.currentOperation = {
            id: operationId,
            type,
            itemCount: items.length,
            startTime,
            status: 'running'
        };

        this.notifyObservers('operation-started', this.currentOperation);

        try {
            const result = await operation(items);

            this.currentOperation.status = 'completed';
            this.currentOperation.duration = Date.now() - startTime;
            this.currentOperation.result = result;

            this.notifyObservers('operation-completed', this.currentOperation);

            console.log(`✅ ${type} operation completed in ${this.currentOperation.duration}ms`);

            return result;
        } catch (error) {
            this.currentOperation.status = 'failed';
            this.currentOperation.error = error.message;
            this.currentOperation.duration = Date.now() - startTime;

            this.notifyObservers('operation-failed', this.currentOperation);

            console.error(`❌ ${type} operation failed:`, error);
            throw error;
        } finally {
            this.currentOperation = null;
        }
    }

    /**
     * Cancel current operation
     * @returns {boolean} Success
     */
    cancel() {
        if (!this.currentOperation) {
            return false;
        }

        this.currentOperation.status = 'cancelled';
        this.notifyObservers('operation-cancelled', this.currentOperation);
        this.currentOperation = null;
        console.log('⛔ Operation cancelled');
        return true;
    }

    /**
     * Get current operation status
     * @returns {Object|null}
     */
    getCurrentOperation() {
        return this.currentOperation;
    }

    /**
     * Check if operation is in progress
     * @returns {boolean}
     */
    isOperationInProgress() {
        return this.currentOperation !== null;
    }

    /**
     * Subscribe to operations
     * @param {Function} callback - Called with (event, data)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers
     * @private
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    /**
     * Helper: sleep
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Helper: generate ID
     * @private
     */
    generateId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
