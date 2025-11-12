/**
 * ML Metrics Tracker - Track model performance and data drift
 *
 * Features:
 * - Real-time metric computation
 * - Model performance dashboard
 * - Data drift detection
 * - Feature importance tracking
 * - Alert system for degradation
 *
 * @module ml-metrics-tracker
 */

class MLMetricsTracker {
  constructor(options = {}) {
    this.metrics = new Map(); // modelName -> metrics
    this.history = new Map(); // modelName -> [historical metrics]
    this.driftDetectors = new Map(); // Feature -> drift data
    this.alerts = [];
    this.featureImportance = new Map();

    this.config = {
      enableDriftDetection: options.enableDriftDetection !== false,
      enableAlerts: options.enableAlerts !== false,
      degradationThreshold: options.degradationThreshold || 0.05, // 5% drop
      historyLimit: options.historyLimit || 1000,
      alertThreshold: options.alertThreshold || 0.85,
      ...options
    };

    this.stats = {
      totalMetricsComputed: 0,
      totalAlerts: 0,
      totalDriftDetected: 0,
      metricsPerModel: {}
    };

    this.listeners = {
      metricsUpdated: [],
      degradationDetected: [],
      driftDetected: [],
      alertTriggered: []
    };

    console.log('📊 ML Metrics Tracker initialized');
  }

  /**
   * Track metrics for classification model
   * @param {string} modelName - Model name
   * @param {array} predictions - Predicted values
   * @param {array} actual - Actual values
   * @param {object} metadata - Additional metadata
   */
  trackClassificationMetrics(modelName, predictions, actual, metadata = {}) {
    if (predictions.length !== actual.length) {
      throw new Error('Predictions and actual values must have same length');
    }

    const metrics = this.computeClassificationMetrics(predictions, actual);
    const timestamp = new Date().toISOString();

    // Store metrics
    const modelMetrics = {
      modelName,
      type: 'classification',
      timestamp,
      metrics,
      sampleCount: predictions.length,
      metadata
    };

    // Get or create model history
    if (!this.history.has(modelName)) {
      this.history.set(modelName, []);
    }

    const history = this.history.get(modelName);
    history.push(modelMetrics);

    // Limit history size
    if (history.length > this.config.historyLimit) {
      history.shift();
    }

    this.metrics.set(modelName, modelMetrics);
    this.stats.totalMetricsComputed++;

    // Check for degradation
    this.checkDegradation(modelName);

    // Detect data drift
    if (this.config.enableDriftDetection) {
      this.detectDrift(modelName, predictions, actual);
    }

    this.emit('metricsUpdated', {
      modelName,
      metrics,
      timestamp
    });

    console.log(
      `📊 Metrics tracked: ${modelName} - Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`
    );

    return modelMetrics;
  }

  /**
   * Track metrics for regression model
   * @param {string} modelName - Model name
   * @param {array} predictions - Predicted values
   * @param {array} actual - Actual values
   * @param {object} metadata - Additional metadata
   */
  trackRegressionMetrics(modelName, predictions, actual, metadata = {}) {
    if (predictions.length !== actual.length) {
      throw new Error('Predictions and actual values must have same length');
    }

    const metrics = this.computeRegressionMetrics(predictions, actual);
    const timestamp = new Date().toISOString();

    const modelMetrics = {
      modelName,
      type: 'regression',
      timestamp,
      metrics,
      sampleCount: predictions.length,
      metadata
    };

    if (!this.history.has(modelName)) {
      this.history.set(modelName, []);
    }

    const history = this.history.get(modelName);
    history.push(modelMetrics);

    if (history.length > this.config.historyLimit) {
      history.shift();
    }

    this.metrics.set(modelName, modelMetrics);
    this.stats.totalMetricsComputed++;

    this.checkDegradation(modelName);

    this.emit('metricsUpdated', {
      modelName,
      metrics,
      timestamp
    });

    console.log(
      `📊 Metrics tracked: ${modelName} - MSE: ${metrics.mse.toFixed(4)}, R²: ${metrics.r2.toFixed(4)}`
    );

    return modelMetrics;
  }

