/**
 * Task Monitor
 * WebSocket-based real-time task monitoring with reconnection logic
 *
 * @module TaskMonitor
 */

class TaskMonitor {
    /**
     * Create TaskMonitor instance
     * @param {string} wsUrl - WebSocket URL
     * @param {Object} options - Configuration
     */
    constructor(wsUrl, options = {}) {
        this.wsUrl = wsUrl;
        this.options = {
            autoReconnect: true,
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
            reconnectBackoff: 1.5,
            ...options
        };

        this.ws = null;
        this.tasks = new Map();           // taskId → task
        this.taskHistory = [];            // Completed tasks
        this.observers = [];
        this.reconnectAttempts = 0;
        this.reconnectDelay = this.options.reconnectDelay;
        this.connected = false;

        console.log('📡 TaskMonitor initialized');
    }

    /**
     * Connect to WebSocket
     * @returns {Promise<void>}
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔗 Connecting to ${this.wsUrl}...`);

                this.ws = new WebSocket(this.wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = this.options.reconnectDelay;
                    this.notifyObservers('connected', {});
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.notifyObservers('error', { error });
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    this.connected = false;
                    this.notifyObservers('disconnected', {});
                    this.attemptReconnect();
                };
            } catch (error) {
                console.error('Connection error:', error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            console.log('🔌 WebSocket disconnected');
        }
    }

    /**
     * Attempt reconnection with exponential backoff
     * @private
     */
    attemptReconnect() {
        if (!this.options.autoReconnect) return;

        this.reconnectAttempts++;
        this.reconnectDelay = Math.min(
            this.reconnectDelay * this.options.reconnectBackoff,
            this.options.maxReconnectDelay
        );

        console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})...`);

        setTimeout(() => {
            this.connect().catch(() => {
                // Retry silently
            });
        }, this.reconnectDelay);
    }

    /**
     * Handle incoming WebSocket message
     * @private
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'task_created':
                    this.handleTaskCreated(message.data);
                    break;
                case 'task_progress':
                    this.handleTaskProgress(message.data);
                    break;
                case 'task_log':
                    this.handleTaskLog(message.data);
                    break;
                case 'task_completed':
                    this.handleTaskCompleted(message.data);
                    break;
                case 'task_failed':
                    this.handleTaskFailed(message.data);
                    break;
                case 'task_paused':
                    this.handleTaskPaused(message.data);
                    break;
                case 'ping':
                    this.sendMessage({ type: 'pong' });
                    break;
                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    /**
     * Handle task created
     * @private
     */
    handleTaskCreated(data) {
        const task = {
            id: data.taskId,
            name: data.name,
            status: 'running',
            created: new Date(),
            started: new Date(),
            completed: null,
            progress: 0,
            processed: 0,
            total: data.total || 0,
            eta: null,
            logs: [],
            result: null
        };

        this.tasks.set(data.taskId, task);
        this.notifyObservers('task-created', task);
        console.log(`🚀 Task created: ${data.name}`);
    }

    /**
     * Handle task progress
     * @private
     */
    handleTaskProgress(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.progress = data.progress;
        task.processed = data.processed;
        task.total = data.total;
        task.eta = data.eta;

        this.notifyObservers('task-progress', { taskId: data.taskId, task });
    }

    /**
     * Handle task log
     * @private
     */
    handleTaskLog(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.logs.push({
            message: data.message,
            level: data.level || 'info',
            timestamp: new Date()
        });

        this.notifyObservers('task-log', { taskId: data.taskId, log: task.logs[task.logs.length - 1] });
    }

    /**
     * Handle task completed
     * @private
     */
    handleTaskCompleted(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'completed';
        task.completed = new Date();
        task.progress = 100;
        task.result = data.result;

        // Move to history
        this.taskHistory.push(task);
        this.tasks.delete(data.taskId);

        this.notifyObservers('task-completed', task);
        console.log(`✅ Task completed: ${task.name}`);
    }

    /**
     * Handle task failed
     * @private
     */
    handleTaskFailed(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'failed';
        task.completed = new Date();
        task.error = data.error;

        // Move to history
        this.taskHistory.push(task);
        this.tasks.delete(data.taskId);

        this.notifyObservers('task-failed', task);
        console.log(`❌ Task failed: ${task.name}`);
    }

    /**
     * Handle task paused
     * @private
     */
    handleTaskPaused(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'paused';
        this.notifyObservers('task-paused', task);
        console.log(`⏸️ Task paused: ${task.name}`);
    }

    /**
     * Send message to server
     * @private
     */
    sendMessage(message) {
        if (this.connected && this.ws) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    }

    /**
     * Pause task
     * @param {string} taskId - Task ID
     */
    pauseTask(taskId) {
        this.sendMessage({
            type: 'pause_task',
            taskId
        });
    }

    /**
     * Resume task
     * @param {string} taskId - Task ID
     */
    resumeTask(taskId) {
        this.sendMessage({
            type: 'resume_task',
            taskId
        });
    }

    /**
     * Cancel task
     * @param {string} taskId - Task ID
     */
    cancelTask(taskId) {
        this.sendMessage({
            type: 'cancel_task',
            taskId
        });
    }

    /**
     * Get active tasks
     * @returns {Array} Active task objects
     */
    getActiveTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {Object|null} Task or null
     */
    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    /**
     * Get task history
     * @param {number} limit - Max items (default: 100)
     * @returns {Array} Completed tasks
     */
    getHistory(limit = 100) {
        return this.taskHistory.slice(-limit);
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.taskHistory = [];
    }

    /**
     * Get tasks by status
     * @param {string} status - Status filter
     * @returns {Array} Matching tasks
     */
    getTasksByStatus(status) {
        return this.getActiveTasks().filter(t => t.status === status);
    }

    /**
     * Export history
     * @returns {string} JSON string
     */
    exportHistory() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            tasks: this.taskHistory
        }, null, 2);
    }

    /**
     * Subscribe to events
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
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            activeTasks: this.tasks.size,
            totalTasks: this.tasks.size + this.taskHistory.length,
            completedTasks: this.taskHistory.filter(t => t.status === 'completed').length,
            failedTasks: this.taskHistory.filter(t => t.status === 'failed').length,
            averageProgress: this.getActiveTasks().length > 0 ?
                Math.round(this.getActiveTasks().reduce((sum, t) => sum + t.progress, 0) / this.getActiveTasks().length) :
                0,
            connected: this.connected
        };
    }

    /**
     * Check connection status
     * @returns {boolean}
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get detailed task info
     * @param {string} taskId - Task ID
     * @returns {Object} Detailed task info
     */
    getTaskDetails(taskId) {
        const task = this.getTask(taskId);
        if (!task) return null;

        const duration = task.completed ?
            (task.completed - task.started) / 1000 :
            (new Date() - task.started) / 1000;

        const speed = task.processed > 0 ?
            (task.processed / duration).toFixed(2) :
            0;

        return {
            ...task,
            duration: duration.toFixed(2),
            speed: `${speed} items/s`,
            recentLogs: task.logs.slice(-10)
        };
    }
}
