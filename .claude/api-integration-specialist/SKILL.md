---
name: api-integration-specialist
description: Expert in REST API integration, WebSocket communication, state management, error handling, and request optimization for frontend applications. Specializes in vanilla JavaScript implementations without frameworks, focusing on robust error handling and user feedback patterns. Invoke when integrating APIs, implementing real-time updates, building error handling, optimizing requests, managing state, or handling long-running operations.
---

# API Integration Specialist

Expert skill for REST API integration, WebSocket communication, state management, error handling, and request optimization in frontend applications using vanilla JavaScript.

## Overview

Modern web applications rely on robust API integration to communicate with backend services. This skill provides comprehensive patterns for building reliable, performant, and user-friendly API integrations without requiring external frameworks. It covers the full spectrum of API communication - from simple REST requests to real-time WebSocket connections, with emphasis on error handling, retry logic, state management, and request optimization.

The patterns in this skill are battle-tested in production applications like Email Checker, which processes large datasets through background jobs while providing real-time progress updates and responsive user feedback. All implementations use vanilla JavaScript with modern ES6+ features, ensuring maximum compatibility and minimal dependencies.

## Core Competencies

### REST API Integration
- **Fetch API mastery**: Modern promise-based HTTP requests with full configuration control
- **Request patterns**: GET, POST, PUT, DELETE with proper headers, body formatting, and error handling
- **File uploads**: Multipart form data handling for file uploads with progress tracking
- **Authentication**: Token-based auth, session management, CSRF protection
- **Timeout handling**: AbortController for request cancellation and timeout enforcement
- **Response parsing**: JSON/text/blob parsing with proper error handling

### WebSocket Communication
- **Connection lifecycle**: Initialization, authentication, graceful shutdown
- **Real-time updates**: Bidirectional communication for live data streams
- **Reconnection logic**: Exponential backoff, connection health monitoring
- **Heartbeat/ping-pong**: Keep-alive mechanisms to prevent timeout
- **Fallback strategies**: Degrading to polling when WebSocket unavailable
- **Message queuing**: Buffering messages during disconnection periods

### State Management
- **Container pattern**: Centralized state with immutable updates
- **Observer pattern**: Subscribe/notify for reactive UI updates
- **State persistence**: LocalStorage/SessionStorage synchronization
- **Computed properties**: Derived state calculations
- **State history**: Undo/redo capabilities with state snapshots
- **Conflict resolution**: Handling concurrent updates

### Error Handling
- **Error classification**: Network errors, HTTP errors, application errors
- **Retry strategies**: Exponential backoff, max attempts, conditional retry
- **User feedback**: Toast notifications, inline messages, error boundaries
- **Logging**: Structured error logging for debugging and monitoring
- **Graceful degradation**: Fallback UI when services unavailable
- **Recovery patterns**: Auto-retry, manual retry, alternative flows

### Request Optimization
- **Debouncing**: Delay execution until user stops typing/interacting
- **Throttling**: Limit execution frequency for high-frequency events
- **Request deduplication**: Prevent identical concurrent requests
- **Request prioritization**: Queue management with priority levels
- **Caching**: Response caching with TTL and invalidation strategies
- **Batch requests**: Combine multiple requests to reduce overhead

## When to Invoke This Skill

Invoke the `api-integration-specialist` skill when working on:

1. **API Integration Tasks**
   - Connecting frontend to REST API endpoints
   - Implementing CRUD operations with proper error handling
   - Building API client libraries or wrappers
   - Setting up authentication and authorization flows

2. **Real-Time Features**
   - Implementing WebSocket connections for live updates
   - Building chat, notifications, or live data streams
   - Creating progress indicators for long-running operations
   - Synchronizing state across multiple browser tabs

3. **Error Handling & Reliability**
   - Implementing retry logic and fallback mechanisms
   - Building user-friendly error messages and recovery flows
   - Setting up error logging and monitoring
   - Creating offline-first capabilities

4. **Performance Optimization**
   - Reducing unnecessary API calls with debouncing/throttling
   - Implementing request queuing and prioritization
   - Setting up response caching strategies
   - Optimizing large data transfers

