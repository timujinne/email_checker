/**
 * Filter Scoring Engine
 * Calculates email scores based on filter configuration
 *
 * @module FilterScorer
 */

class FilterScorer {
    /**
     * Create FilterScorer instance
     * @param {Object} config - Filter configuration from FilterConfig
     */
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.cacheSize = 1000;
    }

    /**
     * Update configuration
     * @param {Object} config - New configuration
     */
    updateConfig(config) {
        this.config = config;
        this.cache.clear();
    }

    /**
     * Calculate score for a single email
     * @param {Object} email - Email object with properties: email, company, domain
     * @returns {Object} { score: number, breakdown: Object }
     */
    calculateScore(email) {
        // Check cache
        const cacheKey = email.email?.toLowerCase();
        if (cacheKey && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const breakdown = {
            emailQuality: this.scoreEmailQuality(email),
            companyRelevance: this.scoreCompanyRelevance(email),
            geographicPriority: this.scoreGeographicPriority(email),
            engagement: this.scoreEngagement(email)
        };

        // Apply weights
        const weights = this.config.scoring.weights;
        const rawScore = (breakdown.emailQuality * weights.email_quality) +
                        (breakdown.companyRelevance * weights.company_relevance) +
                        (breakdown.geographicPriority * weights.geographic_priority) +
                        (breakdown.engagement * weights.engagement);

        // Apply bonuses
        let finalScore = rawScore;
        const bonuses = this.calculateBonuses(email);
        for (const [key, multiplier] of Object.entries(bonuses)) {
            breakdown[`bonus_${key}`] = multiplier;
        }

        // Apply multipliers
        finalScore = bonuses.oem > 1 ? finalScore * bonuses.oem : finalScore;
        finalScore = bonuses.geography > 1 ? finalScore * bonuses.geography : finalScore;
        finalScore = bonuses.domain > 1 ? finalScore * bonuses.domain : finalScore;

        const result = {
            score: Math.round(finalScore * 100) / 100,
            breakdown,
            priority: this.getPriority(finalScore),
            bonuses
        };

        // Cache result
        if (cacheKey && this.cache.size < this.cacheSize) {
            this.cache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * Score email quality (0-10)
     * @private
     */
    scoreEmailQuality(email) {
        let score = 5; // Base score

        const domain = this.extractDomain(email.email || '');
        const rules = this.config.email_quality;

        // Corporate vs free email
        if (rules.corporate_domains) {
            if (this.isFreeDomain(domain)) {
                score += rules.free_email_penalty || -0.5;
            } else {
                score += 2; // Corporate domain bonus
            }
        }

        // Structure quality
        if (rules.structure_quality) {
            if (this.isValidEmailStructure(email.email || '')) {
                score += 1;
            } else {
                score -= 1;
            }
        }

        // Suspicious patterns
        if (rules.suspicious_patterns) {
            for (const pattern of rules.suspicious_patterns) {
                if ((email.email || '').toLowerCase().includes(pattern.toLowerCase())) {
                    score -= 0.5;
                }
            }
        }

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Score company relevance (0-100)
     * @private
     */
    scoreCompanyRelevance(email) {
        let score = 0;
        const companyText = `${email.company || ''} ${email.domain || ''}`.toLowerCase();
        const keywords = this.config.company_keywords;

        // Primary positive keywords
        if (keywords.primary_keywords?.positive) {
            for (const keyword of keywords.primary_keywords.positive) {
                if (companyText.includes(keyword.term?.toLowerCase())) {
                    score += (keyword.weight || 1.0) * 20;
                }
            }
        }

        // Primary negative keywords
        if (keywords.primary_keywords?.negative) {
            for (const keyword of keywords.primary_keywords.negative) {
                if (companyText.includes(keyword.term?.toLowerCase())) {
                    score -= (keyword.weight || 0.5) * 10;
                }
            }
        }

        // Secondary keywords (lower weight)
        if (keywords.secondary_keywords?.positive) {
            for (const keyword of keywords.secondary_keywords.positive) {
                if (companyText.includes(keyword?.toLowerCase ? keyword.toLowerCase() : keyword)) {
                    score += 5;
                }
            }
        }

        if (keywords.secondary_keywords?.negative) {
            for (const keyword of keywords.secondary_keywords.negative) {
                if (companyText.includes(keyword?.toLowerCase ? keyword.toLowerCase() : keyword)) {
                    score -= 3;
                }
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score geographic priority (0-100)
     * @private
     */
    scoreGeographicPriority(email) {
        let score = 10; // Base score
        const geoRules = this.config.geographic_rules;
        const emailDomain = this.extractDomain(email.email || '').toLowerCase();

        // Check country
        const targetCountry = this.config.target.country?.toLowerCase();
        const emailCountry = (email.country || '').toLowerCase();

        if (emailCountry === targetCountry) {
            score = 70;
        } else if (geoRules.target_regions?.some(r => emailCountry.includes(r.toLowerCase()))) {
            score = 50;
        } else if (emailCountry.includes('eu')) {
            score = 30;
        }

        // Apply country multiplier
        const multipliers = geoRules.multipliers || {};
        for (const [country, mult] of Object.entries(multipliers)) {
            if (emailCountry.includes(country.toLowerCase())) {
                score *= mult;
                break;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score engagement level (0-100)
     * @private
     */
    scoreEngagement(email) {
        let score = 50; // Base score
        const emailLocal = (email.email || '').split('@')[0].toLowerCase();

        // Contact-related emails score highest
        const contactKeywords = ['contact', 'info', 'hello', 'inquiry', 'sales', 'support'];
        if (contactKeywords.some(kw => emailLocal.includes(kw))) {
            score = 80;
        }

        // Product/service emails score medium
        const productKeywords = ['product', 'service', 'order', 'delivery', 'shipping'];
        if (productKeywords.some(kw => emailLocal.includes(kw))) {
            score = 60;
        }

        // Admin/system emails score low
        const adminKeywords = ['admin', 'system', 'noreply', 'no-reply', 'bounce', 'mailer'];
        if (adminKeywords.some(kw => emailLocal.includes(kw))) {
            score = 20;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate bonus multipliers
     * @private
     */
    calculateBonuses(email) {
        const bonuses = {
            oem: 1.0,
            geography: 1.0,
            domain: 1.0
        };

        // OEM bonus
        const oemRules = this.config.domain_rules?.oemEquipment;
        if (oemRules && oemRules.keywords) {
            const companyText = `${email.company || ''} ${email.domain || ''}`.toLowerCase();
            for (const keyword of oemRules.keywords) {
                if (companyText.includes(keyword.toLowerCase())) {
                    bonuses.oem = oemRules.multiplier || 1.3;
                    break;
                }
            }
        }

        // Geography bonus
        const geoMult = this.config.geographic_rules?.multipliers || {};
        const emailCountry = (email.country || '').toLowerCase();
        const targetCountry = this.config.target.country?.toLowerCase();
        if (emailCountry === targetCountry && geoMult[this.config.target.country]) {
            bonuses.geography = geoMult[this.config.target.country];
        }

        return bonuses;
    }

    /**
     * Get priority level from score
     * @private
     */
    getPriority(score) {
        const thresholds = this.config.scoring.thresholds;
        if (score >= thresholds.high_priority) return 'HIGH';
        if (score >= thresholds.medium_priority) return 'MEDIUM';
        if (score >= thresholds.low_priority) return 'LOW';
        return 'EXCLUDED';
    }

    /**
     * Extract domain from email
     * @private
     */
    extractDomain(email) {
        const match = email.match(/@(.+)$/);
        return match ? match[1] : '';
    }

    /**
     * Check if domain is free email
     * @private
     */
    isFreeDomain(domain) {
        const freeDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'mail.com', 'protonmail.com', 'aol.com', 'msn.com',
            'yandex.com', 'mailbox.org', 'zoho.com', 'icloud.com'
        ];
        return freeDomains.includes(domain.toLowerCase());
    }

    /**
     * Check if email structure is valid
     * @private
     */
    isValidEmailStructure(email) {
        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Score multiple emails (batch)
     * @param {Array} emails - Array of email objects
     * @returns {Array} Array of scored results
     */
    scoreEmails(emails) {
        return emails.map(email => ({
            ...email,
            ...this.calculateScore(email)
        }));
    }

    /**
     * Sort emails by score
     * @param {Array} emails - Scored emails
     * @param {boolean} ascending - Sort ascending (default: false)
     * @returns {Array} Sorted emails
     */
    sortByScore(emails, ascending = false) {
        return [...emails].sort((a, b) => {
            const diff = (a.score || 0) - (b.score || 0);
            return ascending ? diff : -diff;
        });
    }

    /**
     * Filter emails by priority
     * @param {Array} emails - Scored emails
     * @param {string} priority - Priority level (HIGH, MEDIUM, LOW, EXCLUDED)
     * @returns {Array} Filtered emails
     */
    filterByPriority(emails, priority) {
        return emails.filter(e => (e.priority || 'EXCLUDED') === priority);
    }

    /**
     * Get statistics for scored emails
     * @param {Array} emails - Scored emails
     * @returns {Object} Statistics
     */
    getStatistics(emails) {
        const scores = emails.map(e => e.score || 0);
        const priorities = emails.map(e => e.priority || 'EXCLUDED');

        return {
            total: emails.length,
            average: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
            min: Math.min(...scores),
            max: Math.max(...scores),
            high: priorities.filter(p => p === 'HIGH').length,
            medium: priorities.filter(p => p === 'MEDIUM').length,
            low: priorities.filter(p => p === 'LOW').length,
            excluded: priorities.filter(p => p === 'EXCLUDED').length
        };
    }

    /**
     * Get detailed breakdown for an email
     * @param {Object} email - Email to score
     * @returns {Object} Detailed breakdown
     */
    getDetailedBreakdown(email) {
        const result = this.calculateScore(email);
        return {
            email: email.email,
            score: result.score,
            priority: result.priority,
            components: {
                emailQuality: {
                    raw: result.breakdown.emailQuality,
                    weighted: result.breakdown.emailQuality * this.config.scoring.weights.email_quality,
                    weight: this.config.scoring.weights.email_quality,
                    description: 'Based on domain type, structure validity, and suspicious patterns'
                },
                companyRelevance: {
                    raw: result.breakdown.companyRelevance,
                    weighted: result.breakdown.companyRelevance * this.config.scoring.weights.company_relevance,
                    weight: this.config.scoring.weights.company_relevance,
                    description: 'Based on keyword matching against industry terms'
                },
                geographicPriority: {
                    raw: result.breakdown.geographicPriority,
                    weighted: result.breakdown.geographicPriority * this.config.scoring.weights.geographic_priority,
                    weight: this.config.scoring.weights.geographic_priority,
                    description: 'Based on target country and region rules'
                },
                engagement: {
                    raw: result.breakdown.engagement,
                    weighted: result.breakdown.engagement * this.config.scoring.weights.engagement,
                    weight: this.config.scoring.weights.engagement,
                    description: 'Based on email type (contact, service, admin)'
                }
            },
            bonuses: result.bonuses
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cacheSize
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FilterScorer };
}
