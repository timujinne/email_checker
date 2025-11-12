/**
 * Validation Forecasting Engine - Predict future validation metrics
 *
 * Features:
 * - Time series forecasting (ARIMA, Exponential Smoothing)
 * - Trend analysis and seasonality detection
 * - Confidence intervals
 * - Multi-step ahead predictions
 * - Automatic algorithm selection
 *
 * @module validation-forecaster
 */

class ValidationForecaster {
  constructor(options = {}) {
    this.modelName = 'ValidationForecaster';
    this.version = options.version || '1.0.0';

    this.config = {
      algorithm: options.algorithm || 'auto', // auto, arima, exponential, prophet
      horizonDays: options.horizonDays || 30,
      minHistoryDays: options.minHistoryDays || 14,
      confidenceLevel: options.confidenceLevel || 0.95,
      enableSeasonality: options.enableSeasonality !== false,
      ...options
    };

    this.forecasts = new Map(); // listId -> forecast
    this.history = new Map(); // listId -> historical data
    this.models = new Map(); // modelId -> trained model

    this.stats = {
      totalForecasts: 0,
      averageMAPE: 0,
      modelAccuracy: {}
    };

    console.log(`🔮 Validation Forecaster initialized (v${this.version})`);
  }

  /**
   * Forecast validation metrics
   * @param {string} listId - Email list ID
   * @param {array} historicalData - Historical validation data
   * @param {object} options - Forecast options
   * @returns {Promise<object>} Forecast result
   */
  async forecast(listId, historicalData, options = {}) {
    if (historicalData.length < this.config.minHistoryDays) {
      throw new Error(
        `Insufficient history: need ${this.config.minHistoryDays} days, got ${historicalData.length}`
      );
    }

    try {
      // Store historical data
      this.history.set(listId, historicalData);

      const startTime = Date.now();

      // Extract time series
      const validationRates = historicalData.map(d => d.validationRate || 0.9);
      const bounceRates = historicalData.map(d => d.bounceRate || 0.05);
      const complaintRates = historicalData.map(d => d.complaintRate || 0.001);

      // Detect seasonality and trend
      const components = this.decomposeTimeSeries(validationRates);

      // Select forecasting algorithm
      const algorithm = options.algorithm || this.selectBestAlgorithm(validationRates);

      // Generate forecasts
      let forecast;
      switch (algorithm) {
        case 'arima':
          forecast = this.arimaForecast(validationRates, this.config.horizonDays);
          break;
        case 'exponential':
          forecast = this.exponentialSmoothing(validationRates, this.config.horizonDays);
          break;
        case 'prophet':
          forecast = this.prophetForecast(validationRates, this.config.horizonDays);
          break;
        default:
          forecast = this.hybridForecast(validationRates, this.config.horizonDays);
      }

      // Forecast other metrics
      const bounceForecast = this.exponentialSmoothing(bounceRates, this.config.horizonDays);
      const complaintForecast = this.exponentialSmoothing(complaintRates, this.config.horizonDays);

      // Calculate confidence intervals
      const forecastWithCI = this.addConfidenceIntervals(
        forecast,
        validationRates,
        this.config.confidenceLevel
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        forecastWithCI,
        historicalData,
        components
      );

      const forecastTime = Date.now() - startTime;

      const result = {
        listId,
        algorithm,
        generatedAt: new Date().toISOString(),
        horizonDays: this.config.horizonDays,
        metrics: {
          validationRate: forecastWithCI,
          bounceRate: bounceForecast,
          complaintRate: complaintForecast
        },
        components,
        recommendations,
        accuracy: options.validateAgainst
          ? this.calculateAccuracy(forecastWithCI, options.validateAgainst)
          : null,
        forecastTime
      };

      // Store forecast
      this.forecasts.set(listId, result);
      this.stats.totalForecasts++;

      console.log(`✅ Forecast generated for ${listId}: ${algorithm} (${forecastTime}ms)`);

      return result;

    } catch (error) {
      console.error('❌ Forecast failed:', error);
      throw error;
    }
  }

  /**
   * ARIMA forecasting
   * @private
   */
  arimaForecast(data, steps) {
    // Simplified ARIMA using differencing and autoregression
    const differenced = this.differenceData(data);
    const trend = this.estimateTrend(differenced);

    const forecast = [];
    let lastValue = data[data.length - 1];

    for (let i = 0; i < steps; i++) {
      const nextValue = lastValue + trend + (Math.random() - 0.5) * 0.01;
      const clipped = Math.max(0, Math.min(1, nextValue));
      forecast.push({
        day: i + 1,
        forecast: clipped,
        lower: clipped - 0.02,
        upper: clipped + 0.02
      });
      lastValue = clipped;
    }

    return forecast;
  }

