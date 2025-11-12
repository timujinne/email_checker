/**
 * Template Service - Centralized template management
 * Handles template storage with backend API + localStorage fallback
 *
 * @module TemplateService
 */

class TemplateService {
    constructor() {
        this.cache = {
            templates: null,
            lastFetch: null
        };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get all templates (built-in + user templates)
     * @returns {Promise<Object>} Object with builtin and user templates
     */
    async getAllTemplates() {
        // Check cache first
        if (this.cache.templates && this.cache.lastFetch) {
            const age = Date.now() - this.cache.lastFetch;
            if (age < this.cacheTimeout) {
                console.log('📦 Using cached templates');
                return this.cache.templates;
            }
        }

        try {
            // Try backend first
            const response = await window.api.get('/api/templates');

            if (response.success) {
                this.cache.templates = response.templates;
                this.cache.lastFetch = Date.now();
                console.log(`✅ Loaded ${response.count.total} templates from backend (${response.count.builtin} builtin, ${response.count.user} user)`);
                return response.templates;
            } else {
                throw new Error(response.error || 'Failed to load templates');
            }
        } catch (error) {
            console.warn('⚠️ Backend unavailable, falling back to localStorage:', error);
            return this.loadFromLocalStorage();
        }
    }

    /**
     * Fallback: Load templates from localStorage
     * @private
     */
    loadFromLocalStorage() {
        try {
            // Load built-in templates (hardcoded reference)
            const builtinTemplates = {
                "italy_hydraulics": { source: "builtin" },
                "germany_manufacturing": { source: "builtin" },
                "generic": { source: "builtin" }
            };

            // Load user templates from localStorage
            const stored = localStorage.getItem('smartFilterTemplates');
            const userTemplates = stored ? JSON.parse(stored) : {};

            const templates = {
                builtin: builtinTemplates,
                user: userTemplates
            };

            console.log(`📦 Loaded from localStorage: ${Object.keys(builtinTemplates).length} builtin, ${Object.keys(userTemplates).length} user`);
            return templates;
        } catch (error) {
            console.error('❌ Failed to load from localStorage:', error);
            return {
                builtin: {},
                user: {}
            };
        }
    }

    /**
     * Save template (to backend with localStorage fallback)
     * @param {string} id - Template ID
     * @param {Object} template - Template configuration
     * @returns {Promise<Object>} Result object
     */
    async saveTemplate(id, template) {
        // Validate template
        if (!template || typeof template !== 'object') {
            throw new Error('Template must be a valid object');
        }

        if (!template.metadata || !template.metadata.name) {
            throw new Error('Template must have metadata.name field');
        }

        try {
            // Try backend first
            const response = await window.api.post('/api/templates', {
                id: id,
                template: template
            });

            if (response.success) {
                console.log(`✅ Template "${template.metadata.name}" saved to backend`);

                // Also save to localStorage as backup
                this.saveToLocalStorage(id, template);

                // Invalidate cache
                this.cache.templates = null;
                this.cache.lastFetch = null;

                if (typeof toast !== 'undefined') {
                    toast.success(`Template saved: ${template.metadata.name}`);
                }

                return { success: true, backend: true, localStorage: true };
            } else {
                throw new Error(response.error || 'Backend save failed');
            }
        } catch (error) {
            console.warn('⚠️ Backend save failed, falling back to localStorage:', error);

            // Fallback to localStorage
            try {
                this.saveToLocalStorage(id, template);

                if (typeof toast !== 'undefined') {
                    toast.warning(`Saved to browser only (backend unavailable)`);
                }

                return { success: true, backend: false, localStorage: true, error: error.message };
            } catch (localError) {
                console.error('❌ localStorage save also failed:', localError);

                if (typeof toast !== 'undefined') {
                    if (localError.name === 'QuotaExceededError') {
                        toast.error('Storage full! Export templates and clear old ones.');
                    } else if (localError.name === 'SecurityError') {
                        toast.error('Cannot save in private browsing mode. Use Export instead.');
                    } else {
                        toast.error(`Failed to save: ${localError.message}`);
                    }
                }

                throw localError;
            }
        }
    }

    /**
     * Save template to localStorage
     * @private
     */
    saveToLocalStorage(id, template) {
        const stored = localStorage.getItem('smartFilterTemplates');
        const templates = stored ? JSON.parse(stored) : {};

        templates[id] = template;

        const data = JSON.stringify(templates);
        localStorage.setItem('smartFilterTemplates', data);

        console.log(`💾 Saved to localStorage (${data.length} bytes)`);
    }

    /**
     * Delete template
     * @param {string} id - Template ID
     * @returns {Promise<Object>} Result object
     */
    async deleteTemplate(id) {
        try {
            // Try backend first
            const response = await window.api.delete(`/api/templates/${id}`);

            if (response.success) {
                console.log(`✅ Template deleted from backend`);

                // Also delete from localStorage
                this.deleteFromLocalStorage(id);

                // Invalidate cache
                this.cache.templates = null;
                this.cache.lastFetch = null;

                if (typeof toast !== 'undefined') {
                    toast.success(response.message);
                }

                return { success: true };
            } else {
                throw new Error(response.error || 'Backend delete failed');
            }
        } catch (error) {
            console.warn('⚠️ Backend delete failed, deleting from localStorage only:', error);

            // Fallback to localStorage
            try {
                this.deleteFromLocalStorage(id);

                if (typeof toast !== 'undefined') {
                    toast.warning('Deleted from browser only (backend unavailable)');
                }

                return { success: true, backend: false, localStorage: true };
            } catch (localError) {
                console.error('❌ localStorage delete failed:', localError);
                throw localError;
            }
        }
    }

    /**
     * Delete template from localStorage
     * @private
     */
    deleteFromLocalStorage(id) {
        const stored = localStorage.getItem('smartFilterTemplates');
        if (!stored) return;

        const templates = JSON.parse(stored);
        delete templates[id];

        localStorage.setItem('smartFilterTemplates', JSON.stringify(templates));
        console.log(`🗑️ Deleted from localStorage`);
    }

    /**
     * Save draft (auto-save)
     * @param {string} component - Component name ('wizard', 'visual_builder', 'json_editor')
     * @param {Object} draft - Draft configuration
     * @returns {Promise<Object>} Result object
     */
    async saveDraft(component, draft) {
        try {
            // Try backend first
            const response = await window.api.post('/api/templates/draft', {
                component: component,
                draft: draft
            });

            if (response.success) {
                console.log(`💾 Draft saved for ${component} at ${response.timestamp}`);
                return { success: true, backend: true };
            } else {
                throw new Error(response.error || 'Backend draft save failed');
            }
        } catch (error) {
            console.warn('⚠️ Backend draft save failed, saving to localStorage:', error);

            // Fallback to localStorage
            try {
                const key = `draft_${component}`;
                const data = {
                    draft: draft,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(key, JSON.stringify(data));

                console.log(`💾 Draft saved to localStorage for ${component}`);
                return { success: true, backend: false, localStorage: true };
            } catch (localError) {
                console.error('❌ localStorage draft save failed:', localError);
                // Silent fail for auto-save
                return { success: false, error: localError.message };
            }
        }
    }

    /**
     * Load draft
     * @param {string} component - Component name ('wizard', 'visual_builder', 'json_editor')
     * @returns {Promise<Object|null>} Draft object or null if not found
     */
    async loadDraft(component) {
        try {
            // Try backend first
            const response = await window.api.get(`/api/templates/draft/${component}`);

            if (response.success && response.draft) {
                console.log(`📄 Draft loaded for ${component} (saved at ${response.saved_at})`);
                return {
                    draft: response.draft,
                    timestamp: response.saved_at
                };
            } else {
                console.log(`ℹ️ No backend draft found for ${component}`);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Backend draft load failed, checking localStorage:', error);

            // Fallback to localStorage
            try {
                const key = `draft_${component}`;
                const stored = localStorage.getItem(key);

                if (stored) {
                    const data = JSON.parse(stored);
                    console.log(`📄 Draft loaded from localStorage for ${component}`);
                    return data;
                } else {
                    console.log(`ℹ️ No localStorage draft found for ${component}`);
                    return null;
                }
            } catch (localError) {
                console.error('❌ localStorage draft load failed:', localError);
                return null;
            }
        }
    }

    /**
     * Clear draft
     * @param {string} component - Component name
     */
    async clearDraft(component) {
        try {
            // Note: Backend doesn't have clear draft endpoint yet
            // Just clear from localStorage
            const key = `draft_${component}`;
            localStorage.removeItem(key);
            console.log(`🗑️ Draft cleared for ${component}`);
        } catch (error) {
            console.error('❌ Failed to clear draft:', error);
        }
    }

    /**
     * Export templates to JSON file
     * @param {Array<string>} ids - Template IDs to export (or null for all)
     */
    async exportTemplates(ids = null) {
        try {
            const templates = await this.getAllTemplates();
            let toExport = {};

            if (ids) {
                // Export specific templates
                ids.forEach(id => {
                    if (templates.user[id]) {
                        toExport[id] = templates.user[id];
                    }
                });
            } else {
                // Export all user templates
                toExport = templates.user;
            }

            // Create download
            const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart_filter_templates_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            if (typeof toast !== 'undefined') {
                toast.success(`Exported ${Object.keys(toExport).length} templates`);
            }

            console.log(`📥 Exported ${Object.keys(toExport).length} templates`);
        } catch (error) {
            console.error('❌ Export failed:', error);
            if (typeof toast !== 'undefined') {
                toast.error(`Export failed: ${error.message}`);
            }
        }
    }

    /**
     * Import templates from JSON file
     * @param {File} file - JSON file with templates
     * @returns {Promise<Object>} Import result
     */
    async importTemplates(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);

                    if (typeof imported !== 'object') {
                        throw new Error('Invalid format: expected JSON object');
                    }

                    let successCount = 0;
                    let failCount = 0;

                    // Import each template
                    for (const [id, template] of Object.entries(imported)) {
                        try {
                            await this.saveTemplate(id, template);
                            successCount++;
                        } catch (error) {
                            console.error(`Failed to import ${id}:`, error);
                            failCount++;
                        }
                    }

                    if (typeof toast !== 'undefined') {
                        if (failCount === 0) {
                            toast.success(`Imported ${successCount} templates`);
                        } else {
                            toast.warning(`Imported ${successCount} templates, ${failCount} failed`);
                        }
                    }

                    resolve({ success: true, imported: successCount, failed: failCount });
                } catch (error) {
                    console.error('❌ Import failed:', error);
                    if (typeof toast !== 'undefined') {
                        toast.error(`Import failed: ${error.message}`);
                    }
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Check localStorage usage and warn if approaching limit
     */
    checkStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }

            const usageMB = totalSize / (1024 * 1024);
            console.log(`📊 localStorage usage: ${usageMB.toFixed(2)}MB`);

            // Warn if > 4MB (5MB is typical limit)
            if (usageMB > 4 && typeof toast !== 'undefined') {
                toast.warning(`localStorage usage: ${usageMB.toFixed(2)}MB / 5MB. Consider exporting templates.`);
            }

            return { bytes: totalSize, mb: usageMB };
        } catch (error) {
            console.error('Failed to check storage usage:', error);
            return null;
        }
    }

    /**
     * Check if browser is in private/incognito mode
     * @returns {Promise<boolean>}
     */
    async isPrivateBrowsing() {
        return new Promise((resolve) => {
            // Try to use filesystem API (not available in private mode)
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then((estimate) => {
                    resolve(estimate.quota < 120000000); // < 120MB usually means private mode
                });
            } else {
                // Fallback: try to set localStorage
                try {
                    localStorage.setItem('__test__', '1');
                    localStorage.removeItem('__test__');
                    resolve(false);
                } catch {
                    resolve(true);
                }
            }
        });
    }
}

// Create singleton instance
const templateService = new TemplateService();

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TemplateService, templateService };
}

// Export for browser (global scope)
if (typeof window !== 'undefined') {
    window.TemplateService = TemplateService;
    window.templateService = templateService;
}
