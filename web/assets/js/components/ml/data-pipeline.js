/**
 * Data Pipeline - Extract and engineer features from email data
 *
 * Features:
 * - Data source connectors (CSV, JSON, API)
 * - Feature extraction engine
 * - Data normalization and scaling
 * - Missing value handling
 * - Outlier detection
 * - Batch and streaming modes
 *
 * @module data-pipeline
 */

class DataPipeline {
  constructor(options = {}) {
    this.config = {
      enableValidation: options.enableValidation !== false,
      enableNormalization: options.enableNormalization !== false,
      enableOutlierDetection: options.enableOutlierDetection !== false,
      outlierThreshold: options.outlierThreshold || 3, // Standard deviations
      missingValueStrategy: options.missingValueStrategy || 'mean', // mean, median, drop, constant
      constantValue: options.constantValue || 0,
      enableAugmentation: options.enableAugmentation !== false,
      batchSize: options.batchSize || 32,
      ...options
    };

    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      totalOutliers: 0,
      totalMissing: 0,
      totalAugmented: 0,
      averageProcessingTime: 0
    };

    this.featureDefinitions = new Map(); // Feature metadata
    this.normalizers = new Map(); // Stored normalization params

    console.log('📊 Data Pipeline initialized', this.config);
  }

  /**
   * Define features for a data type
   * @param {string} dataType - Type of data (email, company, engagement)
   * @param {array} features - Array of feature definitions
   */
  defineFeatures(dataType, features) {
    const featureDefs = {};

    features.forEach(f => {
      featureDefs[f.name] = {
        name: f.name,
        type: f.type || 'numeric', // numeric, categorical, text, boolean
        description: f.description || '',
        required: f.required !== false,
        transform: f.transform || null, // Custom transformation function
        missingValue: f.missingValue || null,
        scale: f.scale || null, // { min, max } for scaling
        categories: f.categories || null, // For categorical
        extractFn: f.extractFn || null, // Function to extract from raw data
        minValue: f.minValue || null,
        maxValue: f.maxValue || null
      };
    });

    this.featureDefinitions.set(dataType, featureDefs);
    console.log(`✅ Defined ${features.length} features for ${dataType}`);
  }

  /**
   * Extract features from email data
   * @param {object} emailData - Email object
   * @returns {object} Extracted features
   */
  extractEmailFeatures(emailData) {
    const features = {
      // Email structure features
      localPartLength: emailData.localPart?.length || 0,
      domainLength: emailData.domain?.length || 0,
      hasNumbers: /\d/.test(emailData.email) ? 1 : 0,
      hasSpecialChars: /[!#$%&'*+/=?^_`{|}~]/.test(emailData.localPart) ? 1 : 0,
      hasConsecutiveDots: emailData.email.includes('..') ? 1 : 0,
      hasUpperCase: /[A-Z]/.test(emailData.localPart) ? 1 : 0,
      hasUnderscore: emailData.localPart.includes('_') ? 1 : 0,
      hasDot: emailData.localPart.includes('.') ? 1 : 0,

      // Domain features
      domainTLD: this.getTLD(emailData.domain) || '',
      domainAge: this.estimateDomainAge(emailData.domain),
      isFreeDomain: this.isFreeDomain(emailData.domain) ? 1 : 0,
      isCorporateDomain: this.isCorporateDomain(emailData.domain) ? 1 : 0,
      domainPopularity: this.getDomainPopularity(emailData.domain) || 0,

      // List source features (if available)
      sourceQuality: emailData.sourceQuality || 0.5,
      listAge: emailData.listAge || 0,
      validationStatus: this.encodeValidationStatus(emailData.validationStatus),
      previousBounceRate: emailData.previousBounceRate || 0,
      previousComplaintRate: emailData.previousComplaintRate || 0,

      // Engagement features (if available)
      engagementScore: emailData.engagementScore || 0,
      openRate: emailData.openRate || 0,
      clickRate: emailData.clickRate || 0,
      conversionRate: emailData.conversionRate || 0
    };

    return features;
  }

  /**
   * Extract company intelligence features
   * @param {object} companyData - Company information
   * @returns {object} Extracted features
   */
  extractCompanyFeatures(companyData) {
    const features = {
      // Company size
      companySize: this.encodeCompanySize(companyData.size),

      // Industry match
      industryMatch: companyData.industryMatch ? 1 : 0,
      industryScore: companyData.industryScore || 0,

      // Growth signals
      hasGrowthSignals: companyData.hasGrowthSignals ? 1 : 0,
      growthScore: companyData.growthScore || 0,
      recentFunding: companyData.recentFunding ? 1 : 0,

      // Geographic
      targetCountry: companyData.country === this.config.targetCountry ? 1 : 0,
      targetRegion: companyData.region === this.config.targetRegion ? 1 : 0,

      // Market position
      isMarketLeader: companyData.isMarketLeader ? 1 : 0,
      marketShare: companyData.marketShare || 0,

      // Reputation
      hasNegativeIndicators: companyData.hasNegativeIndicators ? 1 : 0,
      trustScore: companyData.trustScore || 0.5
    };

    return features;
  }

  /**
   * Process raw data through pipeline
   * @param {array} rawData - Array of raw data objects
   * @param {string} dataType - Type of data
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processed data
   */
  async processBatch(rawData, dataType = 'email', options = {}) {
    const startTime = Date.now();

    try {
      console.log(`📥 Processing batch: ${rawData.length} records of type '${dataType}'`);

      // Step 1: Extract features
      const features = rawData.map(item => {
        switch (dataType) {
          case 'email':
            return this.extractEmailFeatures(item);
          case 'company':
            return this.extractCompanyFeatures(item);
          default:
            return item;
        }
      });

      // Step 2: Handle missing values
      const withoutMissing = this.handleMissingValues(features);

      // Step 3: Detect and handle outliers
      const withoutOutliers = this.config.enableOutlierDetection
        ? this.detectOutliers(withoutMissing)
        : withoutMissing;

      // Step 4: Normalize/Scale features
      const normalized = this.config.enableNormalization
        ? this.normalizeFeatures(withoutOutliers, dataType)
        : withoutOutliers;

      // Step 5: Augment if needed
      const augmented = this.config.enableAugmentation && options.augment
        ? this.augmentData(normalized)
        : normalized;

      // Step 6: Validate
      if (this.config.enableValidation) {
        this.validateData(augmented, dataType);
      }

      const processingTime = Date.now() - startTime;
      this.stats.totalProcessed += augmented.length;
      this.stats.averageProcessingTime =
        (this.stats.averageProcessingTime * (this.stats.totalProcessed - augmented.length) +
          processingTime) /
        this.stats.totalProcessed;

      console.log(
        `✅ Batch processed: ${augmented.length} records in ${processingTime}ms`
      );

      return {
        data: augmented,
        features: Object.keys(features[0] || {}),
        processedCount: augmented.length,
        processingTime,
        outliers: this.stats.totalOutliers,
        missingHandled: this.stats.totalMissing
      };

    } catch (error) {
      this.stats.totalErrors++;
      console.error('❌ Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Stream processing for large datasets
   * @param {function} dataSource - Async generator or function that yields data
   * @param {string} dataType - Type of data
   * @param {function} onBatch - Callback for each batch
   */
  async *streamProcess(dataSource, dataType = 'email', onBatch = null) {
    let batchCount = 0;

    for await (const item of dataSource) {
      const batch = Array.isArray(item) ? item : [item];
      const processed = await this.processBatch(batch, dataType);

      if (onBatch) {
        onBatch({
          batchNumber: batchCount++,
          processed,
          totalProcessed: this.stats.totalProcessed
        });
      }

      yield processed;
    }
  }

  /**
   * Load data from various sources
   * @param {string} source - URL or path
   * @param {string} format - Format (csv, json, jsonl)
   * @returns {Promise<array>} Loaded data
   */
  async loadData(source, format = 'json') {
    try {
      console.log(`📂 Loading data from ${source} (${format})`);

      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.statusText}`);

      const text = await response.text();

      let data;
      switch (format.toLowerCase()) {
        case 'json':
          data = JSON.parse(text);
          break;

        case 'jsonl':
          data = text
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
          break;

        case 'csv':
          data = this.parseCSV(text);
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      console.log(`✅ Loaded ${Array.isArray(data) ? data.length : 1} records`);
      return Array.isArray(data) ? data : [data];

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV text
   * @private
   */
  parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });

      data.push(obj);
    }

    return data;
  }

  /**
   * Handle missing values
   * @private
   */
  handleMissingValues(data) {
    return data.map(record => {
      const cleaned = { ...record };

      for (const [key, value] of Object.entries(cleaned)) {
        if (value === null || value === undefined || value === '') {
          this.stats.totalMissing++;

          switch (this.config.missingValueStrategy) {
            case 'mean':
              cleaned[key] = this.calculateMean(data, key);
              break;
            case 'median':
              cleaned[key] = this.calculateMedian(data, key);
              break;
            case 'drop':
              // Mark for removal
              cleaned._remove = true;
              break;
            case 'constant':
              cleaned[key] = this.config.constantValue;
              break;
            default:
              cleaned[key] = 0;
          }
        }
      }

      return cleaned;
    }).filter(r => !r._remove);
  }

  /**
   * Detect outliers using Z-score method
   * @private
   */
  detectOutliers(data) {
    const numericKeys = this.getNumericKeys(data[0]);

    return data.filter(record => {
      for (const key of numericKeys) {
        const value = record[key];
        const mean = this.calculateMean(data, key);
        const std = this.calculateStdDev(data, key, mean);

        if (std > 0) {
          const zScore = Math.abs((value - mean) / std);
          if (zScore > this.config.outlierThreshold) {
            this.stats.totalOutliers++;
            console.warn(`⚠️  Outlier detected in ${key}: ${value}`);
            return false; // Remove outlier
          }
        }
      }

      return true;
    });
  }

  /**
   * Normalize features
   * @private
   */
  normalizeFeatures(data, dataType) {
    // Min-max normalization
    return data.map(record => {
      const normalized = { ...record };
      const numericKeys = this.getNumericKeys(record);

      for (const key of numericKeys) {
        const min = this.getMinValue(data, key);
        const max = this.getMaxValue(data, key);

        if (max > min) {
          normalized[key] = (record[key] - min) / (max - min);
        } else {
          normalized[key] = 0;
        }
      }

      return normalized;
    });
  }

  /**
   * Data augmentation for training
   * @private
   */
  augmentData(data) {
    const augmented = [];

    data.forEach(record => {
      augmented.push(record); // Original

      // Add slightly modified copies
      for (let i = 0; i < 2; i++) {
        const modified = { ...record };
        const numericKeys = this.getNumericKeys(record);

        numericKeys.forEach(key => {
          const noise = (Math.random() - 0.5) * 0.1; // ±5% noise
          modified[key] = record[key] + noise;
        });

        augmented.push(modified);
        this.stats.totalAugmented++;
      }
    });

    return augmented;
  }

  /**
   * Validate data quality
   * @private
   */
  validateData(data, dataType) {
    let errors = 0;

    data.forEach((record, index) => {
      // Check for NaN values
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'number' && isNaN(value)) {
          console.warn(`NaN in record ${index}, field ${key}`);
          errors++;
        }

        // Check for infinite values
        if (typeof value === 'number' && !isFinite(value)) {
          console.warn(`Infinite value in record ${index}, field ${key}`);
          errors++;
        }
      }
    });

    if (errors > 0) {
      console.warn(`⚠️  Data validation found ${errors} issues`);
    }
  }

  /**
   * Get statistics about processed data
   */
  getStatistics() {
    return {
      totalProcessed: this.stats.totalProcessed,
      totalErrors: this.stats.totalErrors,
      totalOutliers: this.stats.totalOutliers,
      totalMissing: this.stats.totalMissing,
      totalAugmented: this.stats.totalAugmented,
      averageProcessingTime: this.stats.averageProcessingTime,
      outlierPercentage: (this.stats.totalOutliers / this.stats.totalProcessed) * 100,
      errorRate: (this.stats.totalErrors / this.stats.totalProcessed) * 100
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      totalOutliers: 0,
      totalMissing: 0,
      totalAugmented: 0,
      averageProcessingTime: 0
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  getTLD(domain) {
    if (!domain) return null;
    const parts = domain.split('.');
    return parts[parts.length - 1] || null;
  }

  estimateDomainAge(domain) {
    // Placeholder: would check domain registry
    return 5; // years
  }

  isFreeDomain(domain) {
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return freeDomains.some(d => domain.endsWith(d));
  }

  isCorporateDomain(domain) {
    return !this.isFreeDomain(domain) && domain.includes('.');
  }

  getDomainPopularity(domain) {
    // Placeholder: would use domain reputation service
    return Math.random();
  }

  encodeValidationStatus(status) {
    const mapping = {
      valid: 1,
      invalid: 0,
      unknown: 0.5,
      risky: 0.25
    };
    return mapping[status] || 0.5;
  }

  encodeCompanySize(size) {
    const mapping = {
      startup: 1,
      'small': 2,
      'medium': 3,
      'large': 4,
      'enterprise': 5
    };
    return mapping[size] || 2.5;
  }

  calculateMean(data, key) {
    const values = data
      .map(r => r[key])
      .filter(v => typeof v === 'number');
    return values.reduce((a, b) => a + b, 0) / values.length || 0;
  }

  calculateMedian(data, key) {
    const values = data
      .map(r => r[key])
      .filter(v => typeof v === 'number')
      .sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values[mid] || 0;
  }

  calculateStdDev(data, key, mean) {
    const values = data.map(r => r[key]).filter(v => typeof v === 'number');
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  getNumericKeys(record) {
    return Object.keys(record).filter(
      k => typeof record[k] === 'number' && !k.startsWith('_')
    );
  }

  getMinValue(data, key) {
    return Math.min(...data.map(r => r[key]).filter(v => typeof v === 'number'));
  }

  getMaxValue(data, key) {
    return Math.max(...data.map(r => r[key]).filter(v => typeof v === 'number'));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataPipeline;
}

if (typeof window !== 'undefined') {
  window.DataPipeline = DataPipeline;
}
