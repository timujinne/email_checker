/**
 * Progress Tracker
 * Displays progress bars, ETA calculations, and real-time logs
 *
 * @module ProgressTracker
 */

class ProgressTracker {
    /**
     * Create ProgressTracker instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            maxLogs: 500,
            autoScroll: true,
            ...options
        };

        this.taskMonitor = null;
        this.tasks = new Map();
        this.logs = [];
        this.observers = [];

        console.log('📊 ProgressTracker initialized');
    }

    /**
     * Set task monitor
     * @param {TaskMonitor} taskMonitor - Task monitor instance
     */
    setTaskMonitor(taskMonitor) {
        this.taskMonitor = taskMonitor;

        // Subscribe to events
        taskMonitor.subscribe((event, data) => {
            switch (event) {
                case 'task-created':
                    this.handleTaskCreated(data);
                    break;
                case 'task-progress':
                    this.handleTaskProgress(data);
                    break;
                case 'task-log':
                    this.handleTaskLog(data);
                    break;
                case 'task-completed':
                    this.handleTaskCompleted(data);
                    break;
                case 'task-failed':
                    this.handleTaskFailed(data);
                    break;
                case 'task-paused':
                    this.handleTaskPaused(data);
                    break;
            }
        });
    }

    /**
     * Render tracker UI
     */
    render() {
        this.element.innerHTML = `
            <div class="progress-tracker">
                <div class="active-tasks" id="active-tasks">
                    <!-- Active task progress bars -->
                </div>
                <div class="logs-section">
                    <div class="logs-header">
                        <h3>Real-time Logs</h3>
                        <button id="clear-logs-btn" class="btn btn-sm btn-ghost">Clear</button>
                        <button id="pause-autoscroll-btn" class="btn btn-sm btn-ghost">Pause</button>
                    </div>
                    <div class="logs-container" id="logs-container">
                        <div class="logs-empty">No logs yet</div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /**
     * Handle task created
     * @private
     */
    handleTaskCreated(task) {
        this.tasks.set(task.id, task);
        this.updateProgressBars();
        this.addLog(task.id, `🚀 Task started: ${task.name}`, 'info');
        this.notifyObservers('task-created', task);
    }

    /**
     * Handle task progress
     * @private
     */
    handleTaskProgress(data) {
        const task = data.task;
        this.tasks.set(task.id, task);
        this.updateProgressBars();
    }

    /**
     * Handle task log
     * @private
     */
    handleTaskLog(data) {
        const log = data.log;
        this.addLog(data.taskId, log.message, log.level || 'info');
    }

    /**
     * Handle task completed
     * @private
     */
    handleTaskCompleted(task) {
        this.tasks.delete(task.id);
        this.updateProgressBars();
        this.addLog(task.id, `✅ Task completed in ${this.formatDuration(task.completed - task.started)}`, 'success');
        this.notifyObservers('task-completed', task);
    }

    /**
     * Handle task failed
     * @private
     */
    handleTaskFailed(task) {
        this.tasks.delete(task.id);
        this.updateProgressBars();
        this.addLog(task.id, `❌ Task failed: ${task.error}`, 'error');
        this.notifyObservers('task-failed', task);
    }

    /**
     * Handle task paused
     * @private
     */
    handleTaskPaused(task) {
        this.updateProgressBars();
        this.addLog(task.id, `⏸️ Task paused`, 'warning');
    }

    /**
     * Update progress bars
     * @private
     */
    updateProgressBars() {
        const container = document.getElementById('active-tasks');
        if (!container) return;

        const activeTasks = Array.from(this.tasks.values());

        if (activeTasks.length === 0) {
            container.innerHTML = '<div class="no-tasks">No active tasks</div>';
            return;
        }

        container.innerHTML = activeTasks.map(task => this.renderProgressBar(task)).join('');

        // Setup control buttons
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = btn.dataset.taskId;
                const action = btn.dataset.action;

                if (action === 'pause') {
                    this.taskMonitor.pauseTask(taskId);
                } else if (action === 'resume') {
                    this.taskMonitor.resumeTask(taskId);
                } else if (action === 'cancel') {
                    if (confirm('Cancel this task?')) {
                        this.taskMonitor.cancelTask(taskId);
                    }
                }
            });
        });
    }

    /**
     * Render single progress bar
     * @private
     */
    renderProgressBar(task) {
        const percentage = task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0;
        const timeElapsed = this.formatDuration(new Date() - task.started);
        const speed = task.processed > 0 ?
            ((task.processed / ((new Date() - task.started) / 1000)).toFixed(2)) :
            0;

        return `
            <div class="progress-item">
                <div class="progress-header">
                    <div class="progress-title">
                        <span class="task-name">${task.name}</span>
                        <span class="task-status ${task.status}">${task.status}</span>
                    </div>
                    <div class="progress-info">
                        <span class="progress-percentage">${percentage}%</span>
                        <span class="progress-stats">
                            ${task.processed}/${task.total} items
                            • ${speed} items/s
                            • Elapsed: ${timeElapsed}
                            ${task.eta ? `• ETA: ${task.eta}` : ''}
                        </span>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%">
                        <span class="progress-label">${percentage}%</span>
                    </div>
                </div>
                <div class="progress-controls">
                    ${task.status === 'running' ? `
                        <button class="btn btn-sm btn-secondary" data-task-id="${task.id}" data-action="pause">⏸️ Pause</button>
                        <button class="btn btn-sm btn-danger-outline" data-task-id="${task.id}" data-action="cancel">⛔ Cancel</button>
                    ` : task.status === 'paused' ? `
                        <button class="btn btn-sm btn-primary" data-task-id="${task.id}" data-action="resume">▶️ Resume</button>
                        <button class="btn btn-sm btn-danger-outline" data-task-id="${task.id}" data-action="cancel">⛔ Cancel</button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Add log entry
     * @private
     */
    addLog(taskId, message, level = 'info') {
        const logEntry = {
            taskId,
            message,
            level,
            timestamp: new Date()
        };

        this.logs.push(logEntry);

        // Keep size limited
        if (this.logs.length > this.options.maxLogs) {
            this.logs.shift();
        }

        this.updateLogs();
    }

    /**
     * Update logs display
     * @private
     */
    updateLogs() {
        const container = document.getElementById('logs-container');
        if (!container) return;

        container.innerHTML = this.logs.length === 0 ?
            '<div class="logs-empty">No logs yet</div>' :
            `<div class="logs-list">
                ${this.logs.map((log, idx) => `
                    <div class="log-entry log-${log.level}" data-timestamp="${log.timestamp.getTime()}">
                        <span class="log-time">${log.timestamp.toLocaleTimeString()}</span>
                        <span class="log-task">[${log.taskId.substring(0, 8)}]</span>
                        <span class="log-message">${this.escapeHtml(log.message)}</span>
                    </div>
                `).join('')}
            </div>`;

        // Auto-scroll
        if (this.options.autoScroll) {
            container.scrollTop = container.scrollHeight;
        }
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        const clearBtn = document.getElementById('clear-logs-btn');
        const pauseBtn = document.getElementById('pause-autoscroll-btn');

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.logs = [];
                this.updateLogs();
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.options.autoScroll = !this.options.autoScroll;
                pauseBtn.textContent = this.options.autoScroll ? 'Pause' : 'Resume';
            });
        }
    }

    /**
     * Format duration (ms to HH:MM:SS)
     * @private
     */
    formatDuration(ms) {
        if (ms < 0) ms = 0;
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const h = hours % 24;
        const m = minutes % 60;
        const s = seconds % 60;

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * Escape HTML
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Search logs
     * @param {string} query - Search query
     * @returns {Array} Matching logs
     */
    searchLogs(query) {
        const lowerQuery = query.toLowerCase();
        return this.logs.filter(log =>
            log.message.toLowerCase().includes(lowerQuery) ||
            log.taskId.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Export logs
     * @returns {string} CSV format
     */
    exportLogs() {
        let csv = 'Timestamp,TaskID,Level,Message\n';
        this.logs.forEach(log => {
            const timestamp = log.timestamp.toISOString();
            const message = log.message.replace(/"/g, '""');
            csv += `${timestamp},${log.taskId},${log.level},"${message}"\n`;
        });
        return csv;
    }

    /**
     * Get task statistics
     * @returns {Object}
     */
    getStats() {
        if (!this.taskMonitor) return null;

        const stats = this.taskMonitor.getStats();
        const activeTasks = this.taskMonitor.getActiveTasks();

        return {
            ...stats,
            averageETA: activeTasks.length > 0 ?
                activeTasks
                    .filter(t => t.eta)
                    .reduce((sum, t) => sum + (t.eta ? this.parseETA(t.eta) : 0), 0) / activeTasks.length :
                0
        };
    }

    /**
     * Parse ETA string to seconds
     * @private
     */
    parseETA(etaStr) {
        // Parse HH:MM:SS format
        const parts = etaStr.split(':');
        if (parts.length !== 3) return 0;

        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);

        return hours * 3600 + minutes * 60 + seconds;
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
}
