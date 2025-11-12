/**
 * Visual Filter Builder Component
 * Provides UI for building filters without coding
 *
 * @module VisualFilterBuilder
 */

class VisualFilterBuilder {
    /**
     * Create VisualFilterBuilder instance
     * @param {string} containerId - ID of container element
     * @param {Object} config - Initial filter config
     * @param {Function} onConfigChange - Callback when config changes
     */
    constructor(containerId, config, onConfigChange) {
        this.containerId = containerId;
        this.config = config;
        this.onConfigChange = onConfigChange;
        this.container = document.getElementById(containerId);
        this.initialized = false;

        // Check if container exists
        if (!this.container) {
            console.error(`❌ Container ${containerId} not found`);
            return;
        }

        // Check if templateService is available
        if (!window.templateService) {
            console.warn('⚠️ TemplateService not available yet, deferring initialization');
            // Retry initialization after a delay
            setTimeout(() => this.retryInitialization(), 100);
            return;
        }

        // Auto-save setup
        this.autoSaveTimer = null;
        this.autoSaveInterval = 30000; // 30 seconds
        this.lastSavedConfig = null;

        // Perform initialization
        this.initialized = true;
        console.log('✅ VisualFilterBuilder: Starting initialization');
        this.render();
        this.attachEventListeners();
        this.setupAutoSave();
        this.checkForDraft();
    }

    /**
     * Retry initialization when dependencies are ready
     */
    retryInitialization() {
        // Check if we're already initialized or container is missing
        if (this.initialized || !this.container) {
            return;
        }

        // Check if templateService is now available
        if (!window.templateService) {
            console.warn('⚠️ TemplateService still not available, retrying...');
            // Retry with exponential backoff (max 3 attempts)
            if (!this.retryCount) this.retryCount = 0;
            if (this.retryCount < 3) {
                this.retryCount++;
                setTimeout(() => this.retryInitialization(), 100 * this.retryCount);
            } else {
                console.error('❌ VisualFilterBuilder: Failed to initialize after 3 retries');
            }
            return;
        }

        // Now we can initialize
        this.initialized = true;
        console.log('✅ VisualFilterBuilder: Retry successful, initializing');
        this.render();
        this.attachEventListeners();
        this.setupAutoSave();
        this.checkForDraft();
    }

