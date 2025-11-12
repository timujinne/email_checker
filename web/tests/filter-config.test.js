/**
 * FilterConfig Component Tests
 * Comprehensive test suite for filter configuration management
 */

// Import the component (using require for CommonJS compatibility)
const { FilterConfig } = require('../../web/assets/js/components/filter-config.js');
const {
    createValidConfig,
    createMinimalConfig,
    createSafeUpdate,
    assertValidConfig,
    assertWeightsValid,
    assertThresholdsOrdered
} = require('./helpers/test-utils.js');

describe('FilterConfig', () => {
    describe('Schema Validation', () => {
        test('validates complete valid configuration', () => {
            const config = createValidConfig();
            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects config with missing metadata', () => {
            const config = createValidConfig();
            delete config.metadata;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: metadata');
        });

        test('rejects config with missing metadata.name', () => {
            const config = createValidConfig();
            delete config.metadata.name;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata.name is required');
        });

        test('rejects config with missing metadata.version', () => {
            const config = createValidConfig();
            delete config.metadata.version;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata.version is required');
        });

        test('rejects config with metadata.name too long', () => {
            const config = createValidConfig();
            config.metadata.name = 'a'.repeat(101); // 101 characters

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata.name must be <= 100 characters');
        });

        test('rejects config with missing target section', () => {
            const config = createValidConfig();
            delete config.target;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: target');
        });

        test('rejects config with missing target.country', () => {
            const config = createValidConfig();
            delete config.target.country;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('target.country is required');
        });

        test('rejects config with missing target.industry', () => {
            const config = createValidConfig();
            delete config.target.industry;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('target.industry is required');
        });

        test('rejects config with empty target.languages array', () => {
            const config = createValidConfig();
            config.target.languages = [];

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('target.languages must be non-empty array');
        });

        test('rejects config with missing scoring section', () => {
            const config = createValidConfig();
            delete config.scoring;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: scoring');
        });

        test('rejects config with missing company_keywords section', () => {
            const config = createValidConfig();
            delete config.company_keywords;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: company_keywords');
        });

        test('rejects config with missing email_quality section', () => {
            const config = createValidConfig();
            delete config.email_quality;

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing required field: email_quality');
        });

        test('rejects config that is not an object', () => {
            const result = FilterConfig.validateSchema(null);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Configuration must be an object');
        });

        test('rejects config with non-array primary_keywords.positive', () => {
            const config = createValidConfig();
            config.company_keywords.primary_keywords.positive = 'not an array';

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('company_keywords.primary_keywords.positive must be an array');
        });

        test('accepts minimal valid configuration', () => {
            const config = createMinimalConfig();
            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Weight Sum Validation', () => {
        test('accepts weights totaling 1.0 exactly', () => {
            const config = createValidConfig({
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
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('accepts weights within 0.01 tolerance (0.999)', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.10,
                        company_relevance: 0.45,
                        geographic_priority: 0.30,
                        engagement: 0.149 // Sum = 0.999
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('accepts weights within 0.01 tolerance (1.009)', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.10,
                        company_relevance: 0.459, // Sum = 1.009
                        geographic_priority: 0.30,
                        engagement: 0.15
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects weights totaling less than 0.99', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.10,
                        company_relevance: 0.40,
                        geographic_priority: 0.20,
                        engagement: 0.10 // Sum = 0.80
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Scoring weights must sum to 1.0'))).toBe(true);
            expect(result.errors.some(e => e.includes('0.80'))).toBe(true);
        });

        test('rejects weights totaling more than 1.01', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.20,
                        company_relevance: 0.50,
                        geographic_priority: 0.40,
                        engagement: 0.20 // Sum = 1.30
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Scoring weights must sum to 1.0'))).toBe(true);
            expect(result.errors.some(e => e.includes('1.30'))).toBe(true);
        });

        test('rejects weight values < 0', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: -0.10,
                        company_relevance: 0.55,
                        geographic_priority: 0.30,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('email_quality weight must be between 0 and 1'))).toBe(true);
        });

        test('rejects weight values > 1', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.10,
                        company_relevance: 1.50,
                        geographic_priority: 0.30,
                        engagement: 0.15
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('company_relevance weight must be between 0 and 1'))).toBe(true);
        });
    });

    describe('Threshold Validation', () => {
        test('accepts properly ordered thresholds (high > medium > low)', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.25,
                        company_relevance: 0.25,
                        geographic_priority: 0.25,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects thresholds with high <= medium', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.25,
                        company_relevance: 0.25,
                        geographic_priority: 0.25,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 50,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Thresholds must be in order: high > medium > low');
        });

        test('rejects thresholds with medium <= low', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.25,
                        company_relevance: 0.25,
                        geographic_priority: 0.25,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 10,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Thresholds must be in order: high > medium > low');
        });

        test('rejects thresholds with high < medium', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.25,
                        company_relevance: 0.25,
                        geographic_priority: 0.25,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 30,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Thresholds must be in order: high > medium > low');
        });

        test('accepts thresholds with large gaps', () => {
            const config = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.25,
                        company_relevance: 0.25,
                        geographic_priority: 0.25,
                        engagement: 0.25
                    },
                    thresholds: {
                        high_priority: 200,
                        medium_priority: 100,
                        low_priority: 1
                    }
                }
            });

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Template Loading', () => {
        test('loads Italy Hydraulics template correctly', () => {
            const templates = FilterConfig.getTemplates();
            const template = templates.italy_hydraulics;

            expect(template).toBeDefined();
            expect(template.target.country).toBe('Italy');
            expect(template.target.industry).toBe('Hydraulics');
            assertValidConfig(template);
            assertWeightsValid(template.scoring.weights);
        });

        test('loads Germany Manufacturing template correctly', () => {
            const templates = FilterConfig.getTemplates();
            const template = templates.germany_manufacturing;

            expect(template).toBeDefined();
            expect(template.metadata.name).toBe('Germany Manufacturing');
            expect(template.target.country).toBe('Germany');
            expect(template.target.industry).toBe('Manufacturing');
            assertValidConfig(template);
            assertWeightsValid(template.scoring.weights);
        });

        test('loads Generic template correctly', () => {
            const templates = FilterConfig.getTemplates();
            const template = templates.generic;

            expect(template).toBeDefined();
            assertValidConfig(template);
            assertWeightsValid(template.scoring.weights);
        });

        test('templates include all required fields', () => {
            const templates = FilterConfig.getTemplates();

            for (const [name, template] of Object.entries(templates)) {
                const result = FilterConfig.validateSchema(template);
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            }
        });
    });

    describe('Config Merging', () => {
        test('merges partial config with defaults', () => {
            const base = createValidConfig();
            const override = createSafeUpdate({
                metadata: {
                    name: 'Custom Name'
                }
            });

            const merged = FilterConfig.mergeConfigs(base, override);

            expect(merged.metadata.name).toBe('Custom Name');
            expect(merged.metadata.version).toBe(base.metadata.version);
            expect(merged.target).toEqual(base.target);
        });

        test('deep merges nested objects', () => {
            const base = createValidConfig();
            const override = createSafeUpdate({
                scoring: {
                    weights: {
                        email_quality: 0.20
                    },
                    thresholds: {}
                }
            });

            const merged = FilterConfig.mergeConfigs(base, override);

            expect(merged.scoring.weights.email_quality).toBe(0.20);
            expect(merged.scoring.weights.company_relevance).toBe(base.scoring.weights.company_relevance);
            expect(merged.scoring.thresholds).toEqual(base.scoring.thresholds);
        });

        test('does not mutate original config', () => {
            const base = createValidConfig();
            const originalName = base.metadata.name;
            const override = createSafeUpdate({
                metadata: {
                    name: 'New Name'
                }
            });

            FilterConfig.mergeConfigs(base, override);

            expect(base.metadata.name).toBe(originalName);
        });

        test('merges geographic rules correctly', () => {
            const base = createValidConfig();
            const override = createSafeUpdate({
                geographic_rules: {
                    target_regions: ['France', 'Spain']
                }
            });

            const merged = FilterConfig.mergeConfigs(base, override);

            expect(merged.geographic_rules.target_regions).toEqual(['France', 'Spain']);
            expect(merged.geographic_rules.multipliers).toEqual(base.geographic_rules.multipliers);
        });

        test('handles empty override', () => {
            const base = createValidConfig();
            const merged = FilterConfig.mergeConfigs(base, createSafeUpdate({}));

            // Should preserve all base values
            expect(merged.metadata).toEqual(base.metadata);
            expect(merged.target).toEqual(base.target);
        });
    });

    describe('Config Cloning', () => {
        test('creates independent copy', () => {
            const original = createValidConfig();
            const clone = FilterConfig.clone(original);

            clone.metadata.name = 'Modified';

            expect(original.metadata.name).not.toBe('Modified');
        });

        test('deep clones nested objects', () => {
            const original = createValidConfig();
            const clone = FilterConfig.clone(original);

            clone.scoring.weights.email_quality = 0.99;

            expect(original.scoring.weights.email_quality).not.toBe(0.99);
        });

        test('deep clones arrays', () => {
            const original = createValidConfig();
            const clone = FilterConfig.clone(original);

            clone.target.languages.push('de');

            expect(original.target.languages).not.toContain('de');
        });

        test('cloned config is valid', () => {
            const original = createValidConfig();
            const clone = FilterConfig.clone(original);

            const result = FilterConfig.validateSchema(clone);

            expect(result.valid).toBe(true);
        });
    });

    describe('JSON Parsing', () => {
        test('parses valid JSON string', () => {
            const config = createValidConfig();
            const jsonString = JSON.stringify(config);

            const result = FilterConfig.parseJSON(jsonString);

            expect(result.success).toBe(true);
            expect(result.config).toEqual(config);
            expect(result.error).toBeNull();
        });

        test('rejects invalid JSON string', () => {
            const result = FilterConfig.parseJSON('{ invalid json }');

            expect(result.success).toBe(false);
            expect(result.config).toBeNull();
            expect(result.error).toContain('JSON Parse Error');
        });

        test('rejects JSON with invalid schema', () => {
            const invalidConfig = { metadata: {} }; // Missing required fields
            const jsonString = JSON.stringify(invalidConfig);

            const result = FilterConfig.parseJSON(jsonString);

            expect(result.success).toBe(false);
            expect(result.config).toBeNull();
            expect(result.error).toBeDefined();
        });
    });

    describe('JSON Stringification', () => {
        test('converts config to formatted JSON', () => {
            const config = createMinimalConfig();
            const jsonString = FilterConfig.toJSON(config);

            expect(jsonString).toBeDefined();
            expect(jsonString).toContain('"metadata"');
            expect(jsonString).toContain('"target"');
            expect(jsonString).toContain('"scoring"');

            // Should be formatted with indentation
            expect(jsonString.split('\n').length).toBeGreaterThan(10);
        });

        test('roundtrip JSON conversion preserves data', () => {
            const config = createValidConfig();
            const jsonString = FilterConfig.toJSON(config);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual(config);
        });
    });

    describe('FilterConfig Instance', () => {
        test('creates instance with generic template', () => {
            const filterConfig = new FilterConfig();

            expect(filterConfig.config).toBeDefined();
            expect(filterConfig.isValid()).toBe(true);
            assertValidConfig(filterConfig.config);
        });

        test('creates instance with specific template', () => {
            const filterConfig = new FilterConfig('italy_hydraulics');

            expect(filterConfig.config.target.country).toBe('Italy');
            expect(filterConfig.isValid()).toBe(true);
        });

        test('creates instance with custom config object', () => {
            const customConfig = createValidConfig();
            const filterConfig = new FilterConfig(customConfig);

            expect(filterConfig.config).toEqual(customConfig);
            expect(filterConfig.isValid()).toBe(true);
        });

        test('validates config on creation', () => {
            const filterConfig = new FilterConfig();

            expect(filterConfig.validation).toBeDefined();
            expect(filterConfig.validation.valid).toBe(true);
        });

        test('getConfig returns current configuration', () => {
            const filterConfig = new FilterConfig();
            const config = filterConfig.getConfig();

            assertValidConfig(config);
        });

        test('updateConfig merges updates', () => {
            const filterConfig = new FilterConfig();
            const originalName = filterConfig.config.metadata.name;

            filterConfig.updateConfig(createSafeUpdate({
                metadata: {
                    name: 'Updated Name'
                }
            }));

            expect(filterConfig.config.metadata.name).toBe('Updated Name');
            expect(filterConfig.config.metadata.name).not.toBe(originalName);
        });

        test('updateConfig updates timestamp', async () => {
            const filterConfig = new FilterConfig();
            const originalTimestamp = filterConfig.config.metadata.updated;

            // Wait a bit to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));
            filterConfig.updateConfig(createSafeUpdate({ metadata: { name: 'New' } }));
            expect(filterConfig.config.metadata.updated).not.toBe(originalTimestamp);
        });

        test('updateConfig revalidates', () => {
            const filterConfig = new FilterConfig();

            // Update with invalid weights
            filterConfig.updateConfig(createSafeUpdate({
                scoring: {
                    weights: {
                        email_quality: 0.5,
                        company_relevance: 0.5,
                        geographic_priority: 0.5,
                        engagement: 0.5
                    },
                    thresholds: {}
                }
            }));

            expect(filterConfig.isValid()).toBe(false);
        });

        test('isValid returns validation status', () => {
            const filterConfig = new FilterConfig();

            expect(filterConfig.isValid()).toBe(true);
        });

        test('getErrors returns validation errors', () => {
            const invalidConfig = { metadata: {} };
            const filterConfig = new FilterConfig(invalidConfig);

            const errors = filterConfig.getErrors();

            expect(errors).toBeDefined();
            expect(errors.length).toBeGreaterThan(0);
        });

        test('toJSON exports as JSON string', () => {
            const filterConfig = new FilterConfig();
            const jsonString = filterConfig.toJSON();

            expect(typeof jsonString).toBe('string');
            expect(jsonString).toContain('"metadata"');
        });

        test('toObject exports as plain object', () => {
            const filterConfig = new FilterConfig();
            const obj = filterConfig.toObject();

            expect(typeof obj).toBe('object');
            assertValidConfig(obj);
        });

        test('reset restores to template', () => {
            const filterConfig = new FilterConfig();
            filterConfig.updateConfig(createSafeUpdate({ metadata: { name: 'Modified' } }));

            filterConfig.reset('generic');

            expect(filterConfig.config.metadata.name).toBe('New Filter');
            expect(filterConfig.isValid()).toBe(true);
        });

        test('reset with unknown template falls back to existing', () => {
            const filterConfig = new FilterConfig('italy_hydraulics');
            const originalCountry = filterConfig.config.target.country;

            // Reset with unknown template - should use existing config's template or fail gracefully
            try {
                filterConfig.reset('unknown_template');
                // If it doesn't fail, it should still be valid
                expect(filterConfig.isValid()).toBe(true);
            } catch (e) {
                // Expected behavior if template doesn't exist
                expect(e).toBeDefined();
            }
        });
    });

    describe('Default Configuration', () => {
        test('getDefaultConfig returns valid configuration', () => {
            const config = FilterConfig.getDefaultConfig();

            const result = FilterConfig.validateSchema(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('default config has all required fields', () => {
            const config = FilterConfig.getDefaultConfig();

            assertValidConfig(config);
            assertWeightsValid(config.scoring.weights);
            assertThresholdsOrdered(config.scoring.thresholds);
        });

        test('default config includes metadata timestamps', () => {
            const config = FilterConfig.getDefaultConfig();

            expect(config.metadata.created).toBeDefined();
            expect(config.metadata.updated).toBeDefined();
            expect(new Date(config.metadata.created)).toBeInstanceOf(Date);
            expect(new Date(config.metadata.updated)).toBeInstanceOf(Date);
        });
    });
});
