/**
 * Retry Manager
 * Implements exponential backoff and smart retry strategies
 * Handles failing operations with grace
 *
 * @module RetryManager
 */

class RetryManager {
    /**
     * Create retry manager
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            initialDelay: 100,        // milliseconds
            maxDelay: 5000,           // milliseconds
            backoffMultiplier: 2,     // exponential backoff
            jitter: true,             // add randomness to prevent thundering herd
            timeoutDelay: 10000,      // timeout for individual attempt
            retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            onRetry: null,
            onFailure: null,
            ...options
        };

        this.stats = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            totalRetriesUsed: 0
        };

        this.observers = [];
        console.log('✅ RetryManager initialized');
    }

    /**
     * Execute operation with automatic retries
     * @param {Function} operation - Async function to retry
     * @param {Object} operationOptions - Operation-specific options
     * @returns {Promise<any>} - Operation result
     */
    async execute(operation, operationOptions = {}) {
        const {
            maxRetries = this.options.maxRetries,
            onRetry = this.options.onRetry,
            context = 'operation'
        } = operationOptions;

        let lastError;
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;
            this.stats.totalAttempts++;

            try {
                console.log(`🔄 ${context} - Attempt ${attempt}/${maxRetries}`);

                // Execute with timeout
                const result = await this._executeWithTimeout(
                    operation,
                    this.options.timeoutDelay
                );

                if (attempt > 1) {
                    this.stats.successfulRetries++;
                    this._notifyObservers('success-after-retry', {
                        context,
                        attempts: attempt,
                        result
                    });
                }

                return result;
            } catch (error) {
                lastError = error;

                // Check if error is retryable
                if (!this._isRetryable(error, attempt, maxRetries)) {
                    throw error;
                }

                // Calculate delay for next attempt
                const delay = this._calculateDelay(attempt);
                console.warn(`⚠️ ${context} failed, retrying in ${delay}ms...`);

                if (onRetry) {
                    try {
                        onRetry({
                            attempt,
                            maxRetries,
                            delay,
                            error: error.message
                        });
                    } catch (e) {
                        console.error('onRetry callback error:', e);
                    }
                }

                // Wait before retrying
                await this._delay(delay);
                this.stats.totalRetriesUsed++;
            }
        }

        // All retries exhausted
        this.stats.failedRetries++;

        this._notifyObservers('failure-after-retries', {
            context,
            attempts: attempt,
            error: lastError
        });

        if (this.options.onFailure) {
            try {
                this.options.onFailure({
                    context,
                    attempts: attempt,
                    error: lastError
                });
            } catch (e) {
                console.error('onFailure callback error:', e);
            }
        }

