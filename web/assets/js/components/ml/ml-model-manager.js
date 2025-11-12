/**
 * ML Model Manager - Central system for loading, managing, and versioning ML models
 *
 * Features:
 * - Model registry and lifecycle management
 * - Model loading with caching
 * - Model versioning and rollback
 * - Performance metrics tracking
 * - A/B testing framework
 *
 * @module ml-model-manager
 * @requires ./ml-metrics-tracker.js
 */

class MLModelManager {
  constructor(options = {}) {
    this.models = new Map(); // modelName -> { model, metadata, version, stats }
    this.modelCache = new Map(); // For inference result caching
    this.modelVersions = new Map(); // modelName -> [versions]
    this.activeVersions = new Map(); // modelName -> active version
    this.loadingPromises = new Map(); // Track loading operations
    this.metricsTracker = null;

    // Configuration
    this.config = {
      enableCaching: options.enableCaching !== false,
      cacheTTL: options.cacheTTL || 3600000, // 1 hour default
      maxCacheSize: options.maxCacheSize || 1000,
      enableMetrics: options.enableMetrics !== false,
      autoBackup: options.autoBackup !== false,
      backupPath: options.backupPath || 'models/backups',
      ...options
    };

    // Event system for model updates
    this.listeners = {
      modelLoaded: [],
      modelFailed: [],
      modelSwitched: [],
      versionCreated: [],
      metricsUpdated: []
    };

    // Statistics
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalInferences: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      averageInferenceTime: 0
    };

