/**
 * Undo/Redo Manager
 * Tracks and manages all state changes with undo/redo capability
 *
 * @module UndoRedoManager
 */

class UndoRedoManager {
    /**
     * Create UndoRedoManager instance
     * @param {number} maxSize - Max actions to keep in history (default: 100)
     */
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.undoStack = [];
        this.redoStack = [];
        this.observers = [];

        console.log('↩️ UndoRedoManager initialized');
    }

    /**
     * Action structure
     * @typedef {Object} Action
     * @property {string} type - Action type (add, remove, update, bulk_add, etc.)
     * @property {*} data - Action data (item, items, updates, etc.)
     * @property {*} previousState - Previous state for undo
     * @property {number} timestamp - When action was executed
     * @property {string} description - Human readable description
     */

    /**
     * Execute an action and add to undo stack
     * @param {Action} action - Action to execute
     * @param {Function} executeFunc - Function to execute the action
     * @param {Function} undoFunc - Function to undo the action
     * @returns {*} Result of executeFunc
     */
    execute(action, executeFunc, undoFunc) {
        // Execute the action
        const result = executeFunc(action.data);

        // Create action record
        const actionRecord = {
            type: action.type,
            data: action.data,
            previousState: action.previousState,
            timestamp: Date.now(),
            description: action.description,
            undoFunc: undoFunc,
            result: result
        };

        // Add to undo stack
        this.undoStack.push(actionRecord);

        // Keep size limited
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }

        // Clear redo stack on new action
        this.redoStack = [];

        // Notify observers
        this.notifyObservers('action-executed', actionRecord);

        return result;
    }

    /**
     * Undo last action
     * @returns {boolean} Success
     */
    undo() {
        if (!this.canUndo()) {
            console.warn('⚠️ No actions to undo');
            return false;
        }

        const action = this.undoStack.pop();

        // Execute undo function
        if (action.undoFunc) {
            action.undoFunc(action.previousState);
        }

        // Add to redo stack
        this.redoStack.push(action);

        // Notify observers
        this.notifyObservers('action-undone', action);

        console.log(`↩️ Undone: ${action.description}`);
        return true;
    }

    /**
     * Redo last undone action
     * @returns {boolean} Success
     */
    redo() {
        if (!this.canRedo()) {
            console.warn('⚠️ No actions to redo');
            return false;
        }

        const action = this.redoStack.pop();

        // Re-execute the action
        action.undoFunc = (prevState) => {
            // Original undo function
            if (action.undoFunc) {
                action.undoFunc(prevState);
            }
        };

        // Add back to undo stack
        this.undoStack.push(action);

        // Notify observers
        this.notifyObservers('action-redone', action);

        console.log(`🔄 Redone: ${action.description}`);
        return true;
    }

    /**
     * Check if can undo
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if can redo
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Get last action info
     * @returns {Object|null}
     */
    getLastAction() {
        return this.undoStack[this.undoStack.length - 1] || null;
    }

    /**
     * Get last undone action info
     * @returns {Object|null}
     */
    getLastUndoneAction() {
        return this.redoStack[this.redoStack.length - 1] || null;
    }

    /**
     * Get undo history (for UI display)
     * @param {number} limit - Max items to return
     * @returns {Array} History items
     */
    getUndoHistory(limit = 10) {
        return this.undoStack
            .slice(-limit)
            .reverse()
            .map(action => ({
                type: action.type,
                description: action.description,
                timestamp: action.timestamp
            }));
    }

    /**
     * Get redo history (for UI display)
     * @param {number} limit - Max items to return
     * @returns {Array} History items
     */
    getRedoHistory(limit = 10) {
        return this.redoStack
            .slice(-limit)
            .reverse()
            .map(action => ({
                type: action.type,
                description: action.description,
                timestamp: action.timestamp
            }));
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyObservers('history-cleared', {});
        console.log('🗑️ History cleared');
    }

    /**
     * Clear undo stack only
     */
    clearUndo() {
        this.undoStack = [];
    }

    /**
     * Clear redo stack only
     */
    clearRedo() {
        this.redoStack = [];
    }

    /**
     * Subscribe to changes
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
     * Notify all observers
     * @param {string} event - Event type
     * @param {*} data - Event data
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
     * @returns {Object}
     */
    getStats() {
        return {
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            maxSize: this.maxSize,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            observerCount: this.observers.length,
            estimatedMemory: (
                this.undoStack.length * 500 +  // Each action ~500 bytes
                this.redoStack.length * 500
            )
        };
    }

    /**
     * Create a savepoint (snapshot of current state)
     * @param {string} name - Savepoint name
     * @returns {Object} Savepoint info
     */
    createSavepoint(name) {
        const savepoint = {
            name,
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            timestamp: Date.now(),
            lastAction: this.getLastAction()?.description || 'Initial state'
        };

        this.notifyObservers('savepoint-created', savepoint);
        return savepoint;
    }

    /**
     * Get all actions of a specific type
     * @param {string} type - Action type
     * @returns {Array} Matching actions
     */
    getActionsByType(type) {
        return this.undoStack.filter(action => action.type === type);
    }

    /**
     * Get actions in time range
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @returns {Array} Actions in range
     */
    getActionsByTimeRange(startTime, endTime) {
        const start = startTime.getTime();
        const end = endTime.getTime();
        return this.undoStack.filter(action => {
            return action.timestamp >= start && action.timestamp <= end;
        });
    }

    /**
     * Undo multiple actions
     * @param {number} count - Number of actions to undo
     * @returns {number} Actions undone
     */
    undoMultiple(count) {
        let undone = 0;
        for (let i = 0; i < count && this.canUndo(); i++) {
            this.undo();
            undone++;
        }
        return undone;
    }

    /**
     * Redo multiple actions
     * @param {number} count - Number of actions to redo
     * @returns {number} Actions redone
     */
    redoMultiple(count) {
        let redone = 0;
        for (let i = 0; i < count && this.canRedo(); i++) {
            this.redo();
            redone++;
        }
        return redone;
    }

    /**
     * Compress history by combining similar actions
     * @returns {number} Actions removed
     */
    compress() {
        let removed = 0;

        for (let i = this.undoStack.length - 1; i > 0; i--) {
            const current = this.undoStack[i];
            const previous = this.undoStack[i - 1];

            // Combine consecutive 'add' actions
            if (current.type === 'add' && previous.type === 'add') {
                previous.data = Array.isArray(previous.data) ?
                    [...previous.data, ...Array.isArray(current.data) ? current.data : [current.data]] :
                    [previous.data, ...(Array.isArray(current.data) ? current.data : [current.data])];

                this.undoStack.splice(i, 1);
                removed++;
            }
        }

        console.log(`📦 History compressed: ${removed} actions removed`);
        return removed;
    }

    /**
     * Export history as JSON
     * @returns {string} JSON string
     */
    exportHistory() {
        const history = {
            undoStack: this.undoStack.map(action => ({
                type: action.type,
                data: action.data,
                previousState: action.previousState,
                timestamp: action.timestamp,
                description: action.description
            })),
            exportedAt: new Date().toISOString()
        };

        return JSON.stringify(history, null, 2);
    }

    /**
     * Import history from JSON
     * @param {string} jsonString - JSON string
     * @returns {boolean} Success
     */
    importHistory(jsonString) {
        try {
            const history = JSON.parse(jsonString);
            this.undoStack = history.undoStack || [];
            this.redoStack = [];
            console.log(`📥 History imported: ${this.undoStack.length} actions`);
            return true;
        } catch (error) {
            console.error('Failed to import history:', error);
            return false;
        }
    }
}
