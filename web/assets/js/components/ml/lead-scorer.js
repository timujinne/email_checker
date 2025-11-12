/**
 * Lead Scoring Engine - Multi-factor lead intelligence and ranking
 *
 * Features:
 * - 4-dimensional scoring (email, company, engagement, list health)
 * - Customizable scoring profiles (B2B SaaS, E-commerce, Real Estate, Automotive)
 * - Real-time and batch scoring
 * - Lead ranking and prioritization
 * - Detailed score explanations
 *
 * @module lead-scorer
 */

class LeadScoringEngine {
  constructor(options = {}) {
    this.modelName = 'LeadScoringEngine';
    this.version = options.version || '1.0.0';

    // Score weights (total: 100 points)
    this.weights = {
      emailQuality: 0.20,      // 20 points
      companyRelevance: 0.35,  // 35 points (highest)
      engagement: 0.25,        // 25 points
      listHealth: 0.20         // 20 points
    };

    // Profile configurations
    this.profiles = {
      'b2b-saas': {
        name: 'B2B SaaS',
        industryKeywords: ['software', 'saas', 'cloud', 'tech', 'ai', 'data', 'analytics'],
        companyMinSize: 50,
        targetCountries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR'],
        negativeIndicators: ['personal', 'consumer', 'retail'],
        bonusMultiplier: { oemManufacturer: 1.5, targetGeo: 2.0 }
      },
      'ecommerce': {
        name: 'E-commerce',
        industryKeywords: ['retail', 'shop', 'store', 'product', 'merchandise', 'sales'],
        companyMinSize: 10,
        targetCountries: ['US', 'GB', 'AU', 'CA'],
        negativeIndicators: ['b2b', 'wholesale', 'corporate'],
        bonusMultiplier: { oemManufacturer: 1.2, targetGeo: 1.5 }
      },
      'real-estate': {
        name: 'Real Estate',
        industryKeywords: ['real estate', 'property', 'broker', 'realtor', 'housing', 'land'],
        companyMinSize: 5,
        targetCountries: ['US', 'CA', 'AU', 'UK'],
        negativeIndicators: ['commercial-only', 'government'],
        bonusMultiplier: { locationMatch: 2.5, targetGeo: 3.0 }
      },
      'automotive': {
        name: 'Automotive',
        industryKeywords: ['automotive', 'car', 'dealer', 'vehicle', 'auto', 'motor'],
        companyMinSize: 20,
        targetCountries: ['US', 'DE', 'JP', 'UK'],
        negativeIndicators: ['furniture', 'industrial-equipment'],
        bonusMultiplier: { inventorySignal: 2.0, targetGeo: 1.8 }
      }
    };

    this.config = {
      defaultProfile: options.defaultProfile || 'b2b-saas',
      minScore: options.minScore || 0,
      maxScore: options.maxScore || 100,
      ...options
    };

    this.stats = {
      totalScored: 0,
      averageScore: 0,
      scoreDistribution: { high: 0, medium: 0, low: 0 },
      profileStats: {}
    };

    console.log(`🤖 Lead Scoring Engine initialized (v${this.version})`);
  }

  /**
   * Score a single lead
   * @param {object} lead - Lead data
   * @param {string} profile - Scoring profile
   * @returns {object} Lead score with breakdown
   */
  scoreLeads(leads, profile = null) {
    const profileName = profile || this.config.defaultProfile;
    const profileConfig = this.profiles[profileName];

    if (!profileConfig) {
      throw new Error(`Unknown profile: ${profileName}`);
    }

    const scoredLeads = leads.map(lead => this.scoreSingleLead(lead, profileConfig));

    // Sort by score descending
    scoredLeads.sort((a, b) => b.totalScore - a.totalScore);

    // Update statistics
    this.updateStats(scoredLeads, profileName);

    return {
      profile: profileName,
      leads: scoredLeads,
      statistics: this.calculateLeadStatistics(scoredLeads),
      topLeads: scoredLeads.slice(0, 10)
    };
  }