    /**
     * Render the visual builder UI
     */
    render() {
        // Guard: Check if container exists
        if (!this.container) {
            console.warn('⚠️ VisualFilterBuilder.render(): Container not available');
            return;
        }

        const html = `
            <!-- Toolbar -->
            <div class="mb-6 flex gap-3 flex-wrap">
                <button id="btn-load-template"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
                    📚 Load Template
                </button>
                <button id="btn-save-template"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
                    💾 Save as Template
                </button>
                <button id="btn-reset-default"
                        class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2">
                    🔄 Reset to Default
                </button>
            </div>

            <!-- Target Configuration -->
            <div class="filter-section">
                <h3>🎯 Target Configuration</h3>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Filter Name</label>
                        <input type="text" id="filter-name" value="${this.config.metadata.name}"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                               placeholder="Enter filter name">
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Description</label>
                        <textarea id="filter-description"
                                  class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                         bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                  placeholder="What does this filter do?"
                                  rows="2">${this.config.metadata.description || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Target Country</label>
                            <input type="text" id="target-country" value="${this.config.target.country}"
                                   class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                          bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Target Industry</label>
                            <input type="text" id="target-industry" value="${this.config.target.industry}"
                                   class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                          bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scoring Weights -->
            <div class="filter-section">
                <h3>⚖️ Scoring Weights</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">Adjust the importance of each scoring component. Total must equal 1.0</p>

                <div class="space-y-4">
                    ${this.renderWeightSlider('email_quality', 'Email Quality', this.config.scoring.weights.email_quality)}
                    ${this.renderWeightSlider('company_relevance', 'Company Relevance', this.config.scoring.weights.company_relevance)}
                    ${this.renderWeightSlider('geographic_priority', 'Geographic Priority', this.config.scoring.weights.geographic_priority)}
                    ${this.renderWeightSlider('engagement', 'Engagement', this.config.scoring.weights.engagement)}
                </div>

                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-sm font-medium">Total Weight: <span id="total-weight">1.00</span></div>
                </div>
            </div>

            <!-- Priority Thresholds -->
            <div class="filter-section">
                <h3>📊 Priority Thresholds</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">Set score ranges for priority levels</p>

                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium mb-2">High Priority (≥)</label>
                        <input type="number" id="threshold-high" value="${this.config.scoring.thresholds.high_priority}"
                               min="0" max="200" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Medium Priority (≥)</label>
                        <input type="number" id="threshold-medium" value="${this.config.scoring.thresholds.medium_priority}"
                               min="0" max="200" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Low Priority (≥)</label>
                        <input type="number" id="threshold-low" value="${this.config.scoring.thresholds.low_priority}"
                               min="0" max="200" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>
                </div>
            </div>

            <!-- Industry Keywords -->
            <div class="filter-section">
                <h3>🔑 Industry Keywords</h3>

                <div class="space-y-4">
                    <!-- Positive Keywords -->
                    <div>
                        <h4 class="font-medium mb-3">✅ Positive Keywords</h4>
                        <div id="positive-keywords-list" class="space-y-2 mb-3">
                            ${this.renderKeywordItems(this.config.company_keywords.primary_keywords.positive, 'positive')}
                        </div>
                        <button type="button" class="btn-add-keyword" data-type="positive" style="width: 100%; padding: 0.5rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                            + Add Positive Keyword
                        </button>
                    </div>

                    <!-- Negative Keywords -->
                    <div>
                        <h4 class="font-medium mb-3">❌ Negative Keywords</h4>
                        <div id="negative-keywords-list" class="space-y-2 mb-3">
                            ${this.renderKeywordItems(this.config.company_keywords.primary_keywords.negative || [], 'negative')}
                        </div>
                        <button type="button" class="btn-add-keyword" data-type="negative" style="width: 100%; padding: 0.5rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                            + Add Negative Keyword
                        </button>
                    </div>
                </div>
            </div>

            <!-- Geographic Rules -->
            <div class="filter-section">
                <h3>🌍 Geographic Rules</h3>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Target Regions</label>
                        <input type="text" id="target-regions"
                               value="${(this.config.geographic_rules.target_regions || []).join(', ')}"
                               placeholder="e.g., Italy, Germany, France"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <p class="text-xs text-slate-500 mt-1">Comma-separated list of target regions</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Exclude Regions</label>
                        <input type="text" id="exclude-regions"
                               value="${(this.config.geographic_rules.exclude_regions || []).join(', ')}"
                               placeholder="e.g., Asia, Africa"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <p class="text-xs text-slate-500 mt-1">Comma-separated list of regions to exclude</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Country Multipliers</label>
                        <div id="multipliers-list" class="space-y-2">
                            ${this.renderMultiplierItems(this.config.geographic_rules.multipliers || {})}
                        </div>
                        <button type="button" class="btn-add-multiplier"
                                style="padding: 8px 16px; background: #10b981; color: white; border: none;
                                       border-radius: 6px; cursor: pointer; margin-top: 8px; font-size: 14px;
                                       transition: background 0.2s;">
                            + Add Country Multiplier
                        </button>
                    </div>
                </div>
            </div>

            <!-- Email Quality Rules -->
            <div class="filter-section">
                <h3>📧 Email Quality Rules</h3>

                <div class="space-y-3">
                    <label class="flex items-center gap-3">
                        <input type="checkbox" id="corporate-domains"
                               ${this.config.email_quality.corporate_domains ? 'checked' : ''}
                               class="w-4 h-4">
                        <span>Require corporate domains (no free email providers)</span>
                    </label>

                    <label class="flex items-center gap-3">
                        <input type="checkbox" id="structure-quality"
                               ${this.config.email_quality.structure_quality ? 'checked' : ''}
                               class="w-4 h-4">
                        <span>Validate email structure quality</span>
                    </label>

                    <div>
                        <label class="block text-sm font-medium mb-2">Suspicious Patterns (Penalty)</label>
                        <input type="text" id="suspicious-patterns"
                               value="${(this.config.email_quality.suspicious_patterns || []).join(', ')}"
                               placeholder="e.g., no-reply, noreply, bounce"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>
                </div>
            </div>

            <!-- OEM Equipment Bonus -->
            <div class="filter-section">
                <h3>🏭 OEM Equipment Bonus</h3>

                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium mb-2">OEM Keywords</label>
                        <input type="text" id="oem-keywords"
                               value="${(this.config.domain_rules.oemEquipment?.keywords || []).join(', ')}"
                               placeholder="e.g., oem, manufacturer, factory"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Score Multiplier</label>
                        <input type="number" id="oem-multiplier"
                               value="${this.config.domain_rules.oemEquipment?.multiplier || 1.3}"
                               min="0.5" max="2" step="0.1"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    /**
     * Render weight slider HTML
     */
    renderWeightSlider(id, label, value) {
        return `
            <div>
                <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-medium">${label}</label>
                    <span class="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded" id="value-${id}">${(value * 100).toFixed(0)}%</span>
                </div>
                <input type="range" id="slider-${id}" min="0" max="100" value="${value * 100}"
                       class="w-full cursor-pointer" data-field="${id}">
            </div>
        `;
    }

    /**
     * Render keyword items
     */
    renderKeywordItems(keywords, type) {
        if (!keywords || keywords.length === 0) {
            return `<p class="text-sm text-slate-500">No keywords yet</p>`;
        }

        return keywords.map((kw, idx) => `
            <div class="keyword-item">
                <input type="text" value="${kw.term || kw}" class="keyword-term" data-type="${type}" data-idx="${idx}">
                ${kw.weight !== undefined ? `
                    <input type="range" min="0" max="2" step="0.1" value="${kw.weight}"
                           class="keyword-weight w-24" data-type="${type}" data-idx="${idx}">
                    <span class="weight-value">${kw.weight.toFixed(1)}</span>
                ` : ''}
                <button type="button" class="btn-remove-keyword" data-type="${type}" data-idx="${idx}" style="background: #991b1b; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer;">
                    Remove
                </button>
            </div>
        `).join('');
    }

    /**
     * Render multiplier items
     */
    renderMultiplierItems(multipliers) {
        return Object.entries(multipliers).map(([country, mult]) => `
            <div class="keyword-item">
                <input type="text" value="${country}" class="multiplier-country flex-1" placeholder="Country">
                <input type="number" value="${mult}" min="0.5" max="2" step="0.1" class="multiplier-value w-20">
                <button type="button" class="btn-remove-multiplier" style="background: #991b1b; color: white; border: none; padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer;">
                    Remove
                </button>
            </div>
        `).join('');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-load-template')?.addEventListener('click', () => this.showTemplateSelector());
        document.getElementById('btn-save-template')?.addEventListener('click', () => this.saveAsTemplate());
        document.getElementById('btn-reset-default')?.addEventListener('click', () => this.resetToDefault());

        // Text inputs
        document.getElementById('filter-name')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('filter-description')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('target-country')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('target-industry')?.addEventListener('change', () => this.updateConfig());

        // Weight sliders
        document.querySelectorAll('input[type="range"][data-field]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                const value = e.target.value / 100;
                document.getElementById(`value-${field}`).textContent = `${e.target.value}%`;
                this.updateConfig();
            });
        });

        // Threshold inputs
        document.getElementById('threshold-high')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('threshold-medium')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('threshold-low')?.addEventListener('change', () => this.updateConfig());

        // Add keyword buttons
        document.querySelectorAll('.btn-add-keyword').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addKeyword(type);
            });
        });

        // Remove keyword buttons
        document.querySelectorAll('.btn-remove-keyword').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const idx = e.target.dataset.idx;
                this.removeKeyword(type, idx);
            });
        });

        // Keyword inputs
        document.querySelectorAll('.keyword-term').forEach(input => {
            input.addEventListener('change', () => this.updateConfig());
        });

        document.querySelectorAll('.keyword-weight').forEach(input => {
            input.addEventListener('change', () => this.updateConfig());
        });

        // Geographic inputs
        document.getElementById('target-regions')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('exclude-regions')?.addEventListener('change', () => this.updateConfig());

        // Email quality
        document.getElementById('corporate-domains')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('structure-quality')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('suspicious-patterns')?.addEventListener('change', () => this.updateConfig());

        // OEM
        document.getElementById('oem-keywords')?.addEventListener('change', () => this.updateConfig());
        document.getElementById('oem-multiplier')?.addEventListener('change', () => this.updateConfig());

        // Geographic rules - Remove multiplier
        document.querySelectorAll('.btn-remove-multiplier').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeMultiplier(e.target);
            });
        });

        // Geographic rules - Add multiplier
        document.querySelector('.btn-add-multiplier')?.addEventListener('click', () => {
            this.addMultiplier();
        });
    }

    /**
     * Add new keyword
     */
    addKeyword(type) {
        const keyword = prompt(`Enter new ${type} keyword:`);
        if (!keyword) return;

        const keywordObj = { term: keyword, weight: 1.0 };
        if (type === 'positive') {
            this.config.company_keywords.primary_keywords.positive.push(keywordObj);
        } else {
            if (!this.config.company_keywords.primary_keywords.negative) {
                this.config.company_keywords.primary_keywords.negative = [];
            }
            this.config.company_keywords.primary_keywords.negative.push(keywordObj);
        }

        this.render();
        this.attachEventListeners();
        this.updateConfig();
    }

    /**
     * Remove keyword
     */
    removeKeyword(type, idx) {
        const keywords = type === 'positive' ?
            this.config.company_keywords.primary_keywords.positive :
            this.config.company_keywords.primary_keywords.negative;

        keywords.splice(idx, 1);
        this.render();
        this.attachEventListeners();
        this.updateConfig();
    }

    /**
     * Remove country multiplier
     */
    removeMultiplier(button) {
        const item = button.closest('.keyword-item');
        const countryInput = item.querySelector('.multiplier-country');

        if (!countryInput) {
            console.error('Cannot find multiplier country input');
            return;
        }

        const country = countryInput.value.trim();

        if (this.config.geographic_rules?.multipliers && country) {
            delete this.config.geographic_rules.multipliers[country];
            console.log(`Removed multiplier for ${country}`);
        }

        this.render();
        this.attachEventListeners();
        this.updateConfig();
    }

    /**
     * Add country multiplier
     */
    addMultiplier() {
        const country = prompt('Enter country name (e.g., "Poland", "Italy"):');
        if (!country) return;

        const multiplierStr = prompt('Enter multiplier (0.5-2.0):', '1.0');
        if (!multiplierStr) return;

        const multiplier = parseFloat(multiplierStr);
        if (isNaN(multiplier) || multiplier < 0.5 || multiplier > 2.0) {
            alert('Invalid multiplier. Must be between 0.5 and 2.0');
            return;
        }

        if (!this.config.geographic_rules) {
            this.config.geographic_rules = {};
        }
        if (!this.config.geographic_rules.multipliers) {
            this.config.geographic_rules.multipliers = {};
        }

        this.config.geographic_rules.multipliers[country] = multiplier;

        this.render();
        this.attachEventListeners();
        this.updateConfig();
    }

    /**
     * Update configuration from UI
     */
    updateConfig() {
        // Metadata
        this.config.metadata.name = document.getElementById('filter-name')?.value || 'New Filter';
        this.config.metadata.description = document.getElementById('filter-description')?.value || '';

        // Target
        this.config.target.country = document.getElementById('target-country')?.value || '';
        this.config.target.industry = document.getElementById('target-industry')?.value || '';

        // Weights
        this.config.scoring.weights.email_quality = (document.getElementById('slider-email_quality')?.value || 0) / 100;
        this.config.scoring.weights.company_relevance = (document.getElementById('slider-company_relevance')?.value || 0) / 100;
        this.config.scoring.weights.geographic_priority = (document.getElementById('slider-geographic_priority')?.value || 0) / 100;
        this.config.scoring.weights.engagement = (document.getElementById('slider-engagement')?.value || 0) / 100;

        // Update total weight display
        const total = (Object.values(this.config.scoring.weights).reduce((a, b) => a + b, 0)).toFixed(2);
        const totalWeightEl = document.getElementById('total-weight');
        if (totalWeightEl) totalWeightEl.textContent = total;

        // Thresholds
        this.config.scoring.thresholds.high_priority = parseInt(document.getElementById('threshold-high')?.value || 100);
        this.config.scoring.thresholds.medium_priority = parseInt(document.getElementById('threshold-medium')?.value || 50);
        this.config.scoring.thresholds.low_priority = parseInt(document.getElementById('threshold-low')?.value || 10);

        // Keywords
        document.querySelectorAll('.keyword-term').forEach(input => {
            const type = input.dataset.type;
            const idx = input.dataset.idx;
            const keywords = type === 'positive' ?
                this.config.company_keywords.primary_keywords.positive :
                this.config.company_keywords.primary_keywords.negative;
            if (keywords[idx]) keywords[idx].term = input.value;
        });

        document.querySelectorAll('.keyword-weight').forEach(input => {
            const type = input.dataset.type;
            const idx = input.dataset.idx;
            const keywords = type === 'positive' ?
                this.config.company_keywords.primary_keywords.positive :
                this.config.company_keywords.primary_keywords.negative;
            if (keywords[idx]) keywords[idx].weight = parseFloat(input.value);
        });

        // Geographic
        this.config.geographic_rules.target_regions = (document.getElementById('target-regions')?.value || '')
            .split(',').map(s => s.trim()).filter(s => s);
        this.config.geographic_rules.exclude_regions = (document.getElementById('exclude-regions')?.value || '')
            .split(',').map(s => s.trim()).filter(s => s);

        // Email quality
        this.config.email_quality.corporate_domains = document.getElementById('corporate-domains')?.checked || false;
        this.config.email_quality.structure_quality = document.getElementById('structure-quality')?.checked || false;
        this.config.email_quality.suspicious_patterns = (document.getElementById('suspicious-patterns')?.value || '')
            .split(',').map(s => s.trim()).filter(s => s);

        // OEM
        this.config.domain_rules.oemEquipment.keywords = (document.getElementById('oem-keywords')?.value || '')
            .split(',').map(s => s.trim()).filter(s => s);
        this.config.domain_rules.oemEquipment.multiplier = parseFloat(document.getElementById('oem-multiplier')?.value || 1.3);

        // Timestamp
        this.config.metadata.updated = new Date().toISOString();

        // Callback
        this.onConfigChange(this.config);

        // Trigger auto-save
        this.triggerAutoSave();
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update displayed config (from external change)
     */
    setConfig(newConfig) {
        this.config = newConfig;
        this.render();
        this.attachEventListeners();
    }

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
     * Perform auto-save of current config
     */
    async performAutoSave() {
        // Check if config has changed since last save
        const currentConfigStr = JSON.stringify(this.config);
        if (currentConfigStr === this.lastSavedConfig) {
            console.log('⏭️ Config unchanged, skipping auto-save');
            return;
        }

        // Save draft using template service
        if (window.templateService) {
            try {
                await window.templateService.saveDraft('visual_builder', this.config);
                this.lastSavedConfig = currentConfigStr;
                console.log('💾 Auto-saved draft for Visual Builder');
            } catch (error) {
                console.error('❌ Auto-save failed:', error);
            }
        }
    }

    /**
     * Trigger auto-save (called after config changes)
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
            const draftData = await window.templateService.loadDraft('visual_builder');

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
            <div id="draft-restore-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
                    <!-- Header -->
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-4xl">📄</div>
                        <div>
                            <h3 class="text-xl font-semibold text-slate-900 dark:text-white">
                                Unsaved Draft Found
                            </h3>
                            <p class="text-sm text-slate-600 dark:text-slate-400">
                                Saved ${timeAgo}
                            </p>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="mb-6">
                        <p class="text-slate-700 dark:text-slate-300 mb-2">
                            You have an unsaved draft from a previous session. Would you like to restore it?
                        </p>
                        <div class="text-sm text-slate-600 dark:text-slate-400">
                            <p><strong>Filter:</strong> ${draftData.draft.metadata?.name || 'Untitled'}</p>
                            <p><strong>Target:</strong> ${draftData.draft.target?.country || 'N/A'} • ${draftData.draft.target?.industry || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3">
                        <button onclick="window.currentVisualBuilder?.restoreDraft()"
                                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Restore Draft
                        </button>
                        <button onclick="window.currentVisualBuilder?.discardDraft()"
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
            this.config = this.pendingDraft;
            this.pendingDraft = null;

            // Re-render with restored config
            this.render();
            this.attachEventListeners();

            // Update parent if callback exists
            if (this.onConfigChange) {
                this.onConfigChange(this.config);
            }

            // Close modal
            document.getElementById('draft-restore-modal')?.remove();

            if (typeof toast !== 'undefined') {
                toast.success('Draft restored successfully');
            }

            console.log('✅ Draft restored');
        }
    }

    /**
     * Discard draft
     */
    async discardDraft() {
        this.pendingDraft = null;

        // Clear draft from backend/localStorage
        if (window.templateService) {
            await window.templateService.clearDraft('visual_builder');
        }

        // Close modal
        document.getElementById('draft-restore-modal')?.remove();

        if (typeof toast !== 'undefined') {
            toast.info('Draft discarded');
        }

        console.log('🗑️ Draft discarded');
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

    /**
     * Show template selector modal
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
                    console.error('Failed to load user templates from localStorage:', e2);
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
        const modalHtml = `
            <div id="template-selector-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 class="text-xl font-semibold text-slate-900 dark:text-white">📚 Load Template</h3>
                        <button onclick="document.getElementById('template-selector-modal')?.remove()"
                                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">
                            ×
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="p-6 overflow-y-auto">
                        <!-- Built-in Templates -->
                        <div class="mb-8">
                            <h4 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Built-in Templates</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${Object.entries(builtInTemplates).map(([key, template]) => `
                                    <button onclick="window.currentVisualBuilder?.selectTemplate('builtin', '${key}')"
                                            class="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left">
                                        <div class="font-semibold text-slate-900 dark:text-white mb-1">
                                            ${template.metadata.name}
                                        </div>
                                        <div class="text-sm text-slate-600 dark:text-slate-400">
                                            ${template.metadata.description || 'No description'}
                                        </div>
                                        <div class="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                            ${template.target.country} • ${template.target.industry}
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- User Templates -->
                        <div>
                            <h4 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Your Templates</h4>
                            ${Object.keys(userTemplates).length === 0 ? `
                                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                                    <p>No saved templates yet.</p>
                                    <p class="text-sm mt-2">Use "Save as Template" to create your first template.</p>
                                </div>
                            ` : `
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    ${Object.entries(userTemplates).map(([key, template]) => `
                                        <button onclick="window.currentVisualBuilder?.selectTemplate('user', '${key}')"
                                                class="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors text-left">
                                            <div class="font-semibold text-slate-900 dark:text-white mb-1">
                                                ${template.metadata.name}
                                            </div>
                                            <div class="text-sm text-slate-600 dark:text-slate-400">
                                                ${template.metadata.description || 'No description'}
                                            </div>
                                            <div class="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                                ${template.target.country} • ${template.target.industry}
                                            </div>
                                            <div class="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                Saved: ${new Date(template.metadata.updated).toLocaleDateString()}
                                            </div>
                                        </button>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button onclick="document.getElementById('template-selector-modal')?.remove()"
                                class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        document.getElementById('template-selector-modal')?.remove();

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Select template and load it
     */
    async selectTemplate(type, key) {
        let template;

        if (type === 'builtin') {
            const templates = FilterConfig.getTemplates();
            template = templates[key];
        } else if (type === 'user') {
            // Load user template using templateService
            if (window.templateService) {
                try {
                    const allTemplates = await window.templateService.getAllTemplates();
                    const userTemplates = allTemplates.user || {};
                    template = userTemplates[key];
                } catch (e) {
                    console.error('Failed to load template via templateService:', e);
                    // Fallback to localStorage
                    try {
                        const stored = localStorage.getItem('smartFilterTemplates');
                        const userTemplates = stored ? JSON.parse(stored) : {};
                        template = userTemplates[key];
                    } catch (e2) {
                        console.error('Failed to load template from localStorage:', e2);
                    }
                }
            } else {
                // Fallback to localStorage if templateService not available
                try {
                    const stored = localStorage.getItem('smartFilterTemplates');
                    const userTemplates = stored ? JSON.parse(stored) : {};
                    template = userTemplates[key];
                } catch (e) {
                    console.error('Failed to load template from localStorage:', e);
                }
            }
        }

        if (!template) {
            if (typeof toast !== 'undefined') {
                toast.error('Template not found');
            }
            return;
        }

        // Deep copy template to avoid reference issues
        this.config = JSON.parse(JSON.stringify(template));

        // Close modal
        document.getElementById('template-selector-modal')?.remove();

        // Re-render with new config
        this.render();
        this.attachEventListeners();

        // Update parent if callback exists
        if (this.onConfigChange) {
            this.onConfigChange(this.config);
        }

        if (typeof toast !== 'undefined') {
            toast.success(`Loaded template: ${template.metadata.name}`);
        }

        console.log(`Loaded ${type} template: ${key}`);
    }

    /**
     * Save current config as template
     */
    async saveAsTemplate() {
        // Get template name from user
        const name = prompt('Enter template name:', this.config.metadata.name || 'My Template');
        if (!name) return;

        // Create unique template key using timestamp + name to prevent collisions
        // Example: "custom_1730567890123_italy_motors"
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const key = `custom_${Date.now()}_${sanitizedName}`;

        // Load existing templates using templateService
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

        // Check if template with same name already exists
        const existingTemplate = Object.values(userTemplates).find(
            t => t.metadata && t.metadata.name === name
        );

        if (existingTemplate) {
            if (!confirm(`Template "${name}" already exists. Create another version?`)) {
                return;
            }
        }

        // Update config metadata
        this.config.metadata.name = name;
        this.config.metadata.updated = new Date().toISOString();

        // Create a copy of the config for the template
        const templateCopy = JSON.parse(JSON.stringify(this.config));

        // Use templateService for saving (with backend + localStorage fallback)
        if (window.templateService) {
            window.templateService.saveTemplate(key, templateCopy).then(result => {
                if (result.success) {
                    if (typeof toast !== 'undefined') {
                        if (result.backend) {
                            toast.success(`Template "${name}" saved successfully`);
                        } else {
                            toast.warning(`Template "${name}" saved to browser only (backend unavailable)`);
                        }
                    }
                    console.log(`✅ Saved template: ${key} (backend: ${result.backend}, localStorage: ${result.localStorage})`);
                } else {
                    if (typeof toast !== 'undefined') {
                        toast.error(`Failed to save template: ${result.error}`);
                    }
                    console.error('Failed to save template:', result.error);
                }
            }).catch(e => {
                console.error('Template save error:', e);
                if (typeof toast !== 'undefined') {
                    toast.error(`Error saving template: ${e.message}`);
                }
            });
        } else {
            // Fallback to direct localStorage if templateService not available
            userTemplates[key] = templateCopy;
            try {
                localStorage.setItem('smartFilterTemplates', JSON.stringify(userTemplates));
                if (typeof toast !== 'undefined') {
                    toast.success(`Template "${name}" saved to browser`);
                }
                console.log(`Saved template to localStorage: ${key}`);
            } catch (e) {
                console.error('Failed to save template:', e);
                if (typeof toast !== 'undefined') {
                    toast.error(`Failed to save template: ${e.message}`);
                }
            }
        }
    }

    /**
     * Reset to default configuration
     */
    resetToDefault() {
        if (!confirm('Reset to default configuration? This will discard all current changes.')) {
            return;
        }

        // Create default config using FilterConfig
        this.config = FilterConfig.createDefault();

        // Re-render with default config
        this.render();
        this.attachEventListeners();

        // Update parent if callback exists
        if (this.onConfigChange) {
            this.onConfigChange(this.config);
        }

        if (typeof toast !== 'undefined') {
            toast.success('Reset to default configuration');
        }

        console.log('Reset to default configuration');
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VisualFilterBuilder };
}

// Export for browser (global scope)
// Prevent duplicate class declarations when navigating between pages
if (typeof window !== 'undefined') {
    if (!window.VisualFilterBuilder) {
        window.VisualFilterBuilder = VisualFilterBuilder;
        console.log('✅ VisualFilterBuilder class registered');
    } else {
        console.warn('⚠️ VisualFilterBuilder already defined, skipping redefinition');
    }
}
