/**
 * Campaign Predictor - Forecast email campaign performance
 *
 * Features:
 * - Predict open rates, click rates, conversions
 * - ROI estimation
 * - Optimal send time prediction
 * - A/B test outcome forecasting
 * - Campaign segmentation recommendations
 *
 * @module campaign-predictor
 */

class CampaignPredictor {
  constructor(options = {}) {
    this.modelName = 'CampaignPredictor';
    this.version = options.version || '1.0.0';

    // Historical benchmarks by industry
    this.benchmarks = {
      'b2b-saas': {
        openRate: 0.25,
        clickRate: 0.08,
        conversionRate: 0.02,
        bounceRate: 0.03
      },
      'ecommerce': {
        openRate: 0.20,
        clickRate: 0.12,
        conversionRate: 0.05,
        bounceRate: 0.02
      },
      'retail': {
        openRate: 0.18,
        clickRate: 0.10,
        conversionRate: 0.03,
        bounceRate: 0.04
      },
      'services': {
        openRate: 0.22,
        clickRate: 0.09,
        conversionRate: 0.01,
        bounceRate: 0.03
      }
    };

    // Email content factors
    this.contentFactors = {
      subjectLineLength: { optimal: 45, impact: 0.15 },
      personalization: { has: 1.2, no: 0.9 },
      cta: { single: 1.1, multiple: 0.95, none: 0.5 },
      images: { many: 0.85, few: 1.0, none: 0.95 },
      textLength: { short: 1.1, medium: 1.0, long: 0.85 }
    };

    this.config = {
      defaultIndustry: options.defaultIndustry || 'b2b-saas',
      useHistoricalData: options.useHistoricalData !== false,
      confidenceLevel: options.confidenceLevel || 0.95,
      ...options
    };

    this.predictions = new Map(); // campaignId -> prediction
    this.historicalCampaigns = new Map(); // campaignId -> campaign data

    this.stats = {
      totalPredictions: 0,
      averageMAPE: 0,
      accurateCount: 0
    };

    console.log(`🎯 Campaign Predictor initialized (v${this.version})`);
  }

  /**
   * Predict campaign performance
   * @param {object} campaignData - Campaign configuration
   * @returns {object} Campaign prediction
   */
  predictCampaignPerformance(campaignData) {
    const campaignId = campaignData.id || `campaign_${Date.now()}`;

    try {
      // Get base metrics from benchmarks
      const industry = campaignData.industry || this.config.defaultIndustry;
      const benchmark = this.benchmarks[industry] || this.benchmarks['b2b-saas'];

      // Extract features
      const features = {
        listSize: campaignData.listSize || 10000,
        listQuality: campaignData.listQuality || 0.85,
        industry,
        subjectLine: campaignData.subjectLine || '',
        hasPersonalization: campaignData.hasPersonalization !== false,
        cta: campaignData.cta || 'single',
        imageCount: campaignData.imageCount || 0,
        textLength: campaignData.textLength || 'medium',
        sendTime: campaignData.sendTime || 'tuesday-10am',
        segmentationUsed: campaignData.segmentationUsed !== false
      };

      // Calculate adjustments
      const adjustments = this.calculateAdjustments(features);

      // Base predictions
      const openRate = benchmark.openRate * adjustments.overall;
      const clickRate = benchmark.clickRate * adjustments.overall * adjustments.cta;
      const conversionRate = benchmark.conversionRate * adjustments.overall * adjustments.personalization;
      const bounceRate = benchmark.bounceRate * adjustments.listQuality;

      // Apply historical data if available
      let historicalAdjustment = 1.0;
      if (this.config.useHistoricalData && campaignData.recentCampaigns) {
        historicalAdjustment = this.calculateHistoricalAdjustment(campaignData.recentCampaigns);
      }

      const finalPredictions = {
        openRate: openRate * historicalAdjustment,
        clickRate: clickRate * historicalAdjustment,
        conversionRate: conversionRate * historicalAdjustment,
        bounceRate: bounceRate
      };

      // Calculate metrics
      const expectedMetrics = this.calculateExpectedMetrics(
        features.listSize,
        finalPredictions
      );

      // ROI calculation
      const roi = this.calculateROI(
        expectedMetrics,
        campaignData.campaignCost || 500,
        campaignData.averageOrderValue || 50
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        campaignData,
        features,
        finalPredictions
      );

      // Confidence intervals
      const intervals = this.getConfidenceIntervals(finalPredictions);

      const prediction = {
        campaignId,
        predictions: finalPredictions,
        expectedMetrics,
        roi,
        recommendations,
        confidenceIntervals: intervals,
        sendTimeRecommendation: this.recommendSendTime(industry),
        segmentationSuggestions: this.sugmentSegmentation(campaignData),
        generatedAt: new Date().toISOString()
      };

      // Store prediction
      this.predictions.set(campaignId, prediction);
      this.stats.totalPredictions++;

      console.log(
        `🎯 Campaign prediction: ${(finalPredictions.openRate * 100).toFixed(1)}% open rate`
      );

      return prediction;

    } catch (error) {
      console.error('❌ Campaign prediction failed:', error);
      throw error;
    }
  }

