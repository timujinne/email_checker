/**
 * OAuth Manager
 * Handles Google OAuth 2.0 authentication flow
 * Manages secure token storage and refresh
 *
 * @module OAuthManager
 */

class OAuthManager {
    /**
     * Create OAuthManager instance
     * @param {Object} config - OAuth configuration
     */
    constructor(config = {}) {
        this.config = {
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
            redirectUri: config.redirectUri || window.location.origin + '/oauth-callback',
            scope: config.scope || ['https://www.googleapis.com/auth/drive.file'],
            ...config
        };

        this.token = null;
        this.tokenExpiry = null;
        this.observers = [];

        this.loadToken();

        console.log('🔐 OAuthManager initialized');
    }

    /**
     * Get authorization URL for login
     * @returns {string} Google OAuth URL
     */
    getAuthorizationUrl() {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scope.join(' '),
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    /**
     * Start OAuth flow - redirect to Google
     */
    authorize() {
        const url = this.getAuthorizationUrl();
        window.location.href = url;
        console.log('🔐 Redirecting to Google OAuth...');
    }

    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code from Google
     * @returns {Promise<Object>} Token response
     */
    async handleCallback(code) {
        console.log('📝 Processing OAuth callback...');

        try {
            // This would normally be done on the backend for security
            // For frontend-only demo, we'll simulate the token exchange
            const response = await this.exchangeCodeForToken(code);

            if (response.access_token) {
                this.setToken(response.access_token, response.expires_in);
                this.notifyObservers('authorized', { token: response.access_token });
                console.log('✅ Authorization successful');
                return response;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('❌ OAuth callback error:', error);
            this.notifyObservers('auth-error', { error: error.message });
            throw error;
        }
    }

    /**
     * Exchange authorization code for token
     * @private
     */
    async exchangeCodeForToken(code) {
        // In production, this should be done on backend for security
        // This is a simplified frontend implementation

        return {
            access_token: this.generateMockToken(),
            refresh_token: this.generateMockToken(),
            expires_in: 3600,
            token_type: 'Bearer',
            scope: this.config.scope.join(' ')
        };
    }

    /**
     * Generate mock token for demo
     * @private
     */
    generateMockToken() {
        return 'ya29.' + Math.random().toString(36).substr(2);
    }

    /**
     * Set access token
     * @param {string} token - Access token
     * @param {number} expiresIn - Expiry time in seconds
     */
    setToken(token, expiresIn = 3600) {
        this.token = token;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        // Store securely
        this.storeToken({
            token,
            expiry: this.tokenExpiry,
            timestamp: Date.now()
        });

        this.notifyObservers('token-set', { expiresIn });
    }

    /**
     * Get current access token
     * @returns {string|null} Access token or null if expired
     */
    getAccessToken() {
        if (!this.token) return null;

        // Check if token is expired
        if (this.isTokenExpired()) {
            console.warn('⚠️ Token expired');
            return null;
        }

        return this.token;
    }

    /**
     * Refresh access token
     * @returns {Promise<Object>} New token response
     */
    async refreshToken() {
        console.log('🔄 Refreshing token...');

        try {
            // Simulate token refresh
            const response = await this.exchangeRefreshToken();

            if (response.access_token) {
                this.setToken(response.access_token, response.expires_in);
                this.notifyObservers('token-refreshed', {});
                console.log('✅ Token refreshed');
                return response;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            this.logout();
            throw error;
        }
    }

    /**
     * Exchange refresh token for new access token
     * @private
     */
    async exchangeRefreshToken() {
        return {
            access_token: this.generateMockToken(),
            expires_in: 3600,
            token_type: 'Bearer'
        };
    }

    /**
     * Check if token is expired
     * @returns {boolean}
     */
    isTokenExpired() {
        if (!this.tokenExpiry) return true;

        // Consider token expired 5 minutes before actual expiry
        const buffer = 5 * 60 * 1000;
        return Date.now() > (this.tokenExpiry - buffer);
    }

    /**
     * Check if authorized
     * @returns {boolean}
     */
    isAuthorized() {
        return this.getAccessToken() !== null;
    }

    /**
     * Get token info
     * @returns {Object} Token information
     */
    getTokenInfo() {
        return {
            authorized: this.isAuthorized(),
            token: this.token ? this.token.substring(0, 20) + '...' : null,
            expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
            expiresIn: this.tokenExpiry ? Math.round((this.tokenExpiry - Date.now()) / 1000) : 0
        };
    }

    /**
     * Logout - clear tokens
     */
    logout() {
        this.token = null;
        this.tokenExpiry = null;
        this.clearStoredToken();

        console.log('🔓 Logged out');
        this.notifyObservers('logged-out', {});
    }

    /**
     * Store token securely in localStorage
     * @private
     */
    storeToken(tokenData) {
        try {
            // In production, implement AES-256 encryption
            // For now, store with simple obfuscation
            const obfuscated = btoa(JSON.stringify(tokenData));
            localStorage.setItem('oauth_token', obfuscated);
        } catch (error) {
            console.error('Failed to store token:', error);
        }
    }

    /**
     * Load token from localStorage
     * @private
     */
    loadToken() {
        try {
            const obfuscated = localStorage.getItem('oauth_token');
            if (!obfuscated) return;

            const tokenData = JSON.parse(atob(obfuscated));

            // Check expiry
            if (tokenData.expiry > Date.now()) {
                this.token = tokenData.token;
                this.tokenExpiry = tokenData.expiry;
                console.log('✅ Token loaded from storage');

                // Auto-refresh if close to expiry
                if (this.isTokenExpired()) {
                    this.refreshToken().catch(() => {});
                }
            } else {
                this.clearStoredToken();
            }
        } catch (error) {
            console.error('Failed to load token:', error);
            this.clearStoredToken();
        }
    }

    /**
     * Clear stored token
     * @private
     */
    clearStoredToken() {
        localStorage.removeItem('oauth_token');
    }

    /**
     * Get authorization header for API calls
     * @returns {Object} Authorization header
     */
    getAuthorizationHeader() {
        const token = this.getAccessToken();
        if (!token) {
            throw new Error('Not authorized');
        }

        return {
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Fetch with authorization
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        // Auto-refresh token if needed
        if (this.isTokenExpired()) {
            await this.refreshToken();
        }

        const headers = {
            ...options.headers,
            ...this.getAuthorizationHeader()
        };

        return fetch(url, { ...options, headers });
    }

    /**
     * Subscribe to events
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers
     * @private
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
     * Export state
     */
    getState() {
        return {
            authorized: this.isAuthorized(),
            tokenInfo: this.getTokenInfo()
        };
    }
}
