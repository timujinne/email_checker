/**
 * Filter Tester Component
 * Playground for testing filters on sample data
 *
 * @module FilterTester
 */

class FilterTester {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.config = config;
        this.scorer = new FilterScorer(config);
        this.sampleEmails = this.generateSampleEmails();
        this.uploadedEmails = null;
        this.currentSource = 'sample'; // 'sample' or 'upload'
        this.results = [];

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.render();
    }

    /**
     * Generate sample emails for testing
     */
    generateSampleEmails() {
        return [
            { email: 'john.smith@hydraulics-italy.it', company: 'Hydraulics Italy', country: 'Italy' },
            { email: 'contact@pump-systems.de', company: 'Pump Systems', country: 'Germany' },
            { email: 'sales@pressure.equipment.com', company: 'Pressure Equipment', country: 'USA' },
            { email: 'noreply@marketplace.it', company: 'Marketplace', country: 'Italy' },
            { email: 'info@oem-manufacturer.com', company: 'OEM Manufacturer', country: 'Germany' },
            { email: 'bounce-handler@system.local', company: 'System', country: 'USA' },
            { email: 'marco@idraulica-central.it', company: 'Idraulica Central', country: 'Italy' },
            { email: 'support@pump.company.de', company: 'Pump Company', country: 'Germany' },
            { email: 'dropshipper@reseller.com', company: 'Reseller', country: 'USA' }
        ];
    }

    /**
     * Render tester UI
     */
    render() {
        const html = `
            <div class="space-y-6">
                <!-- Upload Section -->
                <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">📤 Test Data</h3>

                    <!-- Data Source Tabs -->
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Test Data Source</span>
                        </label>

                        <div class="tabs tabs-boxed mb-4">
                            <a class="tab tab-active" data-source="sample" id="tab-sample">Sample Data</a>
                            <a class="tab" data-source="upload" id="tab-upload">Upload File</a>
                        </div>

                        <!-- Sample Data Section -->
                        <div id="section-sample">
                            <div class="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Using 9 sample emails representing different scenarios (high, medium, low priority)</span>
                            </div>
                        </div>

                        <!-- File Upload Section -->
                        <div id="section-upload" class="hidden">
                            <div class="form-control w-full">
                                <label class="label">
                                    <span class="label-text">Select file</span>
                                    <span class="label-text-alt">TXT, CSV, or LVP format</span>
                                </label>

                                <input
                                    type="file"
                                    id="file-upload-input"
                                    accept=".txt,.csv,.lvp"
                                    class="file-input file-input-bordered file-input-primary w-full"
                                />

                                <!-- File Info Display -->
                                <div id="file-info" class="mt-2 hidden">
                                    <div class="alert alert-info">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 h-6 w-6">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <div>
                                            <p id="file-name" class="font-semibold"></p>
                                            <p id="file-details" class="text-sm"></p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Error Display -->
                                <div id="file-error" class="mt-2 hidden">
                                    <div class="alert alert-error">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 h-6 w-6">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span id="file-error-message"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Auto-run option -->
                    <div class="form-control mt-4">
                        <label class="label cursor-pointer">
                            <span class="label-text">Auto-run test after upload</span>
                            <input type="checkbox" id="auto-run-test" class="checkbox checkbox-primary" checked />
                        </label>
                    </div>

                    <div class="flex gap-2 mt-4">
                        <button id="btn-run-test" class="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Run Test
                        </button>
                        <button id="btn-clear-results" class="btn btn-ghost">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear
                        </button>
                    </div>
                </div>

                <!-- Results Section -->
                <div id="results-container" style="display: none;">
                    <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">📊 Test Results</h3>

                        <!-- Statistics -->
                        <div id="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        </div>

                        <!-- Results Table -->
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #e2e8f0;">
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Email</th>
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Score</th>
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Priority</th>
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Details</th>
                                    </tr>
                                </thead>
                                <tbody id="results-table-body">
                                </tbody>
                            </table>
                        </div>

                        <!-- Export Buttons -->
                        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button id="btn-export-csv" style="padding: 0.5rem 1rem; background: #065f46; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                                📥 Export CSV
                            </button>
                            <button id="btn-export-json" style="padding: 0.5rem 1rem; background: #065f46; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                                📥 Export JSON
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div id="empty-state" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-6">
                    <p style="text-align: center; color: #64748b;">
                        📋 Run test to see scoring results for sample emails
                    </p>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachListeners();
    }

    /**
     * Attach event listeners
     */
    attachListeners() {
        // Tab switching
        document.querySelectorAll('.tab[data-source]').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSource(e.target.dataset.source));
        });

        // File upload
        const fileInput = document.getElementById('file-upload-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Test buttons
        document.getElementById('btn-run-test')?.addEventListener('click', () => this.runTest());
        document.getElementById('btn-clear-results')?.addEventListener('click', () => this.clearResults());
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());
        document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJSON());
    }

    /**
     * Switch between sample and upload sources
     * @param {string} source - 'sample' or 'upload'
     */
    switchSource(source) {
        // Update active tab
        document.querySelectorAll('.tab[data-source]').forEach(tab => {
            tab.classList.toggle('tab-active', tab.dataset.source === source);
        });

        // Show/hide sections
        document.getElementById('section-sample').classList.toggle('hidden', source !== 'sample');
        document.getElementById('section-upload').classList.toggle('hidden', source !== 'upload');

        this.currentSource = source;
    }

    /**
     * Handle file selection
     * @param {Event} event - Change event
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];

        // Hide previous messages
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('file-error').classList.add('hidden');

        if (!file) return;

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showFileError(validation.error);
            return;
        }

        // Show file info
        this.showFileInfo(file);

        try {
            // Parse file
            if (typeof toast !== 'undefined') {
                toast.info('Parsing file...');
            }
            const emails = await this.parseFile(file);

            if (emails.length === 0) {
                throw new Error('No valid emails found in file');
            }

            // Store parsed emails
            this.uploadedEmails = emails;

            // Update file info with count
            document.getElementById('file-details').textContent =
                `${this.formatFileSize(file.size)}, ${emails.length} emails found`;

            if (typeof toast !== 'undefined') {
                toast.success(`Loaded ${emails.length} emails from ${file.name}`);
            }

            // Auto-run test if checkbox is checked
            const autoRunCheckbox = document.getElementById('auto-run-test');
            if (autoRunCheckbox && autoRunCheckbox.checked) {
                this.runTest();
            }

        } catch (error) {
            console.error('File parsing error:', error);
            this.showFileError(error.message);
            if (typeof toast !== 'undefined') {
                toast.error(`Failed to parse file: ${error.message}`);
            }
        }
    }

    /**
     * Validate uploaded file
     * @param {File} file - Uploaded file
     * @returns {Object} - Validation result {valid, error}
     */
    validateFile(file) {
        // Check file exists
        if (!file) {
            return {valid: false, error: 'No file selected'};
        }

        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['txt', 'csv', 'lvp'].includes(extension)) {
            return {valid: false, error: `Invalid file type (expected .txt, .csv, or .lvp, got .${extension})`};
        }

        // Check file size - different limits for different types
        let maxSize;
        if (extension === 'lvp') {
            maxSize = 50 * 1024 * 1024; // 50MB for LVP files
        } else {
            maxSize = 10 * 1024 * 1024; // 10MB for TXT/CSV files
        }

        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            return {
                valid: false,
                error: `File too large (max ${maxSizeMB}MB for .${extension} files, got ${this.formatFileSize(file.size)})`
            };
        }

        // Check file is not empty
        if (file.size === 0) {
            return {valid: false, error: 'File is empty'};
        }

        return {valid: true};
    }

    /**
     * Parse uploaded file content
     * @param {File} file - Uploaded file
     * @returns {Promise<Array>} - Array of email objects
     */
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const extension = file.name.split('.').pop().toLowerCase();

                    let emails;

                    if (extension === 'txt') {
                        emails = this.parseTxtFile(content);
                    } else if (extension === 'csv') {
                        emails = this.parseCsvFile(content);
                    } else if (extension === 'lvp') {
                        emails = this.parseLvpFile(content);
                    } else {
                        throw new Error('Unsupported file format');
                    }

                    resolve(emails);

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Parse TXT file (one email per line)
     * @param {string} content - File content
     * @returns {Array} - Email objects
     */
    parseTxtFile(content) {
        const lines = content.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        return lines.map((email, index) => ({
            email: email,
            company: this.extractDomain(email),
            country: null,
            metadata: {},
            source: 'uploaded_file',
            line_number: index + 1
        }));
    }

    /**
     * Parse CSV file (with optional metadata columns)
     * @param {string} content - File content
     * @returns {Array} - Email objects
     */
    parseCsvFile(content) {
        const lines = content.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            throw new Error('File is empty');
        }

        // Check if first line is header
        const firstLine = lines[0];
        const hasHeader = firstLine.toLowerCase().includes('email') ||
                         firstLine.toLowerCase().includes('company');

        const dataLines = hasHeader ? lines.slice(1) : lines;

        return dataLines.map((line, index) => {
            const columns = this.parseCsvLine(line);

            // Try to detect email column
            const emailColumn = columns.findIndex(col =>
                col.includes('@') && col.includes('.')
            );

            if (emailColumn === -1) {
                console.warn(`No email found in line ${index + 1}: ${line}`);
                return null;
            }

            const email = columns[emailColumn];

            return {
                email: email,
                company: columns[1] || this.extractDomain(email),
                country: columns[2] || null,
                metadata: {
                    raw_line: line,
                    column_count: columns.length
                },
                source: 'uploaded_csv',
                line_number: index + 1
            };
        }).filter(item => item !== null);
    }

    /**
     * Parse LVP file (XML format with email metadata)
     * @param {string} content - File content
     * @returns {Array} - Email objects
     */
    parseLvpFile(content) {
        const emails = [];

        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // Check for parse errors
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML format in LVP file');
            }

            // Extract records (try multiple possible tag names)
            const records = xmlDoc.querySelectorAll('record, Record, RECORD, item, Item');

            if (records.length === 0) {
                throw new Error('No records found in LVP file');
            }

            console.log(`Found ${records.length} records in LVP file`);

            records.forEach((record, index) => {
                // Try to find email in various possible tags
                const emailEl = record.querySelector('email, Email, EMAIL, e_mail, E_MAIL, mail, Mail');

                if (emailEl && emailEl.textContent) {
                    const email = emailEl.textContent.trim();

                    // Extract metadata
                    const companyEl = record.querySelector('company, Company, COMPANY, organization, Organization');
                    const countryEl = record.querySelector('country, Country, COUNTRY, pais, Pais');
                    const nameEl = record.querySelector('name, Name, NAME, contact_name, ContactName');
                    const phoneEl = record.querySelector('phone, Phone, PHONE, tel, Tel, telephone');

                    emails.push({
                        email: email,
                        company: companyEl ? companyEl.textContent.trim() : this.extractDomain(email),
                        country: countryEl ? countryEl.textContent.trim() : null,
                        metadata: {
                            name: nameEl ? nameEl.textContent.trim() : null,
                            phone: phoneEl ? phoneEl.textContent.trim() : null,
                            source: 'lvp'
                        },
                        source: 'uploaded_lvp',
                        line_number: index + 1
                    });
                }
            });

            if (emails.length === 0) {
                throw new Error('No valid emails found in LVP file');
            }

            console.log(`Parsed ${emails.length} emails from LVP file`);
            return emails;

        } catch (error) {
            console.error('LVP parsing error:', error);
            throw new Error(`Failed to parse LVP file: ${error.message}`);
        }
    }

    /**
     * Parse CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} - Columns
     */
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());

        return result;
    }

    /**
     * Extract domain from email
     * @param {string} email - Email address
     * @returns {string} - Domain name
     */
    extractDomain(email) {
        const parts = email.split('@');
        if (parts.length === 2) {
            return parts[1].split('.')[0]; // Get company part (before TLD)
        }
        return 'Unknown';
    }

    /**
     * Show file info
     * @param {File} file - Uploaded file
     */
    showFileInfo(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-details').textContent = `${this.formatFileSize(file.size)}, parsing...`;
        document.getElementById('file-info').classList.remove('hidden');
    }

    /**
     * Show file error
     * @param {string} error - Error message
     */
    showFileError(error) {
        document.getElementById('file-error-message').textContent = error;
        document.getElementById('file-error').classList.remove('hidden');
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Run test on sample or uploaded data
     */
    runTest() {
        // Clear previous results
        this.results = [];
        document.getElementById('results-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';

        try {
            // Determine data source
            let emailsToTest;

            if (this.currentSource === 'upload' && this.uploadedEmails) {
                emailsToTest = this.uploadedEmails;
                if (typeof toast !== 'undefined') {
                    toast.info(`Testing ${emailsToTest.length} uploaded emails...`);
                }
            } else {
                emailsToTest = this.sampleEmails;
                if (typeof toast !== 'undefined') {
                    toast.info('Testing 9 sample emails...');
                }
            }

            // Score all emails
            this.results = this.scorer.scoreEmails(emailsToTest);

            // Sort by score descending
            this.results.sort((a, b) => (b.score || 0) - (a.score || 0));

            // Display results
            this.displayResults();

            if (typeof toast !== 'undefined') {
                toast.success('Test completed!');
            }

        } catch (error) {
            console.error('Test error:', error);
            if (typeof toast !== 'undefined') {
                toast.error(`Test failed: ${error.message}`);
            }
        }
    }

    /**
     * Display results in table
     */
    displayResults() {
        const resultsContainer = document.getElementById('results-container');
        const emptyState = document.getElementById('empty-state');
        const statsGrid = document.getElementById('stats-grid');
        const tableBody = document.getElementById('results-table-body');

        resultsContainer.style.display = 'block';
        emptyState.style.display = 'none';

        // Calculate statistics
        const stats = this.scorer.getStatistics(this.results);

        // Display statistics
        statsGrid.innerHTML = `
            <div style="background: #f1f5f9; padding: 1rem; border-radius: 0.375rem;">
                <div style="font-size: 0.875rem; color: #64748b;">Total</div>
                <div style="font-size: 1.5rem; font-weight: 600;">${stats.total}</div>
            </div>
            <div style="background: #d1fae5; padding: 1rem; border-radius: 0.375rem;">
                <div style="font-size: 0.875rem; color: #065f46;">High</div>
                <div style="font-size: 1.5rem; font-weight: 600;">${stats.high}</div>
            </div>
            <div style="background: #fef3c7; padding: 1rem; border-radius: 0.375rem;">
                <div style="font-size: 0.875rem; color: #92400e;">Medium</div>
                <div style="font-size: 1.5rem; font-weight: 600;">${stats.medium}</div>
            </div>
            <div style="background: #fee2e2; padding: 1rem; border-radius: 0.375rem;">
                <div style="font-size: 0.875rem; color: #991b1b;">Low/Excluded</div>
                <div style="font-size: 1.5rem; font-weight: 600;">${stats.low + stats.excluded}</div>
            </div>
        `;

        // Display results table
        let tableHTML = '';
        for (const result of this.results) {
            const scoreClass = result.priority === 'HIGH' ? 'score-high' :
                              result.priority === 'MEDIUM' ? 'score-medium' : 'score-low';

            tableHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 0.75rem;">${result.email}</td>
                    <td style="padding: 0.75rem;">
                        <span class="score-display ${scoreClass}">${result.score.toFixed(1)}</span>
                    </td>
                    <td style="padding: 0.75rem; font-weight: 500;">${result.priority}</td>
                    <td style="padding: 0.75rem;">
                        <button class="btn-show-details" data-email="${result.email}" style="padding: 0.25rem 0.75rem; background: #cbd5e1; color: #1e293b; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
                            🔍
                        </button>
                    </td>
                </tr>
            `;
        }
        tableBody.innerHTML = tableHTML;

        // Attach details buttons
        document.querySelectorAll('.btn-show-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.target.dataset.email;
                const result = this.results.find(r => r.email === email);
                this.showDetails(result);
            });
        });
    }

    /**
     * Show detailed breakdown for email
     */
    showDetails(result) {
        const breakdown = this.scorer.getDetailedBreakdown(result);

        const html = `
            <div class="bg-base-100 text-base-content" style="border-radius: 0.5rem; padding: 1.5rem; max-width: 500px;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">${result.email}</h3>

                <div style="margin-bottom: 1.5rem;">
                    <div style="font-size: 2rem; font-weight: 700;">Score: <span class="score-display" style="display: inline;">${result.score.toFixed(2)}</span></div>
                    <div style="font-size: 1.125rem; font-weight: 600; color: #1e40af; margin-top: 0.5rem;">Priority: ${result.priority}</div>
                </div>

                <div style="space-y: 1rem;">
                    ${Object.entries(breakdown.components).map(([key, comp]) => `
                        <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem;">${key.replace(/_/g, ' ')}</div>
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">${comp.description}</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                                <div>Raw: ${comp.raw.toFixed(1)}</div>
                                <div>Weighted: ${comp.weighted.toFixed(2)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 0.75rem; background: #1e40af; color: white; border: none; border-radius: 0.375rem; cursor: pointer; margin-top: 1rem;">
                    Close
                </button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;';
        overlay.innerHTML = html;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    /**
     * Clear results
     */
    clearResults() {
        this.results = [];
        document.getElementById('results-container').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
    }

    /**
     * Export results as CSV
     */
    exportCSV() {
        let csv = 'Email,Score,Priority\n';
        for (const result of this.results) {
            csv += `"${result.email}",${result.score.toFixed(2)},"${result.priority}"\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filter_test_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    }

    /**
     * Export results as JSON
     */
    exportJSON() {
        const json = JSON.stringify(this.results, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filter_test_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('JSON exported');
    }

    /**
     * Update config and re-run
     */
    updateConfig(newConfig) {
        this.config = newConfig;
        this.scorer.updateConfig(newConfig);
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FilterTester };
}

// Export for browser (global scope)
if (typeof window !== 'undefined') {
    window.FilterTester = FilterTester;
}
