/**
 * Data Table Component
 * Reusable table with sorting, filtering, and pagination
 */

class DataTable {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.options = {
            sortable: true,
            filterable: true,
            pageable: false,
            pageSize: 10,
            striped: true,
            hover: true,
            ...options
        };

        this.data = [];
        this.columns = [];
        this.sortBy = null;
        this.sortOrder = 'asc';
        this.filterText = '';
        this.currentPage = 0;
    }

    /**
     * Set column definitions
     */
    setColumns(columns) {
        this.columns = columns;
        // columns format: [{ key: 'id', label: 'ID', width: '100px' }, ...]
    }

    /**
     * Set data
     */
    setData(data) {
        this.data = data;
        this.currentPage = 0;
        this.render();
    }

    /**
     * Add row
     */
    addRow(row) {
        this.data.push(row);
        this.render();
    }

    /**
     * Remove row by index
     */
    removeRow(index) {
        this.data.splice(index, 1);
        this.render();
    }

    /**
     * Update row
     */
    updateRow(index, updates) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = { ...this.data[index], ...updates };
            this.render();
        }
    }

    /**
     * Sort by column
     */
    sort(columnKey) {
        if (this.sortBy === columnKey) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = columnKey;
            this.sortOrder = 'asc';
        }
        this.render();
    }

    /**
     * Filter data
     */
    filter(text) {
        this.filterText = text.toLowerCase();
        this.currentPage = 0;
        this.render();
    }

    /**
     * Get filtered data
     */
    getFilteredData() {
        if (!this.filterText) return this.data;

        return this.data.filter(row => {
            return JSON.stringify(row).toLowerCase().includes(this.filterText);
        });
    }

    /**
     * Get sorted data
     */
    getSortedData() {
        let data = this.getFilteredData();

        if (this.sortBy) {
            const column = this.columns.find(c => c.key === this.sortBy);
            if (!column) return data;

            data = [...data].sort((a, b) => {
                let valA = a[this.sortBy];
                let valB = b[this.sortBy];

                // Handle different types
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }

    /**
     * Get paged data
     */
    getPagedData() {
        const sorted = this.getSortedData();

        if (!this.options.pageable) {
            return sorted;
        }

        const start = this.currentPage * this.options.pageSize;
        const end = start + this.options.pageSize;
        return sorted.slice(start, end);
    }

    /**
     * Render table
     */
    render() {
        if (!this.element) {
            console.error('Table element not found');
            return;
        }

        const pagedData = this.getPagedData();

        // Build table HTML
        let html = `
            <table class="table-custom">
                <thead>
                    <tr>
        `;

        // Header
        for (const column of this.columns) {
            const isSorted = this.sortBy === column.key;
            const sortIcon = isSorted
                ? (this.sortOrder === 'asc' ? ' ↑' : ' ↓')
                : '';

            const sortable = this.options.sortable && column.sortable !== false;
            const clickable = sortable ? ' cursor-pointer hover:text-primary' : '';

            html += `
                        <th onclick="${sortable ? `dataTable.sort('${column.key}')` : ''}" class="text-base-content${clickable}">
                            ${column.label}${sortIcon}
                        </th>
            `;
        }

        html += `
                    </tr>
                </thead>
                <tbody>
        `;

        // Body
        if (pagedData.length === 0) {
            html += `
                    <tr>
                        <td colspan="${this.columns.length}" class="text-center text-slate-500 dark:text-slate-400 py-8">
                            Нет данных
                        </td>
                    </tr>
            `;
        } else {
            for (let i = 0; i < pagedData.length; i++) {
                const row = pagedData[i];
                const rowClass = this.options.striped && i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : '';

                html += `<tr class="${rowClass}">`;

                for (const column of this.columns) {
                    let value = row[column.key] || '';

                    // Format value if formatter provided
                    if (column.formatter && typeof column.formatter === 'function') {
                        value = column.formatter(value, row);
                    }

                    html += `<td>${value}</td>`;
                }

                html += `</tr>`;
            }
        }

        html += `
                </tbody>
            </table>
        `;

        // Add pagination if enabled
        if (this.options.pageable) {
            const totalPages = Math.ceil(this.getSortedData().length / this.options.pageSize);
            html += this.renderPagination(totalPages);
        }

        this.element.innerHTML = html;
    }

    /**
     * Render pagination
     */
    renderPagination(totalPages) {
        if (totalPages <= 1) return '';

        let html = `
            <div class="mt-4 flex items-center justify-center gap-2">
        `;

        // Previous
        html += `
            <button
                onclick="dataTable.setCurrentPage(${this.currentPage - 1})"
                ${this.currentPage === 0 ? 'disabled' : ''}
                class="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
            >
                ← Назад
            </button>
        `;

        // Page numbers
        for (let i = 0; i < totalPages; i++) {
            const isActive = i === this.currentPage;
            html += `
                <button
                    onclick="dataTable.setCurrentPage(${i})"
                    class="px-3 py-1 rounded border ${
                        isActive
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'border-slate-300 dark:border-slate-600'
                    }"
                >
                    ${i + 1}
                </button>
            `;
        }

        // Next
        html += `
            <button
                onclick="dataTable.setCurrentPage(${this.currentPage + 1})"
                ${this.currentPage === totalPages - 1 ? 'disabled' : ''}
                class="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
            >
                Далее →
            </button>
        `;

        html += `</div>`;

        return html;
    }

    /**
     * Set current page
     */
    setCurrentPage(page) {
        const totalPages = Math.ceil(this.getSortedData().length / this.options.pageSize);
        if (page >= 0 && page < totalPages) {
            this.currentPage = page;
            this.render();
        }
    }

    /**
     * Export to CSV
     */
    exportToCSV(filename = 'data.csv') {
        const data = this.getSortedData();

        // Build CSV
        let csv = this.columns.map(c => c.label).join(',') + '\n';

        for (const row of data) {
            const values = this.columns.map(c => {
                let value = row[c.key] || '';
                // Escape quotes in values
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        }

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Get selected rows
     */
    getSelectedRows() {
        // Implementation for checkbox selection
        const checkboxes = this.element.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.dataset.rowIndex));
    }
}

// Global instance for easy access
let dataTable = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataTable };
}
