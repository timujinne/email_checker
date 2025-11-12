/**
 * Cloud Storage Manager
 * Manages Google Cloud Storage operations (upload, download, list, delete)
 *
 * @module CloudStorage
 */

class CloudStorage {
    /**
     * Create CloudStorage instance
     * @param {OAuthManager} oauthManager - OAuth manager for authentication
     * @param {string} bucketName - GCS bucket name
     */
    constructor(oauthManager, bucketName = 'email-checker-storage') {
        this.oauth = oauthManager;
        this.bucketName = bucketName;
        this.apiUrl = 'https://storage.googleapis.com/storage/v1';
        this.files = [];
        this.syncStatus = new Map();
        this.observers = [];

        console.log('☁️ CloudStorage initialized');
    }

    /**
     * List files in bucket
     * @param {string} prefix - Optional prefix to filter files
     * @returns {Promise<Array>} Array of files
     */
    async listBucketContents(prefix = '') {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        try {
            console.log(`📂 Listing bucket contents...`);

            // Mock implementation
            const files = this.generateMockFiles(prefix);
            this.files = files;

            this.notifyObservers('files-listed', { count: files.length });
            return files;
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }

    /**
     * Upload file to GCS
     * @param {File} file - File to upload
     * @param {string} destination - Destination path in bucket
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Upload result
     */
    async uploadFile(file, destination = '', progressCallback = null) {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        try {
            console.log(`📤 Uploading file: ${file.name}`);

            const fileName = destination || file.name;
            const uploadResult = {
                name: fileName,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                bucket: this.bucketName,
                path: `gs://${this.bucketName}/${fileName}`
            };

            // Simulate upload with progress
            for (let i = 0; i <= 100; i += 10) {
                if (progressCallback) {
                    progressCallback(i, file.size);
                }
                await this.sleep(200);
            }

            // Add to sync status
            this.syncStatus.set(fileName, {
                status: 'synced',
                timestamp: new Date()
            });

            this.notifyObservers('file-uploaded', uploadResult);
            return uploadResult;
        } catch (error) {
            console.error('Upload error:', error);
            this.syncStatus.set(destination, {
                status: 'failed',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Download file from GCS
     * @param {string} fileName - File name/path
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Blob>} File blob
     */
    async downloadFile(fileName, progressCallback = null) {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        try {
            console.log(`📥 Downloading file: ${fileName}`);

            // Simulate download with progress
            const fileSize = Math.floor(Math.random() * 1000000) + 100000;

            for (let i = 0; i <= 100; i += 10) {
                if (progressCallback) {
                    progressCallback(i, fileSize);
                }
                await this.sleep(200);
            }

            // Create mock blob
            const blob = new Blob(['Mock file content'], { type: 'text/plain' });

            this.notifyObservers('file-downloaded', { fileName });
            return blob;
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Download file directly
     * @param {string} fileName - File name to download
     */
    async downloadFileToComputer(fileName) {
        try {
            const blob = await this.downloadFile(fileName);

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`✅ File downloaded: ${fileName}`);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    }

    /**
     * Delete file from GCS
     * @param {string} fileName - File name/path to delete
     * @returns {Promise<Object>} Delete result
     */
    async deleteFile(fileName) {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        try {
            console.log(`🗑️ Deleting file: ${fileName}`);

            // Mock deletion
            this.files = this.files.filter(f => f.name !== fileName);
            this.syncStatus.delete(fileName);

            this.notifyObservers('file-deleted', { fileName });
            return { fileName, deleted: true };
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }

    /**
     * Get file version history
     * @param {string} fileName - File name
     * @returns {Promise<Array>} Version history
     */
    async getVersionHistory(fileName) {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        // Mock version history
        return [
            {
                version: 3,
                timestamp: new Date().toISOString(),
                size: 1024000,
                generationId: 'v3'
            },
            {
                version: 2,
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                size: 950000,
                generationId: 'v2'
            },
            {
                version: 1,
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                size: 850000,
                generationId: 'v1'
            }
        ];
    }

    /**
     * Sync local files to cloud
     * @param {Array} localFiles - Files to sync
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Sync result
     */
    async syncLocalToCloud(localFiles, progressCallback = null) {
        if (!this.oauth.isAuthorized()) {
            throw new Error('Not authorized');
        }

        console.log(`🔄 Syncing ${localFiles.length} files to cloud...`);

        const results = {
            successful: 0,
            failed: 0,
            files: []
        };

        for (let i = 0; i < localFiles.length; i++) {
            try {
                const file = localFiles[i];
                await this.uploadFile(file, file.name);
                results.successful++;
                results.files.push({ name: file.name, status: 'synced' });

                if (progressCallback) {
                    progressCallback(i + 1, localFiles.length);
                }
            } catch (error) {
                results.failed++;
                results.files.push({ name: localFiles[i].name, status: 'failed' });
            }
        }

        this.notifyObservers('sync-complete', results);
        return results;
    }

    /**
     * Get sync status for all files
     * @returns {Object} Sync status map
     */
    getSyncStatus() {
        const status = {};

        this.files.forEach(file => {
            status[file.name] = {
                synced: this.syncStatus.has(file.name),
                status: this.syncStatus.get(file.name)?.status || 'not-synced'
            };
        });

        return status;
    }

    /**
     * Get bucket statistics
     * @returns {Promise<Object>} Bucket stats
     */
    async getBucketStats() {
        const allFiles = this.files;

        const stats = {
            fileCount: allFiles.length,
            totalSize: allFiles.reduce((sum, f) => sum + f.size, 0),
            lastModified: allFiles.length > 0 ?
                new Date(Math.max(...allFiles.map(f => new Date(f.timeCreated)))) :
                null,
            syncedFiles: Array.from(this.syncStatus.values())
                .filter(s => s.status === 'synced').length
        };

        return stats;
    }

    /**
     * Generate mock files for demo
     * @private
     */
    generateMockFiles(prefix = '') {
        const mockFiles = [
            { name: 'list_20251020.csv', size: 2048000, timeCreated: new Date(Date.now() - 86400000) },
            { name: 'list_20251019.csv', size: 1856000, timeCreated: new Date(Date.now() - 172800000) },
            { name: 'processed_data.json', size: 512000, timeCreated: new Date(Date.now() - 259200000) },
            { name: 'analytics_report.pdf', size: 3072000, timeCreated: new Date(Date.now() - 345600000) }
        ];

        if (prefix) {
            return mockFiles.filter(f => f.name.startsWith(prefix));
        }

        return mockFiles;
    }

    /**
     * Helper: Sleep
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Subscribe to events
     */
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notify observers
     * @private
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    /**
     * Export state
     */
    getState() {
        return {
            bucketName: this.bucketName,
            fileCount: this.files.length,
            syncedCount: Array.from(this.syncStatus.values())
                .filter(s => s.status === 'synced').length
        };
    }
}
