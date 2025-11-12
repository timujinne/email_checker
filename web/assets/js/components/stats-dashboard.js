/**
 * Statistics Dashboard
 * Displays blocklist statistics with interactive charts
 *
 * @module StatsDashboard
 */

class StatsDashboard {
    /**
     * Create StatsDashboard instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            chartType: 'bar',  // bar, pie, line
            topDomainsLimit: 10,
            trendDays: 30,
            ...options
        };

        this.searchIndex = null;
        this.data = null;
        this.charts = {};
        this.observers = [];

        console.log('📊 StatsDashboard initialized');
    }

    /**
     * Set search index data
     * @param {BlocklistSearch} searchIndex - Search index instance
     */
    setSearchIndex(searchIndex) {
        this.searchIndex = searchIndex;
        this.refreshData();
    }

    /**
     * Refresh dashboard data
     */
    refreshData() {
        if (!this.searchIndex) {
            console.warn('⚠️ Search index not set');
            return;
        }

        this.data = {
            stats: this.searchIndex.getStats(),
            topDomains: this.searchIndex.getTopDomains(this.options.topDomainsLimit),
            domainRisks: this.getDomainRisks(),
            distribution: this.getDistribution(),
            trends: this.calculateTrends()
        };

        this.render();
        this.notifyObservers('data-refreshed', this.data);
    }

    /**
     * Get domain risk assessment
     * @private
     */
    getDomainRisks() {
        const domains = this.searchIndex.getTopDomains(20);
        return domains.map(d => this.searchIndex.getDomainRisk(d.domain));
    }

    /**
     * Get status distribution
     * @private
     */
    getDistribution() {
        const stats = this.searchIndex.getStats();
        const total = stats.total || 1;

        return {
            blocked: { count: stats.blocked, percentage: (stats.blocked / total * 100).toFixed(1) },
            allowed: { count: stats.allowed, percentage: (stats.allowed / total * 100).toFixed(1) },
            new: { count: stats.new, percentage: (stats.new / total * 100).toFixed(1) }
        };
    }

    /**
     * Calculate trends over time
     * @private
     */
    calculateTrends() {
        const data = [];
        const days = this.options.trendDays;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            data.push({
                date: dateStr,
                new: Math.floor(Math.random() * 50) + 10,  // Mock data
                total: Math.floor(Math.random() * 100) + 50
            });
        }

