/**
 * Analytics Dashboard
 * Main dashboard combining DateRangePicker, ChartSystem, and reporting
 * Supports drill-down, custom reports, and exports
 *
 * @module AnalyticsDashboard
 */

// Guard against duplicate class declaration
if (typeof AnalyticsDashboard === 'undefined') {
    window.AnalyticsDashboard = class AnalyticsDashboard {
    /**
     * Create AnalyticsDashboard instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = options;
        this.dateRangePicker = null;
        this.chartSystem = null;
        this.data = null;
        this.drillDownHistory = [];
        this.observers = [];

        console.log('📊 AnalyticsDashboard initialized');
        this.init();
    }

    /**
     * Initialize dashboard
     */
    async init() {
        this.render();
        this.initializeComponents();
        this.setupEventListeners();
        await this.loadData();
        console.log('✅ AnalyticsDashboard ready');
    }

    /**
     * Render dashboard UI
     */
    render() {
        this.element.innerHTML = `
            <div class="analytics-dashboard">
                <!-- Header -->
                <div class="analytics-header">
                    <h1>📊 Analytics Dashboard</h1>
                    <div class="header-actions">
                        <button id="btn-refresh" class="btn btn-secondary">🔄 Refresh</button>
                        <button id="btn-export" class="btn btn-secondary">📥 Export</button>
                        <button id="btn-build-report" class="btn btn-primary">📋 Build Report</button>
                    </div>
                </div>

                <!-- Date Range Picker -->
                <div id="date-picker-container" class="date-picker-container"></div>

                <!-- Breadcrumb Navigation (for drill-down) -->
                <div id="drill-breadcrumb" class="drill-breadcrumb" style="display:none;"></div>

                <!-- KPI Cards -->
                <div class="kpi-cards">
                    <div class="kpi-card">
                        <div class="kpi-value" id="kpi-total">0</div>
                        <div class="kpi-label">Total Items</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value" id="kpi-avg">0</div>
                        <div class="kpi-label">Average</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value" id="kpi-max">0</div>
                        <div class="kpi-label">Maximum</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-value" id="kpi-min">0</div>
                        <div class="kpi-label">Minimum</div>
                    </div>
                </div>

                <!-- Chart Tabs -->
                <div class="chart-tabs">
                    <button class="chart-tab active" data-chart="trends">📈 Trends</button>
                    <button class="chart-tab" data-chart="comparison">📊 Comparison</button>
                    <button class="chart-tab" data-chart="distribution">🥧 Distribution</button>
                    <button class="chart-tab" data-chart="heatmap">🔥 Heatmap</button>
                </div>

                <!-- Charts Container -->
                <div id="charts-container" class="charts-container">
                    <div id="chart-trends" class="chart-section active">
                        <h3>Trends Over Time</h3>
                        <canvas id="chart-trends-canvas"></canvas>
                    </div>
                    <div id="chart-comparison" class="chart-section">
                        <h3>Comparison by Category</h3>
                        <canvas id="chart-comparison-canvas"></canvas>
                    </div>
                    <div id="chart-distribution" class="chart-section">
                        <h3>Distribution</h3>
                        <canvas id="chart-distribution-canvas"></canvas>
                    </div>
                    <div id="chart-heatmap" class="chart-section">
                        <h3>Temporal Patterns</h3>
                        <canvas id="chart-heatmap-canvas"></canvas>
                    </div>
                </div>

                <!-- Saved Reports -->
                <div class="saved-reports">
                    <h2>Saved Reports</h2>
                    <div id="reports-list" class="reports-list">
                        <p>No saved reports yet</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Date Range Picker
        this.dateRangePicker = new DateRangePicker('date-picker-container');
        this.dateRangePicker.subscribe((event, data) => {
            if (event === 'range-changed') {
                this.onDateRangeChanged(data);
            }
        });

        // Chart System
        const chartsContainer = document.createElement('div');
        chartsContainer.id = 'charts-render-container';
        chartsContainer.style.display = 'none';
        this.element.appendChild(chartsContainer);

        this.chartSystem = new ChartSystem('charts-render-container');
        this.chartSystem.subscribe((event, data) => {
            if (event === 'chart-created') {
                console.log(`✅ Chart created: ${data.chartId}`);
            }
        });
    }

    /**
     * Load analytics data
     */
    async loadData() {
        // Mock data - replace with API call
        this.data = this.generateMockData();
        this.renderCharts();
        this.updateKPIs();
        this.loadSavedReports();
    }

    /**
     * Generate mock analytics data
     * @private
     */
    generateMockData() {
        const labels = [];
        const trendData = [];
        const date = new Date();

        for (let i = 29; i >= 0; i--) {
            const d = new Date(date);
            d.setDate(d.getDate() - i);
            labels.push(d.toISOString().split('T')[0]);
            trendData.push(Math.floor(Math.random() * 1000) + 100);
        }

        return {
            dates: labels,
            trends: {
                blocked: trendData.map(v => v * 0.4),
                allowed: trendData.map(v => v * 0.3),
                new: trendData.map(v => v * 0.3)
            },
            distribution: {
                blocked: 450,
                allowed: 350,
                new: 200
            },
            byDomain: {
                'gmail.com': 250,
                'yahoo.com': 180,
                'outlook.com': 150,
                'domain4.com': 120,
                'domain5.com': 100,
                'other': 350
            }
        };
    }

    /**
     * Render all charts
     */
    renderCharts() {
        // Line chart - trends
        const trendsContainer = document.createElement('div');
        trendsContainer.id = 'trends-chart-container';
        this.element.appendChild(trendsContainer);

        this.chartSystem.createLineChart(
            'trends',
            this.data.dates,
            [
                { label: 'Blocked', data: this.data.trends.blocked, color: '#ef4444' },
                { label: 'Allowed', data: this.data.trends.allowed, color: '#22c55e' },
                { label: 'New', data: this.data.trends.new, color: '#3b82f6' }
            ],
            { title: 'Email Trends Over Time' }
        );

        // Move chart to correct container
        const chart = trendsContainer.querySelector('canvas');
        if (chart) {
            document.getElementById('chart-trends').appendChild(chart);
            trendsContainer.remove();
        }

        // Bar chart - comparison
        const comparisonContainer = document.createElement('div');
        comparisonContainer.id = 'comparison-chart-container';
        this.element.appendChild(comparisonContainer);

        this.chartSystem.createBarChart(
            'comparison',
            Object.keys(this.data.byDomain),
            [{ label: 'Count', data: Object.values(this.data.byDomain) }],
            { title: 'Top Domains' }
        );

        const compChart = comparisonContainer.querySelector('canvas');
        if (compChart) {
            document.getElementById('chart-comparison').appendChild(compChart);
            comparisonContainer.remove();
        }

        // Pie chart - distribution
        const pieContainer = document.createElement('div');
        pieContainer.id = 'pie-chart-container';
        this.element.appendChild(pieContainer);

        this.chartSystem.createPieChart(
            'distribution',
            Object.keys(this.data.distribution),
            { data: Object.values(this.data.distribution) },
            { title: 'Status Distribution' }
        );

        const pieChart = pieContainer.querySelector('canvas');
        if (pieChart) {
            document.getElementById('chart-distribution').appendChild(pieChart);
            pieContainer.remove();
        }
    }

    /**
     * Update KPI cards
     */
    updateKPIs() {
        const allValues = Object.values(this.data.byDomain);
        const total = allValues.reduce((a, b) => a + b, 0);
        const avg = Math.round(total / allValues.length);
        const max = Math.max(...allValues);
        const min = Math.min(...allValues);

        document.getElementById('kpi-total').textContent = total;
        document.getElementById('kpi-avg').textContent = avg;
        document.getElementById('kpi-max').textContent = max;
        document.getElementById('kpi-min').textContent = min;
    }

    /**
     * Handle date range change
     */
    onDateRangeChanged(dateRange) {
        console.log(`📅 Date range changed: ${dateRange.startDate} to ${dateRange.endDate}`);
        // Reload data for new date range
        this.loadData();
        this.notifyObservers('date-range-changed', dateRange);
    }

    /**
     * Drill down to details
     */
    drillDown(dimension, value) {
        this.drillDownHistory.push({ dimension, value });
        this.updateDrillBreadcrumb();
        console.log(`🔍 Drilled down: ${dimension} = ${value}`);
        this.notifyObservers('drill-down', { dimension, value });
    }

    /**
     * Go back in drill-down
     */
    drillUp() {
        if (this.drillDownHistory.length > 0) {
            this.drillDownHistory.pop();
            this.updateDrillBreadcrumb();
            console.log(`⬆️ Drilled up`);
            this.notifyObservers('drill-up', {});
        }
    }

    /**
     * Update drill-down breadcrumb
     * @private
     */
    updateDrillBreadcrumb() {
        const breadcrumb = document.getElementById('drill-breadcrumb');
        if (this.drillDownHistory.length === 0) {
            breadcrumb.style.display = 'none';
            return;
        }

        breadcrumb.style.display = 'flex';
        breadcrumb.innerHTML = `
            <button class="breadcrumb-item" onclick="this.parentElement.parentElement.analyticsInstance?.drillUp()">
                All Data
            </button>
            ${this.drillDownHistory.map((item, idx) => `
                <span class="breadcrumb-sep">/</span>
                <button class="breadcrumb-item">${item.dimension}: ${item.value}</button>
            `).join('')}
        `;

        this.element.analyticsInstance = this;
    }

    /**
     * Build custom report
     */
    buildCustomReport() {
        const reportName = prompt('Report name:');
        if (!reportName) return;

        const report = {
            id: `report_${Date.now()}`,
            name: reportName,
            dateRange: this.dateRangePicker.getDateRange(),
            charts: ['trends', 'comparison', 'distribution'],
            created: new Date().toISOString()
        };

        // Save report
        let savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        savedReports.push(report);
        localStorage.setItem('saved_reports', JSON.stringify(savedReports));

        this.loadSavedReports();
        alert(`✅ Report "${reportName}" saved`);
        this.notifyObservers('report-created', report);
    }

    /**
     * Load and display saved reports
     */
    loadSavedReports() {
        const savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        const listEl = document.getElementById('reports-list');

        if (savedReports.length === 0) {
            listEl.innerHTML = '<p>No saved reports yet</p>';
            return;
        }

        listEl.innerHTML = `
            <div class="reports-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${savedReports.map(report => `
                            <tr>
                                <td>${report.name}</td>
                                <td>${new Date(report.created).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="alert('Load report: ${report.id}')">Load</button>
                                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.parentElement.parentElement.analyticsInstance?.deleteReport('${report.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.element.analyticsInstance = this;
    }

    /**
     * Delete saved report
     */
    deleteReport(reportId) {
        let savedReports = JSON.parse(localStorage.getItem('saved_reports') || '[]');
        savedReports = savedReports.filter(r => r.id !== reportId);
        localStorage.setItem('saved_reports', JSON.stringify(savedReports));
        this.loadSavedReports();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        // Refresh button
        document.getElementById('btn-refresh').addEventListener('click', () => {
            this.loadData();
            console.log('🔄 Data refreshed');
        });

        // Build report button
        document.getElementById('btn-build-report').addEventListener('click', () => {
            this.buildCustomReport();
        });

        // Export button
        document.getElementById('btn-export').addEventListener('click', () => {
            this.showExportDialog();
        });

        // Chart tabs
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const chartName = e.target.dataset.chart;
                this.switchChart(chartName);
            });
        });
    }

    /**
     * Switch chart tab
     * @private
     */
    switchChart(chartName) {
        document.querySelectorAll('.chart-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`chart-${chartName}`).classList.add('active');

        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-chart="${chartName}"]`).classList.add('active');
    }

    /**
     * Show export dialog
     * @private
     */
    showExportDialog() {
        const format = prompt('Export format (csv/pdf/json):', 'csv');
        if (!format) return;

        if (format === 'csv') {
            this.chartSystem.exportAsCSV('trends', 'analytics-export.csv');
        } else if (format === 'json') {
            this.exportAsJSON();
        } else {
            alert('PDF export coming soon');
        }
    }

    /**
     * Export as JSON
     * @private
     */
    exportAsJSON() {
        const data = {
            exportedAt: new Date().toISOString(),
            dateRange: this.dateRangePicker.getDateRange(),
            data: this.data
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analytics-export.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            dateRange: this.dateRangePicker.getDateRange(),
            drillDownPath: this.drillDownHistory,
            data: this.data
        };
    }
    }; // End of AnalyticsDashboard class
} // End of guard check

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsDashboard: window.AnalyticsDashboard };
}
