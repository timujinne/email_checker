/**
 * WebSocket Service
 * Real-time communication with automatic reconnection
 */

class WebSocketService {
    constructor(url = null, options = {}) {
        // Use dynamic WebSocket URL if not provided
        if (!url) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // WebSocket runs on port+1 (e.g., HTTP on 8089, WebSocket on 8090)
            const hostname = window.location.hostname;
            const port = window.location.port ? parseInt(window.location.port) + 1 : 8090;
            url = `${wsProtocol}//${hostname}:${port}/ws`;
        }
        this.url = url;
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000; // Start with 1s
        this.maxReconnectDelay = 30000; // Max 30s
        this.isIntentionallyClosed = false;
        // WebSocket disabled by default (will be enabled when server is available)
        this.enabled = options.enabled !== undefined ? options.enabled : false;
    }

    /**
     * Connect to WebSocket
     */
    connect() {
        // Skip if WebSocket is disabled
        if (!this.enabled) {
            console.info('ℹ️ WebSocket disabled (server not available) - app will work in offline mode');
            return;
        }

        if (this.isConnected()) {
            console.warn('WebSocket already connected');
            return;
        }

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onerror = (error) => this.handleError(error);
            this.ws.onclose = () => this.handleClose();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle connection open
     */
    handleOpen() {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Update state
        if (typeof store !== 'undefined') {
            store.set('wsConnected', true);
        }

        this.emit('connected', { timestamp: new Date() });
    }

    /**
     * Handle incoming message
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            const { type, data } = message;

            console.log('WebSocket message:', type, data);

            // Emit event for specific message type
            if (type) {
                this.emit(type, data);
            }

            // Emit generic message event
            this.emit('message', message);
        } catch (error) {
            console.error('WebSocket message parse error:', error);
        }
    }

    /**
     * Handle connection error
     */
    handleError(error) {
        // Only log detailed error if WebSocket is enabled
        if (this.enabled) {
            console.error('🔌 WebSocket error:', error);
        }

        // Update state
        if (typeof store !== 'undefined') {
            store.set('wsConnected', false);
        }

        this.emit('error', error);
    }

    /**
     * Handle connection close
     */
    handleClose() {
        console.log('WebSocket disconnected');

        // Update state
        if (typeof store !== 'undefined') {
            store.set('wsConnected', false);
        }

        this.emit('disconnected', { timestamp: new Date() });

        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        // Skip if WebSocket is disabled
        if (!this.enabled) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed', {
                attempts: this.reconnectAttempts
            });
            return;
        }

        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this.reconnectAttempts++;

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Send message
     */
    send(type, data = {}) {
        if (!this.isConnected()) {
            console.error('WebSocket not connected');
            return false;
        }

        try {
            const message = JSON.stringify({ type, data });
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error('WebSocket send error:', error);
            return false;
        }
    }

    /**
     * Close connection
     */
    close() {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Subscribe to event
     */
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);

        // Return unsubscribe function
        return () => this.off(type, callback);
    }

    /**
     * Unsubscribe from event
     */
    off(type, callback) {
        if (!this.listeners.has(type)) return;

        const callbacks = this.listeners.get(type);
        this.listeners.set(
            type,
            callbacks.filter(cb => cb !== callback)
        );
    }

    /**
     * Emit event
     */
    emit(type, data) {
        if (!this.listeners.has(type)) return;

        const callbacks = this.listeners.get(type);
        for (const callback of callbacks) {
            try {
                callback(data);
            } catch (error) {
                console.error(`WebSocket listener error for "${type}":`, error);
            }
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            readyState: this.ws?.readyState
        };
    }
}

// Global WebSocket instance
const ws = new WebSocketService();

// Auto-connect on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't auto-connect, let main.js handle it
    });
}

// Export to window for browser environment
window.ws = ws;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebSocketService, ws };
}
