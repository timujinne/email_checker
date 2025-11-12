/**
 * CSV Import Wizard
 * 5-step guided import process with validation and preview
 * Steps: 1. Upload, 2. Format, 3. Validation, 4. Review, 5. Process
 *
 * @module CSVImportWizard
 */

class CSVImportWizard {
    /**
     * Create CSVImportWizard instance
     * @param {string} elementId - Container element ID
     */
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.currentStep = 1;
        this.totalSteps = 5;
        this.state = {
            file: null,
            rawData: null,
            format: null,
            separator: null,
            items: [],
            validationResults: null,
            importStats: null
        };

        this.formats = {
            smtp: {
                name: 'SMTP Logs',
                columns: ['st_text', 'ts', 'sub', 'frm', 'email', 'tag', 'mid', 'link'],
                separator: ',',
                emailColumn: 'email'
            },
            unsubscribe: {
                name: 'Unsubscribe Logs',
                columns: ['Дата отписки', 'Email адреса', 'Причина'],
                separator: ';',
                emailColumn: 'Email адреса'
            }
        };

        this.observers = [];
        this.init();
    }

    /**
     * Initialize wizard
     */
    init() {
        console.log('📋 CSV Import Wizard initialized');
        this.renderWizard();
        this.setupEventListeners();
    }

    /**
     * Render wizard UI
     */
    renderWizard() {
        this.element.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <h2>CSV Import Wizard</h2>
                    <div class="wizard-progress">
                        <div class="progress-steps">
                            ${Array.from({ length: this.totalSteps }).map((_, i) => `
                                <div class="step ${i + 1 === this.currentStep ? 'active' : ''} ${i + 1 < this.currentStep ? 'completed' : ''}">
                                    <div class="step-number">${i + 1}</div>
                                    <div class="step-title">${this.getStepTitle(i + 1)}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${((this.currentStep - 1) / (this.totalSteps - 1)) * 100}%"></div>
                        </div>
                    </div>
                </div>

                <div class="wizard-content" id="wizard-content">
                    <!-- Content rendered dynamically -->
                </div>

                <div class="wizard-footer">
                    <button id="wizard-prev" class="btn btn-secondary" ${this.currentStep === 1 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <button id="wizard-next" class="btn btn-primary">
                        ${this.currentStep === this.totalSteps ? 'Import' : 'Next →'}
                    </button>
                    <button id="wizard-cancel" class="btn btn-ghost">Cancel</button>
                </div>
            </div>
        `;

        this.renderCurrentStep();
    }

    /**
     * Get step title
     * @private
     */
    getStepTitle(step) {
        const titles = [
            'Upload File',
            'Select Format',
            'Validate',
            'Review',
            'Process'
        ];
        return titles[step - 1];
    }

    /**
     * Render current step content
     * @private
     */
    renderCurrentStep() {
        const content = document.getElementById('wizard-content');

        switch (this.currentStep) {
            case 1:
                this.renderStep1Upload(content);
                break;
            case 2:
                this.renderStep2Format(content);
                break;
            case 3:
                this.renderStep3Validation(content);
                break;
            case 4:
                this.renderStep4Review(content);
                break;
            case 5:
                this.renderStep5Process(content);
                break;
        }
    }

    /**
     * Step 1: Upload & Detection
     * @private
     */
    renderStep1Upload(container) {
        container.innerHTML = `
            <div class="step-content">
                <h3>Upload CSV File</h3>
                <div class="upload-area" id="upload-area">
                    <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p>Drag and drop CSV file here</p>
                    <p class="text-secondary">or click to select file</p>
                    <input type="file" id="file-input" accept=".csv" style="display:none;">
                </div>
                <div id="file-preview" style="display:none;">
                    <h4>File Selected</h4>
                    <table class="preview-table">
                        <thead id="preview-header"></thead>
                        <tbody id="preview-body"></tbody>
                    </table>
                </div>
            </div>
        `;

        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    /**
     * Handle file upload
     * @private
     */
    async handleFileUpload(file) {
        console.log(`📁 Uploading file: ${file.name}`);
        this.state.file = file;

        try {
            const text = await file.text();
            this.state.rawData = text;

            // Auto-detect format
            this.autoDetectFormat();

            // Show preview
            this.showFilePreview();

            this.notifyObservers('file-loaded', { file, rows: this.state.rawData.split('\n').length });
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading file: ' + error.message);
        }
    }

    /**
     * Auto-detect CSV format
     * @private
     */
    autoDetectFormat() {
        const lines = this.state.rawData.split('\n');
        const header = lines[0];

        // Check for SMTP format
        if (header.includes('st_text') && header.includes('email')) {
            this.state.format = 'smtp';
            this.state.separator = ',';
        }
        // Check for unsubscribe format
        else if (header.includes('Email адреса') || header.includes('Дата отписки')) {
            this.state.format = 'unsubscribe';
            this.state.separator = ';';
        }
    }

    /**
     * Show file preview
     * @private
     */
    showFilePreview() {
        const lines = this.state.rawData.split('\n').slice(0, 6); // First 5 data rows + header
        const separator = this.state.separator || ',';

        const rows = lines.map(line => line.split(separator));
        const header = rows[0];
        const data = rows.slice(1);

        const headerEl = document.getElementById('preview-header');
        const bodyEl = document.getElementById('preview-body');

        headerEl.innerHTML = `<tr>${header.map(h => `<th>${h}</th>`).join('')}</tr>`;
        bodyEl.innerHTML = data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');

        document.getElementById('file-preview').style.display = 'block';
    }

    /**
     * Step 2: Format Selection
     * @private
     */
    renderStep2Format(container) {
        container.innerHTML = `
            <div class="step-content">
                <h3>Select CSV Format</h3>
                <div class="format-selector">
                    ${Object.entries(this.formats).map(([key, format]) => `
                        <div class="format-card ${this.state.format === key ? 'selected' : ''}" data-format="${key}">
                            <h4>${format.name}</h4>
                            <p>Columns: ${format.columns.length}</p>
                            <p class="columns-list">${format.columns.slice(0, 3).join(', ')}...</p>
                        </div>
                    `).join('')}
                </div>
                <div class="separator-config">
                    <label>Column Separator:</label>
                    <select id="separator-select">
                        <option value="," ${this.state.separator === ',' ? 'selected' : ''}>Comma (,)</option>
                        <option value=";" ${this.state.separator === ';' ? 'selected' : ''}>Semicolon (;)</option>
                        <option value="\\t" ${this.state.separator === '\\t' ? 'selected' : ''}>Tab</option>
                    </select>
                </div>
            </div>
        `;

        // Format selection
        document.querySelectorAll('.format-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.format-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.state.format = card.dataset.format;
                this.state.separator = this.formats[this.state.format].separator;
            });
        });

        // Separator selection
        document.getElementById('separator-select').addEventListener('change', (e) => {
            this.state.separator = e.target.value;
        });
    }

    /**
     * Step 3: Validation
     * @private
     */
    async renderStep3Validation(container) {
        container.innerHTML = `
            <div class="step-content">
                <h3>Validating Data</h3>
                <div class="validation-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: 0%" id="validation-progress"></div>
                    </div>
                    <p id="validation-status">Starting validation...</p>
                </div>
                <div id="validation-results" style="display:none;">
                    <h4>Validation Results</h4>
                    <table class="validation-table">
                        <tr><td>Total rows:</td><td id="stat-total">0</td></tr>
                        <tr><td>Valid emails:</td><td id="stat-valid" class="text-success">0</td></tr>
                        <tr><td>Invalid emails:</td><td id="stat-invalid" class="text-error">0</td></tr>
                        <tr><td>Duplicates:</td><td id="stat-duplicates" class="text-warning">0</td></tr>
                        <tr><td>Import ready:</td><td id="stat-ready" class="text-success">0</td></tr>
                    </table>
                </div>
            </div>
        `;

        // Parse and validate
        await this.validateData();
    }

    /**
     * Validate CSV data
     * @private
     */
    async validateData() {
        const lines = this.state.rawData.split('\n');
        const format = this.formats[this.state.format];
        const separator = this.state.separator;

        this.state.items = [];
        let valid = 0, invalid = 0, duplicates = 0;
        const emailSet = new Set();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(separator);
            const headerMap = {};

            format.columns.forEach((col, idx) => {
                headerMap[col] = columns[idx]?.trim() || '';
            });

            const email = headerMap[format.emailColumn]?.toLowerCase();

            if (this.isValidEmail(email)) {
                if (emailSet.has(email)) {
                    duplicates++;
                } else {
                    emailSet.add(email);
                    this.state.items.push({
                        email,
                        domain: this.extractDomain(email),
                        status: 'new',
                        source: this.state.file.name,
                        importedAt: new Date().toISOString(),
                        rawData: headerMap
                    });
                    valid++;
                }
            } else {
                invalid++;
            }

            // Update progress
            const progress = (i / lines.length) * 100;
            document.getElementById('validation-progress').style.width = progress + '%';
            document.getElementById('validation-status').textContent = `Validated ${i}/${lines.length} rows...`;
        }

        // Show results
        document.getElementById('validation-results').style.display = 'block';
        document.getElementById('stat-total').textContent = lines.length - 1;
        document.getElementById('stat-valid').textContent = valid;
        document.getElementById('stat-invalid').textContent = invalid;
        document.getElementById('stat-duplicates').textContent = duplicates;
        document.getElementById('stat-ready').textContent = this.state.items.length;

        this.state.validationResults = { valid, invalid, duplicates, ready: this.state.items.length };

        console.log(`✅ Validation complete: ${valid} valid, ${invalid} invalid, ${duplicates} duplicates`);
    }

    /**
     * Step 4: Review & Confirmation
     * @private
     */
    renderStep4Review(container) {
        const results = this.state.validationResults;
        const preview = this.state.items.slice(0, 10);

        container.innerHTML = `
            <div class="step-content">
                <h3>Review Import Summary</h3>
                <div class="import-summary">
                    <div class="summary-stats">
                        <div class="stat-box success">
                            <div class="stat-value">${results.ready}</div>
                            <div class="stat-label">Ready to Import</div>
                        </div>
                        <div class="stat-box error">
                            <div class="stat-value">${results.invalid}</div>
                            <div class="stat-label">Invalid</div>
                        </div>
                        <div class="stat-box warning">
                            <div class="stat-value">${results.duplicates}</div>
                            <div class="stat-label">Duplicates</div>
                        </div>
                    </div>
                    <div class="preview-items">
                        <h4>Sample Items (showing first 10)</h4>
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Domain</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${preview.map(item => `
                                    <tr>
                                        <td>${item.email}</td>
                                        <td>${item.domain}</td>
                                        <td><span class="badge badge-info">${item.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Step 5: Process & Report
     * @private
     */
    async renderStep5Process(container) {
        container.innerHTML = `
            <div class="step-content">
                <h3>Importing Data</h3>
                <div class="import-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: 0%" id="import-progress"></div>
                    </div>
                    <p id="import-status">Starting import...</p>
                </div>
                <div id="import-report" style="display:none;">
                    <h4>Import Complete</h4>
                    <div class="report-stats">
                        <p><strong>Items imported:</strong> <span id="report-imported">0</span></p>
                        <p><strong>Time taken:</strong> <span id="report-time">0</span>s</p>
                        <p><strong>Speed:</strong> <span id="report-speed">0</span> items/sec</p>
                    </div>
                    <button id="download-report" class="btn btn-primary">Download Report</button>
                </div>
            </div>
        `;

        // Start import
        await this.performImport();
    }

    /**
     * Perform actual import
     * @private
     */
    async performImport() {
        const startTime = Date.now();
        const items = this.state.items;

        for (let i = 0; i < items.length; i++) {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 10));

            const progress = ((i + 1) / items.length) * 100;
            document.getElementById('import-progress').style.width = progress + '%';
            document.getElementById('import-status').textContent = `Importing ${i + 1}/${items.length}...`;
        }

        const duration = (Date.now() - startTime) / 1000;
        const speed = (items.length / duration).toFixed(2);

        // Show report
        document.getElementById('import-report').style.display = 'block';
        document.getElementById('report-imported').textContent = items.length;
        document.getElementById('report-time').textContent = duration.toFixed(2);
        document.getElementById('report-speed').textContent = speed;

        this.state.importStats = {
            imported: items.length,
            duration,
            speed,
            timestamp: new Date().toISOString()
        };

        this.notifyObservers('import-complete', {
            items,
            stats: this.state.importStats
        });

        console.log(`✅ Import complete: ${items.length} items in ${duration.toFixed(2)}s`);
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.element.addEventListener('click', (e) => {
            if (e.target.id === 'wizard-next') {
                if (this.currentStep < this.totalSteps) {
                    this.nextStep();
                } else {
                    // Final import
                    this.performImport();
                }
            } else if (e.target.id === 'wizard-prev') {
                this.prevStep();
            } else if (e.target.id === 'wizard-cancel') {
                this.cancel();
            }
        });
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.renderWizard();
            console.log(`➡️ Moving to step ${this.currentStep}`);
        }
    }

    /**
     * Go to previous step
     */
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderWizard();
            console.log(`⬅️ Moving to step ${this.currentStep}`);
        }
    }

    /**
     * Cancel wizard
     */
    cancel() {
        this.state = {
            file: null,
            rawData: null,
            format: null,
            separator: null,
            items: [],
            validationResults: null,
            importStats: null
        };
        this.currentStep = 1;
        this.renderWizard();
        this.notifyObservers('wizard-cancelled', {});
        console.log('❌ Wizard cancelled');
    }

    /**
     * Validate email format
     * @private
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Extract domain from email
     * @private
     */
    extractDomain(email) {
        const parts = email.split('@');
        return parts.length === 2 ? parts[1] : '';
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
}
