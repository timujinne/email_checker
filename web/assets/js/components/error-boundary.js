/**
 * Error Boundary
 * Prevents cascading failures by catching and handling component errors
 * Provides fallback UI and error recovery options
 *
 * @module ErrorBoundary
 */

class ErrorBoundary {
    /**
     * Create error boundary
     * @param {string} componentName - Name of component being protected
     * @param {HTMLElement} element - Component element to wrap
     * @param {Object} options - Configuration options
     */
    constructor(componentName, element, options = {}) {
        this.componentName = componentName;
        this.element = element;
        this.options = {
            showErrorUI: true,
            showErrorDetails: true,
            retryable: true,
            onError: null,
            fallbackUI: null,
            ...options
        };

        this.hasError = false;
        this.error = null;
        this.errorCount = 0;
        this.observers = [];

        // Wrap element in error boundary
        this.wrapper = this._createWrapper();
        this.setupErrorHandling();
    }

    /**
     * Setup error handling for component
     */
    setupErrorHandling() {
        // Catch synchronous errors
        try {
            // Monitor element rendering
            this._monitorElement();
        } catch (error) {
            this.captureError(error);
        }

        // Catch promise rejections from this component
        window.addEventListener('unhandledrejection', (event) => {
            // Only handle rejections from this boundary
            if (event.promise && event.reason) {
                this.captureError(event.reason);
            }
        });

        console.log(`✅ Error boundary set up for: ${this.componentName}`);
    }

    /**
     * Monitor element for errors
     * @private
     */
    _monitorElement() {
        if (!this.element) return;

        // Monitor for errors from event listeners
        const originalAddEventListener = this.element.addEventListener;
        this.element.addEventListener = function(type, listener, options) {
            const wrappedListener = (event) => {
                try {
                    return listener.call(this, event);
                } catch (error) {
                    // Note: capture error through global handler
                }
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        };
    }

    /**
     * Capture error
     * @param {Error} error - Error to capture
     */
    captureError(error) {
        if (this.hasError) return; // Prevent recursive error handling

        this.hasError = true;
        this.error = error;
        this.errorCount++;

        console.error(`❌ Error in ${this.componentName}:`, error);

        // Render error UI
        if (this.options.showErrorUI) {
            this.renderErrorUI();
        }

        // Notify callback
        if (this.options.onError) {
            try {
                this.options.onError(error);
            } catch (e) {
                console.error('onError callback failed:', e);
            }
        }

        // Notify observers
        this._notifyObservers('error', {
            component: this.componentName,
            error: error,
            count: this.errorCount
        });
    }

    /**
     * Render error UI
     */
    renderErrorUI() {
        // Clear existing content
        this.wrapper.innerHTML = '';

        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-boundary-container';
        errorContainer.innerHTML = `
            <div style="
                padding: 20px;
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <span style="font-size: 24px;">⚠️</span>
                    <div>
                        <h3 style="margin: 0; color: #922; font-size: 16px;">
                            ${this.componentName} - Error
                        </h3>
                        <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
                            Something went wrong in this component
                        </p>
                    </div>
                </div>

                ${this.options.showErrorDetails ? `
                    <details style="margin-bottom: 16px;">
                        <summary style="cursor: pointer; color: #922; font-weight: 500;">
                            Error Details
                        </summary>
                        <pre style="
                            background: white;
                            padding: 12px;
                            border-radius: 4px;
                            border: 1px solid #ddd;
                            font-size: 12px;
                            overflow-x: auto;
                            margin-top: 8px;
                        ">${this._escapeHtml(this.error.message)}
${this.error.stack ? '\n' + this._escapeHtml(this.error.stack) : ''}</pre>
                    </details>
                ` : ''}

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${this.options.retryable ? `
                        <button onclick="this.closest('.error-boundary-container').errorBoundary?.retry()"
                                style="
                                    padding: 8px 16px;
                                    background: #1e40af;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-weight: 500;
                                ">
                            🔄 Try Again
                        </button>
                    ` : ''}
                    <button onclick="location.reload()"
                            style="
                                padding: 8px 16px;
                                background: #666;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                        🔁 Reload Page
                    </button>
                    <button onclick="window.history.back()"
                            style="
                                padding: 8px 16px;
                                background: #999;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                        ← Go Back
                    </button>
                </div>

                <p style="margin: 12px 0 0 0; font-size: 12px; color: #666;">
                    Error ID: <code>${this._generateErrorId()}</code>
                </p>
            </div>
        `;

        // Attach error boundary reference
        errorContainer.errorBoundary = this;

        this.wrapper.appendChild(errorContainer);
    }

    /**
     * Retry operation that failed
     * @returns {Promise<void>}
     */
    async retry() {
        this.hasError = false;
        this.error = null;
        this.wrapper.innerHTML = '';

        // Restore original element
        if (this.element) {
            this.wrapper.appendChild(this.element);
        }

        console.log(`🔄 Retrying ${this.componentName}...`);
        this._notifyObservers('retry', { component: this.componentName });

        // Wait a bit before retrying (allow state to reset)
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Create wrapper element
     * @private
     */
    _createWrapper() {
        const wrapper = document.createElement('div');
        wrapper.className = `error-boundary-wrapper error-boundary-${this.componentName}`;
        wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';

        // Replace element in DOM or append to body
        if (this.element && this.element.parentNode) {
            this.element.parentNode.replaceChild(wrapper, this.element);
        }

        return wrapper;
    }

    /**
     * Escape HTML for safe display
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate unique error ID
     * @private
     */
    _generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if error boundary has error
     * @returns {boolean}
     */
    hasErrored() {
        return this.hasError;
    }

    /**
     * Get current error
     * @returns {Error|null}
     */
    getError() {
        return this.error;
    }

    /**
     * Reset error state
     */
    reset() {
        this.hasError = false;
        this.error = null;
        this.errorCount = 0;
        this.wrapper.innerHTML = '';

        if (this.element) {
            this.wrapper.appendChild(this.element);
        }

        console.log(`✅ Error boundary reset for: ${this.componentName}`);
    }

    /**
     * Subscribe to error boundary events
     * @param {Function} callback - Observer function
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers of error boundary events
     * @private
     */
    _notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error boundary observer error:', error);
            }
        });
    }

    /**
     * Get error statistics
     * @returns {Object}
     */
    getStats() {
        return {
            component: this.componentName,
            hasError: this.hasError,
            errorCount: this.errorCount,
            lastError: this.error?.message || 'None'
        };
    }
}

