/**
 * Filter Configuration System
 * Defines schema, validation, and default configurations for Smart Filter
 *
 * @module FilterConfig
 */

class FilterConfig {
    /**
     * Static schema definition for filter configuration
     */
    static SCHEMA = {
        metadata: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
            description: { type: 'string', required: false, maxLength: 500 },
            version: { type: 'string', required: true, pattern: /^\d+\.\d+$/ },
            author: { type: 'string', required: false },
            created: { type: 'string', required: true },
            updated: { type: 'string', required: true }
        },
        target: {
            country: { type: 'string', required: true },
            industry: { type: 'string', required: true },
            languages: { type: 'array', required: true, minLength: 1, maxLength: 5 }
        },
        scoring: {
            weights: {
                email_quality: { type: 'number', required: true, min: 0, max: 1 },
                company_relevance: { type: 'number', required: true, min: 0, max: 1 },
                geographic_priority: { type: 'number', required: true, min: 0, max: 1 },
                engagement: { type: 'number', required: true, min: 0, max: 1 }
            },
            thresholds: {
                high_priority: { type: 'number', required: true, min: 0, max: 200 },
                medium_priority: { type: 'number', required: true, min: 0, max: 200 },
                low_priority: { type: 'number', required: true, min: 0, max: 200 }
            }
        },
        company_keywords: {
            primary_keywords: {
                positive: { type: 'array', required: true },
                negative: { type: 'array', required: false }
            },
            secondary_keywords: {
                positive: { type: 'array', required: false },
                negative: { type: 'array', required: false }
            }
        },
        geographic_rules: {
            target_regions: { type: 'array', required: false },
            exclude_regions: { type: 'array', required: false },
            multipliers: { type: 'object', required: false }
        },
        email_quality: {
            corporate_domains: { type: 'boolean', required: true },
            free_email_penalty: { type: 'number', required: false, min: -1, max: 0 },
            structure_quality: { type: 'boolean', required: true },
            suspicious_patterns: { type: 'array', required: false }
        },
        domain_rules: {
            oemEquipment: {
                keywords: { type: 'array', required: false },
                multiplier: { type: 'number', required: false, min: 0.5, max: 2 }
            }
        }
    };

    /**
     * Get default configuration template
     * @returns {Object} Default configuration
     */
    static getDefaultConfig() {
        const now = new Date().toISOString();
        return {
            metadata: {
                id: `filter_${Date.now()}`,
                name: 'New Filter',
                description: 'Custom filter configuration',
                version: '1.0',
                author: 'user',
                created: now,
                updated: now
            },
            target: {
                country: 'Italy',
                industry: 'Hydraulics',
                languages: ['en', 'it']
            },
            scoring: {
                weights: {
                    email_quality: 0.10,
                    company_relevance: 0.45,
                    geographic_priority: 0.30,
                    engagement: 0.15
                },
                thresholds: {
                    high_priority: 100,
                    medium_priority: 50,
                    low_priority: 10
                }
            },
            company_keywords: {
                primary_keywords: {
                    positive: [
                        { term: 'hydraulic', weight: 1.0 },
                        { term: 'pump', weight: 0.8 },
                        { term: 'pressure', weight: 0.7 }
                    ],
                    negative: [
                        { term: 'dropshipper', weight: 0.5 },
                        { term: 'reseller', weight: 0.3 }
                    ]
                },
                secondary_keywords: {
                    positive: ['equipment', 'systems'],
                    negative: ['marketplace', 'auction']
                }
            },
            geographic_rules: {
                target_regions: ['Italy', 'Central Europe'],
                exclude_regions: [],
                multipliers: {
                    'Italy': 2.0,
                    'Germany': 1.5,
                    'EU': 1.2,
                    'Others': 0.5
                }
            },
            email_quality: {
                corporate_domains: true,
                free_email_penalty: -0.5,
                structure_quality: true,
                suspicious_patterns: ['no-reply', 'noreply', 'donotreply', 'nfeedback']
            },
            domain_rules: {
                oemEquipment: {
                    keywords: ['oem', 'manufacturer', 'factory'],
                    multiplier: 1.3
                }
            }
        };
    }

    /**
     * Get built-in filter templates
     * @returns {Object} Map of templates
     */
    static getTemplates() {
        return {
            'italy_hydraulics': this.getDefaultConfig(),
            'germany_manufacturing': {
                ...this.getDefaultConfig(),
                metadata: {
                    ...this.getDefaultConfig().metadata,
                    id: 'germany_manufacturing',
                    name: 'Germany Manufacturing',
                    description: 'Filter for German manufacturing companies'
                },
                target: {
                    country: 'Germany',
                    industry: 'Manufacturing',
                    languages: ['de', 'en']
                },
                geographic_rules: {
                    target_regions: ['Germany', 'Central Europe'],
                    exclude_regions: [],
                    multipliers: {
                        'Germany': 2.0,
                        'Austria': 1.5,
                        'EU': 1.0,
                        'Others': 0.3
                    }
                }
            },
            'generic': this.getDefaultConfig()
        };
    }

    /**
     * Validate configuration against schema
     * @param {Object} config - Configuration to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateSchema(config) {
        const errors = [];

        // Check if config is object
        if (!config || typeof config !== 'object') {
            return { valid: false, errors: ['Configuration must be an object'] };
        }

        // Check required top-level fields
        const requiredFields = ['metadata', 'target', 'scoring', 'company_keywords', 'email_quality'];
        for (const field of requiredFields) {
            if (!config[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate metadata
        if (config.metadata) {
            if (!config.metadata.name) errors.push('metadata.name is required');
            if (!config.metadata.version) errors.push('metadata.version is required');
            if (config.metadata.name && config.metadata.name.length > 100) {
                errors.push('metadata.name must be <= 100 characters');
            }
        }

        // Validate target
        if (config.target) {
            if (!config.target.country) errors.push('target.country is required');
            if (!config.target.industry) errors.push('target.industry is required');
            if (!Array.isArray(config.target.languages) || config.target.languages.length === 0) {
                errors.push('target.languages must be non-empty array');
            }
        }

        // Validate scoring weights sum to 1.0
        if (config.scoring && config.scoring.weights) {
            const weights = config.scoring.weights;
            const sum = (weights.email_quality || 0) +
                       (weights.company_relevance || 0) +
                       (weights.geographic_priority || 0) +
                       (weights.engagement || 0);
            const tolerance = 0.01;
            if (Math.abs(sum - 1.0) > tolerance) {
                errors.push(`Scoring weights must sum to 1.0 (currently ${sum.toFixed(2)})`);
            }

            // Validate ranges
            for (const [key, value] of Object.entries(weights)) {
                if (value < 0 || value > 1) {
                    errors.push(`${key} weight must be between 0 and 1`);
                }
            }
        }

        // Validate thresholds ordering
        if (config.scoring && config.scoring.thresholds) {
            const t = config.scoring.thresholds;
            if (t.high_priority <= t.medium_priority || t.medium_priority <= t.low_priority) {
                errors.push('Thresholds must be in order: high > medium > low');
            }
        }

        // Validate company_keywords structure
        if (config.company_keywords) {
            if (!Array.isArray(config.company_keywords.primary_keywords?.positive)) {
                errors.push('company_keywords.primary_keywords.positive must be an array');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse JSON string to configuration
     * @param {string} jsonString - JSON string to parse
     * @returns {Object} { success: boolean, config: Object|null, error: string|null }
     */
    static parseJSON(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            const validation = this.validateSchema(config);

            if (!validation.valid) {
                return {
                    success: false,
                    config: null,
                    error: validation.errors.join('; ')
                };
            }

            return { success: true, config, error: null };
        } catch (e) {
            return {
                success: false,
                config: null,
                error: `JSON Parse Error: ${e.message}`
            };
        }
    }

    /**
     * Convert configuration to JSON string
     * @param {Object} config - Configuration to stringify
     * @returns {string} Formatted JSON
     */
    static toJSON(config) {
        return JSON.stringify(config, null, 2);
    }

    /**
     * Merge two configurations (override deep merges)
     * @param {Object} base - Base configuration
     * @param {Object} override - Configuration to merge in
     * @returns {Object} Merged configuration
     */
    static mergeConfigs(base, override) {
        return {
            ...base,
            metadata: { ...base.metadata, ...override.metadata },
            target: { ...base.target, ...override.target },
            scoring: {
                weights: { ...base.scoring.weights, ...override.scoring.weights },
                thresholds: { ...base.scoring.thresholds, ...override.scoring.thresholds }
            },
            company_keywords: {
                primary_keywords: {
                    positive: override.company_keywords?.primary_keywords?.positive || base.company_keywords.primary_keywords.positive,
                    negative: override.company_keywords?.primary_keywords?.negative || base.company_keywords.primary_keywords.negative
                },
                secondary_keywords: {
                    positive: override.company_keywords?.secondary_keywords?.positive || base.company_keywords.secondary_keywords.positive,
                    negative: override.company_keywords?.secondary_keywords?.negative || base.company_keywords.secondary_keywords.negative
                }
            },
            geographic_rules: { ...base.geographic_rules, ...override.geographic_rules },
            email_quality: { ...base.email_quality, ...override.email_quality },
            domain_rules: { ...base.domain_rules, ...override.domain_rules }
        };
    }

    /**
     * Clone configuration object
     * @param {Object} config - Configuration to clone
     * @returns {Object} Deep copy of configuration
     */
    static clone(config) {
        return JSON.parse(JSON.stringify(config));
    }

    /**
     * Create a new FilterConfig instance
     */
    constructor(configOrTemplate = 'generic') {
        if (typeof configOrTemplate === 'string') {
            // Load from template
            const templates = FilterConfig.getTemplates();
            this.config = FilterConfig.clone(templates[configOrTemplate] || templates.generic);
        } else if (typeof configOrTemplate === 'object') {
            // Use provided config
            this.config = FilterConfig.clone(configOrTemplate);
        } else {
            // Default to generic template
            this.config = FilterConfig.getDefaultConfig();
        }

        this.validation = FilterConfig.validateSchema(this.config);
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update configuration
     * @param {Object} updates - Partial updates to merge
     */
    updateConfig(updates) {
        this.config = FilterConfig.mergeConfigs(this.config, updates);
        this.config.metadata.updated = new Date().toISOString();
        this.validation = FilterConfig.validateSchema(this.config);
    }

    /**
     * Check if configuration is valid
     * @returns {boolean} True if valid
     */
    isValid() {
        return this.validation.valid;
    }

    /**
     * Get validation errors
     * @returns {Array} Array of error strings
     */
    getErrors() {
        return this.validation.errors;
    }

    /**
     * Export to JSON
     * @returns {string} JSON string
     */
    toJSON() {
        return FilterConfig.toJSON(this.config);
    }

    /**
     * Export to plain object
     * @returns {Object} Plain JavaScript object
     */
    toObject() {
        return FilterConfig.clone(this.config);
    }

    /**
     * Reset to default or template
     * @param {string} template - Template name
     */
    reset(template = 'generic') {
        this.config = FilterConfig.clone(FilterConfig.getTemplates()[template]);
        this.validation = FilterConfig.validateSchema(this.config);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FilterConfig };
}
