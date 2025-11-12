/**
 * State Container Template
 * Centralized state management with observer pattern
 *
 * Usage:
 *   const state = new StateContainer({ count: 0 });
 *   state.subscribe('count', (newValue) => console.log(newValue));
 *   state.setState({ count: 1 });
 */

class StateContainer {
  constructor(initialState = {}) {
    this.state = initialState;
    this.observers = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
  }

  /**
   * Gets copy of current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Updates state and notifies observers
   */
  setState(updates, recordHistory = true) {
    if (recordHistory) {
      this._recordHistory();
    }

    const oldState = this.state;
    this.state = { ...this.state, ...updates };

    // Notify observers of changed keys
    Object.keys(updates).forEach(key => {
      if (this.observers.has(key)) {
        this.observers.get(key).forEach(callback => {
          callback(this.state[key], oldState[key]);
        });
      }
    });

    // Notify global observers
    if (this.observers.has('*')) {
      this.observers.get('*').forEach(callback => {
        callback(this.state, oldState);
      });
    }
  }

  /**
   * Subscribes to state changes
   */
  subscribe(key, callback) {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    this.observers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      this.observers.get(key).delete(callback);
    };
  }

  /**
   * Records current state in history
   */
  _recordHistory() {
    // Remove future history if not at end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push({ ...this.state });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Undo last state change
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = { ...this.history[this.historyIndex] };
      this._notifyAllObservers();
    }
  }

  /**
   * Redo previously undone state change
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = { ...this.history[this.historyIndex] };
      this._notifyAllObservers();
    }
  }

  /**
   * Notifies all observers
   */
  _notifyAllObservers() {
    const oldState = {};
    this.observers.forEach((callbacks, key) => {
      if (key !== '*') {
        callbacks.forEach(callback => {
          callback(this.state[key], oldState[key]);
        });
      }
    });

    if (this.observers.has('*')) {
      this.observers.get('*').forEach(callback => {
        callback(this.state, oldState);
      });
    }
  }

  /**
   * Persists state to localStorage
   */
  persist(key = 'appState') {
    try {
      localStorage.setItem(key, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Restores state from localStorage
   */
  restore(key = 'appState') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        this.state = JSON.parse(saved);
        this._notifyAllObservers();
        return true;
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    return false;
  }
}

/**
 * Extended State Container with Computed Properties
 */
class ComputedStateContainer extends StateContainer {
  constructor(initialState, computedProperties = {}) {
    super(initialState);
    this.computedProperties = computedProperties;
  }

  getState() {
    const baseState = super.getState();
    const computed = {};

    Object.keys(this.computedProperties).forEach(key => {
      computed[key] = this.computedProperties[key](baseState);
    });

    return { ...baseState, ...computed };
  }
}

/**
 * Example Usage
 */
function example() {
  // Basic usage
  const appState = new StateContainer({
    user: null,
    loading: false,
    error: null
  });

  // Subscribe to specific state changes
  appState.subscribe('loading', (isLoading) => {
    const spinner = document.getElementById('spinner');
    spinner.style.display = isLoading ? 'block' : 'none';
  });

  appState.subscribe('error', (error) => {
    if (error) {
      showError(error);
    }
  });

  // Subscribe to all state changes
  appState.subscribe('*', (newState) => {
    console.log('State changed:', newState);
    appState.persist(); // Auto-save
  });

  // Update state
  appState.setState({ loading: true });
  appState.setState({ user: { name: 'John' }, loading: false });

  // Undo/redo
  appState.undo();
  appState.redo();

  // Computed properties
  const enhancedState = new ComputedStateContainer(
    { lists: [], processing: false },
    {
      totalLists: (state) => state.lists.length,
      statusText: (state) => state.processing ? 'Processing...' : 'Ready'
    }
  );

  const state = enhancedState.getState();
  console.log(state.totalLists); // Computed automatically
  console.log(state.statusText);

  // Restore state on page load
  window.addEventListener('DOMContentLoaded', () => {
    appState.restore('myAppState');
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StateContainer, ComputedStateContainer };
}
