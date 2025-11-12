/**
 * Test Utilities and Factories
 * Helper functions for creating test data and common assertions
 */

/**
 * Create a valid filter configuration
 * @param {Object} overrides - Optional overrides for specific fields
 * @returns {Object} Valid filter configuration
 */
export function createValidConfig(overrides = {}) {
    const now = new Date().toISOString();
    const base = {
        metadata: {
            id: `filter_${Date.now()}`,
            name: 'Test Filter',
            description: 'Test filter configuration',
            version: '1.0',
            author: 'test',
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
                    { term: 'pump', weight: 0.8 }
                ],
                negative: [
                    { term: 'marketplace', weight: 0.5 }
                ]
            },
            secondary_keywords: {
                positive: ['equipment', 'industrial'],
                negative: ['alibaba', 'reseller']
            }
        },
        geographic_rules: {
            target_regions: ['Italy', 'Central Europe'],
            exclude_regions: [],
            multipliers: {
                'Italy': 2.0,
                'Germany': 1.5,
                'EU': 1.0,
                'Others': 0.5
            }
        },
        email_quality: {
            corporate_domains: true,
            free_email_penalty: -0.5,
            structure_quality: true,
            suspicious_patterns: ['noreply', 'no-reply', 'donotreply']
        },
        domain_rules: {
            oemEquipment: {
                keywords: ['oem', 'manufacturer', 'factory'],
                multiplier: 1.3
            }
        }
    };

    return deepMerge(base, overrides);
}

/**
 * Create a minimal valid configuration (only required fields)
 * @returns {Object} Minimal valid configuration
 */
export function createMinimalConfig() {
    const now = new Date().toISOString();
    return {
        metadata: {
            id: 'min_filter',
            name: 'Minimal',
            version: '1.0',
            created: now,
            updated: now
        },
        target: {
            country: 'US',
            industry: 'Generic',
            languages: ['en']
        },
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
        },
        company_keywords: {
            primary_keywords: {
                positive: [{ term: 'test', weight: 1.0 }]
            }
        },
        email_quality: {
            corporate_domains: true,
            structure_quality: true
        }
    };
}

/**
 * Create test email object
 * @param {Object} overrides - Optional overrides
 * @returns {Object} Email test object
 */
export function createTestEmail(overrides = {}) {
    return {
        email: 'info@example.com',
        company: 'Example Company',
        domain: 'example.com',
        country: 'IT',
        metadata: {},
        ...overrides
    };
}

/**
 * Create corporate email
 * @param {Object} overrides - Optional overrides
 * @returns {Object} Corporate email object
 */
export function createCorporateEmail(overrides = {}) {
    return createTestEmail({
        email: 'contact@hydraulics-corp.com',
        company: 'Hydraulics Corporation',
        domain: 'hydraulics-corp.com',
        country: 'IT',
        ...overrides
    });
}

/**
 * Create free email (gmail, yahoo, etc.)
 * @param {Object} overrides - Optional overrides
 * @returns {Object} Free email object
 */
export function createFreeEmail(overrides = {}) {
    return createTestEmail({
        email: 'user@gmail.com',
        company: 'Personal Contact',
        domain: 'gmail.com',
        country: 'US',
        ...overrides
    });
}

/**
 * Create email with industry keywords
 * @param {string[]} keywords - Keywords to include
 * @param {Object} overrides - Optional overrides
 * @returns {Object} Email with keywords
 */
export function createEmailWithKeywords(keywords, overrides = {}) {
    const company = `${keywords.join(' ')} Company`;
    return createTestEmail({
        company,
        email: `info@${keywords[0]}.com`,
        domain: `${keywords[0]}.com`,
        ...overrides
    });
}

/**
 * Create batch of test emails
 * @param {number} count - Number of emails to create
 * @param {Function} factory - Factory function (default: createTestEmail)
 * @returns {Array} Array of email objects
 */
export function createEmailBatch(count, factory = createTestEmail) {
    return Array.from({ length: count }, (_, i) => factory({
        email: `user${i}@example.com`,
        company: `Company ${i}`
    }));
}

/**
 * Create a safe partial update (fills in empty objects for undefined sections)
 * @param {Object} partial - Partial configuration
 * @returns {Object} Safe update object with all sections defined
 */
export function createSafeUpdate(partial) {
    return {
        metadata: partial.metadata || {},
        target: partial.target || {},
        scoring: partial.scoring || { weights: {}, thresholds: {} },
        company_keywords: partial.company_keywords || {
            primary_keywords: {},
            secondary_keywords: {}
        },
        geographic_rules: partial.geographic_rules || {},
        email_quality: partial.email_quality || {},
        domain_rules: partial.domain_rules || {}
    };
}

/**
 * Deep merge utility
 * @private
 */
function deepMerge(target, source) {
    const output = { ...target };

    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }

    return output;
}

/**
 * Assert configuration is valid
 * @param {Object} config - Configuration to check
 */
export function assertValidConfig(config) {
    expect(config).toBeDefined();
    expect(config.metadata).toBeDefined();
    expect(config.metadata.name).toBeDefined();
    expect(config.metadata.version).toBeDefined();
    expect(config.target).toBeDefined();
    expect(config.scoring).toBeDefined();
    expect(config.scoring.weights).toBeDefined();
    expect(config.scoring.thresholds).toBeDefined();
}

/**
 * Assert scoring weights sum to 1.0
 * @param {Object} weights - Weights object
 * @param {number} tolerance - Allowed tolerance (default: 0.01)
 */
export function assertWeightsValid(weights, tolerance = 0.01) {
    const sum = weights.email_quality + weights.company_relevance +
                weights.geographic_priority + weights.engagement;
    expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert thresholds are properly ordered
 * @param {Object} thresholds - Thresholds object
 */
export function assertThresholdsOrdered(thresholds) {
    expect(thresholds.high_priority).toBeGreaterThan(thresholds.medium_priority);
    expect(thresholds.medium_priority).toBeGreaterThan(thresholds.low_priority);
}

/**
 * Assert score is within range
 * @param {number} score - Score to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 */
export function assertScoreInRange(score, min, max) {
    expect(score).toBeGreaterThanOrEqual(min);
    expect(score).toBeLessThanOrEqual(max);
}

/**
 * Create mock API response
 * @param {Object} data - Response data
 * @param {boolean} success - Success status
 * @returns {Object} Mock response object
 */
export function createMockResponse(data, success = true) {
    return {
        ok: success,
        status: success ? 200 : 500,
        statusText: success ? 'OK' : 'Internal Server Error',
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data))
    };
}

/**
 * Wait for next tick
 * @returns {Promise} Promise that resolves on next tick
 */
export function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Flush all pending promises
 * @returns {Promise} Promise that resolves after all pending promises
 */
export function flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
}