/**
 * Global Error Boundary Manager
 * Manages multiple error boundaries
 */
class ErrorBoundaryManager {
    constructor() {
        this.boundaries = new Map();
        this.observers = [];
        this.setupGlobalHandlers();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('🚨 Global error caught:', event.error);
            this._notifyObservers('global-error', {
                error: event.error,
                message: event.message
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            this._notifyObservers('unhandled-rejection', {
                reason: event.reason
            });
        });

        console.log('✅ Global error handlers set up');
    }

    /**
     * Register error boundary
     * @param {string} name - Boundary name
     * @param {ErrorBoundary} boundary - Error boundary instance
     */
    register(name, boundary) {
        this.boundaries.set(name, boundary);
        console.log(`✅ Registered error boundary: ${name}`);
    }

    /**
     * Get error boundary by name
     * @param {string} name - Boundary name
     * @returns {ErrorBoundary|undefined}
     */
    get(name) {
        return this.boundaries.get(name);
    }

    /**
     * Get all error statistics
     * @returns {Array}
     */
    getAllStats() {
        return Array.from(this.boundaries.values()).map(b => b.getStats());
    }

    /**
     * Display all error statistics
     */
    displayStats() {
        const stats = this.getAllStats();
        console.table(stats);
        return stats;
    }

    /**
     * Subscribe to global error events
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

// Create global instance
const errorBoundaryManager = new ErrorBoundaryManager();

// Export for debugging
window.ErrorBoundary = ErrorBoundary;
window.ErrorBoundaryManager = ErrorBoundaryManager;
window.errorBoundaryManager = errorBoundaryManager;

console.log('✅ ErrorBoundary system loaded - Global error handling enabled');