  /**
   * Calculate feature adjustments
   * @private
   */
  calculateAdjustments(features) {
    let overall = 1.0;
    let cta = 1.0;
    let personalization = 1.0;
    let contentQuality = 1.0;
    let listQuality = 1.0;

    // Subject line optimization
    const subjectLength = features.subjectLine.length;
    if (subjectLength >= 40 && subjectLength <= 50) {
      overall += 0.1;
    } else if (subjectLength > 60) {
      overall -= 0.1;
    }

    // Personalization factor
    if (features.hasPersonalization) {
      personalization = 1.2;
      overall += 0.05;
    }

    // CTA optimization
    const ctaFactors = {
      single: 1.1,
      multiple: 0.95,
      none: 0.5
    };
    cta = ctaFactors[features.cta] || 1.0;

    // Content optimization
    if (features.imageCount === 0) {
      contentQuality += 0.05; // Text-only can work well
    } else if (features.imageCount <= 3) {
      contentQuality += 0.1; // Optimal
    } else {
      contentQuality -= 0.1; // Too many images
    }

    // Text length impact
    if (features.textLength === 'short') {
      contentQuality += 0.05;
    } else if (features.textLength === 'long') {
      contentQuality -= 0.1;
    }

    // List quality impact
    listQuality = features.listQuality / 0.85; // Normalize

    // Segmentation bonus
    if (features.segmentationUsed) {
      overall += 0.15; // Segmentation increases all metrics
    }

    return {
      overall: Math.max(0.5, Math.min(2.0, overall)),
      cta,
      personalization,
      contentQuality,
      listQuality
    };
  }