5. **State Management**
   - Building centralized state containers
   - Implementing reactive UI updates
   - Managing complex application state
   - Synchronizing state with backend

## Email Checker API Architecture

The Email Checker web server (`web_server.py`) provides a comprehensive REST API for email list management, processing, and metadata enrichment. Understanding this API structure is essential for frontend integration.

### Core Processing Endpoints

**`GET /api/lists`**
Returns all email lists with metadata from `lists_config.json`. Each list includes filename, display name, file type (txt/lvp), country, category, priority, and processing status.

**`POST /api/process`**
Triggers full incremental processing of all lists. Runs `check-all-incremental --exclude-duplicates --generate-html` in background subprocess. Returns immediately with job ID.

**`POST /api/process_one`**
Processes a single list specified by filename. Auto-detects file type (TXT/LVP) and runs appropriate processing command. Includes metadata extraction for LVP files.

**`GET /api/status`**
Returns current processing status: running/idle, progress percentage, ETA, current file being processed. Polls subprocess output for real-time updates.

**`POST /api/reset_processing`**
Resets all `processed` flags in `lists_config.json` to force full reprocessing. Useful after blocklist updates or configuration changes.

### Metadata Endpoints

**`GET /api/metadata`**
Returns metadata database statistics: total records, unique emails, available fields, database size, LVP source files indexed.

**`GET /api/email-metadata/:email`**
Fetches full metadata for specific email address including company name, address, phone, website, contact person, industry, etc.

**`GET /api/lvp-sources`**
Lists all available LVP files in output directory with file sizes and modification dates for import selection.

**`POST /api/import-lvp`**
Imports LVP file to metadata database. Parses XML, extracts all fields, and stores in SQLite with deduplication.

**`POST /api/enrich-list`**
Enriches a clean email list with metadata from database. Matches emails and generates CSV/JSON files with full metadata fields.

**`GET /api/metadata-search?q=query`**
Searches metadata by company name, address, industry keywords. Returns matching records with email addresses.

### Smart Filter Endpoints (NEW)

**`GET /api/smart-filter/available`**
Lists available smart filter configurations with descriptions, target countries, and supported industries.

**`GET /api/smart-filter/config?name=filter_name`**
Returns full configuration JSON for specified filter including scoring weights, thresholds, keywords, and exclusion patterns.

**`POST /api/smart-filter/process`**
Processes single clean list file with specified filter. Returns priority-segmented output files (HIGH/MEDIUM/LOW/EXCLUDED) and exclusion report.

**`POST /api/smart-filter/process-batch`**
Batch processes multiple files matching glob pattern with smart filter. Progress tracking for each file in batch.

### Reports & Utilities

**`GET /api/reports`**
Lists available HTML report files with generation timestamps and file sizes. Provides download links for each report.

**`GET /api/blocklists`**
Returns blocklist statistics: total blocked emails, blocked domains, last update timestamp, estimated memory usage.

**`POST /api/update-blocklist`**
Adds new emails or domains to blocklists. Validates format, checks for duplicates, and persists to files.

### Response Patterns

All endpoints follow consistent response structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional detailed error info"
}
```

**Long-Running Operations:**
```json
{
  "success": true,
  "job_id": "unique_id",
  "status": "processing",
  "progress": 45.5,
  "eta": "2m 15s"
}
```

## Fetch API Patterns

The Fetch API provides a modern, promise-based interface for HTTP requests. Proper configuration and error handling are critical for reliable API communication.

### Basic GET Request

```javascript
async function fetchLists() {
  try {
    const response = await fetch('/api/lists', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data; // Extract data from envelope
  } catch (error) {
    console.error('Failed to fetch lists:', error);
    throw error; // Re-throw for caller to handle
  }
}
```

### POST Request with JSON Body

```javascript
async function processOneList(filename) {
  try {
    const response = await fetch('/api/process_one', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ filename })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Processing failed');
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError') {
      // Network error
      throw new Error('Network error: Cannot reach server');
    }
    throw error;
  }
}
```

### Request with Timeout

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}
```

