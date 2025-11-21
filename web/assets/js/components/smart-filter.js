/**
 * Smart Filter Studio - Main Orchestrator
 * Coordinates all filter components and manages the overall flow
 *
 * @module SmartFilter
 */

class SmartFilter {
    constructor() {
        this.currentConfig = FilterConfig.getDefaultConfig();
        this.filterConfig = new FilterConfig();
        this.visualBuilder = null;
        this.jsonEditor = null;
        this.filterWizard = null;
        this.templateLibrary = null;
        this.filterTester = null;
        this.currentTab = 'visual';
        this.abortController = null;

        this.init();
    }

    /**
     * Initialize Smart Filter Studio
     */
    init() {
        console.log('🎯 Initializing Smart Filter Studio...');

        // Setup tab switching
        this.setupTabSwitching();

        // Initialize components
        this.initVisualBuilder();
        this.initJsonEditor();
        this.initWizard();
        this.initTemplateLibrary();
        this.initTester();

        // Setup action buttons
        this.setupActionButtons();

        console.log('✅ Smart Filter Studio initialized');
    }

    /**
     * Setup tab switching functionality
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Reinitialize component if needed
        if (tabName === 'json') {
            this.syncJsonEditor();
        } else if (tabName === 'visual') {
            this.syncVisualBuilder();
        }
    }

    /**
     * Initialize Visual Filter Builder
     */
    initVisualBuilder() {
        this.visualBuilder = new VisualFilterBuilder(
            'visual-builder-container',
            this.currentConfig,
            (config) => this.handleConfigChange(config, 'visual')
        );

        // Expose to window for template modal buttons
        window.currentVisualBuilder = this.visualBuilder;
    }

    /**
     * Initialize JSON Editor
     */
    initJsonEditor() {
        this.jsonEditor = new JSONEditor(
            'json-editor-container',
            this.currentConfig,
            (isValid, config) => {
                if (isValid) {
                    this.handleConfigChange(config, 'json');
                }
            }
        );

        // Expose to window for modal buttons
        window.currentJsonEditor = this.jsonEditor;
    }

    /**
     * Initialize Filter Wizard
     */
    initWizard() {
        this.filterWizard = new FilterWizard(
            'filter-wizard-container',
            (result) => this.handleWizardComplete(result)
        );
        this.filterWizard.setConfig(this.currentConfig);
    }

    /**
     * Initialize Template Library
     */
    initTemplateLibrary() {
        this.templateLibrary = new TemplateLibrary(
            'templates-container',
            (template) => this.loadTemplate(template)
        );
    }

    /**
     * Initialize Filter Tester
     */
    initTester() {
        this.filterTester = new FilterTester(
            'tester-container',
            this.currentConfig
        );
    }

    /**
     * Handle configuration changes from any component
     */
    handleConfigChange(config, source) {
        this.currentConfig = FilterConfig.clone(config);

        // Validate
        const validation = FilterConfig.validateSchema(this.currentConfig);
        if (!validation.valid) {
            console.warn('Config validation failed:', validation.errors);
            return;
        }

        // Sync other components
        if (source !== 'visual') {
            this.syncVisualBuilder();
        }

        if (source !== 'json') {
            this.syncJsonEditor();
        }

        this.syncTester();

        // Update JSON preview
        this.updateJsonPreview();

        console.log('⚙️ Config updated:', this.currentConfig.metadata.name);
    }

    /**
     * Sync Visual Builder with current config
     */
    syncVisualBuilder() {
        if (this.visualBuilder) {
            this.visualBuilder.setConfig(this.currentConfig);
        }
    }

    /**
     * Sync JSON Editor with current config
     */
    syncJsonEditor() {
        if (this.jsonEditor) {
            this.jsonEditor.setConfig(this.currentConfig);
        }
    }

    /**
     * Sync Tester with current config
     */
    syncTester() {
        if (this.filterTester) {
            this.filterTester.updateConfig(this.currentConfig);
        }
    }

    /**
     * Update JSON preview in visual builder tab
     */
    updateJsonPreview() {
        const previewEl = document.getElementById('json-preview-container');
        if (previewEl) {
            const json = JSON.stringify(this.currentConfig, null, 2);
            previewEl.innerHTML = `
                <h3 class="text-lg font-semibold mb-3">📄 JSON Preview</h3>
                <pre class="bg-base-200 text-base-content p-4 rounded-lg overflow-x-auto overflow-y-auto font-mono text-sm" style="max-height: 400px;">
${json}
                </pre>
                <button id="btn-copy-json" class="btn btn-primary w-full mt-4">
                    📋 Copy JSON
                </button>
            `;

            document.getElementById('btn-copy-json')?.addEventListener('click', () => {
                navigator.clipboard.writeText(json).then(() => {
                    toast.success('JSON copied to clipboard');
                });
            });
        }
    }

