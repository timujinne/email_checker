/**
 * Error Handler Template
 * Centralized error handling with logging and user notifications
 *
 * Usage:
 *   const errorHandler = new ErrorHandler();
 *   try {
 *     await riskyOperation();
 *   } catch (error) {
 *     errorHandler.handle(error, { operation: 'riskyOperation' });
 *   }
 */

class ErrorHandler {
  constructor(options = {}) {
    this.errorLog = [];
    this.maxLogSize = options.maxLogSize || 100;
    this.onErrorCallback = null;
    this.isDevelopment = options.isDevelopment || (window.location.hostname === 'localhost');
  }

  /**
   * Handles an error with context
   */
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

    this._log(errorEntry);

    // Determine user message and severity
    const { userMessage, severity } = this._classifyError(error);

    // Show notification
    this.showNotification(userMessage, severity);

    // Call custom error handler if set
    if (this.onErrorCallback) {
      this.onErrorCallback(error, errorEntry);
    }

    return errorEntry;
  }

  /**
   * Classifies error and determines user message
   */
  _classifyError(error) {
    let userMessage = 'An error occurred';
    let severity = 'error';

    if (error.userMessage) {
      userMessage = error.userMessage;
    } else if (error.name === 'NetworkError') {
      userMessage = 'Cannot connect to server';
      severity = 'error';
    } else if (error.name === 'TimeoutError') {
      userMessage = 'Request timed out';
      severity = 'warning';
    } else if (error.name === 'AbortError') {
      userMessage = 'Request cancelled';
      severity = 'info';
    } else if (error instanceof HTTPError) {
      userMessage = error.getUserMessage();
      severity = error.status >= 500 ? 'error' : 'warning';
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      userMessage = 'Network error';
      severity = 'error';
    }

    return { userMessage, severity };
  }

  /**
   * Logs error entry
   */
  _log(errorEntry) {
    this.errorLog.push(errorEntry);

    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (this.isDevelopment) {
      console.error('Error logged:', errorEntry);
    }
  }

  /**
   * Shows toast notification
   */
  showNotification(message, severity = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${severity}`;
    toast.textContent = message;

    // Add styles if not defined
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 16px 24px;
          background: #333;
          color: white;
          border-radius: 4px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
          z-index: 10000;
          max-width: 400px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .toast-error {
          background: #d32f2f;
        }
        .toast-warning {
          background: #f57c00;
        }
        .toast-info {
          background: #1976d2;
        }
        .toast-success {
          background: #388e3c;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Gets error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clears error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Sets custom error callback
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Exports error log as JSON
   */
  exportErrorLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }
}

/**
 * Custom Error Classes
 */
class HTTPError extends Error {
  constructor(status, statusText, data) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HTTPError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
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

class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.userMessage = 'Cannot connect to server. Please check your connection.';
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

/**
 * Example Usage
 */
function example() {
  const errorHandler = new ErrorHandler({
    isDevelopment: true
  });

  // Set custom error callback
  errorHandler.onError((error, entry) => {
    // Send to logging service
    console.log('Sending error to logging service:', entry);
  });

  // Handle errors
  async function riskyOperation() {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new HTTPError(response.status, response.statusText);
      }
      return await response.json();
    } catch (error) {
      errorHandler.handle(error, {
        operation: 'riskyOperation',
        userId: 'user123'
      });
      throw error;
    }
  }

  // Handle network errors
  async function fetchData() {
    try {
      const result = await riskyOperation();
      return result;
    } catch (error) {
      if (error instanceof HTTPError && error.status === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchData();
      }
      // Let error propagate
      throw error;
    }
  }

  // Export error log for debugging
  document.getElementById('exportErrors').addEventListener('click', () => {
    const log = errorHandler.exportErrorLog();
    const blob = new Blob([log], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'error-log.json';
    a.click();
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ErrorHandler,
    HTTPError,
    NetworkError,
    ValidationError
  };
}