  /**
   * Track feature importance
   * @param {string} modelName - Model name
   * @param {object} importance - Feature importance scores
   */
  trackFeatureImportance(modelName, importance) {
    const sorted = Object.entries(importance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20

    this.featureImportance.set(modelName, {
      features: sorted.map(([name]) => name),
      importance: sorted.map(([, score]) => score),
      timestamp: new Date().toISOString(),
      total: sorted.reduce((sum, [, score]) => sum + score, 0)
    });

    console.log(`⭐ Feature importance tracked: ${modelName} - Top feature: ${sorted[0][0]}`);
  }

  /**
   * Get model metrics
   * @param {string} modelName - Model name
   * @returns {object} Current metrics
   */
  getMetrics(modelName) {
    return this.metrics.get(modelName);
  }

  /**
   * Get metrics history
   * @param {string} modelName - Model name
   * @param {number} limit - Number of records to return
   * @returns {array} Historical metrics
   */
  getMetricsHistory(modelName, limit = 100) {
    const history = this.history.get(modelName) || [];
    return history.slice(-limit);
  }

  /**
   * Get feature importance
   * @param {string} modelName - Model name
   * @returns {object} Feature importance
   */
  getFeatureImportance(modelName) {
    return this.featureImportance.get(modelName);
  }

  /**
   * Detect data distribution shift (drift)
   * @param {string} modelName - Model name
   * @param {array} predictions - Current predictions
   * @param {array} actual - Current actual values
   */
  detectDrift(modelName, predictions, actual) {
    // Kolmogorov-Smirnov test for distribution shift
    const history = this.history.get(modelName);
    if (!history || history.length < 2) return;

    const previousMetrics = history[history.length - 2];
    const currentMetrics = history[history.length - 1];

    // Simple drift detection: compare mean and std
    const previousPreds = history.map(h => h.metrics.meanPrediction);
    const currentMean = this.calculateMean(predictions);
    const currentStd = this.calculateStdDev(predictions);

    const ks_statistic = this.kolmogorovSmirnovTest(previousPreds, predictions);

    if (ks_statistic > 0.1) {
      // Potential drift detected
      const drift = {
        modelName,
        timestamp: new Date().toISOString(),
        ks_statistic,
        meanShift: Math.abs(currentMean - previousMetrics.metrics.meanPrediction),
        stdShift: Math.abs(currentStd - previousMetrics.metrics.stdPrediction),
        severity: ks_statistic > 0.3 ? 'high' : 'medium'
      };

      this.driftDetectors.set(`${modelName}:${drift.timestamp}`, drift);
      this.stats.totalDriftDetected++;

      this.emit('driftDetected', drift);

      if (this.config.enableAlerts) {
        this.triggerAlert({
          type: 'drift_detected',
          modelName,
          severity: drift.severity,
          message: `Data drift detected in ${modelName} (KS=${ks_statistic.toFixed(3)})`
        });
      }

      console.warn(`⚠️  Drift detected in ${modelName}: KS=${ks_statistic.toFixed(3)}`);
    }
  }

  /**
   * Get drift status for model
   * @param {string} modelName - Model name
   * @returns {array} Recent drift events
   */
  getDriftStatus(modelName) {
    const drifts = [];

    for (const [key, drift] of this.driftDetectors) {
      if (drift.modelName === modelName) {
        drifts.push(drift);
      }
    }

    return drifts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Generate performance report
   * @param {string} modelName - Model name
   * @returns {object} Performance report
   */
  generateReport(modelName) {
    const currentMetrics = this.metrics.get(modelName);
    const history = this.history.get(modelName) || [];
    const importance = this.featureImportance.get(modelName);
    const drifts = this.getDriftStatus(modelName);

    if (!currentMetrics) {
      return { error: `No metrics found for model: ${modelName}` };
    }

    // Calculate trends
    const metrics = currentMetrics.metrics;
    let trend = 'stable';
    let trendValue = 0;

    if (history.length > 1) {
      const prev = history[history.length - 2].metrics;
      const current = history[history.length - 1].metrics;

      if (currentMetrics.type === 'classification') {
        trendValue = (current.accuracy - prev.accuracy) * 100;
      } else {
        trendValue = (current.r2 - prev.r2) * 100;
      }

      if (trendValue > 0.01) trend = 'improving';
      else if (trendValue < -0.01) trend = 'degrading';
    }

    return {
      modelName,
      type: currentMetrics.type,
      timestamp: currentMetrics.timestamp,
      currentMetrics: metrics,
      trend,
      trendValue,
      sampleCount: currentMetrics.sampleCount,
      historicalCount: history.length,
      topFeatures: importance
        ? importance.features.slice(0, 5)
        : [],
      recentDrifts: drifts.slice(0, 3),
      health: this.calculateModelHealth(modelName),
      recommendations: this.generateRecommendations(modelName)
    };
  }

  /**
   * Get all metrics
   * @returns {object} All models metrics
   */
  getAllMetrics() {
    const allMetrics = {};

    for (const [modelName, metrics] of this.metrics) {
      allMetrics[modelName] = {
        ...metrics,
        health: this.calculateModelHealth(modelName)
      };
    }

    return allMetrics;
  }

  /**
   * Get alerts
   * @returns {array} Recent alerts
   */
  getAlerts() {
    return this.alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Clear alerts older than X hours
   * @param {number} hours - Hours threshold
   */
  clearOldAlerts(hours = 24) {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoffTime);
  }

  /**
   * Get metrics statistics
   * @returns {object} Statistics
   */
  getStatistics() {
    return {
      totalMetricsComputed: this.stats.totalMetricsComputed,
      totalAlerts: this.stats.totalAlerts,
      totalDriftDetected: this.stats.totalDriftDetected,
      modelsTracked: this.metrics.size,
      averageAccuracy: this.calculateAverageAccuracy(),
      healthyModels: this.countHealthyModels()
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Compute classification metrics
   * @private
   */
  computeClassificationMetrics(predictions, actual) {
    const tp = predictions.filter((p, i) => p === 1 && actual[i] === 1).length;
    const fp = predictions.filter((p, i) => p === 1 && actual[i] === 0).length;
    const tn = predictions.filter((p, i) => p === 0 && actual[i] === 0).length;
    const fn = predictions.filter((p, i) => p === 0 && actual[i] === 1).length;

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = fp + tp === 0 ? 0 : tp / (tp + fp);
    const recall = fn + tp === 0 ? 0 : tp / (tp + fn);
    const f1 = 2 * (precision * recall) / (precision + recall || 1);

    return {
      accuracy,
      precision,
      recall,
      f1,
      tp,
      fp,
      tn,
      fn,
      meanPrediction: predictions.reduce((a, b) => a + b, 0) / predictions.length,
      stdPrediction: this.calculateStdDev(predictions)
    };
  }

  /**
   * Compute regression metrics
   * @private
   */
  computeRegressionMetrics(predictions, actual) {
    const residuals = predictions.map((p, i) => p - actual[i]);
    const squaredResiduals = residuals.map(r => r * r);
    const mse = squaredResiduals.reduce((a, b) => a + b, 0) / squaredResiduals.length;
    const rmse = Math.sqrt(mse);

    const meanActual = this.calculateMean(actual);
    const totalSumSquares = actual
      .map(a => (a - meanActual) ** 2)
      .reduce((a, b) => a + b, 0);
    const r2 = 1 - (mse * squaredResiduals.length) / totalSumSquares;

    const mae = residuals.map(r => Math.abs(r)).reduce((a, b) => a + b, 0) / residuals.length;

    return {
      mse,
      rmse,
      mae,
      r2,
      meanPrediction: this.calculateMean(predictions),
      stdPrediction: this.calculateStdDev(predictions)
    };
  }

  /**
   * Check for performance degradation
   * @private
   */
  checkDegradation(modelName) {
    const history = this.history.get(modelName);
    if (!history || history.length < 2) return;

    const prev = history[history.length - 2];
    const current = history[history.length - 1];

    let prevScore, currentScore;

    if (current.type === 'classification') {
      prevScore = prev.metrics.accuracy;
      currentScore = current.metrics.accuracy;
    } else {
      prevScore = prev.metrics.r2;
      currentScore = current.metrics.r2;
    }

    const degradation = prevScore - currentScore;

    if (degradation > this.config.degradationThreshold) {
      this.emit('degradationDetected', {
        modelName,
        previousScore: prevScore,
        currentScore,
        degradation,
        timestamp: new Date().toISOString()
      });

      if (this.config.enableAlerts) {
        this.triggerAlert({
          type: 'degradation_detected',
          modelName,
          severity: degradation > 0.1 ? 'high' : 'medium',
          message: `Model ${modelName} performance degraded by ${(degradation * 100).toFixed(2)}%`
        });
      }

      console.warn(
        `⚠️  Performance degradation: ${modelName} (${(degradation * 100).toFixed(2)}%)`
      );
    }
  }

  /**
   * Kolmogorov-Smirnov test
   * @private
   */
  kolmogorovSmirnovTest(sample1, sample2) {
    // Simplified KS test
    const sorted1 = [...sample1].sort((a, b) => a - b);
    const sorted2 = [...sample2].sort((a, b) => a - b);

    let maxDiff = 0;
    let i = 0, j = 0;

    while (i < sorted1.length && j < sorted2.length) {
      const cdf1 = i / sorted1.length;
      const cdf2 = j / sorted2.length;
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2));

      if (sorted1[i] < sorted2[j]) i++;
      else j++;
    }

    return maxDiff;
  }

  /**
   * Calculate model health score (0-100)
   * @private
   */
  calculateModelHealth(modelName) {
    const metrics = this.metrics.get(modelName);
    if (!metrics) return 0;

    let healthScore = 100;

    // Deduct for low accuracy/R2
    if (metrics.type === 'classification') {
      if (metrics.metrics.accuracy < 0.8) {
        healthScore -= (0.8 - metrics.metrics.accuracy) * 100;
      }
    } else {
      if (metrics.metrics.r2 < 0.7) {
        healthScore -= (0.7 - metrics.metrics.r2) * 100;
      }
    }

    // Deduct for drift
    const drifts = this.getDriftStatus(modelName);
    if (drifts.length > 0) {
      healthScore -= Math.min(30, drifts.length * 10);
    }

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(modelName) {
    const recommendations = [];
    const metrics = this.metrics.get(modelName);
    const drifts = this.getDriftStatus(modelName);

    if (metrics?.type === 'classification' && metrics.metrics.accuracy < 0.85) {
      recommendations.push('Consider retraining with more data');
    }

    if (drifts.length > 0) {
      recommendations.push('Data drift detected - monitor inputs closely');
    }

    if (metrics?.metrics.f1 < 0.75) {
      recommendations.push('Balance dataset for better generalization');
    }

    return recommendations;
  }

  /**
   * Trigger alert
   * @private
   */
  triggerAlert(alert) {
    const alertEvent = {
      ...alert,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };

    this.alerts.push(alertEvent);
    this.stats.totalAlerts++;

    this.emit('alertTriggered', alertEvent);

    return alertEvent;
  }

  calculateMean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateStdDev(values) {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    return Math.sqrt(variance);
  }

  calculateAverageAccuracy() {
    let sum = 0;
    let count = 0;

    for (const [, metrics] of this.metrics) {
      if (metrics.type === 'classification' && metrics.metrics.accuracy) {
        sum += metrics.metrics.accuracy;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  countHealthyModels() {
    let healthy = 0;

    for (const [modelName] of this.metrics) {
      if (this.calculateModelHealth(modelName) > 80) {
        healthy++;
      }
    }

    return healthy;
  }

  /**
   * Event emitter
   * @private
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe from event
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLMetricsTracker;
}

if (typeof window !== 'undefined') {
  window.MLMetricsTracker = MLMetricsTracker;
}