    /**
     * Load template
     */
    loadTemplate(template) {
        this.currentConfig = FilterConfig.clone(template);
        this.handleConfigChange(this.currentConfig, 'template');
        this.switchTab('visual');
        toast.success(`Loaded template: ${template.metadata.name}`);
    }

    /**
     * Handle wizard completion
     */
    handleWizardComplete(result) {
        const exportType = result.exportType;
        const mode = result.mode; // 'clean' or 'raw'

        if (mode === 'raw' && exportType === 'apply') {
            this.startFullWorkflow(result);
            return;
        }

        switch (exportType) {
            case 'apply':
                this.applyFilter();
                break;
            case 'save':
                this.saveAsTemplate();
                break;
            case 'download':
                this.downloadJSON();
                break;
        }
    }

    /**
     * Setup action buttons
     */
    setupActionButtons() {
        const saveBtn = document.getElementById('save-filter-btn');
        const applyBtn = document.getElementById('apply-filter-btn');
        const resetBtn = document.getElementById('reset-btn');

        saveBtn?.addEventListener('click', () => this.saveAsTemplate());
        applyBtn?.addEventListener('click', () => this.applyFilter());
        resetBtn?.addEventListener('click', () => this.resetFilter());
    }

    /**
     * Save filter as template
     */
    saveAsTemplate() {
        const name = prompt('Template name:', this.currentConfig.metadata.name);
        if (!name) return;

        const desc = prompt('Description:', this.currentConfig.metadata.description);

        this.templateLibrary.saveTemplate(this.currentConfig, name, desc || '');
    }

    /**
     * Apply filter to lists
     */
    async applyFilter() {
        try {
            // Validate configuration first
            if (!this.filterConfig.isValid()) {
                throw new Error('Configuration is invalid. Please check your filter settings.');
            }

            // Check connection before proceeding
            const isConnected = await this.checkConnection();
            if (!isConnected) {
                this.showConnectionError();
                return;
            }

            // Show confirmation dialog
            ModalService.confirm(
                'Apply Filter',
                `Apply filter "${this.currentConfig.metadata.name}" to selected lists?`,
                async () => {
                    await this.executeApplyFilter();
                }
            );

        } catch (error) {
            console.error('❌ Error in applyFilter:', error);
            toast.error(this.formatError(error));
        }
    }

    /**
     * Execute filter application with full error handling
     */
    async executeApplyFilter() {
        try {
            // Show loading state
            this.showLoading('Applying filter...');

            // Create abort controller for cancellation
            this.abortController = new AbortController();

            // Execute with retry logic
            const response = await this.retryWithBackoff(
                async () => {
                    const result = await api.post('/api/smart-filter/apply', {
                        config: this.currentConfig,
                        timestamp: new Date().toISOString()
                    }, {
                        signal: this.abortController.signal,
                        timeout: 60000 // 60 second timeout for filter operations
                    });

                    if (!result || !result.data) {
                        throw new Error('Invalid response from server');
                    }

                    if (!result.data.success) {
                        throw new Error(result.data.error || 'Filter application failed');
                    }

                    return result.data;
                },
                {
                    maxRetries: 3,
                    onRetry: (attempt, max, delay) => {
                        this.updateLoading(
                            'Retrying...',
                            `Attempt ${attempt} of ${max} (waiting ${Math.round(delay / 1000)}s)`
                        );
                    }
                }
            );

            // Success
            toast.success('Filter applied successfully!');
            console.log('✓ Filter applied:', response);

            // Optionally refresh results or navigate to results page
            if (response.output_files) {
                this.showSuccessModal(response);
            }

        } catch (error) {
            console.error('❌ Error executing filter:', error);

            // Check if operation was cancelled
            if (error.name === 'AbortError') {
                toast.info('Operation cancelled by user');
                return;
            }

            // Show error with recovery options
            const errorMessage = this.formatError(error);
            toast.error(errorMessage);
            this.showRetryOption(error);

        } finally {
            // Always hide loading state and cleanup
            this.hideLoading();
            this.abortController = null;
        }
    }

