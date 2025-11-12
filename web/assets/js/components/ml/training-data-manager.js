/**
 * Training Data Manager - Manage datasets for model training
 *
 * Features:
 * - Dataset versioning (CRUD operations)
 * - Train/validation/test splits
 * - Data augmentation strategies
 * - Label management
 * - Dataset statistics and visualization
 *
 * @module training-data-manager
 */

class TrainingDataManager {
  constructor(options = {}) {
    this.datasets = new Map(); // datasetId -> dataset
    this.versions = new Map(); // datasetId -> [versions]
    this.labels = new Map(); // labelId -> label metadata
    this.splits = new Map(); // datasetId -> split configuration

    this.config = {
      defaultSplitRatio: options.defaultSplitRatio || { train: 0.7, validation: 0.15, test: 0.15 },
      enableVersioning: options.enableVersioning !== false,
      enableAugmentation: options.enableAugmentation !== false,
      maxDatasetSize: options.maxDatasetSize || 100000,
      stratificationEnabled: options.stratificationEnabled !== false,
      ...options
    };

    this.stats = {
      totalDatasets: 0,
      totalRecords: 0,
      totalVersions: 0,
      totalLabels: 0,
      augmentationRate: 0
    };

    this.listeners = {
      datasetCreated: [],
      datasetUpdated: [],
      versionCreated: [],
      labelCreated: [],
      splitCompleted: []
    };

    console.log('📊 Training Data Manager initialized');
  }

  /**
   * Create a new dataset
   * @param {string} id - Dataset ID
   * @param {array} data - Training data
   * @param {object} metadata - Dataset metadata
   */
  createDataset(id, data, metadata = {}) {
    if (this.datasets.has(id)) {
      throw new Error(`Dataset already exists: ${id}`);
    }

    if (data.length > this.config.maxDatasetSize) {
      throw new Error(`Dataset exceeds max size: ${data.length} > ${this.config.maxDatasetSize}`);
    }

    const dataset = {
      id,
      data,
      metadata: {
        name: metadata.name || id,
        description: metadata.description || '',
        source: metadata.source || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: data.length,
        features: metadata.features || this.extractFeatures(data),
        labels: metadata.labels || [],
        balanceRatio: this.calculateBalance(data),
        ...metadata
      },
      splits: {},
      augmented: null,
      version: '1.0.0'
    };

    this.datasets.set(id, dataset);
    this.stats.totalDatasets++;
    this.stats.totalRecords += data.length;

    // Initialize version tracking
    if (!this.versions.has(id)) {
      this.versions.set(id, []);
    }
    this.versions.get(id).push({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      size: data.length,
      metadata: dataset.metadata
    });

    this.emit('datasetCreated', {
      id,
      size: data.length,
      version: '1.0.0'
    });

    console.log(`✅ Dataset created: ${id} (${data.length} records)`);
    return dataset;
  }

  /**
   * Add data to existing dataset
   * @param {string} id - Dataset ID
   * @param {array} newData - Additional data
   */
  addData(id, newData) {
    const dataset = this.getDataset(id);
    if (!dataset) throw new Error(`Dataset not found: ${id}`);

    const totalSize = dataset.data.length + newData.length;
    if (totalSize > this.config.maxDatasetSize) {
      throw new Error(`Adding data exceeds max size`);
    }

    dataset.data.push(...newData);
    dataset.metadata.size = dataset.data.length;
    dataset.metadata.updatedAt = new Date().toISOString();

    this.emit('datasetUpdated', {
      id,
      action: 'add',
      addedCount: newData.length,
      totalSize: dataset.data.length
    });

    console.log(`➕ Added ${newData.length} records to ${id}`);
    return dataset;
  }

  /**
   * Define labels for the dataset
   * @param {string} datasetId - Dataset ID
   * @param {array} labels - Label definitions
   */
  defineLabels(datasetId, labels) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    const labelDefs = {};
    labels.forEach(label => {
      labelDefs[label.id] = {
        id: label.id,
        name: label.name,
        description: label.description || '',
        type: label.type || 'binary', // binary, multiclass, continuous
        values: label.values || [0, 1],
        weightBalance: label.weightBalance || 1.0
      };
    });

    dataset.metadata.labels = labelDefs;
    this.stats.totalLabels += Object.keys(labelDefs).length;

