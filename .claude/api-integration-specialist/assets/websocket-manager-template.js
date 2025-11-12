/**
 * WebSocket Manager Template
 * Production-ready WebSocket connection manager with reconnection logic
 *
 * Usage:
 *   const ws = new WebSocketManager('ws://localhost:8080/ws');
 *   ws.on('message_type', (data) => console.log(data));
 *   ws.connect();
 */

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

    // Message queue
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;

    // Callbacks
    this.onOpenCallback = null;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
    this.onReconnectCallback = null;
  }

  /**
   * Establishes WebSocket connection
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this._setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this._scheduleReconnect();
    }
  }

  /**
   * Sets up event listeners
   */
  _setupEventListeners() {
    this.ws.addEventListener('open', this._handleOpen.bind(this));
    this.ws.addEventListener('message', this._handleMessage.bind(this));
    this.ws.addEventListener('error', this._handleError.bind(this));
    this.ws.addEventListener('close', this._handleClose.bind(this));
  }

  /**
   * Handles connection open
   */
  _handleOpen(event) {
    console.log('WebSocket connected');

    this.reconnectAttempts = 0;
    this._startHeartbeat();
    this._flushMessageQueue();

    if (this.onOpenCallback) {
      this.onOpenCallback(event);
    }
  }

  /**
   * Handles incoming messages
   */
  _handleMessage(event) {
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

  /**
   * Handles errors
   */
  _handleError(error) {
    console.error('WebSocket error:', error);

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Handles connection close
   */
  _handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);

    this._stopHeartbeat();

    if (this.onCloseCallback) {
      this.onCloseCallback(event);
    }

    this._scheduleReconnect();
  }

  /**
   * Schedules reconnection attempt
   */
  _scheduleReconnect() {
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

  /**
   * Starts heartbeat monitoring
   */
  _startHeartbeat() {
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;

        if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
          console.warn('Heartbeat timeout - closing connection');
          this.ws.close();
          return;
        }

        this.send({ type: 'ping' });
      }
    }, this.heartbeatTimeout / 2);
  }

  /**
   * Stops heartbeat monitoring
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Sends a message
   */
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

  /**
   * Flushes queued messages
   */
  _flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }

  /**
   * Registers message handler
   */
  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregisters message handler
   */
  off(messageType) {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Checks if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnects and prevents reconnection
   */
  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this._stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Callback setters
   */
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

/**
 * Example Usage
 */
function example() {
  const ws = new WebSocketManager('ws://localhost:8080/ws', {
    maxReconnectAttempts: 5,
    heartbeatTimeout: 30000
  });

  // Register message handlers
  ws.on('processing_progress', (message) => {
    console.log('Progress:', message.progress);
    updateProgressBar(message.progress);
  });

  ws.on('processing_complete', (message) => {
    console.log('Processing complete');
    showNotification('Done!');
  });

  // Setup callbacks
  ws.onOpen(() => {
    console.log('Connected, subscribing...');
    ws.send({ type: 'subscribe', channel: 'processing' });
  });

  ws.onClose((event) => {
    if (event.code !== 1000) {
      showNotification('Connection lost');
    }
  });

  ws.onReconnect((attempt) => {
    showNotification(`Reconnecting (${attempt})...`);
  });

  // Connect
  ws.connect();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    ws.disconnect();
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebSocketManager };
}
