/**
 * List Quality Degradation Tracker - Monitor and predict list health decay
 *
 * Features:
 * - Track list quality over time
 * - Predict revalidation needs
 * - Optimal refresh interval calculation
 * - Quality decay rate analysis
 * - Cohort analysis
 *
 * @module list-quality-tracker
 */

class ListQualityDegradationTracker {
  constructor(options = {}) {
    this.modelName = 'ListQualityDegradationTracker';
    this.version = options.version || '1.0.0';

    this.config = {
      decayFactor: options.decayFactor || 0.02, // 2% per day baseline
      minDaysBetweenValidation: options.minDaysBetweenValidation || 7,
      maxDaysBetweenValidation: options.maxDaysBetweenValidation || 180,
      qualityThreshold: options.qualityThreshold || 0.8, // 80% validation rate
      ...options
    };

    this.lists = new Map(); // listId -> list data
    this.decayHistory = new Map(); // listId -> decay measurements
    this.predictions = new Map(); // listId -> predictions

    this.stats = {
      totalTracked: 0,
      avgDecayRate: 0,
      avgRevalidationInterval: 0,
      listsCritical: 0
    };

    console.log(`📊 List Quality Tracker initialized (v${this.version})`);
  }

  /**
   * Start tracking a list
   * @param {string} listId - List ID
   * @param {object} listData - Initial list data
   */
  trackList(listId, listData) {
    const list = {
      id: listId,
      name: listData.name || listId,
      createdAt: listData.createdAt || new Date().toISOString(),
      initialSize: listData.size || 0,
      initialQuality: listData.quality || 0.95,
      lastRevalidated: listData.lastRevalidated || new Date().toISOString(),
      measurements: []
    };

    this.lists.set(listId, list);
    this.stats.totalTracked++;

    // Record initial measurement
    this.recordMeasurement(listId, {
      date: new Date().toISOString(),
      validationRate: listData.quality || 0.95,
      bounceRate: listData.bounceRate || 0.02,
      complaintRate: listData.complaintRate || 0.001,
      size: listData.size || 0
    });

    console.log(`📊 Started tracking list: ${listId}`);
    return list;
  }

  /**
   * Record quality measurement
   * @param {string} listId - List ID
   * @param {object} measurement - Quality measurement
   */
  recordMeasurement(listId, measurement) {
    const list = this.lists.get(listId);
    if (!list) throw new Error(`List not found: ${listId}`);

    const record = {
      timestamp: new Date().toISOString(),
      ...measurement,
      daysSinceCreation: this.getDaysDiff(list.createdAt, measurement.date || new Date().toISOString()),
      daysSinceRevalidation: this.getDaysDiff(list.lastRevalidated, measurement.date || new Date().toISOString())
    };

    list.measurements.push(record);

    // Update last revalidated if this is after a revalidation
    if (measurement.revalidated) {
      list.lastRevalidated = measurement.date || new Date().toISOString();
    }

    // Calculate decay rate if we have history
    if (list.measurements.length > 1) {
      this.calculateDecayRate(listId);
      this.predictDegradation(listId);
    }
  }

  /**
   * Calculate decay rate
   * @private
   */
  calculateDecayRate(listId) {
    const list = this.lists.get(listId);
    const measurements = list.measurements;

    if (measurements.length < 2) return null;

    // Calculate daily decay rate from recent measurements
    const decayRates = [];

    for (let i = 1; i < measurements.length; i++) {
      const prev = measurements[i - 1];
      const curr = measurements[i];

      const daysDiff = this.getDaysDiff(prev.timestamp, curr.timestamp);
      if (daysDiff > 0) {
        const qualityDiff = prev.validationRate - curr.validationRate;
        const dailyRate = qualityDiff / daysDiff;
        decayRates.push(dailyRate);
      }
    }

    if (decayRates.length === 0) return null;

    const avgDecayRate = decayRates.reduce((a, b) => a + b, 0) / decayRates.length;

    if (!this.decayHistory.has(listId)) {
      this.decayHistory.set(listId, []);
    }

    this.decayHistory.get(listId).push({
      timestamp: new Date().toISOString(),
      decayRate: avgDecayRate,
      measurementCount: measurements.length
    });

    // Update global stats
    this.stats.avgDecayRate =
      (this.stats.avgDecayRate * (this.stats.totalTracked - 1) + avgDecayRate) /
      this.stats.totalTracked;

    return avgDecayRate;
  }

