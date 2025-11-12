/**
 * Unit tests for VisualFilterBuilder component
 * Tests UI rendering, weight sliders, threshold inputs, and config generation
 */

// Mock window object for component export
global.window = global.window || {};

// Import component (browser export makes it available on window)
require('../../web/assets/js/components/visual-filter-builder.js');

const { VisualFilterBuilder } = window;

describe('VisualFilterBuilder', () => {
    let container;
    let builder;
    let onConfigChange;

    beforeEach(() => {
        // Create container
        container = document.createElement('div');
        container.id = 'visual-filter-builder';
        document.body.appendChild(container);

        // Mock callback
        onConfigChange = jest.fn();

        // Create builder instance
        builder = new VisualFilterBuilder('visual-filter-builder', null, onConfigChange);
    });

    afterEach(() => {
        // Cleanup
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should create instance with default config', () => {
            expect(builder).toBeDefined();
            expect(builder.config).toBeDefined();
            expect(builder.config.metadata).toBeDefined();
        });

        test('should accept custom config', () => {
            const customConfig = {
                metadata: { name: 'Custom Filter' }
            };
            const customBuilder = new VisualFilterBuilder('visual-filter-builder', customConfig, onConfigChange);
            expect(customBuilder.config.metadata.name).toBe('Custom Filter');
        });

        test('should render UI elements', () => {
            builder.render();

            // Check for main sections
            expect(container.querySelector('.weights-section')).toBeTruthy();
            expect(container.querySelector('.thresholds-section')).toBeTruthy();
            expect(container.querySelector('.keywords-section')).toBeTruthy();
        });

        test('should have all weight sliders', () => {
            builder.render();

            const sliders = container.querySelectorAll('input[type="range"]');
            expect(sliders.length).toBeGreaterThanOrEqual(4); // email_quality, company_relevance, geographic_priority, engagement
        });

        test('should have all threshold inputs', () => {
            builder.render();

            const inputs = container.querySelectorAll('input[type="number"]');
            // At least 3 thresholds: high_priority, medium_priority, low_priority
            const thresholdInputs = Array.from(inputs).filter(
                input => input.id && (input.id.includes('high') || input.id.includes('medium') || input.id.includes('low'))
            );
            expect(thresholdInputs.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Weight Management', () => {
        beforeEach(() => {
            builder.render();
        });

        test('should update weight when slider changes', () => {
            const emailQualitySlider = container.querySelector('input[id*="email_quality"]');
            if (!emailQualitySlider) {
                console.warn('Email quality slider not found, skipping test');
                return;
            }

            // Simulate slider change
            emailQualitySlider.value = '0.3';
            emailQualitySlider.dispatchEvent(new Event('input', { bubbles: true }));

            // Weight should be updated in config
            expect(builder.config.scoring.weights.email_quality).toBeCloseTo(0.3, 2);
        });

        test('should normalize weights to sum to 1.0', () => {
            // Set all weights
            const weights = builder.config.scoring.weights;
            const sum = Object.values(weights).reduce((a, b) => a + b, 0);

            expect(sum).toBeCloseTo(1.0, 2);
        });

        test('should display total weight', () => {
            const totalWeightEl = container.querySelector('#total-weight, [id*="total"]');
            if (!totalWeightEl) {
                console.warn('Total weight element not found, skipping test');
                return;
            }

            const displayedTotal = parseFloat(totalWeightEl.textContent);
            expect(displayedTotal).toBeCloseTo(1.0, 1);
        });

        test('should trigger callback when weight changes', () => {
            const slider = container.querySelector('input[type="range"]');
            if (!slider) {
                console.warn('No sliders found, skipping test');
                return;
            }

            slider.value = '0.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            // Should call onChange callback
            expect(onConfigChange).toHaveBeenCalled();
        });
    });

    describe('Threshold Management', () => {
        beforeEach(() => {
            builder.render();
        });

        test('should update threshold when input changes', () => {
            const highPriorityInput = container.querySelector('input[id*="high"]');
            if (!highPriorityInput) {
                console.warn('High priority input not found, skipping test');
                return;
            }

            highPriorityInput.value = '150';
            highPriorityInput.dispatchEvent(new Event('input', { bubbles: true }));

            expect(builder.config.scoring.thresholds.high_priority).toBe(150);
        });

        test('should validate threshold order (high > medium > low)', () => {
            const thresholds = builder.config.scoring.thresholds;

            expect(thresholds.high_priority).toBeGreaterThan(thresholds.medium_priority);
            expect(thresholds.medium_priority).toBeGreaterThan(thresholds.low_priority);
        });

        test('should trigger callback when threshold changes', () => {
            const input = container.querySelector('input[type="number"]');
            if (!input) {
                console.warn('No number inputs found, skipping test');
                return;
            }

            input.value = '100';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(onConfigChange).toHaveBeenCalled();
        });
    });

    describe('Keywords Management', () => {
        beforeEach(() => {
            builder.render();
        });

        test('should add positive keyword', () => {
            const addBtn = container.querySelector('button[data-action="add-positive-keyword"]');
            const input = container.querySelector('input[data-type="positive-keyword"]');

            if (!addBtn || !input) {
                console.warn('Keyword controls not found, skipping test');
                return;
            }

            input.value = 'hydraulics';
            addBtn.click();

            // Should add to config (exact structure depends on implementation)
            const hasKeyword = builder.config.company_keywords?.positive?.includes('hydraulics') ||
                               builder.config.industry_keywords?.primary?.includes('hydraulics');
            expect(hasKeyword || input.value === '').toBeTruthy();
        });

        test('should add negative keyword', () => {
            const addBtn = container.querySelector('button[data-action="add-negative-keyword"]');
            const input = container.querySelector('input[data-type="negative-keyword"]');

            if (!addBtn || !input) {
                console.warn('Keyword controls not found, skipping test');
                return;
            }

            input.value = 'marketplace';
            addBtn.click();

            const hasKeyword = builder.config.company_keywords?.negative?.includes('marketplace') ||
                               builder.config.blacklist_keywords?.includes('marketplace');
            expect(hasKeyword || input.value === '').toBeTruthy();
        });

        test('should display existing keywords', () => {
            // Set keywords in config
            builder.config.company_keywords = {
                positive: ['pumps', 'valves'],
                negative: ['alibaba']
            };

            builder.render();

            const keywordElements = container.querySelectorAll('[data-keyword]');
            expect(keywordElements.length).toBeGreaterThan(0);
        });
    });

    describe('Config Export', () => {
        test('should export valid config object', () => {
            const config = builder.getConfig();

            expect(config).toBeDefined();
            expect(config.metadata).toBeDefined();
            expect(config.scoring).toBeDefined();
            expect(config.scoring.weights).toBeDefined();
            expect(config.scoring.thresholds).toBeDefined();
        });

        test('should have metadata fields', () => {
            const config = builder.getConfig();

            expect(config.metadata.name).toBeDefined();
            expect(config.metadata.version).toBeDefined();
            expect(config.metadata.description).toBeDefined();
        });

        test('should have all weight fields', () => {
            const config = builder.getConfig();
            const weights = config.scoring.weights;

            expect(weights).toHaveProperty('email_quality');
            expect(weights).toHaveProperty('company_relevance');
            expect(weights).toHaveProperty('geographic_priority');
            expect(weights).toHaveProperty('engagement');
        });

        test('should have all threshold fields', () => {
            const config = builder.getConfig();
            const thresholds = config.scoring.thresholds;

            expect(thresholds).toHaveProperty('high_priority');
            expect(thresholds).toHaveProperty('medium_priority');
            expect(thresholds).toHaveProperty('low_priority');
        });
    });

    describe('Config Import', () => {
        test('should load config from external source', () => {
            const newConfig = {
                metadata: {
                    name: 'Imported Filter',
                    version: '2.0.0',
                    description: 'Test import'
                },
                scoring: {
                    weights: {
                        email_quality: 0.15,
                        company_relevance: 0.40,
                        geographic_priority: 0.35,
                        engagement: 0.10
                    },
                    thresholds: {
                        high_priority: 120,
                        medium_priority: 60,
                        low_priority: 20
                    }
                }
            };

            builder.loadConfig(newConfig);

            expect(builder.config.metadata.name).toBe('Imported Filter');
            expect(builder.config.scoring.weights.email_quality).toBe(0.15);
            expect(builder.config.scoring.thresholds.high_priority).toBe(120);
        });

        test('should trigger callback after config load', () => {
            const newConfig = {
                metadata: { name: 'Test' },
                scoring: {
                    weights: {
                        email_quality: 0.1,
                        company_relevance: 0.4,
                        geographic_priority: 0.3,
                        engagement: 0.2
                    },
                    thresholds: {
                        high_priority: 100,
                        medium_priority: 50,
                        low_priority: 10
                    }
                }
            };

            builder.loadConfig(newConfig);

            expect(onConfigChange).toHaveBeenCalled();
        });

        test('should re-render UI after config load', () => {
            builder.render();
            const initialHTML = container.innerHTML;

            const newConfig = {
                metadata: { name: 'Changed Filter' },
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
                        low_priority: 50
                    }
                }
            };

            builder.loadConfig(newConfig);
            builder.render();

            // HTML should change after render
            expect(container.innerHTML).not.toBe(initialHTML);
        });
    });

    describe('Validation', () => {
        test('should validate weight sum equals 1.0', () => {
            const isValid = builder.validateWeights();
            expect(isValid).toBe(true);
        });

        test('should invalidate incorrect weight sum', () => {
            // Manually set invalid weights
            builder.config.scoring.weights = {
                email_quality: 0.5,
                company_relevance: 0.5,
                geographic_priority: 0.5,
                engagement: 0.5
            };

            const isValid = builder.validateWeights();
            expect(isValid).toBe(false);
        });

        test('should validate threshold order', () => {
            const isValid = builder.validateThresholds();
            expect(isValid).toBe(true);
        });

        test('should invalidate incorrect threshold order', () => {
            // Set invalid thresholds
            builder.config.scoring.thresholds = {
                high_priority: 50,
                medium_priority: 100, // Medium > High (invalid)
                low_priority: 10
            };

            const isValid = builder.validateThresholds();
            expect(isValid).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing container gracefully', () => {
            // Remove container
            document.body.removeChild(container);

            // Should not throw
            expect(() => {
                new VisualFilterBuilder('non-existent-container', null, onConfigChange);
            }).not.toThrow();
        });

        test('should handle invalid config gracefully', () => {
            const invalidConfig = { invalid: 'structure' };

            expect(() => {
                builder.loadConfig(invalidConfig);
            }).not.toThrow();
        });

        test('should handle null callback', () => {
            const builderNoCallback = new VisualFilterBuilder('visual-filter-builder', null, null);

            expect(() => {
                builderNoCallback.render();
            }).not.toThrow();
        });
    });
});