### File Upload with Progress

```javascript
async function uploadLVPFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.open('POST', '/api/import-lvp');
    xhr.send(formData);
  });
}
```

### Request Retry Pattern

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Don't retry client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### Parallel Requests with Error Handling

```javascript
async function fetchMultipleEndpoints() {
  const endpoints = [
    '/api/lists',
    '/api/metadata',
    '/api/reports',
    '/api/status'
  ];

  const results = await Promise.allSettled(
    endpoints.map(url => fetch(url).then(r => r.json()))
  );

  const data = {};
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      data[endpoints[index]] = result.value;
    } else {
      errors.push({
        endpoint: endpoints[index],
        error: result.reason.message
      });
    }
  });

  if (errors.length > 0) {
    console.warn('Some requests failed:', errors);
  }

  return { data, errors };
}
```

## WebSocket Integration

WebSocket provides full-duplex communication for real-time updates. Proper connection management and error handling are essential for reliable real-time features.

### Connection Setup

```javascript
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.messageHandlers = new Map();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.onConnectionOpen();
      });

      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      this.ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        this.onConnectionError(error);
      });

      this.ws.addEventListener('close', () => {
        console.log('WebSocket closed');
        this.stopHeartbeat();
        this.attemptReconnect();
      });
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.onMaxReconnectAttemptsReached();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket not ready, message not sent');
    return false;
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const handler = this.messageHandlers.get(message.type);

      if (handler) {
        handler(message);
      } else {
        console.warn('No handler for message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Override these methods in subclass or assign handlers
  onConnectionOpen() {}
  onConnectionError(error) {}
  onMaxReconnectAttemptsReached() {}
}
```

### Usage Example for Processing Updates

```javascript
// Setup WebSocket for real-time processing updates
const wsManager = new WebSocketManager('ws://localhost:8080/ws');

wsManager.on('processing_progress', (message) => {
  updateProgressBar(message.progress);
  updateETA(message.eta);
  updateCurrentFile(message.current_file);
});

wsManager.on('processing_complete', (message) => {
  showNotification('Processing complete!');
  refreshResultsList();
});

wsManager.on('processing_error', (message) => {
  showError(`Processing failed: ${message.error}`);
});

wsManager.onConnectionOpen = () => {
  showNotification('Connected to server');
};

wsManager.onMaxReconnectAttemptsReached = () => {
  showError('Cannot connect to server. Please refresh the page.');
  // Fallback to polling
  startPollingFallback();
};

wsManager.connect();
```

### Polling Fallback

```javascript
class PollingFallback {
  constructor(endpoint, interval = 2000) {
    this.endpoint = endpoint;
    this.interval = interval;
    this.timerId = null;
    this.callbacks = [];
  }

  start() {
    this.poll(); // Initial poll
    this.timerId = setInterval(() => this.poll(), this.interval);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async poll() {
    try {
      const response = await fetch(this.endpoint);
      const data = await response.json();

      this.callbacks.forEach(callback => callback(data));
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  subscribe(callback) {
    this.callbacks.push(callback);
  }
}

// Use fallback when WebSocket unavailable
const polling = new PollingFallback('/api/status');
polling.subscribe((status) => {
  updateUI(status);
});
polling.start();
```

## State Management

Centralized state management with observer pattern enables reactive UI updates without external frameworks.

### State Container Implementation

```javascript
class StateContainer {
  constructor(initialState = {}) {
    this.state = initialState;
    this.observers = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
  }

  getState() {
    return { ...this.state }; // Return copy to prevent mutation
  }

  setState(updates, recordHistory = true) {
    if (recordHistory) {
      this.recordHistory();
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

  recordHistory() {
    // Remove future history if we're not at the end
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

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = { ...this.history[this.historyIndex] };
      this.notifyAllObservers();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = { ...this.history[this.historyIndex] };
      this.notifyAllObservers();
    }
  }

  notifyAllObservers() {
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

  persist(key = 'appState') {
    try {
      localStorage.setItem(key, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  restore(key = 'appState') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        this.state = JSON.parse(saved);
        this.notifyAllObservers();
        return true;
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    return false;
  }
}
```