  /**
   * Exponential Smoothing
   * @private
   */
  exponentialSmoothing(data, steps) {
    const alpha = 0.3; // Smoothing parameter
    const beta = 0.1; // Trend smoothing

    let level = data[0];
    let trend = (data[data.length - 1] - data[0]) / data.length;

    const forecast = [];

    for (let i = 0; i < steps; i++) {
      const nextValue = level + trend;
      const clipped = Math.max(0, Math.min(1, nextValue));

      forecast.push({
        day: i + 1,
        forecast: clipped,
        lower: clipped - 0.015,
        upper: clipped + 0.015
      });

      // Update level and trend
      level = alpha * clipped + (1 - alpha) * (level + trend);
      trend = beta * (level - (level + trend)) + (1 - beta) * trend;
    }

    return forecast;
  }

  /**
   * Prophet-like forecasting with seasonality
   * @private
   */
  prophetForecast(data, steps) {
    // Simplified Prophet using seasonal decomposition
    const components = this.decomposeTimeSeries(data);
    const { trend, seasonal } = components;

    const forecast = [];
    const lastTrend = trend[trend.length - 1];
    const seasonalFactor = seasonal.length > 0 ? seasonal[seasonal.length - 1] : 0;

    for (let i = 0; i < steps; i++) {
      // Trend component (linear extrapolation)
      const trendComponent = lastTrend + (i * 0.001);

      // Seasonal component (repeat pattern)
      const dayOfCycle = i % Math.max(7, seasonal.length);
      const seasonalComponent = seasonal[dayOfCycle] || seasonalFactor;

      const nextValue = data[data.length - 1] + trendComponent + seasonalComponent;
      const clipped = Math.max(0, Math.min(1, nextValue));

      forecast.push({
        day: i + 1,
        forecast: clipped,
        lower: clipped - 0.025,
        upper: clipped + 0.025
      });
    }

    return forecast;
  }

  /**
   * Hybrid forecasting (ensemble)
   * @private
   */
  hybridForecast(data, steps) {
    const arima = this.arimaForecast(data, steps);
    const exponential = this.exponentialSmoothing(data, steps);
    const prophet = this.prophetForecast(data, steps);

    // Average the three forecasts
    const hybrid = [];

    for (let i = 0; i < steps; i++) {
      const avgForecast =
        (arima[i].forecast + exponential[i].forecast + prophet[i].forecast) / 3;
      const avgLower =
        (arima[i].lower + exponential[i].lower + prophet[i].lower) / 3;
      const avgUpper =
        (arima[i].upper + exponential[i].upper + prophet[i].upper) / 3;

      hybrid.push({
        day: i + 1,
        forecast: avgForecast,
        lower: avgLower,
        upper: avgUpper,
        components: {
          arima: arima[i].forecast,
          exponential: exponential[i].forecast,
          prophet: prophet[i].forecast
        }
      });
    }

    return hybrid;
  }

  /**
   * Decompose time series into trend and seasonal
   * @private
   */
  decomposeTimeSeries(data) {
    // Calculate trend using moving average
    const window = Math.min(7, Math.floor(data.length / 4));
    const trend = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const avg = data.slice(start, end).reduce((a, b) => a + b, 0) / (end - start);
      trend.push(avg);
    }

    // Extract seasonal component
    const detrended = data.map((d, i) => d - trend[i]);
    const seasonal = this.extractSeasonal(detrended);

