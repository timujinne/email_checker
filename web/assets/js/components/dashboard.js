/**
 * Dashboard Component
 * Manages charts, KPI, activity feed, and system status
 */

class DashboardManager {
    constructor() {
        this.charts = new Map();
        this.updateInterval = null;
        this.activityLimit = 20;
    }

    /**
     * Initialize dashboard
     */
    init() {
        console.log('📊 Initializing Dashboard...');

        // Initialize charts
        this.initCharts();

        // Setup WebSocket listeners
        this.setupWebSocketListeners();

        // Setup state listeners
        this.setupStateListeners();

        // Load initial data
        this.loadDashboardData();

        // Setup auto-refresh (every 30 seconds)
        this.updateInterval = setInterval(() => {
            this.refreshData();
        }, 30000);

        console.log('✅ Dashboard initialized');
    }

    /**
     * Initialize all charts
     */
    initCharts() {
        // Destroy existing charts before creating new ones
        if (this.charts.size > 0) {
            console.log('🗑️ Destroying existing charts before reinitializing...');
            this.charts.forEach((chart, key) => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.charts.clear();
        }

        const ctx1 = document.getElementById('processing-trend-chart');
        const ctx2 = document.getElementById('result-distribution-chart');

        if (!ctx1 || !ctx2) {
            console.warn('⚠️ Chart containers not found');
            return;
        }

        // Country Quality Chart (Horizontal Bar Chart)
        this.charts.set('country-quality', new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: [],  // Будет заполнено реальными данными
                datasets: [
                    {
                        label: 'Чистые email',
                        data: [],  // Будет заполнено реальными данными
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    },
                    {
                        label: 'Заблокированные',
                        data: [],  // Будет заполнено реальными данными
                        backgroundColor: '#ef4444',
                        borderColor: '#dc2626',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',  // Horizontal bar
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: this.getTextColor(),
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.x.toLocaleString();
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: this.getGridColor()
                        },
                        ticks: {
                            color: this.getTextColor(),
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.getTextColor(),
                            font: { size: 11 }
                        }
                    }
                }
            }
        }));

        // Result Distribution Chart (Doughnut)
        this.charts.set('distribution', new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Чистые', 'Заблокированы', 'Невалидные'],
                datasets: [{
                    data: [680, 70, 50],
                    backgroundColor: [
                        '#065f46',  // Success
                        '#991b1b',  // Danger
                        '#92400e'   // Warning
                    ],
                    borderColor: [
                        this.getBgColor(),
                        this.getBgColor(),
                        this.getBgColor()
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.getTextColor(),
                            padding: 20,
                            font: { size: 12 }
                        }
                    }
                }
            }
        }));

        console.log('✅ Charts initialized');
    }

    /**
     * Setup WebSocket listeners
     */
    setupWebSocketListeners() {
        if (typeof ws === 'undefined') return;

        ws.on('task.started', (data) => {
            this.addActivity(`🚀 Задача начата: ${data.name}`);
        });

        ws.on('task.progress', (data) => {
            // Update KPI silently
            if (data.processed) {
                document.getElementById('kpi-processed').textContent = data.processed.toLocaleString();
            }
        });

        ws.on('task.completed', (data) => {
            this.addActivity(`✅ Завершено: ${data.name}`);
            this.refreshData();
        });

        ws.on('connected', () => {
            document.getElementById('ws-status').textContent = '✓ Подключено';
            document.getElementById('ws-status').className = 'text-lg font-semibold text-success';
            document.getElementById('ws-detail').textContent = 'Real-time обновления активны';
        });

        ws.on('disconnected', () => {
            document.getElementById('ws-status').textContent = '🔄 Переподключение...';
            document.getElementById('ws-status').className = 'text-lg font-semibold text-warning';
            document.getElementById('ws-detail').textContent = 'Попытка восстановления соединения';
        });
    }

    /**
     * Setup state listeners
     */
    setupStateListeners() {
        store.subscribe((state) => {
            if (state.stats) {
                this.updateKPI(state.stats);
            }
        });

        themeManager.subscribe(() => {
            // Update chart colors on theme change
            this.updateChartColors();
        });
    }

    /**
     * Update KPI display
     */
    updateKPI(stats) {
        const elements = {
            'kpi-processed': stats.processed,
            'kpi-clean': stats.clean,
            'kpi-blocked': stats.blocked,
            'kpi-queue': stats.queueLength
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value.toLocaleString();
            }
        }
    }

    /**
     * Add activity to feed
     */
    addActivity(message) {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;

        // Clear placeholder if exists
        const placeholder = feed.querySelector('.text-center');
        if (placeholder) placeholder.remove();

        // Create new activity item
        const item = document.createElement('div');
        item.className = 'p-3 bg-base-200 rounded border border-base-300 text-sm';
        item.innerHTML = `
            <div class="flex items-start justify-between">
                <span class="flex-1">${message}</span>
                <span class="text-xs text-base-content opacity-60 ml-2 flex-shrink-0">${this.getCurrentTime()}</span>
            </div>
        `;

        feed.insertBefore(item, feed.firstChild);

        // Limit to activityLimit items
        while (feed.children.length > this.activityLimit) {
            feed.removeChild(feed.lastChild);
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            // Check if API is available
            if (typeof api === 'undefined') {
                console.warn('⚠️ API service not available');
                return;
            }

            // Fetch real statistics from backend
            const response = await api.get('/api/dashboard-stats');
            const stats = response.data.stats;

            // Transform to KPI format
            const kpiStats = {
                processed: stats.processed_emails || 0,
                clean: stats.clean_emails || 0,
                blocked: stats.blocked_emails || 0,
                queueLength: stats.queue_length || 0
            };

            // Store in global state
            store.set('stats', kpiStats);
            store.set('dashboardStats', stats); // Full stats for other uses

            // Update KPI display
            this.updateKPI(kpiStats);

            // Update charts with real data
            this.updateChartsWithRealData(stats);

            // Add recent activity
            if (stats.recent_activity && stats.recent_activity.length > 0) {
                stats.recent_activity.forEach(activity => {
                    // Обработка даты: либо ISO строка (processed_at), либо Unix timestamp (modified)
                    let timestamp;
                    if (activity.processed_at) {
                        // ISO строка из БД
                        timestamp = new Date(activity.processed_at).toLocaleString('ru-RU');
                    } else if (activity.modified) {
                        // Unix timestamp из старого формата
                        timestamp = new Date(activity.modified * 1000).toLocaleString('ru-RU');
                    } else {
                        timestamp = 'Неизвестно';
                    }

                    const size = activity.size || activity.output_size || 0;
                    this.addActivity(`📂 ${activity.filename} (${this.formatBytes(size)}) - ${timestamp}`);
                });
            }

            this.addActivity('📊 Данные панели загружены');
            console.log('✅ Dashboard data loaded:', stats);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error('Не удалось загрузить данные: ' + error.message);

            // Fallback to empty stats
            const fallbackStats = {
                processed: 0,
                clean: 0,
                blocked: 0,
                queueLength: 0
            };
            this.updateKPI(fallbackStats);
        }
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Update charts with real data from backend
     */
    updateChartsWithRealData(stats) {
        // Update country quality chart with real data
        const countryChart = this.charts.get('country-quality');
        if (countryChart && stats && stats.country_stats) {
            // Берем топ-10 стран
            const top10 = stats.country_stats.slice(0, 10);

            // Формируем labels с качеством
            const labels = top10.map(c => `${c.country} (${c.quality_score}%)`);
            const cleanData = top10.map(c => c.clean_emails);
            const blockedData = top10.map(c => c.blocked_emails);

            countryChart.data.labels = labels;
            countryChart.data.datasets[0].data = cleanData;
            countryChart.data.datasets[1].data = blockedData;
            countryChart.update();

            console.log(`✅ Country quality chart updated with ${top10.length} countries`);
        }

        // Update distribution chart with real data
        const distributionChart = this.charts.get('distribution');
        if (distributionChart && stats) {
            distributionChart.data.datasets[0].data = [
                stats.clean_emails || 0,
                stats.blocked_emails || 0,
                stats.invalid_emails || 0
            ];
            distributionChart.update();
        }
    }

    /**
     * Refresh data
     */
    refreshData() {
        // In real app, would fetch fresh data from API
        console.log('🔄 Refreshing dashboard data...');
        this.loadDashboardData();
    }

    /**
     * Update chart colors on theme change
     */
    updateChartColors() {
        const trendChart = this.charts.get('trend');
        if (trendChart) {
            trendChart.options.plugins.legend.labels.color = this.getTextColor();
            trendChart.options.scales.x.ticks.color = this.getTextColor();
            trendChart.options.scales.y.ticks.color = this.getTextColor();
            trendChart.options.scales.y.grid.color = this.getGridColor();
            trendChart.update();
        }

        const distChart = this.charts.get('distribution');
        if (distChart) {
            distChart.options.plugins.legend.labels.color = this.getTextColor();
            distChart.update();
        }
    }

    /**
     * Get text color based on theme
     */
    getTextColor() {
        return themeManager.isDark() ? '#f1f5f9' : '#0f172a';
    }

    /**
     * Get background color based on theme
     */
    getBgColor() {
        return themeManager.isDark() ? '#1e293b' : '#ffffff';
    }

    /**
     * Get grid color based on theme
     */
    getGridColor() {
        return themeManager.isDark() ? '#334155' : '#e2e8f0';
    }

    /**
     * Generate date labels for last N days
     */
    generateDateLabels(days) {
        const labels = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
        }

        return labels;
    }

    /**
     * Get current time formatted
     */
    getCurrentTime() {
        return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Destroy dashboard
     */
    destroy() {
        // Destroy all charts
        for (const [name, chart] of this.charts) {
            chart.destroy();
        }
        this.charts.clear();

        // Clear interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log('📊 Dashboard destroyed');
    }
}

// Global instance
const dashboardManager = new DashboardManager();

// NOTE: Initialization is handled by router in main.js
// Do NOT initialize here in DOMContentLoaded - routes are not registered yet!
// main.js will call dashboardManager.init() when navigating to dashboard route

// Export to window for browser environment
window.dashboardManager = dashboardManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardManager, dashboardManager };
}