  /**
   * Score single lead
   * @private
   */
  scoreSingleLead(lead, profile) {
    const scores = {
      emailQuality: this.scoreEmailQuality(lead),
      companyRelevance: this.scoreCompanyRelevance(lead, profile),
      engagement: this.scoreEngagement(lead),
      listHealth: this.scoreListHealth(lead)
    };

    // Calculate weighted score
    let totalScore = 0;
    for (const [factor, weight] of Object.entries(this.weights)) {
      const key = this.camelToSnake(factor);
      if (scores[key] !== undefined) {
        totalScore += scores[key] * weight * 100;
      }
    }

    // Apply bonuses
    totalScore = this.applyBonuses(totalScore, lead, profile);

    // Clamp to 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    return {
      email: lead.email,
      totalScore: Math.round(totalScore),
      scores: {
        emailQuality: Math.round(scores.emailQuality * 100),
        companyRelevance: Math.round(scores.companyRelevance * 100),
        engagement: Math.round(scores.engagement * 100),
        listHealth: Math.round(scores.listHealth * 100)
      },
      tier: this.getScoreTier(totalScore),
      reasons: this.generateScoreReasons(scores, lead, profile),
      recommendation: this.getRecommendation(totalScore, lead)
    };
  }

  /**
   * Score email quality (0-1)
   * @private
   */
  scoreEmailQuality(lead) {
    let score = 0.5; // Baseline

    // Email format
    if (lead.emailQualityScore !== undefined) {
      score += (lead.emailQualityScore / 100) * 0.5;
    }

    // Domain reputation
    if (lead.domainReputation !== undefined) {
      score += (lead.domainReputation / 100) * 0.3;
    }

    // Validation status
    if (lead.validationStatus === 'valid') {
      score += 0.2;
    } else if (lead.validationStatus === 'invalid') {
      score -= 0.5;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score company relevance (0-1)
   * @private
   */
  scoreCompanyRelevance(lead, profile) {
    let score = 0.3; // Baseline

    // Industry match
    if (lead.industry) {
      const hasPositiveMatch = profile.industryKeywords.some(keyword =>
        lead.industry.toLowerCase().includes(keyword)
      );

      if (hasPositiveMatch) {
        score += 0.4;
      }

      // Check for negative indicators
      const hasNegativeMatch = profile.negativeIndicators.some(indicator =>
        lead.industry.toLowerCase().includes(indicator)
      );

      if (hasNegativeMatch) {
        score -= 0.3;
      }
    }

    // Company size
    if (lead.companySize) {
      const sizeValue = {
        'startup': 1,
        'small': 2,
        'medium': 3,
        'large': 4,
        'enterprise': 5
      }[lead.companySize] || 2.5;

      if (sizeValue >= profile.companyMinSize) {
        score += 0.2;
      }
    }

    // Geographic match
    if (lead.country && profile.targetCountries.includes(lead.country)) {
      score += 0.15;
    }

    // Market position
    if (lead.isMarketLeader) {
      score += 0.15;
    }

    // Growth signals
    if (lead.hasGrowthSignals) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score engagement signals (0-1)
   * @private
   */
  scoreEngagement(lead) {
    let score = 0.3; // Baseline

    // Open rate
    if (lead.openRate !== undefined) {
      score += Math.min(lead.openRate, 0.3);
    }

    // Click rate
    if (lead.clickRate !== undefined) {
      score += Math.min(lead.clickRate, 0.2);
    }

    // Conversion rate
    if (lead.conversionRate !== undefined) {
      score += Math.min(lead.conversionRate, 0.1);
    }

    // Custom engagement score
    if (lead.engagementScore !== undefined) {
      score += (lead.engagementScore / 100) * 0.4;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score list health (0-1)
   * @private
   */
  scoreListHealth(lead) {
    let score = 0.5; // Baseline

    // List age
    if (lead.listAge !== undefined) {
      const ageMonths = lead.listAge / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths < 3) score += 0.2;
      else if (ageMonths < 12) score += 0.1;
      else if (ageMonths > 24) score -= 0.1;
    }

    // Bounce rate
    if (lead.bounceRate !== undefined) {
      score -= lead.bounceRate * 0.5;
    }

    // Complaint rate
    if (lead.complaintRate !== undefined) {
      score -= lead.complaintRate * 1.0;
    }

    // Source quality
    if (lead.sourceQuality !== undefined) {
      score += (lead.sourceQuality / 100) * 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Apply bonus multipliers
   * @private
   */
  applyBonuses(score, lead, profile) {
    const bonuses = profile.bonusMultiplier || {};
    let multiplier = 1.0;

    // OEM/Manufacturer bonus
    if (bonuses.oemManufacturer && lead.isOEMManufacturer) {
      multiplier *= bonuses.oemManufacturer;
    }

    // Geographic bonus
    if (bonuses.targetGeo && lead.country && profile.targetCountries.includes(lead.country)) {
      multiplier *= bonuses.targetGeo;
    }

    // Location match (for real estate)
    if (bonuses.locationMatch && lead.targetLocationMatch) {
      multiplier *= bonuses.locationMatch;
    }

    // Inventory signal (for automotive)
    if (bonuses.inventorySignal && lead.hasInventorySignals) {
      multiplier *= bonuses.inventorySignal;
    }

    return score * multiplier;
  }

  /**
   * Get score tier
   * @private
   */
  getScoreTier(score) {
    if (score >= 80) return 'platinum';
    if (score >= 60) return 'gold';
    if (score >= 40) return 'silver';
    if (score >= 20) return 'bronze';
    return 'unqualified';
  }

  /**
   * Generate score explanations
   * @private
   */
  generateScoreReasons(scores, lead, profile) {
    const reasons = [];

    if (scores.emailQuality >= 0.8) {
      reasons.push('Excellent email quality');
    } else if (scores.emailQuality < 0.4) {
      reasons.push('Poor email quality');
    }

    if (scores.companyRelevance >= 0.7) {
      reasons.push(`Strong match with ${profile.name} profile`);
    } else if (scores.companyRelevance < 0.4) {
      reasons.push('Weak industry/company match');
    }

    if (scores.engagement >= 0.7) {
      reasons.push('High engagement signals');
    }

    if (scores.listHealth < 0.4) {
      reasons.push('List health concerns (age/bounces)');
    }

    return reasons;
  }

  /**
   * Get recommendation
   * @private
   */
  getRecommendation(score, lead) {
    if (score >= 80) {
      return {
        action: 'prioritize',
        message: 'Top priority - pursue immediately',
        followUpDelay: '24 hours'
      };
    }

    if (score >= 60) {
      return {
        action: 'contact',
        message: 'Good prospect - contact soon',
        followUpDelay: '3-5 days'
      };
    }

    if (score >= 40) {
      return {
        action: 'nurture',
        message: 'Nurture for future engagement',
        followUpDelay: '1-2 weeks'
      };
    }

    return {
      action: 'skip',
      message: 'Low priority - consider for future campaigns',
      followUpDelay: '30 days'
    };
  }

  /**
   * Update statistics
   * @private
   */
  updateStats(scoredLeads, profileName) {
    this.stats.totalScored += scoredLeads.length;

    const avg = scoredLeads.reduce((a, b) => a + b.totalScore, 0) / scoredLeads.length;
    this.stats.averageScore =
      (this.stats.averageScore * (this.stats.totalScored - scoredLeads.length) +
        avg * scoredLeads.length) /
      this.stats.totalScored;

    // Distribution
    scoredLeads.forEach(lead => {
      if (lead.totalScore >= 60) this.stats.scoreDistribution.high++;
      else if (lead.totalScore >= 40) this.stats.scoreDistribution.medium++;
      else this.stats.scoreDistribution.low++;
    });

    // Profile stats
    if (!this.stats.profileStats[profileName]) {
      this.stats.profileStats[profileName] = { count: 0, avgScore: 0 };
    }

    this.stats.profileStats[profileName].count += scoredLeads.length;
    this.stats.profileStats[profileName].avgScore = avg;
  }

  /**
   * Calculate lead statistics
   * @private
   */
  calculateLeadStatistics(scoredLeads) {
    if (scoredLeads.length === 0) {
      return { totalLeads: 0 };
    }

    return {
      totalLeads: scoredLeads.length,
      averageScore: Math.round(scoredLeads.reduce((a, b) => a + b.totalScore, 0) / scoredLeads.length),
      highPriority: scoredLeads.filter(l => l.totalScore >= 80).length,
      goodProspects: scoredLeads.filter(l => l.totalScore >= 60 && l.totalScore < 80).length,
      nurture: scoredLeads.filter(l => l.totalScore >= 40 && l.totalScore < 60).length,
      lowPriority: scoredLeads.filter(l => l.totalScore < 40).length,
      distribution: {
        platinum: scoredLeads.filter(l => l.tier === 'platinum').length,
        gold: scoredLeads.filter(l => l.tier === 'gold').length,
        silver: scoredLeads.filter(l => l.tier === 'silver').length,
        bronze: scoredLeads.filter(l => l.tier === 'bronze').length,
        unqualified: scoredLeads.filter(l => l.tier === 'unqualified').length
      }
    };
  }

  /**
   * Get available profiles
   */
  getAvailableProfiles() {
    return Object.entries(this.profiles).map(([key, profile]) => ({
      id: key,
      name: profile.name,
      keywordsCount: profile.industryKeywords.length,
      targetCountries: profile.targetCountries
    }));
  }

  /**
   * Get model statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      totalScored: this.stats.totalScored,
      averageScore: Math.round(this.stats.averageScore),
      distribution: this.stats.scoreDistribution,
      profiles: this.stats.profileStats
    };
  }

  // ============ PRIVATE HELPERS ============

  camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeadScoringEngine;
}

if (typeof window !== 'undefined') {
  window.LeadScoringEngine = LeadScoringEngine;
}
