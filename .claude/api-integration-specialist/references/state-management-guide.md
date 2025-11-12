# State Management Guide

Centralized state management with observer pattern for reactive UI updates without external frameworks.

## Core Concepts

### State Container Pattern
- **Single source of truth**: All application state in one place
- **Immutable updates**: State changes create new state objects
- **Observer pattern**: Components subscribe to state changes
- **History tracking**: Undo/redo with state snapshots
- **Persistence**: LocalStorage/SessionStorage sync

## Basic Implementation

See SKILL.md for complete StateContainer implementation with:
- `getState()` - Returns copy of current state
- `setState(updates)` - Updates state and notifies observers
- `subscribe(key, callback)` - Subscribe to state changes
- `recordHistory()` - Track state for undo/redo
- `persist()`/`restore()` - LocalStorage integration

## Usage Patterns

### Subscribe to Specific Keys
```javascript
const appState = new StateContainer({
  user: null,
  loading: false,
  error: null
});

// Subscribe to specific state key
appState.subscribe('loading', (isLoading) => {
  const spinner = document.getElementById('spinner');
  spinner.style.display = isLoading ? 'block' : 'none';
});

// Subscribe to multiple keys
appState.subscribe('error', showError);
appState.subscribe('user', updateUserProfile);
```

### Global State Observer
```javascript
// Watch all state changes
appState.subscribe('*', (newState, oldState) => {
  console.log('State changed:', {
    old: oldState,
    new: newState
  });

  // Auto-save to localStorage
  appState.persist();
});
```

### Computed Properties
```javascript
const appState = new ComputedStateContainer(
  { lists: [], processing: false },
  {
    totalEmails: (state) => state.lists.reduce((sum, list) => sum + list.count, 0),
    statusText: (state) => state.processing ? 'Processing...' : 'Ready'
  }
);

const state = appState.getState();
console.log(state.totalEmails); // Computed automatically
```

## Best Practices

1. **Keep state flat** when possible
2. **Use computed properties** for derived data
3. **Unsubscribe** when components unmount
4. **Persist selectively** - not all state needs saving
5. **Batch updates** when changing multiple keys
6. **Use TypeScript** for type safety (if available)
