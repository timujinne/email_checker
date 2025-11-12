/**
 * Logging Service
 * Comprehensive error and event logging with multiple transports
 * Supports console, localStorage, and remote server logging
 *
 * @module LoggingService
 */

class LoggingService {
    /**
     * Initialize logging service
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            level: 'debug',  // debug, info, warn, error
            maxLogSize: 10 * 1024 * 1024, // 10MB in localStorage
            maxLocalLogs: 1000,
            remoteEndpoint: null,
            batchSize: 50,
            batchInterval: 30000, // 30 seconds
            enableConsole: true,
            enableLocalStorage: true,
            enableRemote: false,
            ...options
        };

        // Log levels
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        this.currentLevel = this.levels[this.options.level] || 0;

        // Storage
        this.logs = [];
        this.remoteQueue = [];

        // Batching
        this.batchTimeout = null;

        // Statistics
        this.stats = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            remoteErrors: 0
        };

        this.loadLogsFromStorage();
        this.startBatching();

        console.log('✅ LoggingService initialized');
    }

    /**
     * Log debug message
     */
    debug(message, data = null) {
        this._log('debug', message, data);
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        this._log('info', message, data);
    }

    /**
     * Log warning message
     */
    warn(message, data = null) {
        this._log('warn', message, data);
    }

    /**
     * Log error message
     */
    error(message, error = null) {
        const data = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : null;
        this._log('error', message, data);
    }

    /**
     * Internal log function
     * @private
     */
    _log(level, message, data) {
        // Check log level
        if (this.levels[level] < this.currentLevel) {
            return;
        }

        // Create log entry
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log to console
        if (this.options.enableConsole) {
            this._logToConsole(entry);
        }

        // Store locally
        if (this.options.enableLocalStorage) {
            this._addLog(entry);
        }

        // Queue for remote
        if (this.options.enableRemote && this.options.remoteEndpoint) {
            this.remoteQueue.push(entry);
        }

        // Update statistics
        this.stats[level]++;
    }

    /**
     * Log to console
     * @private
     */
    _logToConsole(entry) {
        const { level, message, data } = entry;
        const prefix = this._getLevelPrefix(level);
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();

        if (data) {
            console[level](`${prefix} [${timestamp}] ${message}`, data);
        } else {
            console[level](`${prefix} [${timestamp}] ${message}`);
        }
    }

    /**
     * Get level prefix emoji
     * @private
     */
    _getLevelPrefix(level) {
        const prefixes = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };
        return prefixes[level] || '📝';
    }

    /**
     * Add log to internal storage
     * @private
     */
    _addLog(entry) {
        this.logs.push(entry);

        // Keep only recent logs
        if (this.logs.length > this.options.maxLocalLogs) {
            this.logs.shift();
        }

        // Save to localStorage
        this._saveLogsToStorage();
    }

    /**
     * Save logs to localStorage
     * @private
     */
    _saveLogsToStorage() {
        try {
            const data = JSON.stringify(this.logs);
            if (data.length < this.options.maxLogSize) {
                localStorage.setItem('app_logs', data);
            } else {
                // Truncate old logs if storage is full
                const recentLogs = this.logs.slice(-500);
                localStorage.setItem('app_logs', JSON.stringify(recentLogs));
            }
        } catch (error) {
            console.warn('⚠️ Failed to save logs to localStorage:', error.message);
        }
    }

    /**
     * Load logs from localStorage
     */
    loadLogsFromStorage() {
        try {
            const stored = localStorage.getItem('app_logs');
            if (stored) {
                this.logs = JSON.parse(stored);
                console.log(`✅ Loaded ${this.logs.length} logs from storage`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load logs from localStorage:', error.message);
        }
    }

    /**
     * Start batching remote logs
     * @private
     */
    startBatching() {
        this.batchTimeout = setInterval(() => {
            this._flushRemoteLogs();
        }, this.options.batchInterval);
    }

    /**
     * Flush remote logs
     * @private
     */
    async _flushRemoteLogs() {
        if (this.remoteQueue.length === 0) {
            return;
        }

        const batch = this.remoteQueue.splice(0, this.options.batchSize);

        try {
            await fetch(this.options.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    logs: batch,
                    session: this._getSessionId()
                })
            });

            console.log(`📤 Sent ${batch.length} logs to remote server`);
        } catch (error) {
            console.error('❌ Failed to send logs to remote server:', error.message);
            this.stats.remoteErrors++;

            // Re-queue logs if send failed
            this.remoteQueue.unshift(...batch);
        }
    }

    /**
     * Get session ID (persisted in sessionStorage)
     * @private
     */
    _getSessionId() {
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Get all logs
     * @param {Object} filter - Filter options { level, search, startTime, endTime }
     * @returns {Array}
     */
    getLogs(filter = {}) {
        let logs = [...this.logs];

        // Filter by level
        if (filter.level) {
            logs = logs.filter(log => log.level === filter.level);
        }

        // Filter by search term
        if (filter.search) {
            const search = filter.search.toLowerCase();
            logs = logs.filter(log =>
                log.message.toLowerCase().includes(search) ||
                (log.data && JSON.stringify(log.data).toLowerCase().includes(search))
            );
        }

        // Filter by time range
        if (filter.startTime) {
            const start = new Date(filter.startTime).getTime();
            logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
        }

        if (filter.endTime) {
            const end = new Date(filter.endTime).getTime();
            logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
        }

        return logs;
    }

    /**
     * Export logs as JSON
     * @returns {string}
     */
    exportAsJSON() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Export logs as CSV
     * @returns {string}
     */
    exportAsCSV() {
        if (this.logs.length === 0) return '';

        // Header
        const headers = ['Timestamp', 'Level', 'Message', 'Data', 'URL'];
        const rows = [headers.join(',')];

        // Data rows
        this.logs.forEach(log => {
            const row = [
                log.timestamp,
                log.level,
                `"${log.message}"`,
                `"${log.data ? JSON.stringify(log.data).replace(/"/g, '""') : ''}"`,
                `"${log.url}"`
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('app_logs');
        console.log('🧹 Logs cleared');
    }

    /**
     * Download logs
     * @param {string} format - 'json' or 'csv'
     */
    downloadLogs(format = 'json') {
        const content = format === 'csv' ?
            this.exportAsCSV() :
            this.exportAsJSON();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs_${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`📥 Logs downloaded as ${format}`);
    }

    /**
     * Get logging statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            totalLogs: this.logs.length,
            localStorageSize: JSON.stringify(this.logs).length,
            remoteQueueSize: this.remoteQueue.length
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
     * Display recent logs
     * @param {number} count - Number of logs to show
     */
    displayRecentLogs(count = 10) {
        const recentLogs = this.logs.slice(-count);
        console.table(recentLogs);
        return recentLogs;
    }

    /**
     * Stop batching
     */
    stop() {
        if (this.batchTimeout) {
            clearInterval(this.batchTimeout);
        }

        // Send remaining logs
        this._flushRemoteLogs();
        console.log('✅ LoggingService stopped');
    }
}

// Export for debugging
window.LoggingService = LoggingService;

console.log('✅ LoggingService loaded - Comprehensive error logging enabled');
