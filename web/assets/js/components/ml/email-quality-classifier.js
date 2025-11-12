/**
 * Email Quality Classifier - Predict email deliverability and quality
 *
 * Features:
 * - Multi-feature quality scoring (0-100)
 * - Domain reputation analysis
 * - Email format validation
 * - Engagement signal analysis
 * - Confidence scoring
 * - Real-time and batch prediction
 *
 * @module email-quality-classifier
 */

class EmailQualityClassifier {
  constructor(options = {}) {
    this.modelName = 'EmailQualityClassifier';
    this.version = options.version || '1.0.0';

    // Feature weights (importance scores)
    this.weights = {
      domainReputation: 0.25,
      emailStructure: 0.20,
      historicalData: 0.20,
      engagementSignals: 0.20,
      riskFactors: 0.15
    };

    // Known free domains
    this.freeDomains = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'protonmail.com', 'mail.com', 'zoho.com',
      'icloud.com', 'yandex.com', 'mail.ru'
    ]);

    // Spam trap patterns
    this.spamTrapPatterns = [
      /^(test|demo|admin|root|abuse|noreply|no-reply)@/i,
      /^(postmaster|webmaster|abuse|postmast|admin)@/i,
      /(xyz|test|fake|example|sample)@/i
    ];

    // High-risk domains
    this.riskDomains = new Set([
      'tempmail.com', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'maildrop.cc'
    ]);

    this.config = {
      domainReputationAPI: options.domainReputationAPI || null,
      enableCaching: options.enableCaching !== false,
      cacheTTL: options.cacheTTL || 86400000, // 24 hours
      ...options
    };

    this.cache = new Map();
    this.stats = {
      totalPredictions: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageScore: 0,
      highQualityCount: 0 // >= 80
    };

    console.log(`🤖 Email Quality Classifier initialized (v${this.version})`);
  }

  /**
   * Predict email quality score (0-100)
   * @param {object} emailData - Email data object
   * @param {object} options - Prediction options
   * @returns {Promise<object>} Quality prediction result
   */
  async predict(emailData, options = {}) {
    const email = emailData.email?.toLowerCase() || '';

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getFromCache(email);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }

    this.stats.cacheMisses++;

    try {
      const scores = {
        domainReputation: await this.scoreDomainReputation(emailData),
        emailStructure: this.scoreEmailStructure(emailData),
        historicalData: this.scoreHistoricalData(emailData),
        engagementSignals: this.scoreEngagementSignals(emailData),
        riskFactors: this.scoreRiskFactors(emailData)
      };

      // Calculate weighted score
      let overallScore = 0;
      for (const [factor, weight] of Object.entries(this.weights)) {
        overallScore += scores[factor] * weight;
      }

      // Confidence based on data completeness
      const confidence = this.calculateConfidence(emailData, scores);

      // Quality tier
      const qualityTier = this.getQualityTier(overallScore);

      const result = {
        email,
        qualityScore: Math.round(overallScore),
        confidence,
        qualityTier,
        scores,
        factors: this.explainFactors(scores),
        recommendation: this.getRecommendation(overallScore, emailData),
        timestamp: new Date().toISOString()
      };

      // Update statistics
      this.updateStats(result);

      // Cache result
      if (this.config.enableCaching) {
        this.cacheResult(email, result);
      }

      return result;

    } catch (error) {
      console.error('❌ Prediction failed:', error);
      return {
        email,
        qualityScore: 50,
        confidence: 0,
        qualityTier: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Batch predict quality for multiple emails
   * @param {array} emails - Array of email data
   * @returns {Promise<array>} Batch prediction results
   */
  async batchPredict(emails, onProgress = null) {
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      const result = await this.predict(emails[i]);
      results.push(result);

      if (onProgress) {
        onProgress({
          processed: i + 1,
          total: emails.length,
          percentage: Math.round(((i + 1) / emails.length) * 100)
        });
      }
    }

    return results;
  }

  /**
   * Score domain reputation (0-100)
   * @private
   */
  async scoreDomainReputation(emailData) {
    const domain = emailData.domain || this.extractDomain(emailData.email);
    if (!domain) return 0;

    let score = 50; // Baseline

    // Check if free domain
    if (this.freeDomains.has(domain.toLowerCase())) {
      score -= 20; // Free domains less trusted
    }

    // Check if high-risk domain
    if (this.riskDomains.has(domain.toLowerCase())) {
      score -= 40; // High-risk
    }

    // Check domain age (placeholder)
    if (emailData.domainAge) {
      if (emailData.domainAge < 1) score -= 15;
      else if (emailData.domainAge > 5) score += 15;
    }

    // MX record check (simplified)
    if (emailData.hasMXRecord === false) {
      score -= 30;
    }

    // SPF/DKIM/DMARC check
    if (emailData.hasSPF) score += 10;
    if (emailData.hasDKIM) score += 10;
    if (emailData.hasDAMARC) score += 10;

    // TLD validation
    const tld = domain.split('.').pop();
    const validTLDs = ['com', 'org', 'net', 'edu', 'gov', 'co', 'uk', 'de', 'fr'];
    if (!validTLDs.includes(tld.toLowerCase())) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score email structure (0-100)
   * @private
   */
  scoreEmailStructure(emailData) {
    const email = emailData.email || '';
    let score = 50; // Baseline

    if (!this.isValidEmail(email)) {
      return 0;
    }

    const [localPart, domain] = email.split('@');

    // Local part analysis
    if (localPart.length < 4) score -= 15; // Too short
    if (localPart.length > 64) score -= 10; // Too long

    // Check for common patterns
    if (/^[a-z]+\.[a-z]+$/.test(localPart)) {
      score += 15; // firstname.lastname pattern - professional
    }

    if (/\d{2,}/.test(localPart)) {
      score -= 5; // Multiple consecutive numbers - less common
    }

    // Special characters
    const specialChars = (localPart.match(/[!#$%&'*+/=?^_`{|}~]/g) || []).length;
    if (specialChars > 2) score -= 10;

    // Consecutive dots
    if (email.includes('..')) score -= 20;

    // Plus addressing
    if (localPart.includes('+')) {
      score -= 5; // Might be throwaway email
    }

    // Numbers ratio
    const numberRatio = (localPart.match(/\d/g) || []).length / localPart.length;
    if (numberRatio > 0.5) {
      score -= 10; // Too many numbers
    }

    // Domain quality
    const domainLength = domain.length;
    if (domainLength < 6) score -= 10;
    if (domainLength > 50) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score historical data (0-100)
   * @private
   */
  scoreHistoricalData(emailData) {
    let score = 50; // Baseline

    // Previous validation status
    if (emailData.previousStatus === 'valid') {
      score += 25;
    } else if (emailData.previousStatus === 'invalid') {
      score -= 40;
    }

    // Bounce rates
    if (emailData.hardBounceRate !== undefined) {
      score -= emailData.hardBounceRate * 100;
    }

    if (emailData.softBounceRate !== undefined) {
      score -= emailData.softBounceRate * 30;
    }

    // Complaint rate
    if (emailData.complaintRate !== undefined) {
      score -= emailData.complaintRate * 200;
    }

    // List age
    if (emailData.listAge !== undefined) {
      const ageMonths = emailData.listAge / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths < 1) score -= 10;
      else if (ageMonths > 12) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score engagement signals (0-100)
   * @private
   */
  scoreEngagementSignals(emailData) {
    let score = 50; // Baseline

    // Open rate
    if (emailData.openRate !== undefined) {
      if (emailData.openRate > 0.3) score += 20;
      else if (emailData.openRate > 0.1) score += 10;
      else if (emailData.openRate === 0) score -= 10;
    }

    // Click rate
    if (emailData.clickRate !== undefined) {
      if (emailData.clickRate > 0.1) score += 15;
      else if (emailData.clickRate > 0.01) score += 5;
    }

    // Conversion rate
    if (emailData.conversionRate !== undefined) {
      if (emailData.conversionRate > 0.01) score += 10;
    }

    // List source quality
    if (emailData.sourceQuality !== undefined) {
      score += emailData.sourceQuality * 30;
    }

    // Engagement score
    if (emailData.engagementScore !== undefined) {
      score += emailData.engagementScore * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score risk factors (0-100, lower is better)
   * @private
   */
  scoreRiskFactors(emailData) {
    let riskScore = 0;

    const email = emailData.email || '';

    // Spam trap detection
    for (const pattern of this.spamTrapPatterns) {
      if (pattern.test(email)) {
        return 0; // Spam trap detected
      }
    }

    // Check disposable domain
    if (this.isDisposableEmail(email)) {
      riskScore += 40;
    }

    // Check common typos
    const domain = this.extractDomain(email);
    const commonTypos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com'
    };

    if (commonTypos[domain]) {
      riskScore += 25;
    }

    // Excessive punctuation
    const punctuation = (email.match(/[!#$%&'*+=?^_`{|}~]/g) || []).length;
    if (punctuation > 3) {
      riskScore += 20;
    }

    // Recent complaints
    if (emailData.recentComplaints) {
      riskScore += 50;
    }

    // Blacklist check
    if (emailData.isBlacklisted) {
      riskScore += 100;
    }

    return Math.max(0, 100 - riskScore);
  }

  /**
   * Calculate confidence score (0-1)
   * @private
   */
  calculateConfidence(emailData, scores) {
    let confidence = 0.5; // Baseline

    // More data = higher confidence
    const dataPoints = [
      emailData.domainAge,
      emailData.previousStatus,
      emailData.openRate,
      emailData.clickRate,
      emailData.complaintRate,
      emailData.hardBounceRate
    ].filter(v => v !== undefined && v !== null).length;

    confidence += (dataPoints / 6) * 0.4; // Up to 0.9

    // Consistency of scores boosts confidence
    const scoreValues = Object.values(scores);
    const scoreVar = this.calculateVariance(scoreValues);
    if (scoreVar < 500) confidence += 0.1; // Consistent scores

    return Math.min(1, confidence);
  }

  /**
   * Get quality tier
   * @private
   */
  getQualityTier(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'invalid';
  }

  /**
   * Get recommendation based on score
   * @private
   */
  getRecommendation(score, emailData) {
    if (score >= 80) {
      return {
        action: 'send',
        message: 'High quality email - safe to send'
      };
    }

    if (score >= 60) {
      return {
        action: 'send_with_monitoring',
        message: 'Good quality - monitor delivery'
      };
    }

    if (score >= 40) {
      return {
        action: 'review',
        message: 'Fair quality - manual review recommended'
      };
    }

    return {
      action: 'do_not_send',
      message: 'Low quality - high bounce risk'
    };
  }

  /**
   * Explain quality factors
   * @private
   */
  explainFactors(scores) {
    const factors = [];

    for (const [factor, score] of Object.entries(scores)) {
      let status = 'good';
      if (score < 40) status = 'poor';
      else if (score < 60) status = 'fair';

      factors.push({
        factor: this.formatFactorName(factor),
        score: Math.round(score),
        status
      });
    }

    return factors.sort((a, b) => b.score - a.score);
  }

  /**
   * Validate email format
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract domain from email
   * @private
   */
  extractDomain(email) {
    if (!email) return null;
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
  }

  /**
   * Check if email is disposable
   * @private
   */
  isDisposableEmail(email) {
    const domain = this.extractDomain(email);
    if (!domain) return false;

    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'maildrop.cc', 'trashmail.com'
    ];

    return disposableDomains.includes(domain.toLowerCase());
  }

  /**
   * Format factor name
   * @private
   */
  formatFactorName(factor) {
    return factor
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Cache result
   * @private
   */
  cacheResult(email, result) {
    this.cache.set(email, {
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL
    });

    // Clean old cache
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Get from cache
   * @private
   */
  getFromCache(email) {
    const cached = this.cache.get(email);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(email);
      return null;
    }

    return cached.result;
  }

  /**
   * Update statistics
   * @private
   */
  updateStats(result) {
    this.stats.totalPredictions++;
    const oldAvg = this.stats.averageScore;
    this.stats.averageScore =
      (oldAvg * (this.stats.totalPredictions - 1) + result.qualityScore) /
      this.stats.totalPredictions;

    if (result.qualityScore >= 80) {
      this.stats.highQualityCount++;
    }
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get model statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      totalPredictions: this.stats.totalPredictions,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      cacheHitRate: this.stats.totalPredictions > 0
        ? (this.stats.cacheHits / this.stats.totalPredictions) * 100
        : 0,
      averageScore: Math.round(this.stats.averageScore),
      highQualityPercentage: this.stats.totalPredictions > 0
        ? (this.stats.highQualityCount / this.stats.totalPredictions) * 100
        : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️  Cache cleared: ${size} entries`);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailQualityClassifier;
}

if (typeof window !== 'undefined') {
  window.EmailQualityClassifier = EmailQualityClassifier;
}
