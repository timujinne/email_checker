/**
 * Chart System
 * Multi-type chart rendering with Chart.js integration
 * Supports: Line, Bar, Pie, Heatmap charts
 *
 * @module ChartSystem
 */

class ChartSystem {
    /**
     * Create ChartSystem instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            theme: 'light',
            responsive: true,
            maintainAspectRatio: true,
            ...options
        };

        this.charts = new Map();       // chartId → Chart instance
        this.chartConfigs = new Map(); // chartId → config
        this.observers = [];

        // Check Chart.js availability
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js not loaded');
        }

        console.log('📊 ChartSystem initialized');
    }

    /**
     * Create and render a line chart
     * @param {string} chartId - Unique chart ID
     * @param {Array} labels - X-axis labels (dates)
     * @param {Array} datasets - Array of data series
     * @param {Object} options - Chart options
     */
    createLineChart(chartId, labels, datasets, options = {}) {
        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color || '#1e40af',
                    backgroundColor: ds.backgroundColor || 'rgba(30, 64, 175, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    ...ds
                }))
            },
            options: {
                responsive: this.options.responsive,
                maintainAspectRatio: this.options.maintainAspectRatio,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: options.title ? true : false,
                        text: options.title || ''
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return options.yAxisFormatter ? options.yAxisFormatter(value) : value;
                            }
                        }
                    }
                },
                ...options
            }
        };

        this.renderChart(chartId, config);
    }

    /**
     * Create and render a bar chart
     * @param {string} chartId - Unique chart ID
     * @param {Array} labels - Category labels
     * @param {Array} datasets - Data series
     * @param {Object} options - Chart options
     */
    createBarChart(chartId, labels, datasets, options = {}) {
        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.color || '#1e40af',
                    borderColor: ds.borderColor || '#1e40af',
                    borderWidth: 1,
                    ...ds
                }))
            },
            options: {
                indexAxis: options.horizontal ? 'y' : 'x',
                responsive: this.options.responsive,
                maintainAspectRatio: this.options.maintainAspectRatio,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: options.title ? true : false,
                        text: options.title || ''
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                ...options
            }
        };

        this.renderChart(chartId, config);
    }

    /**
     * Create and render a pie chart
     * @param {string} chartId - Unique chart ID
     * @param {Array} labels - Category labels
     * @param {Object} data - Data object with data array and backgroundColor
     * @param {Object} options - Chart options
     */
    createPieChart(chartId, labels, data, options = {}) {
        const colors = data.backgroundColor || [
            '#1e40af', '#991b1b', '#065f46', '#92400e', '#7f1d1d',
            '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6'
        ];

        const config = {
            type: options.donut ? 'doughnut' : 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    ...data
                }]
            },
            options: {
                responsive: this.options.responsive,
                maintainAspectRatio: this.options.maintainAspectRatio,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: options.title ? true : false,
                        text: options.title || ''
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options
            }
        };

        this.renderChart(chartId, config);
    }

    /**
     * Create and render a heatmap chart
     * @param {string} chartId - Unique chart ID
     * @param {Array} rows - Row labels (y-axis)
     * @param {Array} cols - Column labels (x-axis)
     * @param {Array} data - 2D array of values
     * @param {Object} options - Chart options
     */
    createHeatmapChart(chartId, rows, cols, data, options = {}) {
        // Convert 2D data to bubble chart format for heatmap visualization
        const bubbleData = [];
        const colorScale = this.generateColorScale();

        data.forEach((rowData, rowIndex) => {
            rowData.forEach((value, colIndex) => {
                bubbleData.push({
                    x: colIndex,
                    y: rowIndex,
                    r: Math.sqrt(value) * 2,
                    value: value
                });
            });
        });

        // Find min/max for color scaling
        const allValues = data.flat();
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        const config = {
            type: 'bubble',
            data: {
                datasets: [{
                    label: options.label || 'Heatmap',
                    data: bubbleData.map(item => ({
                        x: cols[item.x],
                        y: rows[item.y],
                        r: item.r || 5,
                        value: item.value,
                        backgroundColor: this.getColor(item.value, minValue, maxValue, colorScale)
                    })),
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: this.options.responsive,
                maintainAspectRatio: this.options.maintainAspectRatio,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: options.title ? true : false,
                        text: options.title || ''
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const item = context.raw;
                                return `${item.x}, ${item.y}: ${item.value}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'category',
                        labels: rows,
                        beginAtZero: true
                    },
                    x: {
                        type: 'category',
                        labels: cols,
                        beginAtZero: true
                    }
                },
                ...options
            }
        };

        this.renderChart(chartId, config);
    }

    /**
     * Render chart to canvas
     * @private
     */
    renderChart(chartId, config) {
        // Create canvas if not exists
        let canvas = document.getElementById(`chart-${chartId}`);
        if (!canvas) {
            const container = document.createElement('div');
            container.className = 'chart-container';
            container.innerHTML = `<canvas id="chart-${chartId}"></canvas>`;
            this.element.appendChild(container);
            canvas = document.getElementById(`chart-${chartId}`);
        }

        // Destroy existing chart
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, config);

        this.charts.set(chartId, chart);
        this.chartConfigs.set(chartId, config);

        console.log(`📊 Chart created: ${chartId}`);
        this.notifyObservers('chart-created', { chartId, type: config.type });
    }

    /**
     * Update chart data
     * @param {string} chartId - Chart ID
     * @param {Object} newData - New data object
     */
    updateChartData(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) {
            console.warn(`⚠️ Chart not found: ${chartId}`);
            return;
        }

        chart.data.labels = newData.labels || chart.data.labels;
        if (newData.datasets) {
            chart.data.datasets = newData.datasets;
        }
        chart.update('none'); // No animation for smooth updates

        console.log(`✅ Chart updated: ${chartId}`);
    }

    /**
     * Filter chart data by date range
     * @param {string} chartId - Chart ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Function} filterFunction - Custom filter function
     */
    filterByDateRange(chartId, startDate, endDate, filterFunction) {
        const config = this.chartConfigs.get(chartId);
        if (!config) return;

        // Filter labels and datasets
        const filteredLabels = [];
        const filteredDatasets = config.data.datasets.map(ds => ({
            ...ds,
            data: []
        }));

        config.data.labels.forEach((label, index) => {
            // Parse label as date
            const labelDate = new Date(label);

            if (labelDate >= startDate && labelDate <= endDate) {
                filteredLabels.push(label);
                config.data.datasets.forEach((ds, dsIndex) => {
                    filteredDatasets[dsIndex].data.push(ds.data[index]);
                });
            }
        });

        this.updateChartData(chartId, {
            labels: filteredLabels,
            datasets: filteredDatasets
        });
    }

    /**
     * Export chart as PNG
     * @param {string} chartId - Chart ID
     * @param {string} filename - Output filename
     */
    exportAsPNG(chartId, filename = 'chart.png') {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        const link = document.createElement('a');
        link.href = chart.canvas.toDataURL('image/png');
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`📥 Chart exported: ${filename}`);
    }

    /**
     * Export chart data as CSV
     * @param {string} chartId - Chart ID
     * @param {string} filename - Output filename
     */
    exportAsCSV(chartId, filename = 'chart.csv') {
        const config = this.chartConfigs.get(chartId);
        if (!config) return;

        let csv = '';

        // Header
        const headers = ['Index', ...config.data.datasets.map(ds => ds.label)];
        csv += headers.join(',') + '\n';

        // Data rows
        config.data.labels.forEach((label, index) => {
            const row = [label];
            config.data.datasets.forEach(ds => {
                row.push(ds.data[index] || '');
            });
            csv += row.join(',') + '\n';
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`📥 Data exported: ${filename}`);
    }

    /**
     * Get chart data
     * @param {string} chartId - Chart ID
     * @returns {Object} Chart data
     */
    getChartData(chartId) {
        const config = this.chartConfigs.get(chartId);
        return config ? config.data : null;
    }

    /**
     * Destroy chart
     * @param {string} chartId - Chart ID
     */
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
            this.chartConfigs.delete(chartId);
            console.log(`🗑️ Chart destroyed: ${chartId}`);
        }
    }

    /**
     * Clear all charts
     */
    clearAll() {
        this.charts.forEach((chart) => chart.destroy());
        this.charts.clear();
        this.chartConfigs.clear();
        this.element.innerHTML = '';
        console.log('🗑️ All charts cleared');
    }

    /**
     * Generate color scale for heatmap
     * @private
     */
    generateColorScale() {
        return [
            '#1e40af', // Blue (low)
            '#3b82f6',
            '#60a5fa',
            '#93c5fd',
            '#dbeafe',
            '#fef3c7',
            '#fde047',
            '#facc15',
            '#f97316',
            '#991b1b'  // Red (high)
        ];
    }

    /**
     * Get color for value in heatmap
     * @private
     */
    getColor(value, min, max, colorScale) {
        if (max === min) return colorScale[Math.floor(colorScale.length / 2)];

        const normalized = (value - min) / (max - min);
        const colorIndex = Math.floor(normalized * (colorScale.length - 1));

        return colorScale[colorIndex];
    }

    /**
     * Get statistics about charts
     * @returns {Object} Chart statistics
     */
    getStats() {
        return {
            chartCount: this.charts.size,
            charts: Array.from(this.charts.keys()),
            totalDataPoints: Array.from(this.charts.values()).reduce((sum, chart) => {
                return sum + (chart.data.datasets[0]?.data.length || 0);
            }, 0)
        };
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