        throw lastError;
    }

    /**
     * Execute operation with timeout
     * @private
     */
    async _executeWithTimeout(operation, timeoutMs) {
        return Promise.race([
            operation(),
            new Promise((_, reject) =>
                setTimeout(() => reject(
                    new Error(`Operation timeout after ${timeoutMs}ms`)
                ), timeoutMs)
            )
        ]);
    }

    /**
     * Check if error is retryable
     * @private
     */
    _isRetryable(error, attempt, maxRetries) {
        // Don't retry if we've exhausted all attempts
        if (attempt >= maxRetries) {
            return false;
        }

        // Check for retryable HTTP status codes
        if (error.status) {
            return this.options.retryableStatusCodes.includes(error.status);
        }

        // Check for retryable error messages
        const retryableMessages = [
            'timeout',
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ERR_NETWORK'
        ];

        return retryableMessages.some(msg =>
            error.message?.includes(msg) ||
            error.code?.includes(msg)
        );
    }

    /**
     * Calculate delay for next retry with exponential backoff
     * @private
     */
    _calculateDelay(attemptNumber) {
        // Exponential backoff: initialDelay * (multiplier ^ attemptNumber)
        let delay = this.options.initialDelay *
            Math.pow(this.options.backoffMultiplier, attemptNumber - 1);

        // Cap at max delay
        delay = Math.min(delay, this.options.maxDelay);

        // Add jitter to prevent thundering herd
        if (this.options.jitter) {
            const jitterAmount = delay * 0.1; // 10% jitter
            delay += Math.random() * jitterAmount;
        }

        return Math.round(delay);
    }

    /**
     * Delay helper
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Circuit breaker pattern
     * Prevents cascading failures by failing fast
     */
    createCircuitBreaker(operation, options = {}) {
        const {
            failureThreshold = 5,  // Fail after N failures
            resetTimeout = 60000,  // Reset after 1 minute
            halfOpenAttempts = 1   // Number of attempts in half-open state
        } = options;

        let state = 'CLOSED';      // CLOSED, OPEN, HALF_OPEN
        let failureCount = 0;
        let lastFailureTime = null;
        let halfOpenAttemptCount = 0;

        return async (...args) => {
            // If circuit is OPEN, check if we should transition to HALF_OPEN
            if (state === 'OPEN') {
                if (Date.now() - lastFailureTime > resetTimeout) {
                    console.log('🔄 Circuit breaker: Transitioning to HALF_OPEN');
                    state = 'HALF_OPEN';
                    halfOpenAttemptCount = 0;
                } else {
                    throw new Error('Circuit breaker is OPEN - rejecting request');
                }
            }

            // Execute operation
            try {
                const result = await operation(...args);

                // If operation succeeds
                if (state === 'HALF_OPEN') {
                    console.log('✅ Circuit breaker: Transitioning to CLOSED');
                    state = 'CLOSED';
                    failureCount = 0;
                }

                return result;
            } catch (error) {
                // Operation failed
                failureCount++;
                lastFailureTime = Date.now();

                if (state === 'HALF_OPEN') {
                    console.log('❌ Circuit breaker: Transitioning to OPEN');
                    state = 'OPEN';
                } else if (failureCount >= failureThreshold) {
                    console.log('❌ Circuit breaker: Opening circuit');
                    state = 'OPEN';
                }

                throw error;
            }
        };
    }

    /**
     * Graceful degradation strategy
     * Falls back to reduced functionality on failure
     */
    async withFallback(primaryOperation, fallbackOperation, options = {}) {
        const {
            timeout = 5000,
            logError = true
        } = options;

        try {
            // Try primary operation
            return await Promise.race([
                primaryOperation(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(
                        new Error('Operation timeout')
                    ), timeout)
                )
            ]);
        } catch (error) {
            // Fall back to secondary operation
            if (logError) {
                console.warn('⚠️ Primary operation failed, using fallback:', error.message);
            }

            try {
                return await fallbackOperation();
            } catch (fallbackError) {
                console.error('❌ Both primary and fallback operations failed');
                throw new Error(`Primary: ${error.message}, Fallback: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Bulkhead pattern
     * Isolates resources to prevent resource exhaustion
     */
    createBulkhead(operation, options = {}) {
        const {
            concurrency = 5,
            queueSize = 100
        } = options;

        let activeCount = 0;
        const queue = [];

        const execute = async (...args) => {
            // Check queue size
            if (activeCount >= concurrency) {
                if (queue.length >= queueSize) {
                    throw new Error('Bulkhead queue is full');
                }

                // Wait in queue
                await new Promise(resolve => queue.push(resolve));
            }

            activeCount++;

            try {
                return await operation(...args);
            } finally {
                activeCount--;

                // Process next item in queue
                const resolve = queue.shift();
                if (resolve) {
                    resolve();
                }
            }
        };

        return execute;
    }

    /**
     * Get retry statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            avgRetriesPerSuccess: this.stats.successfulRetries > 0 ?
                (this.stats.totalRetriesUsed / this.stats.successfulRetries).toFixed(2) :
                0,
            successRate: this.stats.totalAttempts > 0 ?
                (((this.stats.totalAttempts - this.stats.failedRetries) /
                    this.stats.totalAttempts) * 100).toFixed(1) + '%' :
                '0%'
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

    /**
     * Subscribe to retry events
     * @param {Function} callback - Observer function
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
    _notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }
}

// Export for debugging
window.RetryManager = RetryManager;

console.log('✅ RetryManager loaded - Exponential backoff and circuit breaker enabled');