  /**
   * Calculate historical adjustment
   * @private
   */
  calculateHistoricalAdjustment(recentCampaigns) {
    if (!recentCampaigns || recentCampaigns.length === 0) {
      return 1.0;
    }

    const avgOpenRate = recentCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) /
      recentCampaigns.length;
    const avgClickRate = recentCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) /
      recentCampaigns.length;

    const benchmarkOpenRate = 0.25;
    const benchmarkClickRate = 0.08;

    // Adjustment based on historical performance
    const openAdjustment = avgOpenRate > 0 ? avgOpenRate / benchmarkOpenRate : 1.0;
    const clickAdjustment = avgClickRate > 0 ? avgClickRate / benchmarkClickRate : 1.0;

    return (openAdjustment + clickAdjustment) / 2;
  }

  /**
   * Calculate expected metrics
   * @private
   */
  calculateExpectedMetrics(listSize, predictions) {
    const adjustedListSize = listSize * (1 - predictions.bounceRate);

    return {
      expectedOpens: Math.round(adjustedListSize * predictions.openRate),
      expectedClicks: Math.round(adjustedListSize * predictions.openRate * predictions.clickRate),
      expectedConversions: Math.round(
        adjustedListSize * predictions.openRate * predictions.clickRate * predictions.conversionRate
      ),
      expectedBounces: Math.round(listSize * predictions.bounceRate),
      undeliverable: listSize - adjustedListSize
    };
  }

  /**
   * Calculate ROI
   * @private
   */
  calculateROI(metrics, cost, aov) {
    const revenue = metrics.expectedConversions * aov;
    const roi = ((revenue - cost) / cost) * 100;
    const breakEven = Math.ceil(cost / aov);

    return {
      revenue: revenue,
      cost: cost,
      profit: revenue - cost,
      roi: roi,
      breakEvenConversions: breakEven,
      costPerConversion: cost / Math.max(1, metrics.expectedConversions),
      costPerClick: cost / Math.max(1, metrics.expectedClicks),
      profitMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : -100
    };
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(campaignData, features, predictions) {
    const recommendations = [];

    // Subject line recommendations
    const subjectLength = features.subjectLine.length;
    if (subjectLength < 30 || subjectLength > 60) {
      recommendations.push({
        area: 'Subject Line',
        current: `${subjectLength} characters`,
        recommendation: 'Keep subject lines between 40-50 characters for best performance',
        impact: '+0.05 open rate'
      });
    }

    // Personalization
    if (!features.hasPersonalization) {
      recommendations.push({
        area: 'Personalization',
        current: 'No personalization',
        recommendation: 'Add recipient name or company for +20% open rate improvement',
        impact: '+0.20 open rate'
      });
    }

    // CTA optimization
    if (features.cta === 'none') {
      recommendations.push({
        area: 'Call-to-Action',
        current: 'No CTA',
        recommendation: 'Add a single, clear CTA button',
        impact: '+2x click rate'
      });
    } else if (features.cta === 'multiple') {
      recommendations.push({
        area: 'Call-to-Action',
        current: `${features.cta} CTAs`,
        recommendation: 'Consolidate to a single primary CTA',
        impact: '+0.15 click rate'
      });
    }

    // Image optimization
    if (features.imageCount > 3) {
      recommendations.push({
        area: 'Images',
        current: `${features.imageCount} images`,
        recommendation: 'Reduce to 1-3 high-quality images',
        impact: '+0.08 engagement'
      });
    }

    // List quality
    if (features.listQuality < 0.8) {
      recommendations.push({
        area: 'List Health',
        current: `${(features.listQuality * 100).toFixed(1)}% valid`,
        recommendation: 'Run list cleaning/revalidation before send',
        impact: '+0.15 deliverability'
      });
    }

    // Segmentation
    if (!features.segmentationUsed) {
      recommendations.push({
        area: 'Segmentation',
        current: 'Full list send',
        recommendation: 'Segment by engagement or demographics',
        impact: '+0.15 open rate'
      });
    }

    return recommendations;
  }

  /**
   * Get confidence intervals
   * @private
   */
  getConfidenceIntervals(predictions) {
    // Standard margin of error (±10%)
    const margin = 0.1;

    return {
      openRate: {
        lower: Math.max(0, predictions.openRate * (1 - margin)),
        upper: Math.min(1, predictions.openRate * (1 + margin))
      },
      clickRate: {
        lower: Math.max(0, predictions.clickRate * (1 - margin)),
        upper: Math.min(1, predictions.clickRate * (1 + margin))
      },
      conversionRate: {
        lower: Math.max(0, predictions.conversionRate * (1 - margin)),
        upper: Math.min(1, predictions.conversionRate * (1 + margin))
      }
    };
  }

  /**
   * Recommend send time
   * @private
   */
  recommendSendTime(industry) {
    const sendTimeRecommendations = {
      'b2b-saas': { day: 'Tuesday', time: '10:00 AM', reason: 'B2B users most active' },
      'ecommerce': { day: 'Wednesday', time: '6:00 PM', reason: 'Evening shopping browsing' },
      'retail': { day: 'Thursday', time: '11:00 AM', reason: 'Pre-weekend shopping prep' },
      'services': { day: 'Monday', time: '9:00 AM', reason: 'Weekly planning time' }
    };

    return (
      sendTimeRecommendations[industry] ||
      sendTimeRecommendations['b2b-saas']
    );
  }

  /**
   * Suggest segmentation
   * @private
   */
  sugmentSegmentation(campaignData) {
    const suggestions = [];

    // Based on list size
    if (campaignData.listSize > 50000) {
      suggestions.push({
        type: 'engagement',
        segments: 3,
        recommendation: 'Segment by engagement level (high/medium/low)',
        expectedLift: '+0.12 open rate'
      });
    }

    // Based on demographics
    if (campaignData.hasDemographics) {
      suggestions.push({
        type: 'demographic',
        segments: 5,
        recommendation: 'Segment by industry, company size, geography',
        expectedLift: '+0.18 relevance'
      });
    }

    // Based on behavior
    if (campaignData.hasBehaviorData) {
      suggestions.push({
        type: 'behavioral',
        segments: 4,
        recommendation: 'Segment by purchase history and product interest',
        expectedLift: '+0.25 conversion'
      });
    }

    return suggestions;
  }

  /**
   * A/B test outcome predictor
   */
  predictABTestOutcome(controlMetrics, treatmentMetrics, sampleSize) {
    const controlConversions = controlMetrics.conversions || 0;
    const treatmentConversions = treatmentMetrics.conversions || 0;

    const controlRate = controlConversions / sampleSize;
    const treatmentRate = treatmentConversions / sampleSize;

    // Calculate statistical significance (Chi-square approximation)
    const expectedDiff = treatmentRate - controlRate;
    const pooledRate = (controlConversions + treatmentConversions) / (sampleSize * 2);
    const stdError = Math.sqrt(pooledRate * (1 - pooledRate) * 2 / sampleSize);
    const zScore = Math.abs(expectedDiff / stdError);

    return {
      controlRate,
      treatmentRate,
      expectedDifference: expectedDiff,
      significanceLevel: zScore > 1.96 ? 'significant' : 'not_significant',
      confidence: zScore > 1.96 ? (Math.min(0.99, 0.95 + (zScore - 1.96) * 0.01)) : 0.5,
      recommendation: zScore > 1.96
        ? `Treatment is ${expectedDiff > 0 ? 'WINNER' : 'LOSER'}`
        : 'Need more data for conclusive result',
      nextSteps: zScore > 1.96
        ? 'Roll out winning variant to full list'
        : 'Continue testing with larger sample'
    };
  }

  /**
   * Get prediction
   */
  getPrediction(campaignId) {
    return this.predictions.get(campaignId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      totalPredictions: this.stats.totalPredictions,
      averageMAPE: this.stats.averageMAPE,
      accurateCount: this.stats.accurateCount
    };
  }

  // ============ PRIVATE HELPERS ============

  calculateHistoricalAccuracy(predicted, actual) {
    if (!actual) return null;
    const error = Math.abs(predicted - actual) / actual;
    return error <= 0.1 ? 'accurate' : 'needs_improvement';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CampaignPredictor;
}

if (typeof window !== 'undefined') {
  window.CampaignPredictor = CampaignPredictor;
}