    /**
     * Start full workflow (Base Filter -> Smart Filter)
     */
    async startFullWorkflow(wizardResult) {
        try {
            const { selectedList, config, scoreThreshold, skipBaseFiltering } = wizardResult;

            // Show loading state with logs
            this.showLoading('Initializing workflow...', true);

            // Create abort controller
            this.abortController = new AbortController();

            const payload = {
                input_file: selectedList.filename || selectedList,
                config_name: config.metadata?.name || 'custom', // Backend expects a name or uses default
                // If custom config, we might need to pass the full config object if backend supports it,
                // but currently backend seems to rely on config_name or hardcoded logic.
                // For now, we'll assume we pass the config object if supported, or just parameters.
                // The backend `handle_smart_filter_workflow` takes `config_name`.
                // If it's a custom config from wizard, we might need to save it first or pass it.
                // Let's pass the full config in the payload just in case backend is updated to use it.
                config: config,
                score_threshold: parseFloat(scoreThreshold || 30),
                skip_base_filtering: skipBaseFiltering
            };

            console.log('Starting full workflow:', payload);

            const response = await api.post('/api/smart-filter/workflow', payload, {
                signal: this.abortController.signal
            });

            if (response.data.success) {
                console.log('Workflow started:', response.data);
                this.monitorProgress();
            } else {
                throw new Error(response.data.error || 'Failed to start workflow');
            }

        } catch (error) {
            console.error('❌ Error starting workflow:', error);
            this.hideLoading();
            toast.error(this.formatError(error));
        }
    }

    /**
     * Monitor workflow progress
     */
    monitorProgress() {
        // Poll every 2 seconds
        const interval = setInterval(async () => {
            // Check if cancelled
            if (!this.abortController) {
                clearInterval(interval);
                return;
            }

            try {
                const response = await api.get('/api/processing-status');
                const data = response.data;

                // Update UI
                this.updateProgressUI(data);

                // Check if completed
                if (!data.is_running) {
                    clearInterval(interval);
                    this.hideLoading();

                    // Show results
                    this.showSuccessModal({
                        output_files: [], // Backend might not return files in status, need to check
                        message: 'Workflow completed successfully!'
                    });

                    // Refresh lists if needed
                    if (window.listsManager) {
                        window.listsManager.loadLists();
                    }
                }

            } catch (error) {
                console.error('Error monitoring progress:', error);
                // Don't stop polling on transient errors
            }
        }, 2000);
    }

    /**
     * Update progress UI with logs
     */
    updateProgressUI(data) {
        const logs = data.logs || [];
        const lastLog = logs[logs.length - 1];

        if (lastLog) {
            this.updateLoading(lastLog.message, `Last update: ${lastLog.timestamp}`);
        }

        // Update log container if exists
        const logContainer = document.getElementById('loading-logs');
        if (logContainer) {
            logContainer.innerHTML = logs.slice(-5).map(log =>
                `<div class="text-xs text-gray-400"><span class="text-gray-500">[${log.timestamp}]</span> ${log.message}</div>`
            ).join('');
        }
    }