    return {
      trend,
      seasonal,
      remainder: data.map((d, i) => d - trend[i] - (seasonal[i % seasonal.length] || 0))
    };
  }

  /**
   * Extract seasonal pattern
   * @private
   */
  extractSeasonal(data) {
    const period = 7; // Weekly seasonality
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    for (let i = 0; i < data.length; i++) {
      const dayOfWeek = i % period;
      seasonal[dayOfWeek] += data[i];
      counts[dayOfWeek]++;
    }

    return seasonal.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0));
  }

  /**
   * Add confidence intervals
   * @private
   */
  addConfidenceIntervals(forecast, historicalData, confidenceLevel) {
    const residuals = this.calculateResiduals(historicalData);
    const stdError = this.calculateStdDev(residuals);

    // Z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);

    return forecast.map(f => ({
      ...f,
      lower: Math.max(0, f.forecast - zScore * stdError),
      upper: Math.min(1, f.forecast + zScore * stdError),
      margin: zScore * stdError
    }));
  }

  /**
   * Select best algorithm
   * @private
   */
  selectBestAlgorithm(data) {
    // Analyze data characteristics
    const components = this.decomposeTimeSeries(data);
    const seasonalStrength = this.calculateSeasonalStrength(components.seasonal);
    const trendStrength = this.calculateTrendStrength(components.trend);

    if (seasonalStrength > 0.3) {
      return 'prophet'; // Prophet handles seasonality well
    }

    if (trendStrength > 0.5) {
      return 'arima'; // ARIMA for strong trends
    }

    return 'exponential'; // Default to exponential
  }

  /**
   * Generate recommendations
   * @private
   */
  generateRecommendations(forecast, historicalData, components) {
    const recommendations = [];
    const latestValidation = forecast[forecast.length - 1].forecast;
    const currentValidation = historicalData[historicalData.length - 1].validationRate || 0.9;

    // Trend analysis
    const trendDelta = latestValidation - currentValidation;

    if (trendDelta < -0.05) {
      recommendations.push({
        type: 'urgent',
        message: `Validation rate will drop below ${(latestValidation * 100).toFixed(1)}%`,
        action: 'Schedule immediate revalidation',
        timeline: 'Within 7 days'
      });
    } else if (trendDelta < -0.02) {
      recommendations.push({
        type: 'warning',
        message: `Slight decline in validation rate predicted`,
        action: 'Plan revalidation within next 14 days',
        timeline: '7-14 days'
      });
    }

    // Seasonality detection
    if (components.seasonal && components.seasonal.length > 0) {
      const maxSeasonal = Math.max(...components.seasonal);
      if (maxSeasonal > 0.05) {
        recommendations.push({
          type: 'info',
          message: 'Strong seasonal pattern detected',
          action: 'Account for seasonal variations in send strategy',
          timeline: 'Ongoing'
        });
      }
    }

    // Confidence check
    const lastForecast = forecast[forecast.length - 1];
    if (lastForecast.margin > 0.05) {
      recommendations.push({
        type: 'caution',
        message: 'High forecast uncertainty',
        action: 'Wait for more data before major decisions',
        timeline: 'Next 7 days'
      });
    }

    return recommendations.length > 0
      ? recommendations
      : [
          {
            type: 'ok',
            message: 'Validation rate expected to remain stable',
            action: 'Continue current validation schedule',
            timeline: 'Ongoing'
          }
        ];
  }

  /**
   * Calculate accuracy metrics
   * @private
   */
  calculateAccuracy(forecast, actualData) {
    if (!actualData || actualData.length === 0) return null;

    let sumAbsError = 0;
    let sumAbsPercError = 0;

    for (let i = 0; i < Math.min(forecast.length, actualData.length); i++) {
      const predicted = forecast[i].forecast;
      const actual = actualData[i];

      sumAbsError += Math.abs(predicted - actual);
      if (actual !== 0) {
        sumAbsPercError += Math.abs((predicted - actual) / actual);
      }
    }

    const mae = sumAbsError / Math.min(forecast.length, actualData.length);
    const mape = sumAbsPercError / Math.min(forecast.length, actualData.length);

    return {
      mae,
      mape,
      rmse: Math.sqrt(
        actualData.slice(0, Math.min(forecast.length, actualData.length))
          .reduce((sum, actual, i) => {
            return sum + Math.pow(forecast[i].forecast - actual, 2);
          }, 0) / Math.min(forecast.length, actualData.length)
      )
    };
  }

  /**
   * Get forecast for specific list
   */
  getForecast(listId) {
    return this.forecasts.get(listId);
  }

  /**
   * Compare forecasts
   */
  compareForecasts(listId, algorithms) {
    const history = this.history.get(listId);
    if (!history) return null;

    const validationRates = history.map(d => d.validationRate || 0.9);
    const comparisons = {};

    algorithms.forEach(algo => {
      let forecast;
      switch (algo) {
        case 'arima':
          forecast = this.arimaForecast(validationRates, this.config.horizonDays);
          break;
        case 'exponential':
          forecast = this.exponentialSmoothing(validationRates, this.config.horizonDays);
          break;
        case 'prophet':
          forecast = this.prophetForecast(validationRates, this.config.horizonDays);
          break;
      }

      comparisons[algo] = forecast;
    });

    return comparisons;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      totalForecasts: this.stats.totalForecasts,
      averageMAPE: this.stats.averageMAPE,
      modelsTracked: this.forecasts.size
    };
  }

  // ============ PRIVATE HELPERS ============

  differenceData(data) {
    const diff = [];
    for (let i = 1; i < data.length; i++) {
      diff.push(data[i] - data[i - 1]);
    }
    return diff;
  }

  estimateTrend(data) {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  calculateResiduals(data) {
    // Simple residuals: difference from mean
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.map(d => d - mean);
  }

  calculateStdDev(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  getZScore(confidenceLevel) {
    const scores = {
      0.68: 1,
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return scores[confidenceLevel] || 1.96;
  }

  calculateSeasonalStrength(seasonal) {
    if (!seasonal || seasonal.length === 0) return 0;
    const variance = this.calculateStdDev(seasonal);
    return variance;
  }

  calculateTrendStrength(trend) {
    if (!trend || trend.length === 0) return 0;
    const diff = this.differenceData(trend);
    return Math.abs(this.estimateTrend(diff));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValidationForecaster;
}

if (typeof window !== 'undefined') {
  window.ValidationForecaster = ValidationForecaster;
}
