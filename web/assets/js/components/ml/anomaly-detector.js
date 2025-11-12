/**
 * Anomaly Detection System - Identify unusual patterns in email lists
 *
 * Features:
 * - Isolation Forest algorithm
 * - Local Outlier Factor (LOF)
 * - Statistical anomaly detection
 * - Customizable sensitivity
 * - Detailed anomaly reports
 *
 * @module anomaly-detector
 */

class AnomalyDetector {
  constructor(options = {}) {
    this.modelName = 'AnomalyDetector';
    this.version = options.version || '1.0.0';

    this.config = {
      algorithm: options.algorithm || 'isolation-forest', // isolation-forest, lof, statistical
      sensitivity: options.sensitivity || 0.7, // 0-1, higher = more anomalies detected
      minSamples: options.minSamples || 20,
      maxSamples: options.maxSamples || 10000,
      enableCaching: options.enableCaching !== false,
      ...options
    };

    // Known anomaly patterns
    this.anomalyPatterns = {
      spamTrap: /^(test|demo|noreply|no-reply|abuse|postmaster)@/i,
      disposable: /(tempmail|10minute|guerrilla|mailinator)/i,
      suspicious: /(fake|example|sample|xxx|yyy|zzz)/i,
      botPattern: /^[a-z0-9]{20,}@/i,
      encodingIssue: /[^\x00-\x7F]/g,
      specialPattern: /^[!#$%&'*+]+@/
    };

    this.stats = {
      totalScanned: 0,
      anomaliesDetected: 0,
      anomalyRate: 0,
      severityDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    this.detectedAnomalies = new Map();
    this.cache = new Map();

    console.log(`🤖 Anomaly Detector initialized (v${this.version})`);
  }

  /**
   * Detect anomalies in email list
   * @param {array} emails - Array of email data
   * @returns {Promise<object>} Detection results
   */
  async detectAnomalies(emails, options = {}) {
    if (emails.length === 0) {
      return { anomalies: [], statistics: {} };
    }

    const startTime = Date.now();
    const algorithm = options.algorithm || this.config.algorithm;

    try {
      let anomalies = [];

      switch (algorithm) {
        case 'isolation-forest':
          anomalies = await this.isolationForest(emails);
          break;
        case 'lof':
          anomalies = await this.localOutlierFactor(emails);
          break;
        case 'statistical':
          anomalies = await this.statisticalDetection(emails);
          break;
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }

      // Sort by severity
      anomalies.sort((a, b) => b.score - a.score);

      // Calculate statistics
      const statistics = this.calculateStatistics(emails, anomalies);
      const detectionTime = Date.now() - startTime;

      this.stats.totalScanned += emails.length;
      this.stats.anomaliesDetected += anomalies.length;

      return {
        algorithm,
        anomalies,
        statistics,
        detectionTime,
        anomalyRate: (anomalies.length / emails.length) * 100
      };

    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Isolation Forest algorithm
   * @private
   */
  async isolationForest(emails) {
    const anomalies = [];
    const threshold = 1 - this.config.sensitivity;

    // Extract features
    const features = emails.map((email, idx) => ({
      idx,
      email: email.email,
      ...this.extractFeatures(email)
    }));

    // Build isolation trees
    const trees = this.buildIsolationTrees(features, 100);

    // Score anomalies
    features.forEach(feature => {
      const anomalyScore = this.getAnomalyScore(feature, trees);

      if (anomalyScore > threshold) {
        anomalies.push({
          email: feature.email,
          score: anomalyScore,
          anomalyType: this.classifyAnomaly(feature),
          severity: this.getSeverity(anomalyScore),
          reasons: this.explainAnomaly(feature)
        });
      }
    });

    return anomalies;
  }

  /**
   * Local Outlier Factor
   * @private
   */
  async localOutlierFactor(emails) {
    const anomalies = [];
    const k = Math.min(10, Math.floor(emails.length / 2));
    const threshold = 1 + (0.5 * (1 - this.config.sensitivity));

    // Extract features
    const features = emails.map((email, idx) => ({
      idx,
      email: email.email,
      vector: this.extractFeatureVector(email)
    }));

    // Calculate LOF
    features.forEach(point => {
      const neighbors = this.findNearestNeighbors(point, features, k);
      const lof = this.calculateLOF(point, neighbors);

      if (lof > threshold) {
        anomalies.push({
          email: point.email,
          score: Math.min(1, lof / 2),
          anomalyType: 'outlier_lof',
          severity: this.getSeverity(Math.min(1, lof / 2)),
          reasons: ['Unusual pattern in feature space']
        });
      }
    });

    return anomalies;
  }

  /**
   * Statistical anomaly detection
   * @private
   */
  async statisticalDetection(emails) {
    const anomalies = [];
    const threshold = this.config.sensitivity;

    // Extract numerical features
    const features = emails.map((email, idx) => ({
      idx,
      email: email.email,
      domainLength: email.domain?.length || 0,
      localPartLength: email.localPart?.length || 0,
      numberRatio: this.getNumberRatio(email),
      specialCharRatio: this.getSpecialCharRatio(email)
    }));

    // Calculate z-scores
    const metrics = ['domainLength', 'localPartLength', 'numberRatio', 'specialCharRatio'];

    metrics.forEach(metric => {
      const mean = this.calculateMean(features.map(f => f[metric]));
      const std = this.calculateStdDev(features.map(f => f[metric]), mean);

      features.forEach((feature) => {
        if (std > 0) {
          const zScore = Math.abs((feature[metric] - mean) / std);

          if (zScore > 3 * (1 - threshold)) {
            const existing = anomalies.find(a => a.email === feature.email);

            if (existing) {
              existing.reasons.push(`${metric}: z-score = ${zScore.toFixed(2)}`);
              existing.score = Math.max(existing.score, Math.min(1, zScore / 5));
            } else {
              anomalies.push({
                email: feature.email,
                score: Math.min(1, zScore / 5),
                anomalyType: 'statistical_outlier',
                severity: this.getSeverity(Math.min(1, zScore / 5)),
                reasons: [`${metric}: z-score = ${zScore.toFixed(2)}`]
              });
            }
          }
        }
      });
    });

    return anomalies;
  }

  /**
   * Classify anomaly type
   * @private
   */
  classifyAnomaly(feature) {
    const email = feature.email;

    for (const [type, pattern] of Object.entries(this.anomalyPatterns)) {
      if (pattern.test(email)) {
        return type;
      }
    }

    return 'unknown_pattern';
  }

  /**
   * Explain anomaly reasons
   * @private
   */
  explainAnomaly(feature) {
    const reasons = [];
    const email = feature.email;

    // Check patterns
    if (this.anomalyPatterns.spamTrap.test(email)) {
      reasons.push('Matches spam trap pattern');
    }

    if (this.anomalyPatterns.disposable.test(email)) {
      reasons.push('Disposable/temporary email service');
    }

    if (this.anomalyPatterns.suspicious.test(email)) {
      reasons.push('Suspicious keywords detected');
    }

    if (this.anomalyPatterns.botPattern.test(email)) {
      reasons.push('Possible bot-generated pattern');
    }

    if (this.anomalyPatterns.encodingIssue.test(email)) {
      reasons.push('Non-ASCII characters detected');
    }

    if (this.anomalyPatterns.specialPattern.test(email)) {
      reasons.push('Special characters at start');
    }

    // Check feature anomalies
    if (feature.domainLength < 4) {
      reasons.push('Unusually short domain');
    }

    if (feature.localPartLength > 50) {
      reasons.push('Unusually long local part');
    }

    if (feature.numberRatio > 0.5) {
      reasons.push('High ratio of numbers');
    }

    if (feature.specialCharRatio > 0.3) {
      reasons.push('Unusual special character ratio');
    }

    return reasons.length > 0 ? reasons : ['Unknown anomaly'];
  }

  /**
   * Get anomaly severity level
   * @private
   */
  getSeverity(score) {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Extract features from email
   * @private
   */
  extractFeatures(email) {
    const domain = email.domain || this.extractDomain(email.email);
    const localPart = email.localPart || this.extractLocalPart(email.email);

    return {
      domainLength: domain?.length || 0,
      localPartLength: localPart?.length || 0,
      totalLength: email.email?.length || 0,
      numberRatio: this.getNumberRatio({ email: email.email }),
      specialCharRatio: this.getSpecialCharRatio({ email: email.email }),
      hasConsecutiveDots: email.email?.includes('..') ? 1 : 0,
      domainPopularity: email.domainPopularity || 0.5
    };
  }

  /**
   * Extract feature vector for LOF
   * @private
   */
  extractFeatureVector(email) {
    const features = this.extractFeatures(email);
    return [
      features.domainLength,
      features.localPartLength,
      features.numberRatio,
      features.specialCharRatio,
      features.hasConsecutiveDots
    ];
  }

  /**
   * Build isolation trees
   * @private
   */
  buildIsolationTrees(features, treeCount) {
    const trees = [];

    for (let i = 0; i < treeCount; i++) {
      const tree = this.buildSingleTree(features, 0, Math.log(features.length));
      trees.push(tree);
    }

    return trees;
  }

  /**
   * Build single isolation tree
   * @private
   */
  buildSingleTree(features, depth, maxDepth) {
    if (depth >= maxDepth || features.length <= 1) {
      return { size: features.length, isLeaf: true };
    }

    // Random attribute and split value
    const attrs = Object.keys(features[0]).filter(k => typeof features[0][k] === 'number');
    const attr = attrs[Math.floor(Math.random() * attrs.length)];
    const values = features.map(f => f[attr]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const splitVal = minVal + Math.random() * (maxVal - minVal);

    const left = features.filter(f => f[attr] < splitVal);
    const right = features.filter(f => f[attr] >= splitVal);

    return {
      attribute: attr,
      splitValue: splitVal,
      left: this.buildSingleTree(left, depth + 1, maxDepth),
      right: this.buildSingleTree(right, depth + 1, maxDepth)
    };
  }

  /**
   * Get anomaly score from trees
   * @private
   */
  getAnomalyScore(feature, trees) {
    const pathLengths = trees.map(tree => this.getPathLength(feature, tree, 0));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    const c = 2 * (Math.log(trees[0].size) + 0.5772) - 2 * (trees[0].size - 1) / trees[0].size;
    const anomalyScore = Math.pow(2, -avgPathLength / c);

    return Math.min(1, anomalyScore);
  }

  /**
   * Get path length in tree
   * @private
   */
  getPathLength(feature, node, depth) {
    if (node.isLeaf) {
      return depth + this.c(node.size);
    }

    if (feature[node.attribute] < node.splitValue) {
      return this.getPathLength(feature, node.left, depth + 1);
    } else {
      return this.getPathLength(feature, node.right, depth + 1);
    }
  }

  /**
   * Calculate statistics
   * @private
   */
  calculateStatistics(emails, anomalies) {
    const byType = {};
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    anomalies.forEach(a => {
      byType[a.anomalyType] = (byType[a.anomalyType] || 0) + 1;
      bySeverity[a.severity]++;
    });

    return {
      totalEmails: emails.length,
      totalAnomalies: anomalies.length,
      anomalyRate: (anomalies.length / emails.length) * 100,
      byType,
      bySeverity,
      averageScore: anomalies.length > 0
        ? anomalies.reduce((a, b) => a + b.score, 0) / anomalies.length
        : 0
    };
  }

  /**
   * Find nearest neighbors
   * @private
   */
  findNearestNeighbors(point, features, k) {
    const distances = features
      .filter(f => f.email !== point.email)
      .map(f => ({
        point: f,
        distance: this.euclideanDistance(point.vector, f.vector)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    return distances.map(d => d.point);
  }

  /**
   * Calculate LOF
   * @private
   */
  calculateLOF(point, neighbors) {
    const k = neighbors.length;
    const reachDist = neighbors.map(neighbor =>
      Math.max(
        this.euclideanDistance(point.vector, neighbor.vector),
        this.getMaxReachDist(neighbor, neighbors)
      )
    );

    const lrd = k / reachDist.reduce((a, b) => a + b, 1);
    const neighborLRDs = neighbors.map(n => k / this.getReachDistance(n, neighbors));
    const avgNeighborLRD = neighborLRDs.reduce((a, b) => a + b, 0) / k;

    return avgNeighborLRD / (lrd + 0.00001);
  }

  // ============ PRIVATE HELPERS ============

  extractDomain(email) {
    if (!email) return '';
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
  }

  extractLocalPart(email) {
    if (!email) return '';
    const parts = email.split('@');
    return parts.length === 2 ? parts[0] : '';
  }

  getNumberRatio(feature) {
    const email = feature.email || '';
    const numbers = (email.match(/\d/g) || []).length;
    return email.length > 0 ? numbers / email.length : 0;
  }

  getSpecialCharRatio(feature) {
    const email = feature.email || '';
    const specials = (email.match(/[!#$%&'*+=?^_`{|}~]/g) || []).length;
    return email.length > 0 ? specials / email.length : 0;
  }

  euclideanDistance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      sum += (v1[i] - v2[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  getMaxReachDist(point, neighbors) {
    return Math.max(
      ...neighbors.map(n => Math.max(this.euclideanDistance(point.vector, n.vector), 0))
    );
  }

  getReachDistance(point, neighbors) {
    return Math.min(
      ...neighbors.map(n => this.euclideanDistance(point.vector, n.vector))
    );
  }

  c(n) {
    if (n <= 1) return 0;
    return (Math.log(n - 1) + 0.5772) - 2 * (n - 1) / n;
  }

  calculateMean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateStdDev(values, mean) {
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      modelName: this.modelName,
      version: this.version,
      ...this.stats,
      averageAnomalyRate: this.stats.totalScanned > 0
        ? (this.stats.anomaliesDetected / this.stats.totalScanned) * 100
        : 0
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnomalyDetector;
}

if (typeof window !== 'undefined') {
  window.AnomalyDetector = AnomalyDetector;
}