### Usage in Email Checker

```javascript
// Initialize application state
const appState = new StateContainer({
  lists: [],
  processing: false,
  progress: 0,
  currentFile: null,
  metadata: null,
  reports: [],
  filters: [],
  error: null
});

// Subscribe to processing status changes
appState.subscribe('processing', (isProcessing) => {
  const processButton = document.getElementById('processButton');
  processButton.disabled = isProcessing;
  processButton.textContent = isProcessing ? 'Processing...' : 'Process All';
});

// Subscribe to progress updates
appState.subscribe('progress', (progress) => {
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `${Math.round(progress)}%`;
});

// Subscribe to error changes
appState.subscribe('error', (error) => {
  if (error) {
    showErrorNotification(error);
  }
});

// Subscribe to lists updates
appState.subscribe('lists', (lists) => {
  renderListsTable(lists);
});

// Persist state on changes
appState.subscribe('*', () => {
  appState.persist('emailCheckerState');
});

// Restore state on page load
window.addEventListener('DOMContentLoaded', () => {
  appState.restore('emailCheckerState');
});
```

### Computed Properties Pattern

```javascript
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

// Usage
const appState = new ComputedStateContainer(
  {
    lists: [],
    processing: false
  },
  {
    // Computed: total email count across all lists
    totalEmails: (state) => {
      return state.lists.reduce((sum, list) => sum + (list.email_count || 0), 0);
    },

    // Computed: processing status text
    statusText: (state) => {
      if (state.processing) {
        return `Processing ${state.currentFile}... ${state.progress}%`;
      }
      return 'Idle';
    },

    // Computed: lists filtered by country
    listsByCountry: (state) => {
      const grouped = {};
      state.lists.forEach(list => {
        const country = list.country || 'Unknown';
        if (!grouped[country]) {
          grouped[country] = [];
        }
        grouped[country].push(list);
      });
      return grouped;
    }
  }
);
```

## Error Handling Patterns

Robust error handling distinguishes production-ready applications from prototypes. Proper classification, user feedback, and recovery strategies are essential.

### Error Classification

```javascript
class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.userMessage = 'Cannot connect to server. Please check your internet connection.';
  }
}

class HTTPError extends Error {
  constructor(status, statusText, response) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HTTPError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.userMessage = this.getUserMessage();
  }

  getUserMessage() {
    if (this.status >= 500) {
      return 'Server error. Please try again later.';
    }
    if (this.status === 404) {
      return 'Resource not found.';
    }
    if (this.status === 403) {
      return 'Access denied.';
    }
    if (this.status === 401) {
      return 'Please log in to continue.';
    }
    if (this.status === 429) {
      return 'Too many requests. Please slow down.';
    }
    return 'Request failed. Please try again.';
  }
}

class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
    this.userMessage = message;
  }
}
```

### Centralized Error Handler

```javascript
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.onErrorCallback = null;
  }

  handle(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };

    this.log(errorEntry);

    // Determine user message
    let userMessage = 'An error occurred';
    let severity = 'error';

    if (error.userMessage) {
      userMessage = error.userMessage;
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      userMessage = 'Cannot connect to server';
      severity = 'error';
    } else if (error.name === 'AbortError') {
      userMessage = 'Request cancelled';
      severity = 'warning';
    }

    // Show notification
    this.showNotification(userMessage, severity);

    // Call custom error handler if set
    if (this.onErrorCallback) {
      this.onErrorCallback(error, errorEntry);
    }

    return errorEntry;
  }

  log(errorEntry) {
    this.errorLog.push(errorEntry);

    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (window.location.hostname === 'localhost') {
      console.error('Error logged:', errorEntry);
    }
  }

  showNotification(message, severity = 'error') {
    // Simple toast notification implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${severity}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  getErrorLog() {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }
}

// Global error handler instance
const errorHandler = new ErrorHandler();
```

### Retry Logic with Backoff

