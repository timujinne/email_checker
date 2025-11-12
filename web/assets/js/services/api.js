/**
 * API Service Layer
 * Centralized HTTP requests with error handling
 */

class ApiService {
    constructor(baseURL = '') {
        this.baseURL = baseURL || '';
        this.timeout = 30000; // 30 seconds
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fn) {
        this.requestInterceptors.push(fn);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fn) {
        this.responseInterceptors.push(fn);
    }

    /**
     * Build full URL
     */
    buildURL(endpoint) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        return this.baseURL + endpoint;
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            timeout = this.timeout,
            ...rest
        } = options;

        const url = this.buildURL(endpoint);
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            ...rest
        };

        // Add body if present
        if (body && method !== 'GET') {
            config.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        // Request interceptors
        for (const interceptor of this.requestInterceptors) {
            try {
                await interceptor(config);
            } catch (error) {
                console.error('Request interceptor error:', error);
            }
        }

        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Handle response
            let data = null;
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // Response interceptors
            for (const interceptor of this.responseInterceptors) {
                try {
                    await interceptor({ status: response.status, data });
                } catch (error) {
                    console.error('Response interceptor error:', error);
                }
            }

            // Check for error status
            if (!response.ok) {
                const error = new Error(data?.error || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return {
                status: response.status,
                data,
                headers: response.headers
            };
        } catch (error) {
            // Handle network and other errors
            if (error.name === 'AbortError') {
                error.message = 'Request timeout';
            }

            console.error('API Error:', {
                endpoint,
                method,
                status: error.status,
                message: error.message
            });

            throw error;
        }
    }

    /**
     * GET request
     */
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    /**
     * PUT request
     */
    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * PATCH request
     */
    patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }
}

// Global API instance - use dynamic URL based on current page location
const apiUrl = window.location.origin; // Will automatically use current host:port
const api = new ApiService(apiUrl);

// Add error logging interceptor
api.addResponseInterceptor(async (response) => {
    if (response.status >= 400) {
        console.warn('API Error Response:', response);
    }
});

// Export to window for browser environment
window.api = api;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, api };
}
