/**
 * API Client Template
 * Reusable API client with error handling, retries, and timeout support
 *
 * Usage:
 *   const api = new APIClient('/api', { timeout: 30000 });
 *   const data = await api.get('/lists');
 *   await api.post('/process', { filename: 'test.txt' });
 */

class APIClient {
  constructor(baseURL = '', options = {}) {
    this.baseURL = baseURL;
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.defaultHeaders = options.headers || {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Makes a request with timeout, retry logic, and error handling
   */
  async request(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    const headers = { ...this.defaultHeaders, ...options.headers };
    const requestOptions = { ...options, headers };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await this._retryRequest(url, requestOptions);
      clearTimeout(timeoutId);

      return await this._parseResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this._handleError(error, endpoint);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  async _retryRequest(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Don't retry client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // Retry on server errors or rate limits
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retry ${attempt}/${this.maxRetries} in ${delay}ms...`);
        await this._sleep(delay);
        return this._retryRequest(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      // Network error - retry
      if (attempt < this.maxRetries && error.name !== 'AbortError') {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Network error, retry ${attempt}/${this.maxRetries} in ${delay}ms...`);
        await this._sleep(delay);
        return this._retryRequest(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Parses response based on content type
   */
  async _parseResponse(response) {
    const contentType = response.headers.get('Content-Type') || '';

    if (!response.ok) {
      // Try to get error message from response
      let errorData;
      try {
        if (contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch {
        errorData = null;
      }

      throw new HTTPError(response.status, response.statusText, errorData);
    }

    // No content
    if (response.status === 204) {
      return null;
    }

    // Parse based on content type
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.includes('text/')) {
      return await response.text();
    }

    return await response.blob();
  }

  /**
   * Handles and wraps errors
   */
  _handleError(error, endpoint) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
      timeoutError.name = 'TimeoutError';
      timeoutError.endpoint = endpoint;
      return timeoutError;
    }

    if (error instanceof HTTPError) {
      return error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error('Cannot connect to server');
      networkError.name = 'NetworkError';
      networkError.originalError = error;
      networkError.endpoint = endpoint;
      return networkError;
    }

    return error;
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async upload(endpoint, formData, onProgress) {
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percent: (e.loaded / e.total) * 100
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new HTTPError(xhr.status, xhr.statusText));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', this.baseURL + endpoint);

      // Set custom headers (except Content-Type for FormData)
      Object.entries(this.defaultHeaders).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });

      xhr.send(formData);
    });
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
}

/**
 * Example Usage
 */
async function example() {
  const api = new APIClient('/api', {
    timeout: 30000,
    maxRetries: 3
  });

  try {
    // GET request
    const lists = await api.get('/lists');
    console.log('Lists:', lists);

    // POST request
    const result = await api.post('/process_one', {
      filename: 'test.txt'
    });
    console.log('Processing:', result);

    // File upload with progress
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const uploadResult = await api.upload('/import-lvp', formData, (progress) => {
      console.log(`Upload: ${progress.percent}%`);
    });
    console.log('Upload complete:', uploadResult);

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('Request timed out');
    } else if (error.name === 'NetworkError') {
      console.error('Cannot connect to server');
    } else if (error instanceof HTTPError) {
      console.error(`Server error: ${error.status}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, HTTPError };
}