```javascript
class RetryManager {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.shouldRetry = options.shouldRetry || this.defaultShouldRetry;
  }

  defaultShouldRetry(error, attempt) {
    // Don't retry client errors (except 429)
    if (error instanceof HTTPError) {
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        return false;
      }
    }

    // Retry network errors and server errors
    return true;
  }

  async execute(fn, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === this.maxAttempts || !this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Usage
const retryManager = new RetryManager({
  maxAttempts: 3,
  baseDelay: 1000
});

async function fetchListsWithRetry() {
  try {
    return await retryManager.execute(async () => {
      const response = await fetch('/api/lists');
      if (!response.ok) {
        throw new HTTPError(response.status, response.statusText);
      }
      return await response.json();
    });
  } catch (error) {
    errorHandler.handle(error, { operation: 'fetchLists' });
    throw error;
  }
}
```

## Request Optimization

Optimizing API requests improves performance and user experience while reducing server load.

### Debouncing Pattern

```javascript
function debounce(func, delay = 300) {
  let timeoutId;

  return function debounced(...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Usage: Search metadata as user types
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const performSearch = debounce(async (query) => {
  if (query.length < 3) {
    searchResults.innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`/api/metadata-search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    renderSearchResults(data.results);
  } catch (error) {
    errorHandler.handle(error, { operation: 'search', query });
  }
}, 500);

searchInput.addEventListener('input', (e) => {
  performSearch(e.target.value);
});
```

### Throttling Pattern

```javascript
function throttle(func, limit = 1000) {
  let inThrottle;
  let lastResult;

  return function throttled(...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

// Usage: Poll processing status
const pollStatus = throttle(async () => {
  const response = await fetch('/api/status');
  const status = await response.json();
  updateProcessingStatus(status);
}, 2000);

// Can call frequently, but only executes every 2 seconds
setInterval(pollStatus, 500);
```

### Request Deduplication

```javascript
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async fetch(key, fetchFn) {
    // Return pending request if exists
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const promise = fetchFn()
      .finally(() => {
        // Remove from pending after completion
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }
}

// Usage
const deduplicator = new RequestDeduplicator();

async function fetchEmailMetadata(email) {
  return deduplicator.fetch(`metadata:${email}`, async () => {
    const response = await fetch(`/api/email-metadata/${encodeURIComponent(email)}`);
    return response.json();
  });
}

// Multiple calls with same email will share single request
fetchEmailMetadata('user@example.com');
fetchEmailMetadata('user@example.com'); // Reuses first request
```

### Request Queue with Priority

```javascript
class RequestQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.activeRequests = 0;
    this.queue = [];
  }

  async enqueue(fetchFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fetchFn,
        priority,
        resolve,
        reject
      });

      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeRequests >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    this.activeRequests++;

    try {
      const result = await item.fetchFn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }
}

// Usage
const requestQueue = new RequestQueue({ concurrency: 3 });

// High priority request (e.g., user action)
requestQueue.enqueue(
  () => fetch('/api/process_one').then(r => r.json()),
  10
);

// Low priority requests (e.g., background data loading)
lists.forEach(list => {
  requestQueue.enqueue(
    () => fetch(`/api/list-details/${list.filename}`).then(r => r.json()),
    1
  );
});
```

## Resources

### Official Documentation
- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

### Email Checker References
- `web_server.py` - API endpoint implementations
- `email_list_manager.html` - Frontend API usage examples
- `CLAUDE.md` - Project architecture and API overview

### Reference Files
- **fetch-api-patterns.md** - Complete Fetch API examples and configurations
- **websocket-implementation.md** - WebSocket setup, reconnection, and protocols
- **state-management-guide.md** - State container patterns and observers
- **error-handling-strategies.md** - Error classification and recovery strategies
- **email-checker-api-reference.md** - Complete API endpoint documentation
- **request-optimization-guide.md** - Debouncing, throttling, and queue patterns

### Asset Templates
- **api-client-template.js** - Reusable API client with error handling
- **websocket-manager-template.js** - WebSocket connection manager
- **state-container-template.js** - State management implementation
- **error-handler-template.js** - Centralized error handling
- **request-queue-template.js** - Request queue with prioritization
