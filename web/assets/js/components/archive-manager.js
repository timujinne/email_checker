/**
 * Archive Manager
 * Main orchestrator for local and cloud archive management
 * Integrates OAuth, CloudStorage, Tagging, and Search systems
 *
 * @module ArchiveManager
 */

// Guard against duplicate class declaration
if (typeof ArchiveManager === 'undefined') {
    window.ArchiveManager = class ArchiveManager {
    /**
     * Create ArchiveManager instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = options;
        this.oauth = null;
        this.cloudStorage = null;
        this.localFiles = this.loadLocalFiles();
        this.tags = this.loadTags();
        this.searchQuery = '';
        this.observers = [];

        console.log('📦 ArchiveManager initialized');
        this.init();
    }

    /**
     * Initialize archive manager
     */
    async init() {
        this.render();
        this.initializeComponents();
        this.setupEventListeners();
        console.log('✅ ArchiveManager ready');
    }

    /**
     * Render manager UI
     */
    render() {
        this.element.innerHTML = `
            <div class="archive-manager">
                <!-- Header -->
                <div class="archive-header">
                    <h1>📦 Archive Manager</h1>
                    <div class="header-buttons">
                        <button id="btn-auth" class="btn btn-primary">🔐 Connect Google Drive</button>
                        <button id="btn-sync" class="btn btn-secondary">🔄 Sync to Cloud</button>
                    </div>
                </div>

                <!-- Search & Filter -->
                <div class="archive-search">
                    <input type="text" id="search-input" placeholder="Search files...">
                    <div class="filter-tags" id="filter-tags">
                        <!-- Tags rendered here -->
                    </div>
                </div>

                <!-- Tabs -->
                <div class="archive-tabs">
                    <button class="tab-btn active" data-tab="local">📂 Local Archive</button>
                    <button class="tab-btn" data-tab="cloud">☁️ Cloud Storage</button>
                </div>

                <!-- Local Archive -->
                <div class="tab-content active" id="tab-local">
                    <div class="archive-table">
                        <table id="local-files-table">
                            <thead>
                                <tr>
                                    <th>Filename</th>
                                    <th>Size</th>
                                    <th>Date</th>
                                    <th>Tags</th>
                                    <th>Sync Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="local-tbody">
                                <tr><td colspan="6">No files</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Cloud Storage -->
                <div class="tab-content" id="tab-cloud">
                    <div class="cloud-status">
                        <span id="cloud-auth-status">Not connected</span>
                    </div>
                    <div class="archive-table">
                        <table id="cloud-files-table">
                            <thead>
                                <tr>
                                    <th>Filename</th>
                                    <th>Size</th>
                                    <th>Uploaded</th>
                                    <th>Version</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="cloud-tbody">
                                <tr><td colspan="5">Not connected</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Statistics -->
                <div class="archive-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="stat-local-count">0</div>
                        <div class="stat-label">Local Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-local-size">0 MB</div>
                        <div class="stat-label">Total Size</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-cloud-count">0</div>
                        <div class="stat-label">Cloud Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-synced">0%</div>
                        <div class="stat-label">Synced</div>
                    </div>
                </div>
            </div>
        `;

        this.updateLocalFilesDisplay();
        this.updateStatistics();
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // OAuth Manager
        this.oauth = new OAuthManager({
            clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
            scope: ['https://www.googleapis.com/auth/drive.file']
        });

        this.oauth.subscribe((event, data) => {
            if (event === 'authorized') {
                this.onAuthorized();
            } else if (event === 'logged-out') {
                this.onLoggedOut();
            }
        });

        // Cloud Storage Manager
        this.cloudStorage = new CloudStorage(this.oauth, 'email-checker-files');

        this.cloudStorage.subscribe((event, data) => {
            if (event === 'files-listed') {
                this.updateCloudFilesDisplay();
            }
        });

        this.updateAuthStatus();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auth button
        document.getElementById('btn-auth').addEventListener('click', () => {
            if (this.oauth.isAuthorized()) {
                this.oauth.logout();
            } else {
                this.oauth.authorize();
            }
        });

        // Sync button
        document.getElementById('btn-sync').addEventListener('click', () => {
            this.syncToCloud();
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.updateLocalFilesDisplay();
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Update local files display
     */
    updateLocalFilesDisplay() {
        const tbody = document.getElementById('local-tbody');
        let filtered = this.localFiles;

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(f =>
                f.name.toLowerCase().includes(query) ||
                f.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No files found</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map((file, idx) => `
            <tr>
                <td>${file.name}</td>
                <td>${this.formatBytes(file.size)}</td>
                <td>${new Date(file.date).toLocaleDateString()}</td>
                <td>${file.tags.map(t => `<span class="tag">${t}</span>`).join('')}</td>
                <td>
                    <span class="sync-badge ${file.synced ? 'synced' : 'pending'}">
                        ${file.synced ? '✓ Synced' : '⏳ Pending'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm" onclick="archiveManagerInstance?.downloadFile('${idx}')">📥</button>
                    <button class="btn btn-sm" onclick="archiveManagerInstance?.deleteFile('${idx}')">🗑️</button>
                    <button class="btn btn-sm" onclick="archiveManagerInstance?.showTagsDialog('${idx}')">🏷️</button>
                </td>
            </tr>
        `).join('');

        window.archiveManagerInstance = this;
    }

    /**
     * Update cloud files display
     */
    async updateCloudFilesDisplay() {
        if (!this.oauth.isAuthorized()) {
            document.getElementById('cloud-tbody').innerHTML =
                '<tr><td colspan="5">Please connect Google Drive first</td></tr>';
            return;
        }

        try {
            const cloudFiles = await this.cloudStorage.listBucketContents();

            const tbody = document.getElementById('cloud-tbody');
            tbody.innerHTML = cloudFiles.map(file => `
                <tr>
                    <td>${file.name}</td>
                    <td>${this.formatBytes(file.size)}</td>
                    <td>${new Date(file.timeCreated).toLocaleDateString()}</td>
                    <td>v1</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="archiveManagerInstance?.downloadCloudFile('${file.name}')">📥</button>
                        <button class="btn btn-sm" onclick="archiveManagerInstance?.deleteCloudFile('${file.name}')">🗑️</button>
                    </td>
                </tr>
            `).join('');

            window.archiveManagerInstance = this;
        } catch (error) {
            console.error('Error loading cloud files:', error);
        }
    }

    /**
     * Handle authorization
     */
    onAuthorized() {
        this.updateAuthStatus();
        this.updateCloudFilesDisplay();
        this.notifyObservers('authorized', {});
    }

    /**
     * Handle logout
     */
    onLoggedOut() {
        this.updateAuthStatus();
        document.getElementById('cloud-tbody').innerHTML =
            '<tr><td colspan="5">Not connected</td></tr>';
        this.notifyObservers('logged-out', {});
    }

    /**
     * Update auth status display
     */
    updateAuthStatus() {
        const btn = document.getElementById('btn-auth');
        const status = document.getElementById('cloud-auth-status');

        if (this.oauth.isAuthorized()) {
            btn.textContent = '🔓 Disconnect';
            status.textContent = '✓ Connected to Google Drive';
        } else {
            btn.textContent = '🔐 Connect Google Drive';
            status.textContent = '✗ Not connected';
        }
    }

    /**
     * Sync to cloud
     */
    async syncToCloud() {
        if (!this.oauth.isAuthorized()) {
            alert('Please connect Google Drive first');
            return;
        }

        const unsyncedFiles = this.localFiles.filter(f => !f.synced);

        if (unsyncedFiles.length === 0) {
            alert('All files are already synced');
            return;
        }

        try {
            const results = await this.cloudStorage.syncLocalToCloud(
                unsyncedFiles.map(f => ({ name: f.name, size: f.size })),
                (current, total) => {
                    console.log(`Syncing ${current}/${total}...`);
                }
            );

            // Update sync status
            results.files.forEach(file => {
                const localFile = this.localFiles.find(f => f.name === file.name);
                if (localFile && file.status === 'synced') {
                    localFile.synced = true;
                }
            });

            this.saveLocalFiles();
            this.updateLocalFilesDisplay();
            this.updateCloudFilesDisplay();
            alert(`✅ Synced ${results.successful} files`);
        } catch (error) {
            alert('Sync failed: ' + error.message);
        }
    }

    /**
     * Download local file
     */
    downloadFile(idx) {
        const file = this.localFiles[idx];
        if (!file) return;

        // Simulate download
        alert(`Downloading ${file.name}...`);
        console.log(`📥 Downloaded: ${file.name}`);
    }

    /**
     * Download cloud file
     */
    async downloadCloudFile(fileName) {
        try {
            await this.cloudStorage.downloadFileToComputer(fileName);
        } catch (error) {
            alert('Download failed: ' + error.message);
        }
    }

    /**
     * Delete local file
     */
    deleteFile(idx) {
        if (!confirm('Delete this file?')) return;

        this.localFiles.splice(idx, 1);
        this.saveLocalFiles();
        this.updateLocalFilesDisplay();
        this.updateStatistics();
    }

    /**
     * Delete cloud file
     */
    async deleteCloudFile(fileName) {
        if (!confirm('Delete this file from cloud?')) return;

        try {
            await this.cloudStorage.deleteFile(fileName);
            this.updateCloudFilesDisplay();
        } catch (error) {
            alert('Delete failed: ' + error.message);
        }
    }

    /**
     * Show tags dialog
     */
    showTagsDialog(idx) {
        const file = this.localFiles[idx];
        const tags = prompt('Tags (comma-separated):', file.tags.join(', '));

        if (tags !== null) {
            file.tags = tags.split(',').map(t => t.trim()).filter(t => t);
            this.saveLocalFiles();
            this.updateLocalFilesDisplay();
        }
    }

    /**
     * Switch tab
     */
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        if (tabName === 'cloud') {
            this.updateCloudFilesDisplay();
        }
    }

    /**
     * Update statistics
     */
    updateStatistics() {
        const totalSize = this.localFiles.reduce((sum, f) => sum + f.size, 0);
        const syncedCount = this.localFiles.filter(f => f.synced).length;
        const syncPercent = this.localFiles.length > 0 ?
            Math.round((syncedCount / this.localFiles.length) * 100) : 0;

        document.getElementById('stat-local-count').textContent = this.localFiles.length;
        document.getElementById('stat-local-size').textContent = this.formatBytes(totalSize);
        document.getElementById('stat-synced').textContent = syncPercent + '%';
    }

    /**
     * Load local files from localStorage
     * @private
     */
    loadLocalFiles() {
        const stored = localStorage.getItem('archive_files');
        if (!stored) {
            // Mock files
            return [
                { name: 'list_20251020.csv', size: 2048000, date: new Date(), tags: ['2025', 'october'], synced: true },
                { name: 'list_20251019.csv', size: 1856000, date: new Date(Date.now() - 86400000), tags: ['2025', 'october'], synced: false },
                { name: 'report.json', size: 512000, date: new Date(Date.now() - 172800000), tags: ['report'], synced: true }
            ];
        }

        return JSON.parse(stored);
    }

    /**
     * Save local files to localStorage
     * @private
     */
    saveLocalFiles() {
        localStorage.setItem('archive_files', JSON.stringify(this.localFiles));
    }

    /**
     * Load tags from localStorage
     * @private
     */
    loadTags() {
        const stored = localStorage.getItem('archive_tags');
        if (!stored) {
            return ['2025', 'october', 'report', 'backup'];
        }

        return JSON.parse(stored);
    }

    /**
     * Format bytes
     * @private
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
     * Get current state
     */
    getState() {
        return {
            authorized: this.oauth.isAuthorized(),
            localFileCount: this.localFiles.length,
            syncedCount: this.localFiles.filter(f => f.synced).length
        };
    }
    }; // End of ArchiveManager class
} // End of guard check

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArchiveManager: window.ArchiveManager };
}