        return data;
    }

    /**
     * Render dashboard
     */
    render() {
        this.element.innerHTML = `
            <div class="stats-dashboard">
                <div class="dashboard-header">
                    <h2>Blocklist Statistics</h2>
                    <button id="refresh-stats" class="btn btn-sm btn-secondary">🔄 Refresh</button>
                </div>

                <div class="stats-grid">
                    <!-- KPI Cards -->
                    <div class="kpi-cards">
                        ${this.renderKPICards()}
                    </div>

                    <!-- Charts -->
                    <div class="charts-section">
                        <div class="chart-container">
                            <h3>Distribution by Status</h3>
                            <canvas id="distribution-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <h3>Top Blocked Domains</h3>
                            <div id="chart-type-selector">
                                <button data-type="bar" class="btn-chart ${this.options.chartType === 'bar' ? 'active' : ''}">Bar</button>
                                <button data-type="pie" class="btn-chart ${this.options.chartType === 'pie' ? 'active' : ''}">Pie</button>
                            </div>
                            <canvas id="domains-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <h3>Blocking Trends (${this.options.trendDays} days)</h3>
                            <canvas id="trends-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <h3>Domain Risk Levels</h3>
                            <div id="risk-table"></div>
                        </div>
                    </div>

                    <!-- Detailed Table -->
                    <div class="table-section">
                        <h3>Top Blocked Domains Detail</h3>
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th>Domain</th>
                                    <th>Total Emails</th>
                                    <th>Blocked</th>
                                    <th>Risk Level</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody id="domains-detail"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.renderCharts();
        this.setupEventListeners();
    }

    /**
     * Render KPI cards
     * @private
     */
    renderKPICards() {
        const stats = this.data.stats;
        const dist = this.data.distribution;

        return `
            <div class="kpi-card">
                <div class="kpi-value">${stats.total}</div>
                <div class="kpi-label">Total Items</div>
                <div class="kpi-change">+${stats.total > 0 ? stats.total : 0}</div>
            </div>
            <div class="kpi-card error">
                <div class="kpi-value">${stats.blocked}</div>
                <div class="kpi-label">Blocked Emails</div>
                <div class="kpi-change">${dist.blocked.percentage}% of total</div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-value">${stats.allowed}</div>
                <div class="kpi-label">Allowed Emails</div>
                <div class="kpi-change">${dist.allowed.percentage}% of total</div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-value">${stats.new}</div>
                <div class="kpi-label">New Emails</div>
                <div class="kpi-change">${dist.new.percentage}% of total</div>
            </div>
            <div class="kpi-card info">
                <div class="kpi-value">${stats.uniqueDomains}</div>
                <div class="kpi-label">Unique Domains</div>
            </div>
        `;
    }

    /**
     * Render charts
     * @private
     */
    renderCharts() {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js not loaded, skipping charts');
            return;
        }

        this.renderDistributionChart();
        this.renderDomainsChart();
        this.renderTrendsChart();
        this.renderRiskTable();
    }

    /**
     * Render distribution chart
     * @private
     */
    renderDistributionChart() {
        const ctx = document.getElementById('distribution-chart');
        const dist = this.data.distribution;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Blocked', 'Allowed', 'New'],
                datasets: [{
                    data: [dist.blocked.count, dist.allowed.count, dist.new.count],
                    backgroundColor: ['#ef4444', '#22c55e', '#3b82f6'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Render domains chart
     * @private
     */
    renderDomainsChart() {
        const ctx = document.getElementById('domains-chart');
        const domains = this.data.topDomains;

        const chartType = this.options.chartType;
        const labels = domains.map(d => d.domain);
        const data = domains.map(d => d.blockedCount);

        new Chart(ctx, {
            type: chartType,
            data: {
                labels,
                datasets: [{
                    label: 'Blocked Emails',
                    data,
                    backgroundColor: chartType === 'pie' ?
                        ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'] :
                        '#ef4444',
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: chartType === 'bar' ? 'y' : undefined,
                plugins: {
                    legend: chartType === 'pie' ? { position: 'bottom' } : { display: false }
                }
            }
        });
    }

    /**
     * Render trends chart
     * @private
     */
    renderTrendsChart() {
        const ctx = document.getElementById('trends-chart');
        const trends = this.data.trends;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(t => t.date),
                datasets: [
                    {
                        label: 'New Emails',
                        data: trends.map(t => t.new),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Total Blocked',
                        data: trends.map(t => t.total),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Render risk table
     * @private
     */
    renderRiskTable() {
        const riskEl = document.getElementById('risk-table');
        const risks = this.data.domainRisks.slice(0, 5);

        riskEl.innerHTML = `
            <table class="risk-table">
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Blocked Count</th>
                        <th>Risk Level</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${risks.map(risk => `
                        <tr>
                            <td>${risk.domain}</td>
                            <td>${risk.blockedEmails}</td>
                            <td>
                                <span class="badge ${risk.riskLevel === 'high' ? 'badge-error' : risk.riskLevel === 'medium' ? 'badge-warning' : 'badge-success'}">
                                    ${risk.riskLevel.toUpperCase()}
                                </span>
                            </td>
                            <td><span class="score-bar" style="width: ${risk.riskScore}%"></span> ${risk.riskScore}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Render detailed table
        const detailEl = document.getElementById('domains-detail');
        detailEl.innerHTML = this.data.topDomains.map(d => {
            const risk = this.data.domainRisks.find(r => r.domain === d.domain);
            return `
                <tr>
                    <td>${d.domain}</td>
                    <td>${d.count}</td>
                    <td>${d.blockedCount}</td>
                    <td>
                        <span class="badge ${risk?.riskLevel === 'high' ? 'badge-error' : risk?.riskLevel === 'medium' ? 'badge-warning' : 'badge-success'}">
                            ${risk?.riskLevel?.toUpperCase() || 'UNKNOWN'}
                        </span>
                    </td>
                    <td>${(d.blockedCount / d.count * 100).toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        document.getElementById('refresh-stats').addEventListener('click', () => {
            this.refreshData();
        });

        document.querySelectorAll('[data-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.options.chartType = btn.dataset.type;
                this.renderCharts();
            });
        });
    }

    /**
     * Export statistics as JSON
     * @returns {string} JSON string
     */
    exportAsJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    /**
     * Export statistics as CSV
     * @returns {string} CSV string
     */
    exportAsCSV() {
        let csv = 'Domain,Total,Blocked,Risk Level,Percentage\n';
        this.data.topDomains.forEach(d => {
            const risk = this.data.domainRisks.find(r => r.domain === d.domain);
            csv += `${d.domain},${d.count},${d.blockedCount},${risk?.riskLevel || 'unknown'},"${(d.blockedCount / d.count * 100).toFixed(1)}%"\n`;
        });
        return csv;
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
