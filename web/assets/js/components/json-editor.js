/**
 * JSON Editor Component
 * Provides JSON editing with live validation and syntax highlighting
 *
 * @module JSONEditor
 */

class JSONEditor {
    /**
     * Create JSONEditor instance
     * @param {string} containerId - ID of container element
     * @param {Object} initialConfig - Initial configuration object
     * @param {Function} onValidChange - Callback when JSON becomes valid/invalid
     */
    constructor(containerId, initialConfig, onValidChange) {
        this.containerId = containerId;
        this.initialConfig = initialConfig;
        this.onValidChange = onValidChange;
        this.container = document.getElementById(containerId);
        this.currentJson = JSON.stringify(initialConfig, null, 2);
        this.isValid = true;

        // Auto-save setup
        this.autoSaveTimer = null;
        this.autoSaveInterval = 10000; // 10 seconds
        this.lastSavedJson = null;

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.render();
        this.attachEventListeners();
        this.setupAutoSave();
        this.checkForDraft();
    }

    /**
     * Render the JSON editor UI
     */
    render() {
        const html = `
            <div class="json-editor-container">
                <!-- Toolbar -->
                <div class="flex gap-2 mb-4" style="flex-wrap: wrap;">
                    <button id="btn-format" class="btn btn-primary btn-sm">
                        ✨ Format
                    </button>
                    <button id="btn-copy" class="btn btn-ghost btn-sm">
                        📋 Copy
                    </button>
                    <button id="btn-reset" class="btn btn-ghost btn-sm">
                        🔄 Reset
                    </button>
                    <button id="btn-load-template" class="btn btn-ghost btn-sm">
                        📚 Templates
                    </button>
                </div>

                <!-- Status Bar -->
                <div id="json-status" class="mb-3 p-2 rounded text-sm" style="background: #d1fae5; color: #065f46; display: none;">
                    ✓ Valid JSON
                </div>

                <!-- Error Message -->
                <div id="json-error" class="mb-3 p-3 rounded text-sm" style="background: #fee2e2; color: #991b1b; display: none;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">JSON Validation Error:</div>
                    <div id="json-error-message"></div>
                </div>

                <!-- Editor -->
                <textarea id="json-textarea"
                          class="json-editor bg-base-100 text-base-content border-base-300"
                          style="width: 100%; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.6;">
                </textarea>

                <!-- Statistics -->
                <div id="json-stats" class="mt-3 grid grid-cols-4 gap-2 text-xs">
                    <div class="bg-base-200 p-2 rounded">
                        <div class="text-base-content/70">Lines</div>
                        <div id="stat-lines" class="font-mono text-lg font-bold">0</div>
                    </div>
                    <div class="bg-base-200 p-2 rounded">
                        <div class="text-base-content/70">Characters</div>
                        <div id="stat-chars" class="font-mono text-lg font-bold">0</div>
                    </div>
                    <div class="bg-base-200 p-2 rounded">
                        <div class="text-base-content/70">Size</div>
                        <div id="stat-size" class="font-mono text-lg font-bold">0 B</div>
                    </div>
                    <div class="bg-base-200 p-2 rounded">
                        <div class="text-base-content/70">Status</div>
                        <div id="stat-status" class="font-mono text-lg font-bold">✓</div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.textarea = document.getElementById('json-textarea');
        this.textarea.value = this.currentJson;
        this.updateStats();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.textarea.addEventListener('input', () => this.handleInput());
        document.getElementById('btn-format')?.addEventListener('click', () => this.formatJSON());
        document.getElementById('btn-copy')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.reset());
        document.getElementById('btn-load-template')?.addEventListener('click', () => this.showTemplateSelector());
    }

    /**
     * Handle textarea input
     */
    handleInput() {
        this.currentJson = this.textarea.value;
        this.validate();
        this.updateStats();

        // Trigger auto-save
        this.triggerAutoSave();
    }

    /**
     * Validate JSON
     */
    validate() {
        const errorEl = document.getElementById('json-error');
        const statusEl = document.getElementById('json-status');

        try {
            const parsed = JSON.parse(this.currentJson);

            // Validate against schema
            const validation = FilterConfig.validateSchema(parsed);

            if (!validation.valid) {
                throw new Error(validation.errors[0] || 'Configuration validation failed');
            }

            // Valid
            this.isValid = true;
            this.textarea.classList.remove('invalid');
            this.textarea.classList.add('valid');
            errorEl.style.display = 'none';
            statusEl.style.display = 'block';
            statusEl.textContent = '✓ Valid JSON and configuration';
            document.getElementById('stat-status').textContent = '✓';
            document.getElementById('stat-status').style.color = '#065f46';

            if (this.onValidChange) {
                this.onValidChange(true, parsed);
            }

        } catch (e) {
            // Invalid
            this.isValid = false;
            this.textarea.classList.remove('valid');
            this.textarea.classList.add('invalid');
            statusEl.style.display = 'none';
            errorEl.style.display = 'block';

            let errorMsg = e.message;

            // Parse error details
            if (e instanceof SyntaxError) {
                errorMsg = `Syntax Error: ${e.message}`;
            }

            document.getElementById('json-error-message').textContent = errorMsg;
            document.getElementById('stat-status').textContent = '✗';
            document.getElementById('stat-status').style.color = '#991b1b';

            if (this.onValidChange) {
                this.onValidChange(false, null);
            }
        }
    }

    /**
     * Format JSON
     */
    formatJSON() {
        try {
            const parsed = JSON.parse(this.currentJson);
            this.currentJson = JSON.stringify(parsed, null, 2);
            this.textarea.value = this.currentJson;
            this.validate();
            this.updateStats();
        } catch (e) {
            alert('Cannot format: ' + e.message);
        }
    }

    /**
     * Copy JSON to clipboard
     */
    copyToClipboard() {
        navigator.clipboard.writeText(this.currentJson).then(() => {
            const btn = document.getElementById('btn-copy');
            const oldText = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => {
                btn.textContent = oldText;
            }, 2000);
        }).catch(err => {
            alert('Copy failed: ' + err.message);
        });
    }

    /**
     * Reset to initial config
     */
    reset() {
        if (confirm('Reset to initial configuration?')) {
            this.currentJson = JSON.stringify(this.initialConfig, null, 2);
            this.textarea.value = this.currentJson;
            this.validate();
            this.updateStats();
        }
    }

    /**
     * Show template selector
     */
    async showTemplateSelector() {
        // Load built-in templates
        const builtInTemplates = FilterConfig.getTemplates();

        // Load user templates using templateService
        let userTemplates = {};
        if (window.templateService) {
            try {
                const allTemplates = await window.templateService.getAllTemplates();
                userTemplates = allTemplates.user || {};
            } catch (e) {
                console.error('Failed to load templates via templateService:', e);
                // Fallback to localStorage
                try {
                    const stored = localStorage.getItem('smartFilterTemplates');
                    userTemplates = stored ? JSON.parse(stored) : {};
                } catch (e2) {
                    console.error('Failed to load templates from localStorage:', e2);
                }
            }
        } else {
            // Fallback to localStorage if templateService not available
            try {
                const stored = localStorage.getItem('smartFilterTemplates');
                userTemplates = stored ? JSON.parse(stored) : {};
            } catch (e) {
                console.error('Failed to load user templates:', e);
            }
        }

        // Build select options with grouped templates
        let html = '<select id="template-select" style="width: 100%; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; margin-bottom: 1rem;">';

        // Built-in templates group
        if (Object.keys(builtInTemplates).length > 0) {
            html += '<optgroup label="Built-in Templates">';
            for (const [key, template] of Object.entries(builtInTemplates)) {
                const name = template.metadata?.name || key;
                html += `<option value="builtin:${key}">${name}</option>`;
            }
            html += '</optgroup>';
        }

        // User templates group
        if (Object.keys(userTemplates).length > 0) {
            html += '<optgroup label="Your Templates">';
            for (const [key, template] of Object.entries(userTemplates)) {
                const name = template.metadata?.name || key;
                html += `<option value="user:${key}">${name}</option>`;
            }
            html += '</optgroup>';
        }

        // If no templates at all
        if (Object.keys(builtInTemplates).length === 0 && Object.keys(userTemplates).length === 0) {
            html += '<option value="">No templates available</option>';
        }

        html += '</select>';

        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; padding: 1.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Load Template</h3>
                ${html}
                <div style="display: flex; gap: 0.5rem;">
                    <button id="btn-load" class="btn btn-primary" style="flex: 1;">
                        Load
                    </button>
                    <button id="btn-cancel" class="btn btn-ghost" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        overlay.appendChild(dialog);

        document.body.appendChild(overlay);

        const btnLoad = document.getElementById('btn-load');
        if (btnLoad) {
            btnLoad.addEventListener('click', () => {
                const selected = document.getElementById('template-select').value;

                if (!selected || selected === '') {
                    overlay.remove();
                    return;
                }

                // Parse type and key from value (format: "type:key")
                const [type, key] = selected.split(':');
                let template;

                if (type === 'builtin') {
                    template = builtInTemplates[key];
                } else if (type === 'user') {
                    template = userTemplates[key];
                }

                if (template) {
                    this.currentJson = JSON.stringify(template, null, 2);
                    this.textarea.value = this.currentJson;
                    this.validate();
                    this.updateStats();

                    if (typeof toast !== 'undefined') {
                        toast.success(`Loaded template: ${template.metadata?.name || key}`);
                    }

                    console.log(`Loaded ${type} template: ${key}`);
                }

                overlay.remove();
            });
        }

        const btnCancel = document.getElementById('btn-cancel');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                overlay.remove();
            });
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    /**
     * Update statistics
     */
    updateStats() {
        const lines = this.currentJson.split('\n').length;
        const chars = this.currentJson.length;
        const bytes = new Blob([this.currentJson]).size;

        document.getElementById('stat-lines').textContent = lines.toString();
        document.getElementById('stat-chars').textContent = chars.toString();
        document.getElementById('stat-size').textContent = this.formatBytes(bytes);
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get current JSON as object
     */
    getConfig() {
        try {
            return JSON.parse(this.currentJson);
        } catch (e) {
            return null;
        }
    }

    /**
     * Set JSON from object
     */
    setConfig(config) {
        this.currentJson = JSON.stringify(config, null, 2);
        this.textarea.value = this.currentJson;
        this.validate();
        this.updateStats();
    }

    /**
     * Check if JSON is valid
     */
    isJsonValid() {
        return this.isValid;
    }

    /**
     * Get error message
     */
    getError() {
        return document.getElementById('json-error-message')?.textContent || '';
    }

    // ========== Auto-Save Draft Methods ==========

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Debounced auto-save function
        this.debouncedAutoSave = this.debounce(() => {
            this.performAutoSave();
        }, this.autoSaveInterval);
    }

    /**
     * Debounce helper function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Perform auto-save of current JSON
     */
    async performAutoSave() {
        // Only save if JSON is valid
        if (!this.isValid) {
            console.log('⏭️ JSON invalid, skipping auto-save');
            return;
        }

        // Check if JSON has changed since last save
        if (this.currentJson === this.lastSavedJson) {
            console.log('⏭️ JSON unchanged, skipping auto-save');
            return;
        }

        // Save draft using template service
        if (window.templateService) {
            try {
                const config = JSON.parse(this.currentJson);
                await window.templateService.saveDraft('json_editor', config);
                this.lastSavedJson = this.currentJson;
                console.log('💾 Auto-saved JSON draft');
            } catch (error) {
                console.error('❌ Auto-save failed:', error);
            }
        }
    }

    /**
     * Trigger auto-save (called after JSON changes)
     */
    triggerAutoSave() {
        if (this.debouncedAutoSave) {
            this.debouncedAutoSave();
        }
    }

    /**
     * Check for existing draft and offer to restore
     */
    async checkForDraft() {
        if (!window.templateService) {
            console.warn('⚠️ TemplateService not available');
            return;
        }

        try {
            const draftData = await window.templateService.loadDraft('json_editor');

            if (draftData && draftData.draft) {
                this.showDraftRestoreModal(draftData);
            }
        } catch (error) {
            console.error('❌ Failed to check for draft:', error);
        }
    }

    /**
     * Show modal to restore draft
     */
    showDraftRestoreModal(draftData) {
        const savedDate = new Date(draftData.timestamp);
        const timeAgo = this.getTimeAgo(savedDate);

        const modalHtml = `
            <div id="json-draft-restore-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
                    <!-- Header -->
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-4xl">📝</div>
                        <div>
                            <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                                Unsaved JSON Draft Found
                            </h3>
                            <p class="text-sm text-base-content/70">
                                Saved ${timeAgo}
                            </p>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="mb-6">
                        <p class="text-slate-700 dark:text-slate-300 mb-2">
                            You have an unsaved JSON configuration from a previous session. Would you like to restore it?
                        </p>
                        <div class="text-sm text-base-content/70">
                            <p><strong>Filter:</strong> ${draftData.draft.metadata?.name || 'Untitled'}</p>
                            <p><strong>Target:</strong> ${draftData.draft.target?.country || 'N/A'} • ${draftData.draft.target?.industry || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3">
                        <button onclick="window.currentJsonEditor?.restoreDraft()"
                                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Restore Draft
                        </button>
                        <button onclick="window.currentJsonEditor?.discardDraft()"
                                class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Store draft data temporarily
        this.pendingDraft = draftData.draft;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Restore draft
     */
    restoreDraft() {
        if (this.pendingDraft) {
            // Update JSON in textarea
            this.currentJson = JSON.stringify(this.pendingDraft, null, 2);
            this.textarea.value = this.currentJson;

            this.pendingDraft = null;

            // Validate and update
            this.validate();
            this.updateStats();

            // Close modal
            document.getElementById('json-draft-restore-modal')?.remove();

            if (typeof toast !== 'undefined') {
                toast.success('JSON draft restored successfully');
            }

            console.log('✅ JSON draft restored');
        }
    }

    /**
     * Discard draft
     */
    async discardDraft() {
        this.pendingDraft = null;

        // Clear draft from backend/localStorage
        if (window.templateService) {
            await window.templateService.clearDraft('json_editor');
        }

        // Close modal
        document.getElementById('json-draft-restore-modal')?.remove();

        if (typeof toast !== 'undefined') {
            toast.info('Draft discarded');
        }

        console.log('🗑️ JSON draft discarded');
    }

    /**
     * Get human-readable time ago string
     * @param {Date} date - Date to format
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';

        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' days ago';

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';

        return Math.floor(seconds) + ' seconds ago';
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JSONEditor };
}

// Export for browser (global scope)
if (typeof window !== 'undefined') {
    window.JSONEditor = JSONEditor;
}
