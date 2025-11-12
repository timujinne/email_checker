/**
 * Export Manager
 * Handles exporting blocklist data in multiple formats (CSV, JSON, TXT)
 *
 * @module ExportManager
 */

class ExportManager {
    /**
     * Create ExportManager instance
     */
    constructor() {
        console.log('📤 ExportManager initialized');
    }

    /**
     * Export items as CSV
     * @param {Array} items - Items to export
     * @param {Object} options - Export options
     * @returns {string} CSV content
     */
    exportAsCSV(items, options = {}) {
        const {
            includeMetadata = true,
            filename = 'blocklist.csv'
        } = options;

        let csv = '';

        // Header
        if (includeMetadata) {
            csv += '# Email Blocker Export\n';
            csv += `# Exported: ${new Date().toISOString()}\n`;
            csv += `# Total Items: ${items.length}\n\n`;
        }

        // Column headers
        const columns = ['email', 'domain', 'status', 'source', 'importedAt', 'tags'];
        csv += columns.join(',') + '\n';

        // Data rows
        items.forEach(item => {
            const row = [
                this.escapeCSV(item.email),
                this.escapeCSV(item.domain),
                this.escapeCSV(item.status),
                this.escapeCSV(item.source || ''),
                this.escapeCSV(item.importedAt || ''),
                this.escapeCSV(item.tags ? item.tags.join(';') : '')
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Export items as JSON
     * @param {Array} items - Items to export
     * @param {Object} options - Export options
     * @returns {string} JSON content
     */
    exportAsJSON(items, options = {}) {
        const {
            pretty = true,
            includeStats = true
        } = options;

        const data = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalItems: items.length,
                version: '1.0'
            },
            items: items
        };

        if (includeStats) {
            data.statistics = {
                blocked: items.filter(i => i.status === 'blocked').length,
                allowed: items.filter(i => i.status === 'allowed').length,
                new: items.filter(i => i.status === 'new').length,
                uniqueDomains: new Set(items.map(i => i.domain)).size
            };
        }

        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    }

    /**
     * Export items as TXT (one email per line)
     * @param {Array} items - Items to export
     * @param {Object} options - Export options
     * @returns {string} TXT content
     */
    exportAsTXT(items, options = {}) {
        const {
            includeHeader = true,
            onlyStatus = null  // Filter by status if specified
        } = options;

        let txt = '';

        if (includeHeader) {
            txt += `# Email Blocker Export\n`;
            txt += `# Exported: ${new Date().toISOString()}\n`;
            txt += `# Total Items: ${items.length}\n\n`;
        }

        let filtered = items;
        if (onlyStatus) {
            filtered = items.filter(i => i.status === onlyStatus);
        }

        filtered.forEach(item => {
            txt += item.email + '\n';
        });

        return txt;
    }

    /**
     * Export as TSV (tab-separated values)
     * @param {Array} items - Items to export
     * @returns {string} TSV content
     */
    exportAsTSV(items) {
        let tsv = '';

        // Header
        tsv += ['email', 'domain', 'status', 'source', 'importedAt'].join('\t') + '\n';

        // Data rows
        items.forEach(item => {
            const row = [
                item.email,
                item.domain,
                item.status,
                item.source || '',
                item.importedAt || ''
            ];
            tsv += row.join('\t') + '\n';
        });

        return tsv;
    }

    /**
     * Export HTML report
     * @param {Array} items - Items to export
     * @param {Object} stats - Statistics object
     * @returns {string} HTML content
     */
    exportAsHTML(items, stats = {}) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Blocker Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #1e40af; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .stat-label { font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #1e40af; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
        .status-blocked { color: #ef4444; font-weight: bold; }
        .status-allowed { color: #22c55e; font-weight: bold; }
        .status-new { color: #3b82f6; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Email Blocker Export Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${items.length}</div>
                <div class="stat-label">Total Items</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.blocked || items.filter(i => i.status === 'blocked').length}</div>
                <div class="stat-label">Blocked</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.allowed || items.filter(i => i.status === 'allowed').length}</div>
                <div class="stat-label">Allowed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${new Set(items.map(i => i.domain)).size}</div>
                <div class="stat-label">Unique Domains</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Domain</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Imported</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.email}</td>
                        <td>${item.domain}</td>
                        <td><span class="status-${item.status}">${item.status.toUpperCase()}</span></td>
                        <td>${item.source || '-'}</td>
                        <td>${item.importedAt ? new Date(item.importedAt).toLocaleDateString() : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Email Blocker Export | ${items.length} items exported</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`✅ Downloaded: ${filename}`);
    }

    /**
     * Copy to clipboard
     * @param {string} content - Content to copy
     * @returns {Promise<boolean>} Success
     */
    async copyToClipboard(content) {
        try {
            await navigator.clipboard.writeText(content);
            console.log('✅ Copied to clipboard');
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            return false;
        }
    }

    /**
     * Export and download
     * @param {Array} items - Items to export
     * @param {string} format - Format (csv, json, txt, html)
     * @param {string} filename - Optional filename
     */
    exportAndDownload(items, format, filename) {
        let content = '';
        let mimeType = 'text/plain';
        let defaultFilename = `blocklist_${new Date().toISOString().split('T')[0]}`;

        switch (format.toLowerCase()) {
            case 'csv':
                content = this.exportAsCSV(items);
                mimeType = 'text/csv';
                defaultFilename += '.csv';
                break;
            case 'json':
                content = this.exportAsJSON(items);
                mimeType = 'application/json';
                defaultFilename += '.json';
                break;
            case 'tsv':
                content = this.exportAsTSV(items);
                mimeType = 'text/tab-separated-values';
                defaultFilename += '.tsv';
                break;
            case 'html':
                content = this.exportAsHTML(items);
                mimeType = 'text/html';
                defaultFilename += '.html';
                break;
            case 'txt':
            default:
                content = this.exportAsTXT(items);
                mimeType = 'text/plain';
                defaultFilename += '.txt';
                break;
        }

        this.downloadFile(content, filename || defaultFilename, mimeType);
    }

    /**
     * Get export summary
     * @param {Array} items - Items to export
     * @returns {Object} Summary
     */
    getSummary(items) {
        return {
            total: items.length,
            blocked: items.filter(i => i.status === 'blocked').length,
            allowed: items.filter(i => i.status === 'allowed').length,
            new: items.filter(i => i.status === 'new').length,
            uniqueDomains: new Set(items.map(i => i.domain)).size,
            dateRange: {
                earliest: items.length > 0 ? Math.min(...items.map(i => new Date(i.importedAt))) : null,
                latest: items.length > 0 ? Math.max(...items.map(i => new Date(i.importedAt))) : null
            }
        };
    }

    /**
     * Escape CSV cell value
     * @private
     */
    escapeCSV(value) {
        if (!value) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}
