/**
 * Processing Queue
 * Main orchestrator for processing queue management and monitoring
 * Integrates: TaskMonitor, ProgressTracker
 *
 * @module ProcessingQueue
 */

class ProcessingQueue {
    /**
     * Create ProcessingQueue instance
     * @param {string} elementId - Container element ID
     * @param {string} wsUrl - WebSocket URL
     * @param {Object} options - Configuration
     */
    constructor(elementId, wsUrl, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            enableHistory: true,
            historyPageSize: 20,
            ...options
        };

        this.taskMonitor = new TaskMonitor(wsUrl);
        this.progressTracker = null;
        this.observers = [];
        this.currentPage = 1;
        this.historyFilter = 'all';  // all, completed, failed

        console.log('🔄 ProcessingQueue initialized');
        this.init();
    }

    /**
     * Initialize processing queue
     */
    async init() {
        this.renderUI();
        this.progressTracker = new ProgressTracker('progress-tracker-container');
        this.progressTracker.setTaskMonitor(this.taskMonitor);
        this.progressTracker.render();

        try {
            await this.taskMonitor.connect();
            this.updateConnectionStatus(true);
        } catch (error) {
            console.error('Failed to connect:', error);
            this.updateConnectionStatus(false);
        }

        this.setupEventListeners();
        this.loadHistory();

        console.log('✅ ProcessingQueue ready');
    }

    /**
     * Render main UI
     */
    renderUI() {
        this.element.innerHTML = `
            <div class="processing-queue">
                <!-- Header -->
                <div class="queue-header">
                    <h1>🔄 Processing Queue</h1>
                    <div class="queue-status">
                        <span id="connection-status" class="status-badge disconnected">
                            🔴 Disconnected
                        </span>
                        <span id="tasks-count" class="tasks-badge">0 active • 0 completed</span>
                    </div>
                </div>

                <!-- Progress Tracker -->
                <div id="progress-tracker-container" class="progress-tracker-wrapper"></div>

                <!-- Statistics -->
                <div class="queue-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="stat-active">0</div>
                        <div class="stat-label">Active Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-completed">0</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-failed">0</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-progress">-</div>
                        <div class="stat-label">Avg Progress</div>
                    </div>
                </div>

                <!-- History Section -->
                <div class="queue-history">
                    <div class="history-header">
                        <h2>Task History</h2>
                        <div class="history-controls">
                            <select id="history-filter" class="filter-select">
                                <option value="all">All Tasks</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                            <button id="export-history" class="btn btn-sm btn-secondary">📥 Export</button>
                            <button id="clear-history" class="btn btn-sm btn-ghost">Clear</button>
                        </div>
                    </div>

                    <div class="history-table">
                        <table id="history-table">
                            <thead>
                                <tr>
                                    <th>Task Name</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Completed</th>
                                    <th>Duration</th>
                                    <th>Processed</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="history-tbody"></tbody>
                        </table>
                    </div>

                    <div class="history-pagination" id="history-pagination">
                        <!-- Pagination buttons rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // History filter
        document.getElementById('history-filter').addEventListener('change', (e) => {
            this.historyFilter = e.target.value;
            this.currentPage = 1;
            this.loadHistory();
        });

        // History actions
        document.getElementById('export-history').addEventListener('click', () => {
            this.exportHistory();
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            if (confirm('Clear all task history?')) {
                this.taskMonitor.clearHistory();
                this.loadHistory();
            }
        });

        // Connection status updates
        this.taskMonitor.subscribe((event, data) => {
            if (event === 'connected') {
                this.updateConnectionStatus(true);
            } else if (event === 'disconnected') {
                this.updateConnectionStatus(false);
            }
            this.updateStatistics();
        });

        // Progress tracker events
        this.progressTracker.subscribe((event, data) => {
            this.updateStatistics();
        });

        // Periodic stats update
        setInterval(() => {
            this.updateStatistics();
        }, 1000);
    }

    /**
     * Update connection status display
     * @private
     */
    updateConnectionStatus(connected) {
        const badge = document.getElementById('connection-status');
        if (connected) {
            badge.className = 'status-badge connected';
            badge.textContent = '🟢 Connected';
        } else {
            badge.className = 'status-badge disconnected';
            badge.textContent = '🔴 Disconnected';
        }
    }

    /**
     * Update statistics display
     * @private
     */
    updateStatistics() {
        const stats = this.taskMonitor.getStats();

        document.getElementById('stat-active').textContent = stats.activeTasks;
        document.getElementById('stat-completed').textContent = stats.completedTasks;
        document.getElementById('stat-failed').textContent = stats.failedTasks;
        document.getElementById('stat-progress').textContent = `${stats.averageProgress}%`;

        document.getElementById('tasks-count').textContent =
            `${stats.activeTasks} active • ${stats.completedTasks} completed`;
    }

    /**
     * Load task history
     * @private
     */
    loadHistory() {
        const allHistory = this.taskMonitor.getHistory(1000);

        // Filter by status
        let filtered = allHistory;
        if (this.historyFilter === 'completed') {
            filtered = allHistory.filter(t => t.status === 'completed');
        } else if (this.historyFilter === 'failed') {
            filtered = allHistory.filter(t => t.status === 'failed');
        }

        // Pagination
        const pageSize = this.options.historyPageSize;
        const totalPages = Math.ceil(filtered.length / pageSize);
        const startIdx = (this.currentPage - 1) * pageSize;
        const pageItems = filtered.slice(startIdx, startIdx + pageSize);

        // Render table
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = pageItems.length === 0 ?
            '<tr><td colspan="7" class="text-center">No tasks found</td></tr>' :
            pageItems.map(task => `
                <tr class="history-row history-${task.status}">
                    <td class="task-name">${task.name}</td>
                    <td>
                        <span class="badge ${task.status === 'completed' ? 'badge-success' : 'badge-error'}">
                            ${task.status.toUpperCase()}
                        </span>
                    </td>
                    <td>${task.created?.toLocaleString() || '-'}</td>
                    <td>${task.completed?.toLocaleString() || '-'}</td>
                    <td>${this.formatDuration(task.completed - task.created)}</td>
                    <td>${task.processed || 0}/${task.total || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-ghost view-details" data-task-id="${task.id}" title="View Details">View</button>
                    </td>
                </tr>
            `).join('');

        // Setup view details buttons
        tbody.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                this.showTaskDetails(taskId);
            });
        });

        // Render pagination
        this.renderPagination(totalPages);
    }

    /**
     * Render pagination controls
     * @private
     */
    renderPagination(totalPages) {
        const paginationEl = document.getElementById('history-pagination');

        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = `
            <button class="btn btn-sm ${this.currentPage === 1 ? 'disabled' : ''}"
                onclick="this.parentElement.parentElement.querySelector('.processing-queue').processingQueue?.goToPage(1)">
                First
            </button>
            <button class="btn btn-sm ${this.currentPage === 1 ? 'disabled' : ''}"
                onclick="this.parentElement.parentElement.querySelector('.processing-queue').processingQueue?.goToPage(${this.currentPage - 1})">
                Previous
            </button>

            <span class="pagination-info">Page ${this.currentPage} of ${totalPages}</span>

            <button class="btn btn-sm ${this.currentPage === totalPages ? 'disabled' : ''}"
                onclick="this.parentElement.parentElement.querySelector('.processing-queue').processingQueue?.goToPage(${this.currentPage + 1})">
                Next
            </button>
            <button class="btn btn-sm ${this.currentPage === totalPages ? 'disabled' : ''}"
                onclick="this.parentElement.parentElement.querySelector('.processing-queue').processingQueue?.goToPage(${totalPages})">
                Last
            </button>
        `;

        paginationEl.innerHTML = html;
    }

    /**
     * Go to page
     * @param {number} page - Page number
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadHistory();
    }

    /**
     * Show task details
     * @private
     */
    showTaskDetails(taskId) {
        const task = this.taskMonitor.getTask(taskId);
        const details = this.taskMonitor.getTaskDetails(taskId);

        if (!details) {
            alert('Task not found');
            return;
        }

        const detailsHtml = `
            <div class="task-details-modal">
                <div class="modal-content">
                    <h2>${details.name}</h2>
                    <div class="details-section">
                        <h3>Summary</h3>
                        <table class="details-table">
                            <tr><td>Status:</td><td>${details.status.toUpperCase()}</td></tr>
                            <tr><td>Created:</td><td>${details.created?.toLocaleString() || '-'}</td></tr>
                            <tr><td>Completed:</td><td>${details.completed?.toLocaleString() || '-'}</td></tr>
                            <tr><td>Duration:</td><td>${details.duration}s</td></tr>
                            <tr><td>Processed:</td><td>${details.processed}/${details.total} items</td></tr>
                            <tr><td>Speed:</td><td>${details.speed}</td></tr>
                        </table>
                    </div>

                    ${details.recentLogs.length > 0 ? `
                        <div class="details-section">
                            <h3>Recent Logs</h3>
                            <div class="logs-list">
                                ${details.recentLogs.map(log => `
                                    <div class="log-entry log-${log.level}">
                                        <span class="log-time">${log.timestamp?.toLocaleTimeString() || ''}</span>
                                        <span class="log-message">${log.message}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${details.error ? `
                        <div class="details-section error">
                            <h3>Error</h3>
                            <pre>${details.error}</pre>
                        </div>
                    ` : ''}

                    ${details.result ? `
                        <div class="details-section">
                            <h3>Result</h3>
                            <pre>${JSON.stringify(details.result, null, 2)}</pre>
                        </div>
                    ` : ''}

                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = detailsHtml;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Export history
     * @private
     */
    exportHistory() {
        const csv = this.progressTracker.exportLogs();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `task-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Format duration (ms to HH:MM:SS)
     * @private
     */
    formatDuration(ms) {
        if (!ms || ms < 0) return '-';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const h = hours % 24;
        const m = minutes % 60;
        const s = seconds % 60;

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            connected: this.taskMonitor.isConnected(),
            activeTasks: this.taskMonitor.getActiveTasks(),
            stats: this.taskMonitor.getStats()
        };
    }

    /**
     * Subscribe to events
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
     * Disconnect
     */
    disconnect() {
        this.taskMonitor.disconnect();
    }
}
