/**
 * FilterScorer Component Tests
 * Comprehensive test suite for email scoring engine
 */

// Import components
const { FilterScorer } = require('../../web/assets/js/components/filter-scorer.js');
const { FilterConfig } = require('../../web/assets/js/components/filter-config.js');
const {
    createValidConfig,
    createTestEmail,
    createCorporateEmail,
    createFreeEmail,
    createEmailWithKeywords,
    createEmailBatch,
    assertScoreInRange
} = require('./helpers/test-utils.js');

describe('FilterScorer', () => {
    let scorer;
    let config;

    beforeEach(() => {
        config = createValidConfig();
        scorer = new FilterScorer(config);
    });

    describe('Initialization', () => {
        test('creates scorer with valid config', () => {
            expect(scorer).toBeDefined();
            expect(scorer.config).toEqual(config);
        });

        test('initializes cache', () => {
            expect(scorer.cache).toBeDefined();
            expect(scorer.cache).toBeInstanceOf(Map);
            expect(scorer.cache.size).toBe(0);
        });

        test('sets cache size limit', () => {
            expect(scorer.cacheSize).toBe(1000);
        });
    });

    describe('Email Quality Scoring', () => {
        test('scores corporate domain email highly', () => {
            const email = createCorporateEmail();
            const score = scorer.scoreEmailQuality(email);

            assertScoreInRange(score, 6, 10);
        });

        test('penalizes free domain email', () => {
            const email = createFreeEmail();
            const score = scorer.scoreEmailQuality(email);

            assertScoreInRange(score, 0, 6);
        });

        test('detects gmail as free domain', () => {
            const email = createTestEmail({ email: 'user@gmail.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(6);
        });

        test('detects yahoo as free domain', () => {
            const email = createTestEmail({ email: 'user@yahoo.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(6);
        });

        test('detects hotmail as free domain', () => {
            const email = createTestEmail({ email: 'user@hotmail.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(6);
        });

        test('penalizes suspicious pattern "noreply"', () => {
            const email = createTestEmail({ email: 'noreply@company.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(8);
        });

        test('penalizes suspicious pattern "no-reply"', () => {
            const email = createTestEmail({ email: 'no-reply@company.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(8);
        });

        test('penalizes suspicious pattern "donotreply"', () => {
            const email = createTestEmail({ email: 'donotreply@company.com' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(8);
        });

        test('scores valid structure positively', () => {
            const email = createTestEmail({ email: 'valid@domain.com' });
            const score = scorer.scoreEmailQuality(email);

            assertScoreInRange(score, 0, 10);
        });

        test('penalizes invalid email structure', () => {
            const email = createTestEmail({ email: 'invalid-email' });
            const score = scorer.scoreEmailQuality(email);

            expect(score).toBeLessThan(7);
        });

        test('handles missing email gracefully', () => {
            const email = createTestEmail({ email: '' });
            const score = scorer.scoreEmailQuality(email);

            assertScoreInRange(score, 0, 10);
        });
    });

    describe('Company Relevance Scoring', () => {
        test('scores positive keywords highly', () => {
            const email = createEmailWithKeywords(['hydraulic', 'pump']);
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeGreaterThan(30);
        });

        test('applies primary keyword weights', () => {
            const email = createTestEmail({
                company: 'Hydraulic Systems Inc',
                domain: 'hydraulic.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeGreaterThan(15); // 1.0 weight * 20
        });

        test('applies negative keyword penalties', () => {
            const email = createTestEmail({
                company: 'Marketplace Trading',
                domain: 'marketplace.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeLessThan(20);
        });

        test('combines primary and secondary keywords', () => {
            const email = createTestEmail({
                company: 'Industrial Hydraulic Equipment',
                domain: 'hydraulic-equipment.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            // Should score high due to multiple keyword matches
            expect(score).toBeGreaterThan(20);
        });

        test('case-insensitive keyword matching', () => {
            const email1 = createTestEmail({ company: 'HYDRAULIC Company' });
            const email2 = createTestEmail({ company: 'hydraulic company' });

            const score1 = scorer.scoreCompanyRelevance(email1);
            const score2 = scorer.scoreCompanyRelevance(email2);

            expect(score1).toBe(score2);
        });

        test('secondary positive keywords add points', () => {
            const email = createTestEmail({
                company: 'Equipment Manufacturing',
                domain: 'equipment.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeGreaterThan(0);
        });

        test('secondary negative keywords reduce score', () => {
            const email = createTestEmail({
                company: 'Alibaba Reseller',
                domain: 'alibaba-reseller.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeLessThan(10);
        });

        test('handles empty company name', () => {
            const email = createTestEmail({ company: '' });
            const score = scorer.scoreCompanyRelevance(email);

            assertScoreInRange(score, 0, 100);
        });

        test('score capped at 100', () => {
            // Create email with many positive keywords
            const email = createTestEmail({
                company: 'Hydraulic Pump Equipment Industrial OEM Manufacturer Factory',
                domain: 'hydraulic-pump-oem.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeLessThanOrEqual(100);
        });

        test('score floored at 0', () => {
            // Create email with many negative keywords
            const email = createTestEmail({
                company: 'Marketplace Alibaba Reseller Dropshipper',
                domain: 'marketplace-alibaba.com'
            });
            const score = scorer.scoreCompanyRelevance(email);

            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Geographic Priority Scoring', () => {
        test('scores target country highly', () => {
            const email = createTestEmail({ country: 'Italy' });
            const score = scorer.scoreGeographicPriority(email);

            expect(score).toBeGreaterThan(60);
        });

        test('scores non-target country lower', () => {
            const email = createTestEmail({ country: 'United States' });
            const score = scorer.scoreGeographicPriority(email);

            expect(score).toBeLessThan(60);
        });

        test('case-insensitive country matching', () => {
            const email1 = createTestEmail({ country: 'ITALY' });
            const email2 = createTestEmail({ country: 'italy' });

            const score1 = scorer.scoreGeographicPriority(email1);
            const score2 = scorer.scoreGeographicPriority(email2);

            expect(score1).toBe(score2);
        });

        test('applies high priority multiplier for target region', () => {
            config.geographic_rules.target_regions = ['Central Europe'];
            scorer = new FilterScorer(config);

            const email = createTestEmail({ country: 'Central Europe' });
            const score = scorer.scoreGeographicPriority(email);

            expect(score).toBeGreaterThan(40);
        });

        test('applies country multiplier from config', () => {
            const email = createTestEmail({ country: 'Italy' });
            const score = scorer.scoreGeographicPriority(email);

            // Italy has 2.0 multiplier in default config, but capped at 100
            expect(score).toBeGreaterThanOrEqual(100); // Base 70 * 2.0, capped at 100
        });

        test('handles EU region scoring', () => {
            const email = createTestEmail({ country: 'EU France' });
            const score = scorer.scoreGeographicPriority(email);

            assertScoreInRange(score, 10, 100);
        });

        test('handles missing country gracefully', () => {
            const email = createTestEmail({ country: '' });
            const score = scorer.scoreGeographicPriority(email);

            assertScoreInRange(score, 0, 100);
        });

        test('score capped at 100', () => {
            // Even with high multipliers, should cap at 100
            config.geographic_rules.multipliers = { 'Italy': 10.0 };
            scorer = new FilterScorer(config);

            const email = createTestEmail({ country: 'Italy' });
            const score = scorer.scoreGeographicPriority(email);

            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('Engagement Level Scoring', () => {
        test('scores product/service contacts highly', () => {
            const email = createTestEmail({ email: 'product@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeGreaterThan(55);
        });

        test('scores contact emails highly', () => {
            const email = createTestEmail({ email: 'contact@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeGreaterThan(70);
        });

        test('scores info emails highly', () => {
            const email = createTestEmail({ email: 'info@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeGreaterThan(70);
        });

        test('scores sales emails highly', () => {
            const email = createTestEmail({ email: 'sales@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeGreaterThan(70);
        });

        test('scores generic contacts medium', () => {
            const email = createTestEmail({ email: 'hello@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeGreaterThan(50);
        });

        test('scores automated contacts lower', () => {
            const email = createTestEmail({ email: 'noreply@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeLessThan(50);
        });

        test('scores admin emails lower', () => {
            const email = createTestEmail({ email: 'admin@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeLessThan(50);
        });

        test('scores system emails lower', () => {
            const email = createTestEmail({ email: 'system@company.com' });
            const score = scorer.scoreEngagement(email);

            expect(score).toBeLessThan(50);
        });

        test('handles empty email gracefully', () => {
            const email = createTestEmail({ email: '' });
            const score = scorer.scoreEngagement(email);

            assertScoreInRange(score, 0, 100);
        });
    });

    describe('Bonus Multipliers', () => {
        test('applies OEM bonus correctly', () => {
            const email = createTestEmail({
                company: 'OEM Manufacturer',
                domain: 'oem-manufacturer.com'
            });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.oem).toBe(1.3);
        });

        test('detects "manufacturer" for OEM bonus', () => {
            const email = createTestEmail({ company: 'ABC Manufacturer' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.oem).toBe(1.3);
        });

        test('detects "factory" for OEM bonus', () => {
            const email = createTestEmail({ company: 'Factory Direct' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.oem).toBe(1.3);
        });

        test('no OEM bonus for non-OEM companies', () => {
            const email = createTestEmail({ company: 'Retail Store' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.oem).toBe(1.0);
        });

        test('applies geographic bonus for target country', () => {
            const email = createTestEmail({ country: 'Italy' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.geography).toBe(2.0);
        });

        test('no geographic bonus for non-target country', () => {
            const email = createTestEmail({ country: 'United States' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.geography).toBe(1.0);
        });

        test('domain bonus defaults to 1.0', () => {
            const email = createTestEmail();
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.domain).toBe(1.0);
        });

        test('bonuses are case-insensitive', () => {
            const email = createTestEmail({ company: 'OEM MANUFACTURER' });
            const bonuses = scorer.calculateBonuses(email);

            expect(bonuses.oem).toBe(1.3);
        });
    });

    describe('Priority Determination', () => {
        test('assigns HIGH priority for score >= threshold', () => {
            const priority = scorer.getPriority(110);

            expect(priority).toBe('HIGH');
        });

        test('assigns HIGH priority for score exactly at threshold', () => {
            const priority = scorer.getPriority(100);

            expect(priority).toBe('HIGH');
        });

        test('assigns MEDIUM priority for score in range', () => {
            const priority = scorer.getPriority(75);

            expect(priority).toBe('MEDIUM');
        });

        test('assigns MEDIUM priority at exact threshold', () => {
            const priority = scorer.getPriority(50);

            expect(priority).toBe('MEDIUM');
        });

        test('assigns LOW priority for score in range', () => {
            const priority = scorer.getPriority(30);

            expect(priority).toBe('LOW');
        });

        test('assigns LOW priority at exact threshold', () => {
            const priority = scorer.getPriority(10);

            expect(priority).toBe('LOW');
        });

        test('assigns EXCLUDED for score below low threshold', () => {
            const priority = scorer.getPriority(5);

            expect(priority).toBe('EXCLUDED');
        });

        test('assigns EXCLUDED for score of 0', () => {
            const priority = scorer.getPriority(0);

            expect(priority).toBe('EXCLUDED');
        });

        test('handles high scores (>200)', () => {
            const priority = scorer.getPriority(250);

            expect(priority).toBe('HIGH');
        });
    });

    describe('Calculate Score', () => {
        test('returns score and breakdown', () => {
            const email = createTestEmail();
            const result = scorer.calculateScore(email);

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('breakdown');
            expect(result).toHaveProperty('priority');
            expect(result).toHaveProperty('bonuses');
        });

        test('breakdown includes all components', () => {
            const email = createTestEmail();
            const result = scorer.calculateScore(email);

            expect(result.breakdown).toHaveProperty('emailQuality');
            expect(result.breakdown).toHaveProperty('companyRelevance');
            expect(result.breakdown).toHaveProperty('geographicPriority');
            expect(result.breakdown).toHaveProperty('engagement');
        });

        test('applies weights to components', () => {
            const email = createTestEmail();
            const result = scorer.calculateScore(email);

            // Score should be weighted sum
            expect(result.score).toBeGreaterThan(0);
        });

        test('applies bonus multipliers to final score', () => {
            const email = createTestEmail({
                company: 'OEM Manufacturer',
                country: 'Italy'
            });
            const result = scorer.calculateScore(email);

            // Should have OEM and geography bonuses
            expect(result.bonuses.oem).toBeGreaterThan(1.0);
            expect(result.bonuses.geography).toBeGreaterThan(1.0);
        });

        test('rounds score to 2 decimal places', () => {
            const email = createTestEmail();
            const result = scorer.calculateScore(email);

            const decimals = (result.score.toString().split('.')[1] || '').length;
            expect(decimals).toBeLessThanOrEqual(2);
        });

        test('determines correct priority level', () => {
            const email = createTestEmail();
            const result = scorer.calculateScore(email);

            expect(['HIGH', 'MEDIUM', 'LOW', 'EXCLUDED']).toContain(result.priority);
        });

        test('handles high-quality email with bonuses', () => {
            const email = createCorporateEmail({
                company: 'Hydraulic OEM Manufacturer',
                country: 'Italy'
            });
            const result = scorer.calculateScore(email);

            expect(result.score).toBeGreaterThan(50);
            expect(result.priority).not.toBe('EXCLUDED');
        });
    });

    describe('Caching', () => {
        test('caches scoring results', () => {
            const email = createTestEmail();

            scorer.calculateScore(email);
            scorer.calculateScore(email);

            expect(scorer.cache.size).toBe(1);
        });

        test('cache hit returns exact same object', () => {
            const email = createTestEmail();

            const result1 = scorer.calculateScore(email);
            const result2 = scorer.calculateScore(email);

            expect(result1).toBe(result2); // Same reference
        });

        test('cache key is case-insensitive', () => {
            const email1 = createTestEmail({ email: 'TEST@EXAMPLE.COM' });
            const email2 = createTestEmail({ email: 'test@example.com' });

            scorer.calculateScore(email1);
            scorer.calculateScore(email2);

            expect(scorer.cache.size).toBe(1);
        });

        test('cache respects LRU limit', () => {
            scorer.cacheSize = 5; // Set low limit for testing

            // Score 6 different emails
            for (let i = 0; i < 6; i++) {
                const email = createTestEmail({ email: `user${i}@example.com` });
                scorer.calculateScore(email);
            }

            expect(scorer.cache.size).toBeLessThanOrEqual(5);
        });

        test('clearCache removes all cached results', () => {
            const email = createTestEmail();
            scorer.calculateScore(email);

            scorer.clearCache();

            expect(scorer.cache.size).toBe(0);
        });

        test('getCacheStats returns cache info', () => {
            const email = createTestEmail();
            scorer.calculateScore(email);

            const stats = scorer.getCacheStats();

            expect(stats.size).toBe(1);
            expect(stats.maxSize).toBe(1000);
        });

        test('cache miss after clearCache', () => {
            const email = createTestEmail();

            const result1 = scorer.calculateScore(email);
            scorer.clearCache();
            const result2 = scorer.calculateScore(email);

            expect(result1).not.toBe(result2); // Different references
            expect(result1.score).toBe(result2.score); // Same values
        });
    });

    describe('Batch Scoring', () => {
        test('scores multiple emails correctly', () => {
            const emails = createEmailBatch(10);
            const results = scorer.scoreEmails(emails);

            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toHaveProperty('score');
                expect(result).toHaveProperty('priority');
            });
        });

        test('batch scoring uses cache', () => {
            const email = createTestEmail();
            scorer.calculateScore(email); // Prime cache

            const results = scorer.scoreEmails([email]);

            expect(scorer.cache.size).toBe(1);
        });

        test('handles empty batch', () => {
            const results = scorer.scoreEmails([]);

            expect(results).toEqual([]);
        });

        test('preserves original email properties', () => {
            const emails = createEmailBatch(3);
            const results = scorer.scoreEmails(emails);

            results.forEach((result, i) => {
                expect(result.email).toBe(emails[i].email);
                expect(result.company).toBe(emails[i].company);
            });
        });
    });

    describe('Sorting', () => {
        test('sorts emails by score descending (default)', () => {
            const emails = [
                { ...createTestEmail(), score: 50 },
                { ...createTestEmail(), score: 100 },
                { ...createTestEmail(), score: 25 }
            ];

            const sorted = scorer.sortByScore(emails);

            expect(sorted[0].score).toBe(100);
            expect(sorted[1].score).toBe(50);
            expect(sorted[2].score).toBe(25);
        });

        test('sorts emails by score ascending', () => {
            const emails = [
                { ...createTestEmail(), score: 50 },
                { ...createTestEmail(), score: 100 },
                { ...createTestEmail(), score: 25 }
            ];

            const sorted = scorer.sortByScore(emails, true);

            expect(sorted[0].score).toBe(25);
            expect(sorted[1].score).toBe(50);
            expect(sorted[2].score).toBe(100);
        });

        test('does not mutate original array', () => {
            const emails = [
                { ...createTestEmail(), score: 50 },
                { ...createTestEmail(), score: 100 }
            ];

            scorer.sortByScore(emails);

            expect(emails[0].score).toBe(50); // Original unchanged
        });

        test('handles missing scores', () => {
            const emails = [
                { ...createTestEmail(), score: 50 },
                { ...createTestEmail() } // No score
            ];

            const sorted = scorer.sortByScore(emails);

            expect(sorted).toHaveLength(2);
        });
    });

    describe('Filtering', () => {
        test('filters emails by HIGH priority', () => {
            const emails = [
                { ...createTestEmail(), priority: 'HIGH' },
                { ...createTestEmail(), priority: 'MEDIUM' },
                { ...createTestEmail(), priority: 'HIGH' }
            ];

            const filtered = scorer.filterByPriority(emails, 'HIGH');

            expect(filtered).toHaveLength(2);
            filtered.forEach(e => expect(e.priority).toBe('HIGH'));
        });

        test('filters emails by MEDIUM priority', () => {
            const emails = [
                { ...createTestEmail(), priority: 'HIGH' },
                { ...createTestEmail(), priority: 'MEDIUM' },
                { ...createTestEmail(), priority: 'LOW' }
            ];

            const filtered = scorer.filterByPriority(emails, 'MEDIUM');

            expect(filtered).toHaveLength(1);
            expect(filtered[0].priority).toBe('MEDIUM');
        });

        test('filters emails by LOW priority', () => {
            const emails = [
                { ...createTestEmail(), priority: 'LOW' },
                { ...createTestEmail(), priority: 'EXCLUDED' }
            ];

            const filtered = scorer.filterByPriority(emails, 'LOW');

            expect(filtered).toHaveLength(1);
        });

        test('filters emails by EXCLUDED priority', () => {
            const emails = [
                { ...createTestEmail(), priority: 'LOW' },
                { ...createTestEmail(), priority: 'EXCLUDED' }
            ];

            const filtered = scorer.filterByPriority(emails, 'EXCLUDED');

            expect(filtered).toHaveLength(1);
        });

        test('returns empty array if no matches', () => {
            const emails = [
                { ...createTestEmail(), priority: 'HIGH' }
            ];

            const filtered = scorer.filterByPriority(emails, 'LOW');

            expect(filtered).toEqual([]);
        });

        test('handles missing priority field', () => {
            const emails = [
                { ...createTestEmail() } // No priority
            ];

            const filtered = scorer.filterByPriority(emails, 'EXCLUDED');

            expect(filtered).toHaveLength(1); // Defaults to EXCLUDED
        });
    });

    describe('Statistics', () => {
        test('calculates average score correctly', () => {
            const emails = [
                { ...createTestEmail(), score: 100 },
                { ...createTestEmail(), score: 50 },
                { ...createTestEmail(), score: 75 }
            ];

            const stats = scorer.getStatistics(emails);

            expect(parseFloat(stats.average)).toBe(75.00);
        });

        test('finds min and max scores', () => {
            const emails = [
                { ...createTestEmail(), score: 100 },
                { ...createTestEmail(), score: 20 },
                { ...createTestEmail(), score: 60 }
            ];

            const stats = scorer.getStatistics(emails);

            expect(stats.min).toBe(20);
            expect(stats.max).toBe(100);
        });

        test('counts priority distribution', () => {
            const emails = [
                { ...createTestEmail(), priority: 'HIGH' },
                { ...createTestEmail(), priority: 'HIGH' },
                { ...createTestEmail(), priority: 'HIGH' },
                { ...createTestEmail(), priority: 'MEDIUM' },
                { ...createTestEmail(), priority: 'MEDIUM' },
                { ...createTestEmail(), priority: 'LOW' },
                { ...createTestEmail(), priority: 'EXCLUDED' }
            ];

            const stats = scorer.getStatistics(emails);

            expect(stats.total).toBe(7);
            expect(stats.high).toBe(3);
            expect(stats.medium).toBe(2);
            expect(stats.low).toBe(1);
            expect(stats.excluded).toBe(1);
        });

        test('handles empty array', () => {
            const stats = scorer.getStatistics([]);

            expect(stats.total).toBe(0);
            expect(stats.average).toBe(0);
            expect(stats.min).toBe(Infinity);
            expect(stats.max).toBe(-Infinity);
        });

        test('handles missing scores', () => {
            const emails = [
                { ...createTestEmail() }, // No score
                { ...createTestEmail(), score: 50 }
            ];

            const stats = scorer.getStatistics(emails);

            expect(stats.total).toBe(2);
            expect(parseFloat(stats.average)).toBe(25.00); // (0 + 50) / 2
        });
    });

    describe('Detailed Breakdown', () => {
        test('provides detailed breakdown for email', () => {
            const email = createTestEmail();
            const breakdown = scorer.getDetailedBreakdown(email);

            expect(breakdown).toHaveProperty('email');
            expect(breakdown).toHaveProperty('score');
            expect(breakdown).toHaveProperty('priority');
            expect(breakdown).toHaveProperty('components');
            expect(breakdown).toHaveProperty('bonuses');
        });

        test('includes raw and weighted scores', () => {
            const email = createTestEmail();
            const breakdown = scorer.getDetailedBreakdown(email);

            expect(breakdown.components.emailQuality).toHaveProperty('raw');
            expect(breakdown.components.emailQuality).toHaveProperty('weighted');
            expect(breakdown.components.emailQuality).toHaveProperty('weight');
        });

        test('includes descriptions for each component', () => {
            const email = createTestEmail();
            const breakdown = scorer.getDetailedBreakdown(email);

            expect(breakdown.components.emailQuality).toHaveProperty('description');
            expect(breakdown.components.companyRelevance).toHaveProperty('description');
            expect(breakdown.components.geographicPriority).toHaveProperty('description');
            expect(breakdown.components.engagement).toHaveProperty('description');
        });

        test('weighted scores match component weights', () => {
            const email = createTestEmail();
            const breakdown = scorer.getDetailedBreakdown(email);

            const expectedWeighted = breakdown.components.emailQuality.raw *
                                    config.scoring.weights.email_quality;

            expect(breakdown.components.emailQuality.weighted).toBeCloseTo(expectedWeighted, 2);
        });
    });

    describe('Config Updates', () => {
        test('updateConfig changes configuration', () => {
            const newConfig = createValidConfig({ metadata: { name: 'New' } });

            scorer.updateConfig(newConfig);

            expect(scorer.config.metadata.name).toBe('New');
        });

        test('updateConfig clears cache', () => {
            const email = createTestEmail();
            scorer.calculateScore(email); // Prime cache

            scorer.updateConfig(config);

            expect(scorer.cache.size).toBe(0);
        });

        test('scoring uses updated config', () => {
            const email = createTestEmail();
            const result1 = scorer.calculateScore(email);

            // Change weights dramatically
            const newConfig = createValidConfig({
                scoring: {
                    weights: {
                        email_quality: 0.70,
                        company_relevance: 0.10,
                        geographic_priority: 0.10,
                        engagement: 0.10
                    },
                    thresholds: config.scoring.thresholds
                }
            });
            scorer.updateConfig(newConfig);

            const result2 = scorer.calculateScore(email);

            expect(result1.score).not.toBe(result2.score);
        });
    });

    describe('Helper Methods', () => {
        test('extractDomain extracts domain from email', () => {
            const domain = scorer.extractDomain('user@example.com');

            expect(domain).toBe('example.com');
        });

        test('extractDomain handles missing @ symbol', () => {
            const domain = scorer.extractDomain('invalid-email');

            expect(domain).toBe('');
        });

        test('isFreeDomain detects free email providers', () => {
            expect(scorer.isFreeDomain('gmail.com')).toBe(true);
            expect(scorer.isFreeDomain('yahoo.com')).toBe(true);
            expect(scorer.isFreeDomain('hotmail.com')).toBe(true);
            expect(scorer.isFreeDomain('outlook.com')).toBe(true);
        });

        test('isFreeDomain returns false for corporate domains', () => {
            expect(scorer.isFreeDomain('company.com')).toBe(false);
            expect(scorer.isFreeDomain('business.org')).toBe(false);
        });

        test('isValidEmailStructure validates email format', () => {
            expect(scorer.isValidEmailStructure('valid@example.com')).toBe(true);
            expect(scorer.isValidEmailStructure('user.name@company.co.uk')).toBe(true);
        });

        test('isValidEmailStructure rejects invalid formats', () => {
            expect(scorer.isValidEmailStructure('invalid')).toBe(false);
            expect(scorer.isValidEmailStructure('@example.com')).toBe(false);
            expect(scorer.isValidEmailStructure('user@')).toBe(false);
            expect(scorer.isValidEmailStructure('user @example.com')).toBe(false);
        });
    });
});
