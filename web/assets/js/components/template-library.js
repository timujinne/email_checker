/**
 * Template Library Component
 * Manages filter templates (save, load, delete, export, import)
 *
 * @module TemplateLibrary
 */

class TemplateLibrary {
    constructor(containerId, onTemplateSelect) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.onTemplateSelect = onTemplateSelect;
        this.userTemplates = {};
        this.builtInTemplates = FilterConfig.getTemplates();
        this.backendConfigs = [];  // Backend Smart Filter configs from API
        this.isLoading = true;

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Load templates asynchronously
        this.init();
    }

    /**
     * Initialize component (async)
     */
    async init() {
        await this.loadAllTemplates();
        this.isLoading = false;
        this.render();
    }

    /**
     * Load all templates using templateService
     */
    async loadAllTemplates() {
        // Load user templates
        if (window.templateService) {
            try {
                const allTemplates = await window.templateService.getAllTemplates();
                this.userTemplates = allTemplates.user || {};
                console.log(`✅ Loaded ${Object.keys(this.userTemplates).length} user templates via templateService`);
            } catch (e) {
                console.error('Error loading templates via templateService:', e);
                // Fallback to localStorage
                this.userTemplates = this.loadUserTemplatesFromLocalStorage();
            }
        } else {
            // Fallback to localStorage if templateService not available
            console.warn('templateService not available, using localStorage');
            this.userTemplates = this.loadUserTemplatesFromLocalStorage();
        }

        // Load backend configs
        await this.loadBackendConfigs();
    }

    /**
     * Load backend Smart Filter configs from API
     */
    async loadBackendConfigs() {
        try {
            const response = await fetch('/api/smart-filter/available');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.success && data.filters) {
                this.backendConfigs = data.filters;
                console.log(`✅ Loaded ${this.backendConfigs.length} backend configs from API`);
            }
        } catch (e) {
            console.error('Error loading backend configs:', e);
            this.backendConfigs = [];
        }
    }

    /**
     * Fallback: Load user templates from localStorage
     */
    loadUserTemplatesFromLocalStorage() {
        try {
            const stored = localStorage.getItem('smartFilterTemplates');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error loading templates from localStorage:', e);
            return {};
        }
    }

    /**
     * Render template library UI
     */
    render() {
        const html = `
            <!-- Tabs and Actions Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #cbd5e1;">
                <!-- Tabs -->
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="template-tab-btn active" data-template-tab="backend" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: #1e40af;">
                        🚀 Backend Configs (${this.backendConfigs.length})
                    </button>
                    <button class="template-tab-btn" data-template-tab="builtin" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: #64748b;">
                        📚 Built-in Templates
                    </button>
                    <button class="template-tab-btn" data-template-tab="custom" style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 500; color: #64748b;">
                        ⭐ My Templates (${Object.keys(this.userTemplates).length})
                    </button>
                </div>

                <!-- Export/Import Actions -->
                <div style="display: flex; gap: 0.5rem; padding-bottom: 0.75rem;">
                    <button id="btn-export-all" style="padding: 0.5rem 1rem; background: #065f46; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;">
                        📥 Export All
                    </button>
                    <button id="btn-import" style="padding: 0.5rem 1rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;">
                        📤 Import
                    </button>
                </div>
            </div>

            <!-- Backend Configs Tab (shown by default) -->
            <div id="template-tab-backend" class="templates-grid">
                ${this.renderBackendConfigs()}
            </div>

            <!-- Built-in Templates Tab -->
            <div id="template-tab-builtin" class="templates-grid" style="display: none;">
                ${this.renderBuiltInTemplates()}
            </div>

            <!-- User Templates Tab -->
            <div id="template-tab-custom" class="templates-grid" style="display: none;">
                ${this.renderUserTemplates()}
            </div>

            <!-- Hidden file input for import -->
            <input type="file" id="template-import-input" accept=".json" style="display: none;"/>

            <!-- Save as Template Modal (hidden) -->
            <div id="save-template-modal" style="display: none;">
                <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; padding: 1.5rem; max-width: 400px;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Save as Template</h3>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Template Name</label>
                        <input type="text" id="template-name" placeholder="e.g., Italy Motors"
                               class="input input-bordered w-full">
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Description</label>
                        <textarea id="template-desc" placeholder="What is this template for?"
                                  class="textarea textarea-bordered w-full" style="height: 60px;"></textarea>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button id="btn-save-template" class="btn btn-success" style="flex: 1;">
                            Save
                        </button>
                        <button id="btn-cancel-save" class="btn btn-ghost" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachListeners();
    }

    /**
     * Render built-in templates
     */
    renderBuiltInTemplates() {
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">';

        for (const [key, template] of Object.entries(this.builtInTemplates)) {
            html += `
                <div class="template-card bg-base-100 text-base-content border border-base-300" style="border-radius: 0.5rem; padding: 1.5rem;">
                    <h4 style="font-weight: 600; margin-bottom: 0.5rem;">${template.metadata.name}</h4>
                    <p class="text-base-content/70" style="font-size: 0.875rem; margin-bottom: 1rem;">${template.metadata.description}</p>

                    <div class="text-base-content/60" style="font-size: 0.75rem; margin-bottom: 1rem;">
                        <div>🎯 ${template.target.country} - ${template.target.industry}</div>
                        <div>📊 v${template.metadata.version}</div>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-use-template" data-key="${key}"
                                style="flex: 1; padding: 0.5rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            Use
                        </button>
                        <button class="btn-view-template" data-key="${key}"
                                style="flex: 1; padding: 0.5rem; background: #cbd5e1; color: #1e293b; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            View
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render user templates
     */
    renderUserTemplates() {
        const templates = Object.entries(this.userTemplates);

        if (templates.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                    <p>No custom templates yet. Save your first template!</p>
                </div>
            `;
        }

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">';

        for (const [key, template] of templates) {
            html += `
                <div class="template-card bg-base-100 text-base-content border-2 border-success" style="border-radius: 0.5rem; padding: 1.5rem;">
                    <h4 style="font-weight: 600; margin-bottom: 0.5rem;">⭐ ${template.metadata.name}</h4>
                    <p class="text-base-content/70" style="font-size: 0.875rem; margin-bottom: 1rem;">${template.metadata.description}</p>

                    <div class="text-base-content/60" style="font-size: 0.75rem; margin-bottom: 1rem;">
                        <div>📅 ${new Date(template.metadata.created).toLocaleDateString()}</div>
                        <div>🎯 ${template.target.country}</div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-use-template" data-key="${key}"
                                style="flex: 1; min-width: 70px; padding: 0.5rem; background: #065f46; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            Use
                        </button>
                        <button class="btn-export-template" data-key="${key}"
                                style="padding: 0.5rem 0.75rem; background: #cbd5e1; color: #1e293b; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            📥
                        </button>
                        <button class="btn-delete-template" data-key="${key}"
                                style="padding: 0.5rem 0.75rem; background: #991b1b; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render backend Smart Filter configs
     */
    renderBackendConfigs() {
        if (this.backendConfigs.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚙️</div>
                    <p>No backend configs available. Check API connection.</p>
                </div>
            `;
        }

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">';

        for (const config of this.backendConfigs) {
            // Check if this is universal template
            const isUniversal = config.name === 'universal_exclusion_template';
            const borderStyle = isUniversal ? 'border-2 border-warning' : 'border border-info';
            const icon = isUniversal ? '🌍' : '🚀';

            html += `
                <div class="template-card bg-base-100 text-base-content ${borderStyle}" style="border-radius: 0.5rem; padding: 1.5rem;">
                    <h4 style="font-weight: 600; margin-bottom: 0.5rem;">${icon} ${config.display_name}</h4>

                    <div class="text-base-content/60" style="font-size: 0.75rem; margin-bottom: 1rem;">
                        <div>🎯 ${config.target_market} - ${config.target_industry}</div>
                        <div>📊 v${config.version}</div>
                        <div>🔧 Config: ${config.config_name}</div>
                    </div>

                    ${isUniversal ? `
                        <div style="background: #fef3c7; color: #92400e; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; margin-bottom: 1rem;">
                            ⚡ Universal template with 13 exclusion categories (EN/DE/FR)
                        </div>
                    ` : ''}

                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-load-backend-config" data-config-name="${config.name}"
                                style="flex: 1; padding: 0.5rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            Load
                        </button>
                        <button class="btn-view-backend-config" data-config-name="${config.name}"
                                style="flex: 1; padding: 0.5rem; background: #cbd5e1; color: #1e293b; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            View
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Attach event listeners
     */
    attachListeners() {
        // Tab switching (scoped to template tabs only)
        document.querySelectorAll('.template-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.templateTab;

                // Update button states (only template tabs)
                document.querySelectorAll('.template-tab-btn').forEach(b => b.style.borderBottomColor = 'transparent');
                e.target.style.borderBottomColor = '#1e40af';

                // Hide/show template tab content (scoped selector)
                document.querySelectorAll('[id^="template-tab-"]').forEach(el => el.style.display = 'none');
                document.getElementById(`template-tab-${tab}`).style.display = 'block';
            });
        });

        // Use template buttons
        document.querySelectorAll('.btn-use-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                const isBuitIn = this.builtInTemplates[key];
                const template = isBuitIn ? this.builtInTemplates[key] : this.userTemplates[key];

                if (this.onTemplateSelect) {
                    this.onTemplateSelect(template);
                }
                toast.success(`Loaded template: ${template.metadata.name}`);
            });
        });

        // View template buttons
        document.querySelectorAll('.btn-view-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                const template = this.builtInTemplates[key];
                this.showTemplateDetails(template);
            });
        });

        // Export template buttons
        document.querySelectorAll('.btn-export-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.exportTemplate(key);
            });
        });

        // Delete template buttons
        document.querySelectorAll('.btn-delete-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                this.deleteTemplate(key);
            });
        });

        // Load backend config buttons
        document.querySelectorAll('.btn-load-backend-config').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const configName = e.target.dataset.configName;
                await this.loadBackendConfig(configName);
            });
        });

        // View backend config buttons
        document.querySelectorAll('.btn-view-backend-config').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const configName = e.target.dataset.configName;
                await this.viewBackendConfig(configName);
            });
        });

        // Export All button
        const btnExportAll = document.getElementById('btn-export-all');
        if (btnExportAll) {
            btnExportAll.addEventListener('click', () => {
                this.exportAllTemplates();
            });
        }

        // Import button
        const btnImport = document.getElementById('btn-import');
        if (btnImport) {
            btnImport.addEventListener('click', () => {
                this.showImportDialog();
            });
        }

        // File input for import
        const fileInput = document.getElementById('template-import-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleImportFile(e.target.files[0]);
                e.target.value = ''; // Reset input
            });
        }
    }

    /**
     * Show template details
     */
    showTemplateDetails(template) {
        const json = JSON.stringify(template, null, 2);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;';

        overlay.innerHTML = `
            <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; padding: 1.5rem;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">${template.metadata.name}</h3>
                <pre class="bg-base-200" style="padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-size: 0.875rem;">${json}</pre>
                <button onclick="this.closest('div').parentElement.remove()" class="btn btn-primary w-full" style="margin-top: 1rem;">
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Export template as JSON
     */
    exportTemplate(key) {
        const template = this.userTemplates[key];
        const json = JSON.stringify(template, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.metadata.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Template exported');
    }

    /**
     * Delete template
     */
    async deleteTemplate(key) {
        if (confirm(`Delete template "${this.userTemplates[key].metadata.name}"?`)) {
            // Use templateService for deletion
            if (window.templateService) {
                const result = await window.templateService.deleteTemplate(key);
                if (result.success) {
                    delete this.userTemplates[key];
                    this.render();
                    toast.success('Template deleted');
                } else {
                    toast.error(`Failed to delete template: ${result.error}`);
                }
            } else {
                // Fallback to direct localStorage deletion
                delete this.userTemplates[key];
                try {
                    localStorage.setItem('smartFilterTemplates', JSON.stringify(this.userTemplates));
                    this.render();
                    toast.success('Template deleted');
                } catch (e) {
                    toast.error('Failed to delete template');
                }
            }
        }
    }

    /**
     * Save current config as template
     */
    async saveTemplate(config, name, description) {
        const id = `custom_${Date.now()}`;
        const template = FilterConfig.clone(config);
        template.metadata.id = id;
        template.metadata.name = name;
        template.metadata.description = description;
        template.metadata.created = new Date().toISOString();

        // Use templateService for saving
        if (window.templateService) {
            const result = await window.templateService.saveTemplate(id, template);
            if (result.success) {
                this.userTemplates[id] = template;
                this.render();
                if (result.backend) {
                    toast.success(`Template saved: ${name}`);
                } else {
                    toast.warning(`Template saved to browser only: ${name}`);
                }
            } else {
                toast.error(`Failed to save template: ${result.error}`);
            }
        } else {
            // Fallback to direct localStorage save
            this.userTemplates[id] = template;
            try {
                localStorage.setItem('smartFilterTemplates', JSON.stringify(this.userTemplates));
                this.render();
                toast.success(`Template saved to browser: ${name}`);
            } catch (e) {
                toast.error('Failed to save template');
            }
        }
    }

    /**
     * Get all templates (built-in + user)
     */
    getAllTemplates() {
        return { ...this.builtInTemplates, ...this.userTemplates };
    }

    /**
     * Get user templates only
     */
    getUserTemplates() {
        return this.userTemplates;
    }

    /**
     * Import template from JSON
     */
    async importTemplate(jsonString) {
        try {
            const template = JSON.parse(jsonString);
            const validation = FilterConfig.validateSchema(template);

            if (!validation.valid) {
                toast.error('Invalid template: ' + validation.errors[0]);
                return false;
            }

            const id = `custom_${Date.now()}`;
            template.metadata.id = id;

            // Use templateService for saving imported template
            if (window.templateService) {
                const result = await window.templateService.saveTemplate(id, template);
                if (result.success) {
                    this.userTemplates[id] = template;
                    this.render();
                    toast.success(`Template imported: ${template.metadata.name}`);
                    return true;
                } else {
                    toast.error(`Failed to import template: ${result.error}`);
                    return false;
                }
            } else {
                // Fallback to direct localStorage save
                this.userTemplates[id] = template;
                try {
                    localStorage.setItem('smartFilterTemplates', JSON.stringify(this.userTemplates));
                    this.render();
                    toast.success(`Template imported to browser: ${template.metadata.name}`);
                    return true;
                } catch (e) {
                    toast.error('Failed to import template');
                    return false;
                }
            }
        } catch (e) {
            toast.error('Invalid JSON: ' + e.message);
            return false;
        }
    }

    /**
     * Export all user templates using templateService
     */
    async exportAllTemplates() {
        if (Object.keys(this.userTemplates).length === 0) {
            toast.warning('No templates to export');
            return;
        }

        if (window.templateService) {
            try {
                // Use templateService exportTemplates() with all user template IDs
                const templateIds = Object.keys(this.userTemplates);
                await window.templateService.exportTemplates(templateIds);
                toast.success(`Exported ${templateIds.length} template(s)`);
            } catch (e) {
                console.error('Failed to export templates via templateService:', e);
                // Fallback to manual export
                this.manualExportAll();
            }
        } else {
            // Fallback if templateService not available
            this.manualExportAll();
        }
    }

    /**
     * Manual export fallback
     */
    manualExportAll() {
        const json = JSON.stringify(this.userTemplates, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart_filter_templates_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${Object.keys(this.userTemplates).length} template(s)`);
    }

    /**
     * Show import dialog (triggers file input)
     */
    showImportDialog() {
        const fileInput = document.getElementById('template-import-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle imported file
     */
    async handleImportFile(file) {
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            toast.error('Please select a JSON file');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Check if it's a single template or multiple templates
            let templatesImported = 0;
            let templatesFailed = 0;

            if (data.metadata && data.target) {
                // Single template
                const success = await this.importTemplate(text);
                if (success) {
                    templatesImported = 1;
                } else {
                    templatesFailed = 1;
                }
            } else if (typeof data === 'object') {
                // Multiple templates (object with template IDs as keys)
                for (const [key, template] of Object.entries(data)) {
                    const success = await this.importTemplate(JSON.stringify(template));
                    if (success) {
                        templatesImported++;
                    } else {
                        templatesFailed++;
                    }
                }
            } else {
                toast.error('Invalid template file format');
                return;
            }

            // Show summary
            if (templatesImported > 0) {
                toast.success(`Imported ${templatesImported} template(s)`);
            }
            if (templatesFailed > 0) {
                toast.warning(`Failed to import ${templatesFailed} template(s)`);
            }

            // Reload templates and re-render
            await this.loadAllTemplates();
            this.render();
        } catch (e) {
            console.error('Import error:', e);
            toast.error('Failed to import: ' + e.message);
        }
    }

    /**
     * Load backend config from API and convert to template format
     */
    async loadBackendConfig(configName) {
        try {
            const response = await fetch(`/api/smart-filter/config?name=${encodeURIComponent(configName)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success || !data.config) {
                throw new Error(data.error || 'Failed to load config');
            }

            // Backend configs use different format, need to adapt
            // For now, just show message - TODO: convert format or use directly
            toast.info(`Backend config "${configName}" loaded. Note: Backend configs use Python processing format.`);
            console.log('Backend config data:', data.config);

            // Optional: Load into JSON editor for inspection
            if (window.currentJsonEditor) {
                window.currentJsonEditor.setValue(JSON.stringify(data.config, null, 2));
            }

        } catch (e) {
            console.error('Error loading backend config:', e);
            toast.error(`Failed to load config: ${e.message}`);
        }
    }

    /**
     * View backend config details in modal
     */
    async viewBackendConfig(configName) {
        try {
            const response = await fetch(`/api/smart-filter/config?name=${encodeURIComponent(configName)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success || !data.config) {
                throw new Error(data.error || 'Failed to load config');
            }

            const config = data.config;
            const json = JSON.stringify(config, null, 2);
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;';

            const isUniversal = configName === 'universal_exclusion_template';
            const banner = isUniversal ? `
                <div style="background: #fef3c7; color: #92400e; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <strong>🌍 Universal Template</strong><br>
                    13 exclusion categories (healthcare, education, finance, legal, IT, tourism, etc.)<br>
                    200+ keywords across 3 languages (EN/DE/FR)<br>
                    Use as standalone filter or as base for custom filters
                </div>
            ` : '';

            overlay.innerHTML = `
                <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; padding: 1.5rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">${config.display_name || config.filter_name}</h3>
                    ${banner}
                    <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 0.375rem; margin-bottom: 1rem; font-size: 0.875rem;">
                        <div><strong>Config:</strong> ${config.config_name}</div>
                        <div><strong>Version:</strong> ${config.version}</div>
                        <div><strong>Target:</strong> ${config.target_market?.country_name || config.target_country} - ${config.target_industry}</div>
                        <div><strong>Languages:</strong> ${(config.languages || []).join(', ')}</div>
                    </div>
                    <pre class="bg-base-200" style="padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-size: 0.75rem; max-height: 400px;">${json}</pre>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="navigator.clipboard.writeText(${JSON.stringify(json).replace(/"/g, '&quot;')}); toast.success('Copied to clipboard')" class="btn btn-secondary" style="flex: 1;">
                            📋 Copy
                        </button>
                        <button onclick="this.closest('div').parentElement.remove()" class="btn btn-primary" style="flex: 1;">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

        } catch (e) {
            console.error('Error viewing backend config:', e);
            toast.error(`Failed to view config: ${e.message}`);
        }
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TemplateLibrary };
}

// Export for browser (global scope)
if (typeof window !== 'undefined') {
    window.TemplateLibrary = TemplateLibrary;
}