  /**
   * Predict when list will fall below quality threshold
   * @private
   */
  predictDegradation(listId) {
    const list = this.lists.get(listId);
    const measurements = list.measurements;

    if (measurements.length < 2) return null;

    const latestMeasurement = measurements[measurements.length - 1];
    const currentQuality = latestMeasurement.validationRate;
    const decayRate = this.calculateDecayRate(listId) || this.config.decayFactor;

    // Predict days until quality falls below threshold
    const qualityDiff = currentQuality - this.config.qualityThreshold;

    if (qualityDiff <= 0) {
      // Already below threshold
      return {
        status: 'critical',
        daysUntilThreshold: 0,
        recommendedRevalidation: 'immediately',
        urgency: 'critical'
      };
    }

    const daysUntilThreshold = Math.ceil(qualityDiff / (decayRate || this.config.decayFactor));

    const prediction = {
      listId,
      currentQuality: currentQuality,
      threshold: this.config.qualityThreshold,
      decayRate: decayRate || this.config.decayFactor,
      daysUntilThreshold: Math.max(1, daysUntilThreshold),
      predictedDateThreshold: this.addDays(new Date(), daysUntilThreshold),
      status: this.getStatus(daysUntilThreshold),
      recommendedRevalidation: this.getRevalidationInterval(daysUntilThreshold),
      urgency: this.getUrgency(daysUntilThreshold),
      roi: this.calculateROI(daysUntilThreshold),
      prediction: this.predictTrend(list, daysUntilThreshold)
    };

    this.predictions.set(listId, prediction);

    // Update critical count
    if (prediction.urgency === 'critical') {
      this.stats.listsCritical++;
    }

    console.log(
      `🔮 Prediction for ${listId}: ${daysUntilThreshold} days until threshold`
    );

    return prediction;
  }

  /**
   * Get revalidation recommendation
   * @private
   */
  getRevalidationInterval(daysUntilThreshold) {
    if (daysUntilThreshold <= 7) {
      return { days: 7, message: 'Immediate - within 7 days' };
    }

    if (daysUntilThreshold <= 14) {
      return { days: 14, message: 'Urgent - within 14 days' };
    }

    if (daysUntilThreshold <= 30) {
      return { days: 30, message: 'Soon - within 30 days' };
    }

    if (daysUntilThreshold <= 60) {
      return { days: 60, message: 'Planned - within 60 days' };
    }

    return { days: 90, message: 'Routine - schedule within 90 days' };
  }

  /**
   * Get urgency level
   * @private
   */
  getUrgency(daysUntilThreshold) {
    if (daysUntilThreshold <= 7) return 'critical';
    if (daysUntilThreshold <= 14) return 'high';
    if (daysUntilThreshold <= 30) return 'medium';
    if (daysUntilThreshold <= 60) return 'low';
    return 'none';
  }

  /**
   * Get status
   * @private
   */
  getStatus(daysUntilThreshold) {
    if (daysUntilThreshold <= 0) return 'critical';
    if (daysUntilThreshold <= 7) return 'warning';
    if (daysUntilThreshold <= 30) return 'caution';
    return 'healthy';
  }

