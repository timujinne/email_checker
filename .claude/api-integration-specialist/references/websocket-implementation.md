# WebSocket Implementation Guide

Complete guide for implementing robust WebSocket connections with reconnection logic, heartbeat monitoring, and fallback strategies.

## Basic Connection Setup

### Simple WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.addEventListener('open', (event) => {
  console.log('Connected to WebSocket server');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.addEventListener('close', (event) => {
  console.log('Disconnected:', event.code, event.reason);
});
```

## Production-Ready WebSocket Manager

### Full Implementation with Reconnection
```javascript
class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.messageHandlers = new Map();

    // Reconnection config
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;

    // Heartbeat config
    this.heartbeatInterval = null;
    this.heartbeatTimeout = options.heartbeatTimeout || 30000;
    this.lastHeartbeat = null;

    // Message queue for offline messages
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;

    // Callbacks
    this.onOpenCallback = null;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
    this.onReconnectCallback = null;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  setupEventListeners() {
    this.ws.addEventListener('open', this.handleOpen.bind(this));
    this.ws.addEventListener('message', this.handleMessage.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
  }

  handleOpen(event) {
    console.log('WebSocket connected');

    // Reset reconnection counter
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Send queued messages
    this.flushMessageQueue();

    // Call user callback
    if (this.onOpenCallback) {
      this.onOpenCallback(event);
    }
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);

      // Handle heartbeat response
      if (message.type === 'pong') {
        this.lastHeartbeat = Date.now();
        return;
      }

      // Dispatch to registered handlers
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

  handleError(error) {
    console.error('WebSocket error:', error);

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);

    // Stop heartbeat
    this.stopHeartbeat();

    // Call user callback
    if (this.onCloseCallback) {
      this.onCloseCallback(event);
    }

    // Attempt reconnection
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    const jitter = Math.random() * 1000;
    const finalDelay = delay + jitter;

    console.log(
      `Reconnecting in ${Math.round(finalDelay / 1000)}s ` +
      `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (this.onReconnectCallback) {
        this.onReconnectCallback(this.reconnectAttempts);
      }
      this.connect();
    }, finalDelay);
  }

  startHeartbeat() {
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Check if we've received a heartbeat recently
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;

        if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
          console.warn('Heartbeat timeout - closing connection');
          this.ws.close();
          return;
        }

        // Send ping
        this.send({ type: 'ping' });
      }
    }, this.heartbeatTimeout / 2);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(data) {
    const message = JSON.stringify(data);

    if (this.isConnected()) {
      this.ws.send(message);
      return true;
    } else {
      // Queue message for later
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
        console.warn('Message queued (offline)');
      } else {
        console.error('Message queue full, dropping message');
      }
      return false;
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  off(messageType) {
    this.messageHandlers.delete(messageType);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    // Prevent reconnection
    this.reconnectAttempts = this.maxReconnectAttempts;

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // Callback setters
  onOpen(callback) {
    this.onOpenCallback = callback;
  }

  onClose(callback) {
    this.onCloseCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onReconnect(callback) {
    this.onReconnectCallback = callback;
  }
}
```

## Usage Examples

### Processing Progress Updates
```javascript
const wsManager = new WebSocketManager('ws://localhost:8080/ws', {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatTimeout: 30000
});

// Register message handlers
wsManager.on('processing_progress', (message) => {
  document.getElementById('progress').textContent = `${message.progress}%`;
  document.getElementById('eta').textContent = message.eta;
  document.getElementById('currentFile').textContent = message.current_file;
});

wsManager.on('processing_complete', (message) => {
  showNotification('Processing complete!', 'success');
  loadResults();
});

wsManager.on('processing_error', (message) => {
  showNotification(`Error: ${message.error}`, 'error');
});

// Setup callbacks
wsManager.onOpen(() => {
  console.log('Connected, subscribing to updates');
  wsManager.send({ type: 'subscribe', channel: 'processing' });
});

wsManager.onClose((event) => {
  if (event.code !== 1000) {
    showNotification('Connection lost, reconnecting...', 'warning');
  }
});

wsManager.onReconnect((attempt) => {
  showNotification(`Reconnecting (attempt ${attempt})...`, 'info');
});

// Connect
wsManager.connect();

// Disconnect on page unload
window.addEventListener('beforeunload', () => {
  wsManager.disconnect();
});
```

### Authentication
```javascript
class AuthenticatedWebSocket extends WebSocketManager {
  constructor(url, token, options = {}) {
    super(url, options);
    this.token = token;
    this.authenticated = false;
  }

  handleOpen(event) {
    // Authenticate immediately after connection
    this.send({
      type: 'auth',
      token: this.token
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);

    if (message.type === 'auth_success') {
      this.authenticated = true;
      console.log('Authenticated successfully');

      // Now call parent handler
      super.handleOpen(event);
      return;
    }

    if (message.type === 'auth_failed') {
      console.error('Authentication failed');
      this.disconnect();
      return;
    }

    // Handle other messages
    super.handleMessage(event);
  }

  send(data) {
    if (data.type !== 'auth' && !this.authenticated) {
      console.warn('Not authenticated yet');
      return false;
    }

    return super.send(data);
  }
}

// Usage
const ws = new AuthenticatedWebSocket(
  'ws://localhost:8080/ws',
  localStorage.getItem('auth_token')
);
ws.connect();
```

## Polling Fallback

When WebSocket is unavailable or fails repeatedly:

```javascript
class PollingFallback {
  constructor(endpoint, interval = 2000) {
    this.endpoint = endpoint;
    this.interval = interval;
    this.timerId = null;
    this.callbacks = new Map();
    this.lastData = null;
  }

  start() {
    if (this.timerId) {
      console.warn('Polling already started');
      return;
    }

    console.log('Starting polling fallback');
    this.poll();
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

      // Only trigger callbacks if data changed
      if (JSON.stringify(data) !== JSON.stringify(this.lastData)) {
        this.lastData = data;
        this.notifyCallbacks(data);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  notifyCallbacks(data) {
    this.callbacks.forEach((callback) => {
      callback(data);
    });
  }

  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event).add(callback);
  }

  off(event, callback) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).delete(callback);
    }
  }
}

// Usage with automatic fallback
class RobustConnection {
  constructor(wsUrl, pollingUrl) {
    this.wsUrl = wsUrl;
    this.pollingUrl = pollingUrl;
    this.wsManager = null;
    this.pollingFallback = null;
    this.useWebSocket = true;
  }

  connect() {
    if (this.useWebSocket) {
      this.connectWebSocket();
    } else {
      this.connectPolling();
    }
  }

  connectWebSocket() {
    this.wsManager = new WebSocketManager(this.wsUrl);

    this.wsManager.onOpen(() => {
      console.log('WebSocket connected');
    });

    this.wsManager.onClose(() => {
      if (this.wsManager.reconnectAttempts >= this.wsManager.maxReconnectAttempts) {
        console.log('WebSocket failed, falling back to polling');
        this.useWebSocket = false;
        this.connectPolling();
      }
    });

    this.wsManager.connect();
  }

  connectPolling() {
    this.pollingFallback = new PollingFallback(this.pollingUrl);
    this.pollingFallback.start();
  }

  on(event, handler) {
    if (this.wsManager) {
      this.wsManager.on(event, handler);
    }
    if (this.pollingFallback) {
      this.pollingFallback.on(event, handler);
    }
  }

  disconnect() {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }
    if (this.pollingFallback) {
      this.pollingFallback.stop();
    }
  }
}
```

## Best Practices

1. **Always implement reconnection logic** with exponential backoff
2. **Use heartbeat/ping-pong** to detect dead connections
3. **Queue messages** when connection is lost
4. **Limit queue size** to prevent memory issues
5. **Add jitter** to reconnection delays to prevent thundering herd
6. **Implement authentication** if using sensitive data
7. **Have a polling fallback** for environments blocking WebSocket
8. **Clean up on page unload** to avoid connection leaks
9. **Handle binary messages** if needed (using Blob or ArrayBuffer)
10. **Log connection events** for debugging
