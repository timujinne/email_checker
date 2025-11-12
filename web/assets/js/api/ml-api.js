/**
 * ML API Endpoints - REST API for ML model predictions and integrations
 *
 * Endpoints:
 * - POST /api/ml/predict/email-quality
 * - POST /api/ml/detect-anomalies
 * - POST /api/ml/score-leads
 * - POST /api/ml/forecast/validation
 * - POST /api/ml/forecast/campaign
 * - GET /api/ml/models
 * - POST /api/ml/train
 * - GET /api/ml/metrics/:model_id
 *
 * @module ml-api
 */

class MLApi {
  constructor(baseUrl = '/api/ml') {
    this.baseUrl = baseUrl;
    this.modelManager = null;
    this.classifiers = new Map();
    this.forecasters = new Map();

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };

    console.log('📡 ML API initialized');
  }

  /**
   * Initialize API with model instances
   */
  initialize(modelManager, classifiers = {}, forecasters = {}) {
    this.modelManager = modelManager;
    this.classifiers = new Map(Object.entries(classifiers));
    this.forecasters = new Map(Object.entries(forecasters));
    console.log('✅ ML API models initialized');
  }

  /**
   * POST /api/ml/predict/email-quality
   * Predict email quality score
   */
  async predictEmailQuality(req) {
    const startTime = Date.now();

    try {
      const { email, emailData, options } = req;

      if (!email && !emailData) {
        return this.error('Email or emailData required', 400);
      }

      const classifier = this.classifiers.get('EmailQualityClassifier');
      if (!classifier) {
        return this.error('Email Quality Classifier not available', 503);
      }

      const emailObject = emailData || { email };
      const prediction = await classifier.predict(emailObject, options);

      return this.success({
        data: prediction,
        model: 'EmailQualityClassifier',
        version: classifier.version,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * POST /api/ml/detect-anomalies
   * Detect anomalies in email list
   */
  async detectAnomalies(req) {
    const startTime = Date.now();

    try {
      const { emails, options } = req;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return this.error('Emails array required', 400);
      }

      const detector = this.classifiers.get('AnomalyDetector');
      if (!detector) {
        return this.error('Anomaly Detector not available', 503);
      }

      const result = await detector.detectAnomalies(emails, options);

      return this.success({
        data: result,
        model: 'AnomalyDetector',
        version: detector.version,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * POST /api/ml/score-leads
   * Score and rank leads
   */
  async scoreLeads(req) {
    const startTime = Date.now();

    try {
      const { leads, profile, options } = req;

      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return this.error('Leads array required', 400);
      }

      const scorer = this.classifiers.get('LeadScoringEngine');
      if (!scorer) {
        return this.error('Lead Scoring Engine not available', 503);
      }

      const result = scorer.scoreLeads(leads, profile);

      // Add pagination support
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 100;
      const startIdx = (page - 1) * pageSize;
      const endIdx = startIdx + pageSize;

      return this.success({
        data: result.leads.slice(startIdx, endIdx),
        statistics: result.statistics,
        pagination: {
          page,
          pageSize,
          total: result.leads.length,
          totalPages: Math.ceil(result.leads.length / pageSize)
        },
        model: 'LeadScoringEngine',
        version: scorer.version,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * POST /api/ml/forecast/validation
   * Forecast validation metrics
   */
  async forecastValidation(req) {
    const startTime = Date.now();

    try {
      const { listId, historicalData, options } = req;

      if (!listId || !historicalData || !Array.isArray(historicalData)) {
        return this.error('listId and historicalData array required', 400);
      }

      const forecaster = this.forecasters.get('ValidationForecaster');
      if (!forecaster) {
        return this.error('Validation Forecaster not available', 503);
      }

      const forecast = await forecaster.forecast(listId, historicalData, options);

      return this.success({
        data: forecast,
        model: 'ValidationForecaster',
        version: forecaster.version,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * POST /api/ml/forecast/campaign
   * Forecast campaign performance
   */
  async forecastCampaign(req) {
    const startTime = Date.now();

    try {
      const { campaignData } = req;

      if (!campaignData) {
        return this.error('campaignData required', 400);
      }

      const predictor = this.forecasters.get('CampaignPredictor');
      if (!predictor) {
        return this.error('Campaign Predictor not available', 503);
      }

      const prediction = predictor.predictCampaignPerformance(campaignData);

      return this.success({
        data: prediction,
        model: 'CampaignPredictor',
        version: predictor.version,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * GET /api/ml/models
   * List all available models
   */
  async getModels() {
    try {
      const models = [];

      // Add classifiers
      for (const [name, classifier] of this.classifiers) {
        if (classifier.getStatistics) {
          models.push({
            id: name,
            name: classifier.modelName,
            version: classifier.version,
            type: 'classifier',
            statistics: classifier.getStatistics()
          });
        }
      }

      // Add forecasters
      for (const [name, forecaster] of this.forecasters) {
        if (forecaster.getStatistics) {
          models.push({
            id: name,
            name: forecaster.modelName,
            version: forecaster.version,
            type: 'forecaster',
            statistics: forecaster.getStatistics()
          });
        }
      }

      return this.success({
        models,
        count: models.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * POST /api/ml/train
   * Start model training job (async)
   */
  async trainModel(req) {
    const startTime = Date.now();

    try {
      const { modelType, datasetId, options } = req;

      if (!modelType || !datasetId) {
        return this.error('modelType and datasetId required', 400);
      }

      // Generate job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In production, this would queue the job
      const job = {
        id: jobId,
        modelType,
        datasetId,
        status: 'queued',
        startTime: new Date().toISOString(),
        eta: new Date(Date.now() + 3600000).toISOString(), // 1 hour estimate
        progress: 0
      };

      console.log(`📚 Training job queued: ${jobId}`);

      return this.success({
        job,
        message: 'Training job queued',
        pollUrl: `/api/ml/train/${jobId}/status`,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * GET /api/ml/metrics/:modelId
   * Get model performance metrics
   */
  async getModelMetrics(modelId) {
    try {
      // Check classifiers
      if (this.classifiers.has(modelId)) {
        const model = this.classifiers.get(modelId);
        return this.success({
          modelId,
          metrics: model.getStatistics ? model.getStatistics() : {},
          type: 'classifier'
        });
      }

      // Check forecasters
      if (this.forecasters.has(modelId)) {
        const model = this.forecasters.get(modelId);
        return this.success({
          modelId,
          metrics: model.getStatistics ? model.getStatistics() : {},
          type: 'forecaster'
        });
      }

      return this.error(`Model not found: ${modelId}`, 404);

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * Batch prediction endpoint
   */
  async batchPredict(req) {
    const startTime = Date.now();

    try {
      const { model, items, options } = req;

      if (!model || !items || !Array.isArray(items)) {
        return this.error('model and items array required', 400);
      }

      const classifier = this.classifiers.get(model);
      if (!classifier || !classifier.batchPredict) {
        return this.error(`Batch prediction not available for ${model}`, 503);
      }

      const predictions = await classifier.batchPredict(items, options?.onProgress);

      return this.success({
        data: predictions,
        model,
        count: predictions.length,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * Export predictions
   */
  async exportPredictions(req) {
    try {
      const { predictions, format } = req;

      if (!predictions || !Array.isArray(predictions)) {
        return this.error('predictions array required', 400);
      }

      let exported;

      switch (format || 'json') {
        case 'csv':
          exported = this.convertToCSV(predictions);
          break;
        case 'json':
        default:
          exported = JSON.stringify(predictions, null, 2);
      }

      return this.success({
        data: exported,
        format: format || 'json',
        recordCount: predictions.length
      });

    } catch (error) {
      return this.error(error.message, 500);
    }
  }

  /**
   * Health check
   */
  async health() {
    return this.success({
      status: 'operational',
      models: {
        classifiers: this.classifiers.size,
        forecasters: this.forecasters.size
      },
      timestamp: new Date().toISOString()
    });
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Success response
   * @private
   */
  success(data) {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;

    return {
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Error response
   * @private
   */
  error(message, statusCode = 500) {
    this.stats.totalRequests++;
    this.stats.failedRequests++;

    return {
      success: false,
      error: message,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Convert to CSV
   * @private
   */
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(obj =>
      headers.map(header => {
        const value = obj[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get API statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
        : 0
    };
  }
}

/**
 * Express/HTTP Router for ML API
 * Usage with Express:
 * const app = express();
 * const mlRouter = new MLApiRouter(mlApi);
 * app.use('/api/ml', mlRouter.getRouter());
 */

class MLApiRouter {
  constructor(mlApi) {
    this.mlApi = mlApi;
  }

  /**
   * Handle incoming requests
   */
  async handleRequest(method, path, body) {
    try {
      // Route handling
      if (method === 'POST' && path === '/predict/email-quality') {
        return await this.mlApi.predictEmailQuality(body);
      }

      if (method === 'POST' && path === '/detect-anomalies') {
        return await this.mlApi.detectAnomalies(body);
      }

      if (method === 'POST' && path === '/score-leads') {
        return await this.mlApi.scoreLeads(body);
      }

      if (method === 'POST' && path === '/forecast/validation') {
        return await this.mlApi.forecastValidation(body);
      }

      if (method === 'POST' && path === '/forecast/campaign') {
        return await this.mlApi.forecastCampaign(body);
      }

      if (method === 'GET' && path === '/models') {
        return await this.mlApi.getModels();
      }

      if (method === 'POST' && path === '/train') {
        return await this.mlApi.trainModel(body);
      }

      if (method === 'GET' && path.match(/^\/metrics\/(.+)$/)) {
        const modelId = path.match(/^\/metrics\/(.+)$/)[1];
        return await this.mlApi.getModelMetrics(modelId);
      }

      if (method === 'POST' && path === '/batch-predict') {
        return await this.mlApi.batchPredict(body);
      }

      if (method === 'POST' && path === '/export') {
        return await this.mlApi.exportPredictions(body);
      }

      if (method === 'GET' && path === '/health') {
        return await this.mlApi.health();
      }

      return { success: false, error: 'Endpoint not found', statusCode: 404 };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: 500,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MLApi, MLApiRouter };
}

if (typeof window !== 'undefined') {
  window.MLApi = MLApi;
  window.MLApiRouter = MLApiRouter;
}