  /**
   * Calculate ROI of revalidation
   * @private
   */
  calculateROI(daysUntilThreshold) {
    // Estimated costs and benefits
    const revalidationCost = 100; // Cost per 1000 emails
    const bounceRiskCost = 50; // Cost per 1% bounce rate increase
    const deliverabilityBenefit = 200; // Benefit improvement

    const delayedDegradation = (30 - Math.min(30, daysUntilThreshold)) * 0.01;
    const estimatedLoss = bounceRiskCost * delayedDegradation;
    const netROI = deliverabilityBenefit - revalidationCost;

    return {
      revalidationCost,
      estimatedLoss,
      benefit: deliverabilityBenefit,
      netROI,
      recommended: netROI > 0
    };
  }

  /**
   * Predict quality trend
   * @private
   */
  predictTrend(list, horizonDays) {
    const measurements = list.measurements;
    const latestQuality = measurements[measurements.length - 1].validationRate;
    const decayRate = this.calculateDecayRate(list.id) || this.config.decayFactor;

    const predictions = [];

    for (let day = 0; day <= horizonDays; day += 7) {
      const predictedQuality = latestQuality - (decayRate * day);

      predictions.push({
        day,
        date: this.addDays(new Date(), day),
        predictedQuality: Math.max(0, predictedQuality),
        healthStatus: this.getHealthStatus(Math.max(0, predictedQuality))
      });
    }

    return predictions;
  }

  /**
   * Get health status
   * @private
   */
  getHealthStatus(quality) {
    if (quality >= 0.95) return 'excellent';
    if (quality >= 0.85) return 'good';
    if (quality >= 0.75) return 'fair';
    if (quality >= 0.65) return 'poor';
    return 'critical';
  }

  /**
   * Cohort analysis - compare lists by age
   */
  cohortAnalysis() {
    const cohorts = {};

    for (const [, list] of this.lists) {
      const ageMonths = this.getDaysDiff(list.createdAt, new Date().toISOString()) / 30;
      const cohortKey = Math.floor(ageMonths / 3) * 3; // Group by 3-month cohorts

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = { lists: [], totalQuality: 0, count: 0 };
      }

      if (list.measurements.length > 0) {
        const latestQuality = list.measurements[list.measurements.length - 1].validationRate;
        cohorts[cohortKey].lists.push(list.id);
        cohorts[cohortKey].totalQuality += latestQuality;
        cohorts[cohortKey].count++;
      }
    }

    // Calculate cohort statistics
    const analysis = {};

    for (const [cohortKey, cohort] of Object.entries(cohorts)) {
      if (cohort.count > 0) {
        analysis[`${cohortKey}-month`] = {
          listCount: cohort.count,
          averageQuality: cohort.totalQuality / cohort.count,
          quality_decline: (1 - cohort.totalQuality / cohort.count) * 100
        };
      }
    }

    return analysis;
  }

  /**
   * Get list prediction
   */
  getPrediction(listId) {
    return this.predictions.get(listId);
  }

  /**
   * Get all predictions
   */
  getAllPredictions() {
    const predictions = [];

    for (const [, prediction] of this.predictions) {
      predictions.push(prediction);
    }

    return predictions.sort((a, b) => {
      // Sort by urgency
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Get critical lists needing revalidation
   */
  getCriticalLists() {
    const critical = [];

    for (const [, prediction] of this.predictions) {
      if (prediction.urgency === 'critical' || prediction.urgency === 'high') {
        critical.push({
          listId: prediction.listId,
          daysRemaining: prediction.daysUntilThreshold,
          recommendation: prediction.recommendedRevalidation,
          urgency: prediction.urgency
        });
      }
    }

    return critical;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      totalTracked: this.stats.totalTracked,
      listsCritical: this.stats.listsCritical,
      averageDecayRate: this.stats.avgDecayRate,
      averageRevalidationInterval: this.stats.avgRevalidationInterval
    };
  }

  // ============ PRIVATE HELPERS ============

  getDaysDiff(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ListQualityDegradationTracker;
}

if (typeof window !== 'undefined') {
  window.ListQualityDegradationTracker = ListQualityDegradationTracker;
}
