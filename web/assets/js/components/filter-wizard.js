/**
 * Filter Wizard Component
 * 5-step wizard for creating filters step-by-step
 *
 * @module FilterWizard
 */

// Guard against duplicate class declaration
if (typeof FilterWizard === 'undefined') {
    window.FilterWizard = class FilterWizard {
    constructor(containerId, onComplete) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.onComplete = onComplete;
        this.currentStep = 1;
        this.totalSteps = 5;
        this.config = FilterConfig.getDefaultConfig();
        this.selectedFile = null;

        // State management
        this.state = {
            lists: [],
            loading: true,  // Show loading skeleton initially
            error: null,
            previewResults: [],
            selectedList: null,
            selectedConfig: null
        };

        // Cache for API responses
        this.cache = {
            lists: null,
            previewData: new Map()
        };

        // Auto-save setup
        this.lastSavedStep = null;
        this.lastSavedConfig = null;

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.init();
    }

    /**
     * Initialize wizard - load data and render
     */
    async init() {
        // Load output files (clean lists) from API
        await this.loadOutputFiles();

        // Check for existing draft
        await this.checkForDraft();

        this.render();
    }

    async render() {
        // Get step content (may be async for step 2)
        const stepContent = await this.getStepContent();

        const html = `
            <!-- Step Indicators -->
            <div class="wizard-steps" id="wizard-steps">
                ${this.renderStepIndicators()}
            </div>

            <!-- Step Content -->
            <div id="wizard-content" class="bg-base-100 rounded-lg shadow p-6 mb-6">
                ${stepContent}
            </div>

            <!-- Navigation Buttons -->
            <div class="flex gap-4 justify-end">
                <button id="btn-prev" class="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        ${this.currentStep === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    ← Previous
                </button>
                <button id="btn-next" class="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors">
                    ${this.currentStep === this.totalSteps ? '✓ Finish' : 'Next →'}
                </button>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachListeners();
    }

    renderStepIndicators() {
        let html = '';
        for (let i = 1; i <= this.totalSteps; i++) {
            const isActive = i === this.currentStep;
            const isCompleted = i < this.currentStep;
            const stepClass = isActive ? 'active' : (isCompleted ? 'completed' : '');

            const titles = [
                'Select List',
                'Choose Config',
                'Customize',
                'Preview',
                'Export'
            ];

            html += `
                <div class="step-indicator ${stepClass}" onclick="window.currentWizard?.goToStep(${i})">
                    <span class="step-number">${isCompleted ? '✓' : i}</span>
                    <span>${titles[i-1]}</span>
                </div>
            `;
        }
        return html;
    }

    async getStepContent() {
        // Step 2 is async, others are sync
        if (this.currentStep === 2) {
            return await this.getStep2Content();
        }

        const steps = {
            1: this.getStep1Content(),
            3: this.getStep3Content(),
            4: this.getStep4Content(),
            5: this.getStep5Content()
        };
        return steps[this.currentStep] || '';
    }

    getStep1Content() {
        if (this.state.loading) {
            return `
                <h2 class="text-xl font-bold mb-4">📋 Select Email List</h2>
                <p class="text-slate-600 dark:text-slate-400 mb-4">Choose which email list to apply the filter to</p>

                <div class="space-y-2">
                    ${this.renderSkeletonLoader(3)}
                </div>
            `;
        }

        if (this.state.error) {
            return `
                <h2 class="text-xl font-bold mb-4">📋 Select Email List</h2>
                <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div class="font-medium text-red-900 dark:text-red-400">❌ Error loading lists</div>
                    <div class="text-sm text-red-800 dark:text-red-300">${this.state.error}</div>
                    <button onclick="window.currentWizard?.retryLoadLists()"
                            class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
                        🔄 Retry
                    </button>
                </div>
            `;
        }

        // Filter for clean lists only
        const cleanLists = this.state.lists.filter(list =>
            list.filename.includes('_clean_') && !list.filename.includes('_metadata_')
        );

        if (cleanLists.length === 0) {
            return `
                <h2 class="text-xl font-bold mb-4">📋 Select Email List</h2>
                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div class="font-medium text-yellow-900 dark:text-yellow-400">⚠️ No clean lists available</div>
                    <div class="text-sm text-yellow-800 dark:text-yellow-300">Process some email lists first to create clean files.</div>
                </div>
            `;
        }

        return `
            <h2 class="text-xl font-bold mb-4">📋 Select Email List</h2>
            <p class="text-slate-600 dark:text-slate-400 mb-4">Choose which email list to apply the filter to</p>

            <div id="list-selector" class="space-y-2 max-h-96 overflow-y-auto">
                ${cleanLists.map((list, index) => `
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                        <input type="radio" name="list" value="${list.filename}" class="w-4 h-4" ${index === 0 ? 'checked' : ''}
                               onchange="window.currentWizard?.onListSelect('${list.filename}')">
                        <div class="flex-1">
                            <div class="font-medium">${list.display_name || list.filename}</div>
                            <div class="text-sm text-slate-500">
                                ${list.country ? `🌍 ${list.country}` : ''}
                                ${list.category ? `• ${list.category}` : ''}
                                ${list.total_emails ? `• ${list.total_emails.toLocaleString()} emails` : ''}
                            </div>
                        </div>
                        ${list.file_type === 'lvp' ? '<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">LVP</span>' : ''}
                    </label>
                `).join('')}
            </div>
        `;
    }

    async getStep2Content() {
        // Load templates dynamically
        let templates = { builtin: {}, user: {} };
        let loading = false;

        if (window.templateService) {
            try {
                loading = true;
                templates = await window.templateService.getAllTemplates();
                console.log(`Loaded templates: ${Object.keys(templates.builtin).length} builtin, ${Object.keys(templates.user).length} user`);
            } catch (error) {
                console.error('Failed to load templates:', error);
            }
        }

        // Build builtin template options
        const builtinOptions = Object.entries(templates.builtin).map(([key, tmpl], index) => {
            const name = tmpl.metadata?.name || key;
            const description = tmpl.metadata?.description || 'Built-in template';
            const country = tmpl.target?.country || '';
            const industry = tmpl.target?.industry || '';

            return `
                <label class="flex items-center gap-3 p-3 border border-base-300 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                    <input type="radio" name="config" value="${key}" class="w-4 h-4" ${index === 0 ? 'checked' : ''}
                           onchange="window.currentWizard?.onConfigSelect('${key}')">
                    <div class="flex-1">
                        <div class="font-medium text-base-content">${name}</div>
                        <div class="text-sm text-base-content/70">${description}</div>
                        ${country || industry ? `
                            <div class="text-xs text-base-content/60 mt-1">
                                ${country ? `🌍 ${country}` : ''}
                                ${industry ? `• 🏭 ${industry}` : ''}
                            </div>
                        ` : ''}
                    </div>
                </label>
            `;
        }).join('');

        // Build user template options (if any)
        const userTemplatesCount = Object.keys(templates.user).length;
        const userOptions = userTemplatesCount > 0 ? `
            <h4 class="font-medium text-base-content mt-6 mb-2">⭐ Your Custom Templates</h4>
            ${Object.entries(templates.user).map(([key, tmpl]) => {
                const name = tmpl.metadata?.name || key;
                const description = tmpl.metadata?.description || 'Custom template';

                return `
                    <label class="flex items-center gap-3 p-3 border-2 border-success rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                        <input type="radio" name="config" value="${key}" class="w-4 h-4"
                               onchange="window.currentWizard?.onConfigSelect('${key}')">
                        <div class="flex-1">
                            <div class="font-medium text-base-content">⭐ ${name}</div>
                            <div class="text-sm text-base-content/70">${description}</div>
                        </div>
                    </label>
                `;
            }).join('')}
        ` : '';

        return `
            <h2 class="text-xl font-bold mb-4">⚙️ Choose Configuration</h2>
            <p class="text-slate-600 dark:text-slate-400 mb-4">Select a template or create new from scratch</p>

            ${Object.keys(templates.builtin).length > 0 ? `
                <div id="config-selector" class="space-y-2">
                    <h4 class="font-medium text-base-content mb-2">📚 Built-in Templates (${Object.keys(templates.builtin).length})</h4>
                    ${builtinOptions}

                    ${userOptions}

                    <h4 class="font-medium text-base-content mt-6 mb-2">✨ Custom</h4>
                    <label class="flex items-center gap-3 p-3 border border-base-300 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                        <input type="radio" name="config" value="custom" class="w-4 h-4"
                               onchange="window.currentWizard?.onConfigSelect('custom')">
                        <div>
                            <div class="font-medium text-base-content">Create from Scratch</div>
                            <div class="text-sm text-base-content/70">Build custom configuration in next steps</div>
                        </div>
                    </label>
                </div>
            ` : `
                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div class="font-medium text-yellow-900 dark:text-yellow-400">⚠️ No templates loaded</div>
                    <div class="text-sm text-yellow-800 dark:text-yellow-300">
                        Unable to load templates. You can still create a custom configuration.
                    </div>
                </div>
            `}
        `;
    }

    getStep3Content() {
        const weights = this.config.scoring.weights;
        const thresholds = this.config.scoring.thresholds;

        return `
            <h2 class="text-xl font-bold mb-4">🎯 Customize Parameters</h2>
            <p class="text-slate-600 dark:text-slate-400 mb-4">Fine-tune the filter settings</p>

            <div class="space-y-6">
                <!-- Target Settings -->
                <div class="border-b pb-4">
                    <h3 class="font-medium mb-3">🌍 Target Settings</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Target Country</label>
                            <input type="text" id="wizard-country" value="${this.config.target.country}"
                                   class="w-full px-3 py-2 border border-base-300 rounded-lg bg-base-100 text-base-content"
                                   onchange="window.currentWizard?.updateConfig('target.country', this.value)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Target Industry</label>
                            <input type="text" id="wizard-industry" value="${this.config.target.industry || ''}"
                                   class="w-full px-3 py-2 border border-base-300 rounded-lg bg-base-100 text-base-content"
                                   onchange="window.currentWizard?.updateConfig('target.industry', this.value)">
                        </div>
                    </div>
                </div>

                <!-- Scoring Weights -->
                <div class="border-b pb-4">
                    <h3 class="font-medium mb-3">⚖️ Scoring Weights (Total: <span id="total-weight">100</span>%)</h3>

                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Email Quality</label>
                            <input type="range" id="wizard-weight-email" min="0" max="100"
                                   value="${(weights.email_quality * 100).toFixed(0)}"
                                   class="w-full" oninput="window.currentWizard?.updateWeight('email_quality', this.value)">
                            <div class="text-sm text-slate-500 mt-1">
                                <span id="weight-email-display">${(weights.email_quality * 100).toFixed(0)}</span>%
                                <span class="text-xs ml-2">(Corporate domain, structure)</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Company Relevance</label>
                            <input type="range" id="wizard-weight-company" min="0" max="100"
                                   value="${(weights.company_relevance * 100).toFixed(0)}"
                                   class="w-full" oninput="window.currentWizard?.updateWeight('company_relevance', this.value)">
                            <div class="text-sm text-slate-500 mt-1">
                                <span id="weight-company-display">${(weights.company_relevance * 100).toFixed(0)}</span>%
                                <span class="text-xs ml-2">(Industry keywords)</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Geographic Priority</label>
                            <input type="range" id="wizard-weight-geo" min="0" max="100"
                                   value="${(weights.geographic_priority * 100).toFixed(0)}"
                                   class="w-full" oninput="window.currentWizard?.updateWeight('geographic_priority', this.value)">
                            <div class="text-sm text-slate-500 mt-1">
                                <span id="weight-geo-display">${(weights.geographic_priority * 100).toFixed(0)}</span>%
                                <span class="text-xs ml-2">(Target country/region)</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1">Engagement</label>
                            <input type="range" id="wizard-weight-engagement" min="0" max="100"
                                   value="${(weights.engagement * 100).toFixed(0)}"
                                   class="w-full" oninput="window.currentWizard?.updateWeight('engagement', this.value)">
                            <div class="text-sm text-slate-500 mt-1">
                                <span id="weight-engagement-display">${(weights.engagement * 100).toFixed(0)}</span>%
                                <span class="text-xs ml-2">(Email type: contact, service, admin)</span>
                            </div>
                        </div>
                    </div>

                    <div id="weight-warning" class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 hidden">
                        <div class="text-sm text-yellow-800 dark:text-yellow-300">⚠️ Weights should total 100%</div>
                    </div>
                </div>

                <!-- Priority Thresholds -->
                <div>
                    <h3 class="font-medium mb-3">🎯 Priority Thresholds</h3>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">High Priority</label>
                            <input type="number" id="wizard-threshold-high" value="${thresholds.high_priority}"
                                   class="w-full px-3 py-2 border border-base-300 rounded-lg bg-base-100 text-base-content"
                                   onchange="window.currentWizard?.updateConfig('scoring.thresholds.high_priority', parseInt(this.value))">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Medium Priority</label>
                            <input type="number" id="wizard-threshold-medium" value="${thresholds.medium_priority}"
                                   class="w-full px-3 py-2 border border-base-300 rounded-lg bg-base-100 text-base-content"
                                   onchange="window.currentWizard?.updateConfig('scoring.thresholds.medium_priority', parseInt(this.value))">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Low Priority</label>
                            <input type="number" id="wizard-threshold-low" value="${thresholds.low_priority}"
                                   class="w-full px-3 py-2 border border-base-300 rounded-lg bg-base-100 text-base-content"
                                   onchange="window.currentWizard?.updateConfig('scoring.thresholds.low_priority', parseInt(this.value))">
                        </div>
                    </div>
                </div>

                <!-- Reset Button -->
                <div class="pt-4 border-t">
                    <button onclick="window.currentWizard?.resetToDefaults()"
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm">
                        🔄 Reset to Template Defaults
                    </button>
                </div>
            </div>
        `;
    }

    getStep4Content() {
        if (this.state.loading) {
            return `
                <h2 class="text-xl font-bold mb-4">📊 Preview Results</h2>
                <p class="text-slate-600 dark:text-slate-400 mb-4">Generating preview...</p>
                <div class="space-y-3">
                    ${this.renderSkeletonLoader(5)}
                </div>
            `;
        }

        if (!this.state.selectedList) {
            return `
                <h2 class="text-xl font-bold mb-4">📊 Preview Results</h2>
                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div class="font-medium text-yellow-900 dark:text-yellow-400">⚠️ No list selected</div>
                    <div class="text-sm text-yellow-800 dark:text-yellow-300">Go back to Step 1 and select a list.</div>
                </div>
            `;
        }

        const results = this.state.previewResults;
        if (results.length === 0) {
            return `
                <h2 class="text-xl font-bold mb-4">📊 Preview Results</h2>
                <div class="p-4 bg-base-200 rounded-lg border border-base-300">
                    <div class="font-medium">Loading preview...</div>
                    <div class="text-sm text-base-content/70">Analyzing sample emails from selected list...</div>
                </div>
            `;
        }

        // Calculate statistics
        const stats = {
            total: results.length,
            high: results.filter(r => r.priority === 'HIGH').length,
            medium: results.filter(r => r.priority === 'MEDIUM').length,
            low: results.filter(r => r.priority === 'LOW').length,
            excluded: results.filter(r => r.priority === 'EXCLUDED').length
        };

        // Show first 10 results
        const previewItems = results.slice(0, 10);

        return `
            <h2 class="text-xl font-bold mb-4">📊 Preview Results</h2>
            <p class="text-slate-600 dark:text-slate-400 mb-4">See how filter will score sample emails from ${this.state.selectedList.display_name || this.state.selectedList.filename}</p>

            <div id="preview-results" class="space-y-2 max-h-96 overflow-y-auto mb-6">
                ${previewItems.map(result => {
                    const scoreClass = result.priority === 'HIGH' ? 'score-high' :
                                      result.priority === 'MEDIUM' ? 'score-medium' :
                                      result.priority === 'LOW' ? 'score-low' : 'score-excluded';

                    const bgClass = result.priority === 'HIGH' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-300' :
                                   result.priority === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-300' :
                                   result.priority === 'LOW' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-300' :
                                   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300';

                    const textSecondaryClass = result.priority === 'HIGH' ? 'text-green-700 dark:text-green-400' :
                                              result.priority === 'MEDIUM' ? 'text-yellow-700 dark:text-yellow-400' :
                                              result.priority === 'LOW' ? 'text-orange-700 dark:text-orange-400' :
                                              'text-red-700 dark:text-red-400';

                    return `
                        <div class="p-3 border rounded-lg ${bgClass}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="font-medium text-sm">${result.email || 'Unknown'}</div>
                                    ${result.company ? `<div class="text-xs ${textSecondaryClass} mt-1">${result.company}</div>` : ''}
                                </div>
                                <div class="flex gap-2 items-center">
                                    <span class="score-display ${scoreClass}">${result.score.toFixed(1)}</span>
                                    <span class="text-xs px-2 py-1 rounded ${scoreClass}">${result.priority}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${results.length > 10 ? `<div class="text-sm text-slate-500 mb-4 text-center">Showing 10 of ${results.length} preview emails</div>` : ''}

            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="font-medium mb-3">📊 Preview Statistics (${stats.total} sample emails):</div>
                <div class="grid grid-cols-4 gap-4 text-sm">
                    <div>
                        <div class="text-green-700 dark:text-green-400 font-bold text-lg">${stats.high}</div>
                        <div class="text-slate-600 dark:text-slate-400">HIGH (${((stats.high/stats.total)*100).toFixed(1)}%)</div>
                    </div>
                    <div>
                        <div class="text-yellow-700 dark:text-yellow-400 font-bold text-lg">${stats.medium}</div>
                        <div class="text-slate-600 dark:text-slate-400">MEDIUM (${((stats.medium/stats.total)*100).toFixed(1)}%)</div>
                    </div>
                    <div>
                        <div class="text-orange-700 dark:text-orange-400 font-bold text-lg">${stats.low}</div>
                        <div class="text-slate-600 dark:text-slate-400">LOW (${((stats.low/stats.total)*100).toFixed(1)}%)</div>
                    </div>
                    <div>
                        <div class="text-red-700 dark:text-red-400 font-bold text-lg">${stats.excluded}</div>
                        <div class="text-slate-600 dark:text-slate-400">EXCLUDED (${((stats.excluded/stats.total)*100).toFixed(1)}%)</div>
                    </div>
                </div>
            </div>

            <div class="mt-4 text-center">
                <button onclick="window.currentWizard?.regeneratePreview()"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                    🔄 Regenerate Preview
                </button>
            </div>
        `;
    }

    getStep5Content() {
        return `
            <h2 class="text-xl font-bold mb-4">✓ Export & Apply</h2>
            <p class="text-slate-600 dark:text-slate-400 mb-4">Save and apply the filter to your lists</p>

            <div class="space-y-3">
                <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200">
                    <input type="radio" name="export" value="apply" class="w-4 h-4" checked>
                    <div>
                        <div class="font-medium">Apply Now</div>
                        <div class="text-sm text-slate-500">Process selected list immediately</div>
                    </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200">
                    <input type="radio" name="export" value="save" class="w-4 h-4">
                    <div>
                        <div class="font-medium">Save as Template</div>
                        <div class="text-sm text-slate-500">Save for future use without applying now</div>
                    </div>
                </label>

                <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-base-200">
                    <input type="radio" name="export" value="download" class="w-4 h-4">
                    <div>
                        <div class="font-medium">Download JSON</div>
                        <div class="text-sm text-slate-500">Export configuration as JSON file</div>
                    </div>
                </label>
            </div>

            <div class="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div class="font-medium text-green-900 dark:text-green-400">✓ Ready to proceed</div>
                <div class="text-sm text-green-800 dark:text-green-300">Click "Finish" to complete the wizard</div>
            </div>
        `;
    }

    attachListeners() {
        // Step navigation
        document.getElementById('btn-prev')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-next')?.addEventListener('click', () => this.nextStep());

        // Make window reference for step clicking
        window.currentWizard = this;
    }

    async nextStep() {
        // Save draft before moving to next step
        await this.saveDraft();

        // Moving to step 4 - generate preview
        if (this.currentStep === 3) {
            await this.generatePreview();
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.render();
        } else {
            this.finish();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.render();

            // Save draft after moving back
            this.saveDraft();
        }
    }

    goToStep(stepNum) {
        if (stepNum <= this.currentStep) {
            this.currentStep = stepNum;
            this.render();
        }
    }

    async finish() {
        const exportType = document.querySelector('input[name="export"]:checked')?.value;

        if (this.onComplete) {
            this.onComplete({
                config: this.config,
                exportType: exportType,
                selectedList: document.querySelector('input[name="list"]:checked')?.value
            });
        }

        // Clear draft after successful completion
        await this.clearDraft();

        toast.success('Filter wizard completed!');
    }

    getConfig() {
        return this.config;
    }

    setConfig(config) {
        this.config = config;
    }

    // ========== API Integration Methods ==========

    /**
     * Load lists from API
     */
    /**
     * Load output files (clean lists) from API
     * This is used instead of loadLists() to get actual processed files
     */
    async loadOutputFiles() {
        // Use cached lists if available
        if (this.cache.lists) {
            this.state.lists = this.cache.lists;
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            // NEW: Load from output-files API (actual processed files, not lists_config.json)
            // API returns all clean files when called without 'list' parameter
            const response = await window.api.get('/api/output-files');
            const cleanFiles = response.data.files || response.data || [];

            console.log(`Loaded ${cleanFiles.length} clean files from API`);

            // Files are already filtered by API to include only *_clean_*.txt files
            // No need for additional filtering here

            this.cache.lists = cleanFiles;
            this.setState({
                lists: cleanFiles,
                loading: false
            });

            // Auto-select first clean list if available
            if (cleanFiles.length > 0 && !this.state.selectedList) {
                this.state.selectedList = cleanFiles[0];
                console.log(`Auto-selected: ${cleanFiles[0].filename}`);
            }
        } catch (error) {
            console.error('Failed to load output files:', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to load output files. Check console for details.'
            });

            // Show toast notification
            if (typeof toast !== 'undefined') {
                toast.error(`Failed to load output files: ${error.message}`);
            }
        }
    }

    /**
     * Load lists from config (OLD METHOD - kept for backward compatibility)
     */
    async loadLists() {
        // Use cached lists if available
        if (this.cache.lists) {
            this.state.lists = this.cache.lists;
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const response = await window.api.get('/api/lists');
            const lists = response.data.lists || [];

            this.cache.lists = lists;
            this.setState({
                lists: lists,
                loading: false
            });

            // Auto-select first clean list if available
            const cleanLists = lists.filter(l =>
                l.filename.includes('_clean_') && !l.filename.includes('_metadata_')
            );
            if (cleanLists.length > 0 && !this.state.selectedList) {
                this.state.selectedList = cleanLists[0];
            }
        } catch (error) {
            console.error('Failed to load lists:', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to load lists. Check console for details.'
            });

            // Show toast notification
            if (typeof toast !== 'undefined') {
                toast.error(`Failed to load lists: ${error.message}`);
            }
        }
    }

    /**
     * Retry loading lists
     */
    async retryLoadLists() {
        this.cache.lists = null; // Clear cache
        await this.loadLists();
        this.render();
    }

    /**
     * Handle list selection
     */
    onListSelect(filename) {
        const list = this.state.lists.find(l => l.filename === filename);
        if (list) {
            this.state.selectedList = list;
            console.log('Selected list:', list);
        }
    }

    /**
     * Handle config selection in Step 2
     */
    async onConfigSelect(configKey) {
        console.log(`Config selected: ${configKey}`);
        this.state.selectedConfig = configKey;

        // If not "custom", load the template config
        if (configKey !== 'custom' && window.templateService) {
            try {
                const templates = await window.templateService.getAllTemplates();

                // Check builtin templates first
                if (templates.builtin && templates.builtin[configKey]) {
                    this.config = templates.builtin[configKey];
                    console.log(`Loaded builtin template: ${this.config.metadata?.name}`);
                }
                // Then check user templates
                else if (templates.user && templates.user[configKey]) {
                    this.config = templates.user[configKey];
                    console.log(`Loaded user template: ${this.config.metadata?.name}`);
                }
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }
    }

    /**
     * Generate preview by scoring sample emails
     */
    async generatePreview() {
        if (!this.state.selectedList) {
            console.warn('No list selected for preview');
            return;
        }

        // Check cache
        const cacheKey = `${this.state.selectedList.filename}_${JSON.stringify(this.config.scoring)}`;
        if (this.cache.previewData.has(cacheKey)) {
            this.state.previewResults = this.cache.previewData.get(cacheKey);
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            // Load sample emails from file
            const filePath = `output/${this.state.selectedList.filename}`;
            const response = await window.api.get(`/api/file-preview?path=${encodeURIComponent(filePath)}&lines=50`);

            if (!response.data || !response.data.content) {
                throw new Error('No content in preview response');
            }

            // Parse emails from content
            const lines = response.data.content.split('\n').filter(line => line.trim());
            const emails = lines.map(line => {
                // Extract email if line is in format: email, or email;metadata
                const parts = line.split(/[,;]/);
                const email = parts[0].trim();

                return {
                    email: email,
                    domain: email.includes('@') ? email.split('@')[1] : '',
                    company: parts[1] ? parts[1].trim() : '',
                    country: this.state.selectedList.country || ''
                };
            });

            // Score emails using FilterScorer
            if (typeof FilterScorer === 'undefined') {
                throw new Error('FilterScorer not loaded. Include filter-scorer.js');
            }

            const scorer = new FilterScorer(this.config);
            const scoredResults = emails.map(email => {
                const result = scorer.calculateScore(email);
                return {
                    ...email,
                    score: result.score,
                    priority: result.priority,
                    breakdown: result.breakdown
                };
            });

            // Cache results
            this.cache.previewData.set(cacheKey, scoredResults);

            this.setState({
                previewResults: scoredResults,
                loading: false
            });

            console.log(`Generated preview for ${scoredResults.length} emails`);
        } catch (error) {
            console.error('Failed to generate preview:', error);
            this.setState({
                loading: false,
                error: error.message || 'Failed to generate preview'
            });

            if (typeof toast !== 'undefined') {
                toast.error(`Preview failed: ${error.message}`);
            }
        }
    }

    /**
     * Regenerate preview with current config
     */
    async regeneratePreview() {
        // Clear cache for this list
        this.cache.previewData.clear();
        await this.generatePreview();
        this.render();
    }

    // ========== Configuration Management ==========

    /**
     * Update config value by path
     */
    updateConfig(path, value) {
        const parts = path.split('.');
        let obj = this.config;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) {
                obj[parts[i]] = {};
            }
            obj = obj[parts[i]];
        }

        obj[parts[parts.length - 1]] = value;
        console.log(`Updated config: ${path} = ${value}`);
    }

    /**
     * Update scoring weight
     */
    updateWeight(weightName, value) {
        const percentage = parseFloat(value);
        this.config.scoring.weights[weightName] = percentage / 100;

        // Update display
        const displayEl = document.getElementById(`weight-${weightName.replace('_', '-')}-display`);
        if (displayEl) {
            displayEl.textContent = value;
        }

        // Check if total is 100%
        this.checkWeightTotal();
    }

    /**
     * Check if total weight = 100%
     */
    checkWeightTotal() {
        const weights = this.config.scoring.weights;
        const total = (weights.email_quality + weights.company_relevance +
                      weights.geographic_priority + weights.engagement) * 100;

        const totalDisplay = document.getElementById('total-weight');
        if (totalDisplay) {
            totalDisplay.textContent = total.toFixed(0);
        }

        const warningEl = document.getElementById('weight-warning');
        if (warningEl) {
            if (Math.abs(total - 100) > 0.1) {
                warningEl.classList.remove('hidden');
            } else {
                warningEl.classList.add('hidden');
            }
        }
    }

    /**
     * Reset config to template defaults
     */
    resetToDefaults() {
        const selectedConfig = this.state.selectedConfig || 'italy_hydraulics';
        this.config = FilterConfig.getDefaultConfig(selectedConfig);
        this.render();

        if (typeof toast !== 'undefined') {
            toast.success('Reset to template defaults');
        }
    }

    // ========== Helper Methods ==========

    /**
     * Update component state and re-render
     */
    setState(updates) {
        Object.assign(this.state, updates);

        // Re-render step 1 when lists are loaded
        if (this.currentStep === 1 && updates.lists !== undefined && !updates.loading) {
            console.log('Lists loaded, re-rendering step 1');
            this.render();
        }
    }

    /**
     * Render skeleton loader
     */
    renderSkeletonLoader(count = 3) {
        return Array(count).fill(0).map(() => `
            <div class="animate-pulse p-3 border rounded-lg">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
        `).join('');
    }

    /**
     * Show template selection modal
     */
    async showTemplateModal() {
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

        // Build modal HTML
        let templatesHtml = '<div style="display: grid; gap: 0.5rem;">';

        // Built-in templates
        templatesHtml += '<h4 style="font-weight: 600; margin-top: 0.5rem;">📚 Built-in Templates</h4>';
        for (const [key, template] of Object.entries(builtInTemplates)) {
            templatesHtml += `
                <button onclick="window.currentWizard?.selectTemplate('builtin', '${key}')"
                        class="bg-base-100 hover:bg-base-200 text-base-content border border-base-300 transition-colors"
                        style="text-align: left; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; width: 100%;">
                    <div style="font-weight: 600;">${template.metadata.name}</div>
                    <div class="text-base-content/70" style="font-size: 0.875rem;">${template.metadata.description || ''}</div>
                </button>
            `;
        }

        // User templates if any
        if (Object.keys(userTemplates).length > 0) {
            templatesHtml += '<h4 style="font-weight: 600; margin-top: 1rem;">⭐ My Templates</h4>';
            for (const [key, template] of Object.entries(userTemplates)) {
                templatesHtml += `
                    <button onclick="window.currentWizard?.selectTemplate('user', '${key}')"
                            class="bg-base-100 hover:bg-base-200 text-base-content border border-base-300 transition-colors"
                            style="text-align: left; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; width: 100%;">
                        <div style="font-weight: 600;">${template.metadata.name}</div>
                        <div class="text-base-content/70" style="font-size: 0.875rem;">${template.metadata.description || ''}</div>
                    </button>
                `;
            }
        }

        templatesHtml += '</div>';

        // Create modal
        const modalHtml = `
            <div id="template-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; padding: 1.5rem; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Load Template</h3>
                    ${templatesHtml}
                    <button onclick="document.getElementById('template-modal').remove()"
                            class="btn btn-ghost" style="width: 100%; margin-top: 1rem;">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Select template from modal
     */
    async selectTemplate(type, key) {
        if (type === 'builtin') {
            const templates = FilterConfig.getTemplates();
            this.config = templates[key];
        } else if (type === 'user') {
            // Load user template using templateService
            if (window.templateService) {
                try {
                    const allTemplates = await window.templateService.getAllTemplates();
                    const userTemplates = allTemplates.user || {};
                    this.config = userTemplates[key];
                } catch (e) {
                    console.error('Failed to load template via templateService:', e);
                    // Fallback to localStorage
                    try {
                        const stored = localStorage.getItem('smartFilterTemplates');
                        const userTemplates = stored ? JSON.parse(stored) : {};
                        this.config = userTemplates[key];
                    } catch (e2) {
                        console.error('Failed to load template from localStorage:', e2);
                    }
                }
            } else {
                // Fallback to localStorage if templateService not available
                try {
                    const stored = localStorage.getItem('smartFilterTemplates');
                    const userTemplates = stored ? JSON.parse(stored) : {};
                    this.config = userTemplates[key];
                } catch (e) {
                    console.error('Failed to load template from localStorage:', e);
                }
            }
        }

        this.state.selectedConfig = key;

        // Close modal
        document.getElementById('template-modal')?.remove();

        // Show success message
        if (typeof toast !== 'undefined') {
            toast.success(`Loaded template: ${this.config.metadata.name}`);
        }

        console.log('Template loaded:', this.config.metadata.name);
    }

    // ========== Auto-Save Draft Methods ==========

    /**
     * Save current wizard state as draft
     */
    async saveDraft() {
        if (!window.templateService) {
            console.warn('⚠️ TemplateService not available');
            return;
        }

        // Create draft object with current state
        const draft = {
            currentStep: this.currentStep,
            config: this.config,
            state: {
                selectedList: this.state.selectedList,
                selectedConfig: this.state.selectedConfig
            },
            timestamp: new Date().toISOString()
        };

        // Check if state has changed since last save
        const draftStr = JSON.stringify(draft);
        if (draftStr === this.lastSavedConfig) {
            console.log('⏭️ Wizard state unchanged, skipping auto-save');
            return;
        }

        try {
            await window.templateService.saveDraft('wizard', draft);
            this.lastSavedStep = this.currentStep;
            this.lastSavedConfig = draftStr;
            console.log(`💾 Auto-saved wizard draft at step ${this.currentStep}`);
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
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
            const draftData = await window.templateService.loadDraft('wizard');

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
        const savedDate = new Date(draftData.draft.timestamp);
        const timeAgo = this.getTimeAgo(savedDate);
        const stepText = `Step ${draftData.draft.currentStep} of ${this.totalSteps}`;

        const modalHtml = `
            <div id="wizard-draft-restore-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-base-100 rounded-lg max-w-md w-full p-6">
                    <!-- Header -->
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-4xl">🧙</div>
                        <div>
                            <h3 class="text-xl font-semibold text-base-content">
                                Unfinished Wizard Found
                            </h3>
                            <p class="text-sm text-base-content/70">
                                Saved ${timeAgo}
                            </p>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="mb-6">
                        <p class="text-slate-700 dark:text-slate-300 mb-2">
                            You have an unfinished wizard from a previous session. Would you like to continue where you left off?
                        </p>
                        <div class="text-sm text-slate-600 dark:text-slate-400">
                            <p><strong>Progress:</strong> ${stepText}</p>
                            <p><strong>Filter:</strong> ${draftData.draft.config.metadata?.name || 'Untitled'}</p>
                            <p><strong>Target:</strong> ${draftData.draft.config.target?.country || 'N/A'} • ${draftData.draft.config.target?.industry || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3">
                        <button onclick="window.currentWizard?.restoreDraft()"
                                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Continue Wizard
                        </button>
                        <button onclick="window.currentWizard?.discardDraft()"
                                class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
                            Start Over
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
            // Restore wizard state
            this.currentStep = this.pendingDraft.currentStep || 1;
            this.config = this.pendingDraft.config;

            // Restore state
            if (this.pendingDraft.state) {
                if (this.pendingDraft.state.selectedList) {
                    this.state.selectedList = this.pendingDraft.state.selectedList;
                }
                if (this.pendingDraft.state.selectedConfig) {
                    this.state.selectedConfig = this.pendingDraft.state.selectedConfig;
                }
            }

            this.pendingDraft = null;

            // Re-render with restored state
            this.render();

            // Close modal
            document.getElementById('wizard-draft-restore-modal')?.remove();

            if (typeof toast !== 'undefined') {
                toast.success(`Wizard restored to Step ${this.currentStep}`);
            }

            console.log(`✅ Wizard draft restored at step ${this.currentStep}`);
        }
    }

    /**
     * Discard draft
     */
    async discardDraft() {
        this.pendingDraft = null;

        // Clear draft from backend/localStorage
        await this.clearDraft();

        // Close modal
        document.getElementById('wizard-draft-restore-modal')?.remove();

        if (typeof toast !== 'undefined') {
            toast.info('Starting new wizard');
        }

        console.log('🗑️ Wizard draft discarded');
    }

    /**
     * Clear draft
     */
    async clearDraft() {
        if (window.templateService) {
            await window.templateService.clearDraft('wizard');
            console.log('🗑️ Wizard draft cleared');
        }
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
    }; // End of FilterWizard class
} // End of guard check

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FilterWizard: window.FilterWizard };
}