    console.log('🤖 ML Model Manager initialized', this.config);
  }

  /**
   * Register a new model
   * @param {string} name - Model name
   * @param {object} model - Model object (weights, architecture)
   * @param {object} metadata - Model metadata
   * @param {string} version - Version string (semantic versioning)
   */
  registerModel(name, model, metadata = {}, version = '1.0.0') {
    if (!name || !model) {
      throw new Error('Model name and model object are required');
    }

    const modelEntry = {
      name,
      model,
      metadata: {
        name: metadata.name || name,
        description: metadata.description || '',
        author: metadata.author || 'System',
        type: metadata.type || 'unknown', // classification, regression, clustering, anomaly
        inputShape: metadata.inputShape || null,
        outputShape: metadata.outputShape || null,
        accuracy: metadata.accuracy || null,
        precision: metadata.precision || null,
        recall: metadata.recall || null,
        f1Score: metadata.f1Score || null,
        ...metadata
      },
      version,
      createdAt: new Date().toISOString(),
      stats: {
        inferenceCount: 0,
        totalInferenceTime: 0,
        averageInferenceTime: 0,
        errors: 0,
        lastUsed: null
      }
    };

    // Store model
    this.models.set(name, modelEntry);

    // Track versions
    if (!this.modelVersions.has(name)) {
      this.modelVersions.set(name, []);
    }
    this.modelVersions.get(name).push({
      version,
      timestamp: new Date().toISOString(),
      metadata: modelEntry.metadata
    });

    // Set as active if first version
    if (!this.activeVersions.has(name)) {
      this.activeVersions.set(name, version);
    }

    this.stats.totalLoaded++;
    this.emit('modelLoaded', { name, version, metadata: modelEntry.metadata });

    console.log(`✅ Model registered: ${name}@${version}`);
    return modelEntry;
  }

  /**
   * Load a model from remote source or local storage
   * @param {string} name - Model name
   * @param {string} source - URL or path to model
   * @param {string} version - Version to load
   * @returns {Promise<object>} Loaded model
   */
  async loadModel(name, source, version = 'latest') {
    // Check if already loading
    const loadingKey = `${name}:${version}`;
    if (this.loadingPromises.has(loadingKey)) {
      return this.loadingPromises.get(loadingKey);
    }

    const loadPromise = (async () => {
      const startTime = Date.now();

      try {
        // Try to load from cache first
        if (this.config.enableCaching && this.models.has(name)) {
          const cached = this.models.get(name);
          if (version === 'latest' || cached.version === version) {
            console.log(`📦 Model loaded from cache: ${name}@${version}`);
            return cached;
          }
        }

        // Load from source
        console.log(`📥 Loading model: ${name} from ${source}`);
        const response = await fetch(source);

        if (!response.ok) {
          throw new Error(`Failed to load model: ${response.statusText}`);
        }

        const modelData = await response.json();

        // Register loaded model
        const model = this.registerModel(
          name,
          modelData,
          modelData.metadata || {},
          version
        );

        // Cache model weights if needed
        if (this.config.enableCaching) {
          this.cacheModel(name, modelData);
        }

        const loadTime = Date.now() - startTime;
        this.updateLoadTimeStats(loadTime);

        console.log(`✅ Model loaded successfully: ${name} (${loadTime}ms)`);
        return model;

      } catch (error) {
        this.stats.totalFailed++;
        this.emit('modelFailed', { name, version, error: error.message });
        console.error(`❌ Failed to load model ${name}:`, error);
        throw error;
      } finally {
        this.loadingPromises.delete(loadingKey);
      }
    })();

    this.loadingPromises.set(loadingKey, loadPromise);
    return loadPromise;
  }

  /**
   * Run inference with a model
   * @param {string} name - Model name
   * @param {array|object} input - Input data
   * @param {object} options - Inference options
   * @returns {Promise<object>} Prediction result
   */
  async predict(name, input, options = {}) {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(name, input);
    if (this.config.enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }

    this.stats.cacheMisses++;

    try {
      // Get active model
      const model = this.getModel(name);
      if (!model) {
        throw new Error(`Model not found: ${name}`);
      }

      // Run inference
      const prediction = await this.runInference(model, input, options);

      // Update statistics
      const inferenceTime = Date.now() - startTime;
      this.updateInferenceStats(name, inferenceTime);

      // Cache result
      if (this.config.enableCaching) {
        this.cacheResult(cacheKey, prediction, this.config.cacheTTL);
      }

      this.stats.totalInferences++;

      return {
        modelName: name,
        version: this.activeVersions.get(name),
        prediction,
        confidence: prediction.confidence || null,
        inferenceTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      model.stats.errors++;
      console.error(`❌ Inference failed for ${name}:`, error);
      throw error;
    }
  }

  /**
   * Run batch predictions
   * @param {string} name - Model name
   * @param {array} inputs - Array of inputs
   * @param {object} options - Options
   * @returns {Promise<array>} Array of predictions
   */
  async batchPredict(name, inputs, options = {}) {
    console.log(`📊 Running batch predictions: ${inputs.length} samples`);

    const predictions = [];
    const batchSize = options.batchSize || 32;
    const startTime = Date.now();

    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, Math.min(i + batchSize, inputs.length));

      const batchPredictions = await Promise.all(
        batch.map(input => this.predict(name, input, options))
      );

      predictions.push(...batchPredictions);

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          processed: Math.min(i + batchSize, inputs.length),
          total: inputs.length,
          percentage: Math.round((Math.min(i + batchSize, inputs.length) / inputs.length) * 100)
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Batch complete: ${predictions.length} predictions in ${totalTime}ms`);

    return {
      predictions,
      modelName: name,
      totalCount: predictions.length,
      totalTime,
      averageTime: totalTime / predictions.length
    };
  }

  /**
   * Switch to a different model version
   * @param {string} name - Model name
   * @param {string} version - Version to switch to
   * @returns {boolean} Success
   */
  switchVersion(name, version) {
    if (!this.models.has(name)) {
      throw new Error(`Model not found: ${name}`);
    }

    const versions = this.modelVersions.get(name) || [];
    const versionExists = versions.some(v => v.version === version);

    if (!versionExists && version !== 'latest') {
      throw new Error(`Version not found: ${version}`);
    }

    this.activeVersions.set(name, version);
    this.clearModelCache(name);

    this.emit('modelSwitched', { name, version });
    console.log(`🔄 Switched to version ${version} for model ${name}`);

    return true;
  }

  /**
   * Create a new model version
   * @param {string} name - Model name
   * @param {object} updatedModel - Updated model object
   * @param {string} newVersion - New version string
   * @returns {object} New model version
   */
  createVersion(name, updatedModel, newVersion) {
    const model = this.getModel(name);
    if (!model) {
      throw new Error(`Model not found: ${name}`);
    }

    // Update model data
    model.model = updatedModel;
    model.version = newVersion;
    model.updatedAt = new Date().toISOString();

    // Track version
    if (!this.modelVersions.has(name)) {
      this.modelVersions.set(name, []);
    }
    this.modelVersions.get(name).push({
      version: newVersion,
      timestamp: new Date().toISOString(),
      metadata: model.metadata
    });

    // Set as active
    this.activeVersions.set(name, newVersion);

    // Clear cache
    this.clearModelCache(name);

    this.emit('versionCreated', { name, version: newVersion });
    console.log(`✨ New version created: ${name}@${newVersion}`);

    return model;
  }

  /**
   * Rollback to previous version
   * @param {string} name - Model name
   * @param {string} version - Version to rollback to
   * @returns {object} Rolled back model
   */
  rollback(name, version) {
    const versions = this.modelVersions.get(name) || [];
    const versionData = versions.find(v => v.version === version);

    if (!versionData) {
      throw new Error(`Version not found: ${version}`);
    }

    console.log(`⏮️  Rolling back ${name} to version ${version}`);

    // In production, would load from backup
    this.switchVersion(name, version);

    return this.getModel(name);
  }

  /**
   * Get model statistics
   * @param {string} name - Model name (optional, all if not specified)
   * @returns {object} Statistics
   */
  getStatistics(name = null) {
    if (name) {
      const model = this.models.get(name);
      if (!model) return null;
      return model.stats;
    }

    // Return all models statistics
    const stats = {};
    for (const [modelName, model] of this.models) {
      stats[modelName] = model.stats;
    }

    return {
      models: stats,
      global: this.stats,
      cacheHitRate: this.stats.cacheMisses > 0
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100
        : 0
    };
  }

  /**
   * Get model information
   * @param {string} name - Model name
   * @returns {object} Model information
   */
  getModelInfo(name) {
    const model = this.models.get(name);
    if (!model) return null;

    return {
      name: model.name,
      version: model.version,
      activeVersion: this.activeVersions.get(name),
      metadata: model.metadata,
      versions: this.modelVersions.get(name) || [],
      stats: model.stats,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }

  /**
   * List all registered models
   * @returns {array} Array of model names
   */
  listModels() {
    return Array.from(this.models.keys());
  }

  /**
   * Check if model exists
   * @param {string} name - Model name
   * @returns {boolean} Model exists
   */
  hasModel(name) {
    return this.models.has(name);
  }

  /**
   * Clear all cached predictions
   */
  clearAllCache() {
    const cachedCount = this.modelCache.size;
    this.modelCache.clear();
    console.log(`🗑️  Cleared ${cachedCount} cached predictions`);
  }

  /**
   * Setup A/B testing between two model versions
   * @param {string} name - Model name
   * @param {string} versionA - Version A
   * @param {string} versionB - Version B
   * @param {number} splitRatio - Split ratio (0-1)
   * @returns {object} A/B test configuration
   */
  setupABTest(name, versionA, versionB, splitRatio = 0.5) {
    const model = this.getModel(name);
    if (!model) throw new Error(`Model not found: ${name}`);

    const testConfig = {
      modelName: name,
      versionA,
      versionB,
      splitRatio,
      startTime: Date.now(),
      resultsA: { correct: 0, total: 0, accuracy: 0 },
      resultsB: { correct: 0, total: 0, accuracy: 0 }
    };

    if (!this.abtests) {
      this.abtests = new Map();
    }

    this.abtests.set(`${name}:ab`, testConfig);
    console.log(`🧪 A/B test started: ${name} (${versionA} vs ${versionB})`);

    return testConfig;
  }

  /**
   * Get A/B test results
   * @param {string} name - Model name
   * @returns {object} Test results
   */
  getABTestResults(name) {
    if (!this.abtests) return null;
    return this.abtests.get(`${name}:ab`) || null;
  }

  // ============ PRIVATE METHODS ============

  /**
   * Get model by name
   * @private
   */
  getModel(name) {
    return this.models.get(name);
  }

  /**
   * Run inference on model
   * @private
   */
  async runInference(model, input, options) {
    // Implement based on model type
    // This is a placeholder - actual implementation depends on model architecture

    if (model.metadata.type === 'classification') {
      return {
        prediction: 0,
        confidence: 0.95,
        probabilities: [0.95, 0.05]
      };
    }

    return {
      prediction: Math.random(),
      confidence: 0.9
    };
  }

  /**
   * Get cache key for prediction
   * @private
   */
  getCacheKey(modelName, input) {
    // Simple hash function
    const inputStr = JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < inputStr.length; i++) {
      hash = ((hash << 5) - hash) + inputStr.charCodeAt(i);
      hash = hash & hash;
    }
    return `${modelName}:${hash}`;
  }

  /**
   * Cache result
   * @private
   */
  cacheResult(key, result, ttl) {
    if (this.modelCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.modelCache.keys().next().value;
      this.modelCache.delete(firstKey);
    }

    this.modelCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached result
   * @private
   */
  getFromCache(key) {
    const cached = this.modelCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.modelCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear model cache
   * @private
   */
  clearModelCache(modelName) {
    for (const [key] of this.modelCache) {
      if (key.startsWith(`${modelName}:`)) {
        this.modelCache.delete(key);
      }
    }
  }

  /**
   * Cache model weights
   * @private
   */
  cacheModel(name, modelData) {
    // In browser, use IndexedDB for large models
    if (window.indexedDB && modelData && modelData.weights) {
      // Store weights separately from metadata
      const weights = { modelName: name, weights: modelData.weights };
      // Implementation would use IndexedDB
    }
  }

  /**
   * Update load time statistics
   * @private
   */
  updateLoadTimeStats(loadTime) {
    this.stats.averageLoadTime =
      (this.stats.averageLoadTime * (this.stats.totalLoaded - 1) + loadTime) /
      this.stats.totalLoaded;
  }

  /**
   * Update inference statistics
   * @private
   */
  updateInferenceStats(modelName, inferenceTime) {
    const model = this.models.get(modelName);
    if (model) {
      model.stats.inferenceCount++;
      model.stats.totalInferenceTime += inferenceTime;
      model.stats.averageInferenceTime =
        model.stats.totalInferenceTime / model.stats.inferenceCount;
      model.stats.lastUsed = new Date().toISOString();

      this.stats.averageInferenceTime =
        (this.stats.averageInferenceTime * (this.stats.totalInferences - 1) + inferenceTime) /
        this.stats.totalInferences;
    }
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
  module.exports = MLModelManager;
}

// Global registration
if (typeof window !== 'undefined') {
  window.MLModelManager = MLModelManager;
}