    /**
     * Retry API call with exponential backoff
     */
    async retryWithBackoff(fn, options = {}) {
        const {
            maxRetries = 3,
            initialDelay = 1000,
            maxDelay = 10000,
            backoffMultiplier = 2,
            onRetry = null
        } = options;

        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await fn();
                return result;

            } catch (error) {
                lastError = error;

                // Don't retry on validation errors (4xx except 429)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // Don't retry on abort
                if (error.name === 'AbortError') {
                    throw error;
                }

                // Last attempt failed
                if (attempt === maxRetries) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    initialDelay * Math.pow(backoffMultiplier, attempt),
                    maxDelay
                );

                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);

                if (onRetry) {
                    onRetry(attempt + 1, maxRetries, delay);
                }

                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if backend is reachable
     */
    async checkConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/status', {
                method: 'GET',
                cache: 'no-cache',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;

        } catch (error) {
            console.warn('Connection check failed:', error);
            return false;
        }
    }

    /**
     * Show connection error
     */
    showConnectionError() {
        toast.error('Cannot connect to server. Please check your connection and try again.');
    }

    /**
     * Format error for user display
     */
    formatError(error) {
        // Network errors
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            return 'Network connection lost. Please check your internet connection.';
        }

        // Timeout errors
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            return 'Request took too long. The server might be busy. Please try again.';
        }

        // HTTP errors with status codes
        if (error.status) {
            switch (error.status) {
                case 400:
                    return 'Invalid request. Please check your filter configuration.';
                case 401:
                    return 'Authentication required. Please log in.';
                case 403:
                    return 'Access denied. You do not have permission for this operation.';
                case 404:
                    return 'Resource not found. The endpoint may not exist.';
                case 413:
                    return 'Configuration too large. Please reduce the size of your filter.';
                case 429:
                    return 'Too many requests. Please wait a moment and try again.';
                case 500:
                    return 'Server error. Please try again later.';
                case 503:
                    return 'Service unavailable. Please try again in a moment.';
                default:
                    return `Server error (${error.status}). Please contact support if this persists.`;
            }
        }

        // Validation errors
        if (error.message && (error.message.includes('invalid') || error.message.includes('validation'))) {
            return `Validation error: ${error.message}`;
        }

        // Configuration errors
        if (error.message && error.message.includes('Configuration')) {
            return error.message;
        }

        // Generic errors
        return error.message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Show loading overlay with progress message
     */
    showLoading(message = 'Processing...') {
        // Remove existing overlay if any
        this.hideLoading();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'smart-filter-loading';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
                <div class="flex items-center space-x-4 mb-4">
                    <div class="spinner-border animate-spin rounded-full h-12 w-12 border-b-2 border-primary flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-lg font-semibold dark:text-white truncate" id="loading-message">${message}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate" id="loading-progress"></p>
                    </div>
                </div>
                
                <!-- Logs Container -->
                <div id="loading-logs" class="bg-gray-900 rounded p-3 h-32 overflow-y-auto font-mono text-xs mb-4 hidden">
                    <!-- Logs will appear here -->
                </div>

                <button class="btn btn-sm btn-ghost mt-2 w-full" onclick="window.smartFilterCancelOperation()">
                    Cancel
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Show logs container if requested
        if (arguments[1] === true) { // showLogs param
            const logs = document.getElementById('loading-logs');
            if (logs) logs.classList.remove('hidden');
        }
    }

    /**
     * Update loading message
     */
    updateLoading(message, progress = '') {
        const messageEl = document.getElementById('loading-message');
        const progressEl = document.getElementById('loading-progress');

        if (messageEl) messageEl.textContent = message;
        if (progressEl) progressEl.textContent = progress;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('smart-filter-loading');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Cancel ongoing operation
     */
    cancelOperation() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            toast.info('Operation cancelled');
            this.hideLoading();
        }
    }

    /**
     * Show retry option to user
     */
    showRetryOption(error) {
        const modalContent = `
            <div class="text-center">
                <div class="alert alert-error mb-4">
                    <svg class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>${this.formatError(error)}</span>
                </div>

                <div class="flex gap-2 justify-center">
                    <button class="btn btn-primary" onclick="window.smartFilterRetry()">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                    </button>
                    <button class="btn btn-ghost" onclick="window.ModalService?.closeAll()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        if (window.ModalService) {
            window.ModalService.show('Operation Failed', modalContent, {
                closable: true,
                size: 'medium'
            });
        }
    }

    /**
     * Show success modal with results
     */
    showSuccessModal(response) {
        const files = response.output_files || [];
        const fileList = files.map(f => `<li class="text-sm">📄 ${f}</li>`).join('');

        const modalContent = `
            <div class="text-center">
                <div class="alert alert-success mb-4">
                    <svg class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Filter applied successfully!</span>
                </div>

                ${files.length > 0 ? `
                    <div class="text-left mb-4">
                        <p class="font-semibold mb-2">Output files:</p>
                        <ul class="list-disc list-inside space-y-1">
                            ${fileList}
                        </ul>
                    </div>
                ` : ''}

                <button class="btn btn-primary w-full" onclick="window.ModalService?.closeAll()">
                    OK
                </button>
            </div>
        `;

        if (window.ModalService) {
            window.ModalService.show('Success', modalContent, {
                closable: true,
                size: 'medium'
            });
        }
    }

    /**
     * Download filter as JSON
     */
    downloadJSON() {
        const json = JSON.stringify(this.currentConfig, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filter_${this.currentConfig.metadata.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Filter downloaded');
    }

    /**
     * Reset filter to default
     */
    resetFilter() {
        if (confirm('Reset to default configuration?')) {
            this.currentConfig = FilterConfig.getDefaultConfig();
            this.handleConfigChange(this.currentConfig, 'reset');
            toast.success('Filter reset to default');
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return this.currentConfig;
    }

    /**
     * Export configuration
     */
    exportConfig() {
        return JSON.stringify(this.currentConfig, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    importConfig(jsonString) {
        const result = FilterConfig.parseJSON(jsonString);
        if (result.success) {
            this.currentConfig = result.config;
            this.handleConfigChange(this.currentConfig, 'import');
            toast.success('Configuration imported');
            return true;
        } else {
            toast.error('Invalid configuration: ' + result.error);
            return false;
        }
    }
}

// Make retry and cancel functions available globally for button clicks
window.smartFilterRetry = () => {
    if (window.smartFilterInstance) {
        window.ModalService?.closeAll();
        window.smartFilterInstance.executeApplyFilter();
    }
};

window.smartFilterCancelOperation = () => {
    if (window.smartFilterInstance) {
        window.smartFilterInstance.cancelOperation();
    }
};

// Export for use in other modules
// Note: Initialization is handled by main.js router handler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartFilter };
}