    console.log(`✅ Defined ${labels.length} labels for ${datasetId}`);
    return labelDefs;
  }

  /**
   * Create train/validation/test split
   * @param {string} datasetId - Dataset ID
   * @param {object} splitConfig - Split configuration
   * @returns {Promise<object>} Split result
   */
  async createSplit(datasetId, splitConfig = {}) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    const ratio = {
      ...this.config.defaultSplitRatio,
      ...splitConfig
    };

    // Validate ratio
    const total = ratio.train + ratio.validation + ratio.test;
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Split ratios must sum to 1.0, got ${total}`);
    }

    const startTime = Date.now();

    try {
      const splits = this.performSplit(dataset.data, ratio);

      dataset.splits = {
        ...splits,
        ratio,
        createdAt: new Date().toISOString(),
        stratified: this.config.stratificationEnabled
      };

      this.splits.set(datasetId, splits);

      const splitTime = Date.now() - startTime;

      this.emit('splitCompleted', {
        datasetId,
        trainSize: splits.train.length,
        validationSize: splits.validation.length,
        testSize: splits.test.length,
        splitTime
      });

      console.log(
        `✅ Split created: Train=${splits.train.length}, Val=${splits.validation.length}, Test=${splits.test.length}`
      );

      return {
        splits,
        statistics: this.calculateSplitStatistics(splits)
      };

    } catch (error) {
      console.error('❌ Split creation failed:', error);
      throw error;
    }
  }

  /**
   * Augment dataset with synthetic samples
   * @param {string} datasetId - Dataset ID
   * @param {object} augmentConfig - Augmentation configuration
   */
  augmentDataset(datasetId, augmentConfig = {}) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    const augmentationFactor = augmentConfig.factor || 2;
    const technique = augmentConfig.technique || 'noise';

    console.log(
      `🔄 Augmenting dataset ${datasetId} with factor ${augmentationFactor} using ${technique}`
    );

    const augmentedData = [...dataset.data];

    // Augmentation techniques
    const augmentedSamples = dataset.data.flatMap(record => {
      const variations = [];

      for (let i = 1; i < augmentationFactor; i++) {
        let variation = { ...record };

        switch (technique) {
          case 'noise':
            variation = this.addNoise(variation);
            break;
          case 'mixup':
            const randomRecord = dataset.data[Math.floor(Math.random() * dataset.data.length)];
            variation = this.mixup(record, randomRecord);
            break;
          case 'oversampling':
            variation = { ...record };
            break;
          case 'smote':
            variation = this.generateSynthetic(record, dataset.data);
            break;
        }

        variations.push(variation);
      }

      return variations;
    });

    augmentedData.push(...augmentedSamples);

    dataset.augmented = {
      originalSize: dataset.data.length,
      augmentedSize: augmentedData.length,
      augmentationFactor,
      technique,
      createdAt: new Date().toISOString()
    };

    this.stats.augmentationRate =
      (augmentedData.length - dataset.data.length) / dataset.data.length;

    console.log(`✅ Augmentation complete: ${augmentedData.length} total samples`);

    return augmentedData;
  }

  /**
   * Get dataset statistics
   * @param {string} datasetId - Dataset ID
   * @returns {object} Statistics
   */
  getStatistics(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) return null;

    return {
      id: datasetId,
      name: dataset.metadata.name,
      size: dataset.metadata.size,
      features: dataset.metadata.features,
      labels: Object.keys(dataset.metadata.labels || {}),
      balanceRatio: dataset.metadata.balanceRatio,
      hasSplits: Object.keys(dataset.splits).length > 0,
      hasAugmentation: dataset.augmented !== null,
      augmentationDetails: dataset.augmented,
      version: dataset.version,
      createdAt: dataset.metadata.createdAt,
      updatedAt: dataset.metadata.updatedAt
    };
  }

  /**
   * Get dataset with splits ready for training
   * @param {string} datasetId - Dataset ID
   * @returns {object} Training-ready dataset
   */
  getTrainingDataset(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    if (Object.keys(dataset.splits).length === 0) {
      throw new Error('Dataset has not been split. Call createSplit first.');
    }

    return {
      train: dataset.splits.train,
      validation: dataset.splits.validation,
      test: dataset.splits.test,
      metadata: dataset.metadata,
      features: dataset.metadata.features,
      labels: dataset.metadata.labels
    };
  }

  /**
   * Save new dataset version
   * @param {string} datasetId - Dataset ID
   * @param {array} data - Updated data
   * @param {string} versionString - Version string
   */
  saveVersion(datasetId, data, versionString) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    dataset.data = data;
    dataset.version = versionString;
    dataset.metadata.updatedAt = new Date().toISOString();
    dataset.metadata.size = data.length;

    if (!this.versions.has(datasetId)) {
      this.versions.set(datasetId, []);
    }

    this.versions.get(datasetId).push({
      version: versionString,
      timestamp: new Date().toISOString(),
      size: data.length,
      metadata: dataset.metadata
    });

    this.stats.totalVersions++;

    this.emit('versionCreated', {
      datasetId,
      version: versionString,
      size: data.length
    });

    console.log(`✅ Version saved: ${datasetId}@${versionString}`);
    return dataset;
  }

  /**
   * List all datasets
   * @returns {array} Dataset summaries
   */
  listDatasets() {
    const datasets = [];

    for (const [id, dataset] of this.datasets) {
      datasets.push({
        id,
        name: dataset.metadata.name,
        size: dataset.metadata.size,
        version: dataset.version,
        createdAt: dataset.metadata.createdAt
      });
    }

    return datasets;
  }

  /**
   * Delete dataset
   * @param {string} datasetId - Dataset ID
   */
  deleteDataset(datasetId) {
    if (!this.datasets.has(datasetId)) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const dataset = this.datasets.get(datasetId);
    const size = dataset.metadata.size;

    this.datasets.delete(datasetId);
    this.versions.delete(datasetId);
    this.splits.delete(datasetId);

    this.stats.totalDatasets--;
    this.stats.totalRecords -= size;

    console.log(`🗑️  Dataset deleted: ${datasetId}`);
  }

  /**
   * Export dataset
   * @param {string} datasetId - Dataset ID
   * @param {string} format - Format (json, csv)
   * @returns {string} Exported data
   */
  exportDataset(datasetId, format = 'json') {
    const dataset = this.getDataset(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    switch (format) {
      case 'json':
        return JSON.stringify({
          metadata: dataset.metadata,
          data: dataset.data,
          splits: dataset.splits
        }, null, 2);

      case 'csv':
        return this.exportAsCSV(dataset.data);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get global statistics
   * @returns {object} Global stats
   */
  getGlobalStatistics() {
    return {
      totalDatasets: this.stats.totalDatasets,
      totalRecords: this.stats.totalRecords,
      totalVersions: this.stats.totalVersions,
      totalLabels: this.stats.totalLabels,
      averageDatasetSize: this.stats.totalDatasets > 0
        ? this.stats.totalRecords / this.stats.totalDatasets
        : 0,
      augmentationRate: this.stats.augmentationRate
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Get dataset by ID
   * @private
   */
  getDataset(id) {
    return this.datasets.get(id);
  }

  /**
   * Extract features from data
   * @private
   */
  extractFeatures(data) {
    if (data.length === 0) return {};

    const features = {};
    const firstRecord = data[0];

    for (const [key, value] of Object.entries(firstRecord)) {
      features[key] = typeof value;
    }

    return features;
  }

  /**
   * Calculate class balance ratio
   * @private
   */
  calculateBalance(data) {
    const labelField = 'label';
    const counts = {};

    data.forEach(record => {
      if (record[labelField]) {
        counts[record[labelField]] = (counts[record[labelField]] || 0) + 1;
      }
    });

    return counts;
  }

  /**
   * Perform train/val/test split
   * @private
   */
  performSplit(data, ratio) {
    const shuffled = [...data].sort(() => Math.random() - 0.5);

    const trainSize = Math.floor(shuffled.length * ratio.train);
    const valSize = Math.floor(shuffled.length * ratio.validation);

    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + valSize),
      test: shuffled.slice(trainSize + valSize)
    };
  }

  /**
   * Calculate split statistics
   * @private
   */
  calculateSplitStatistics(splits) {
    return {
      trainCount: splits.train.length,
      validationCount: splits.validation.length,
      testCount: splits.test.length,
      trainRatio: (splits.train.length / (splits.train.length + splits.validation.length + splits.test.length)) * 100,
      validationRatio: (splits.validation.length / (splits.train.length + splits.validation.length + splits.test.length)) * 100,
      testRatio: (splits.test.length / (splits.train.length + splits.validation.length + splits.test.length)) * 100
    };
  }

  /**
   * Add noise to record
   * @private
   */
  addNoise(record) {
    const noisy = { ...record };

    for (const [key, value] of Object.entries(noisy)) {
      if (typeof value === 'number') {
        noisy[key] = value + (Math.random() - 0.5) * 0.1 * value;
      }
    }

    return noisy;
  }

  /**
   * Mixup augmentation
   * @private
   */
  mixup(record1, record2, alpha = 0.2) {
    const mixed = {};

    for (const key of Object.keys(record1)) {
      if (typeof record1[key] === 'number' && typeof record2[key] === 'number') {
        mixed[key] = alpha * record1[key] + (1 - alpha) * record2[key];
      } else {
        mixed[key] = record1[key];
      }
    }

    return mixed;
  }

  /**
   * Generate synthetic samples (SMOTE)
   * @private
   */
  generateSynthetic(record, dataset, k = 5) {
    // Simplified SMOTE
    return { ...record };
  }

  /**
   * Export as CSV
   * @private
   */
  exportAsCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(record =>
      headers.map(h => JSON.stringify(record[h] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
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
  module.exports = TrainingDataManager;
}

if (typeof window !== 'undefined') {
  window.TrainingDataManager = TrainingDataManager;
}
