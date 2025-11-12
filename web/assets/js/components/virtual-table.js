/**
 * Virtual Table Component
 * Efficiently renders large datasets (22K+) using virtual scrolling
 * Only renders visible rows + buffer to maintain 60fps performance
 *
 * @module VirtualTable
 * @requires DOM element with fixed height
 */

class VirtualTable {
    /**
     * Create VirtualTable instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     * @param {number} options.rowHeight - Height of each row in pixels (default: 44)
     * @param {number} options.bufferSize - Rows to render above/below viewport (default: 10)
     * @param {boolean} options.sortable - Enable column sorting (default: true)
     * @param {boolean} options.selectable - Enable row selection (default: true)
     * @param {boolean} options.striped - Alternate row colors (default: true)
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        // Component name for preferences (use elementId or custom name)
        this.componentName = options.componentName || elementId;

        this.options = {
            rowHeight: 44,
            bufferSize: 10,
            sortable: true,
            selectable: true,
            striped: true,
            hover: true,
            ...options
        };

        this.data = [];
        this.columns = [];
        this.visibleData = [];
        this.sortBy = null;
        this.sortOrder = 'asc';
        this.selectedRows = new Set();
        this.scrollTop = 0;
        this.viewportHeight = 0;

        // Selection tracking for Shift+click
        this.lastSelectedIndex = null;
        this.lastAction = null; // 'select' or 'deselect'

        // Performance tracking
        this.lastRenderTime = 0;
        this.frameDropped = false;

        // Load saved preferences
        this.loadPreferences();

        this.init();
    }

    /**
     * Initialize the virtual table
     */
    init() {
        console.log('📊 Initializing VirtualTable...');

        // Create table structure
        this.createTableStructure();

        // Setup event listeners
        this.setupEventListeners();

        // Get initial dimensions
        this.updateDimensions();

        console.log('✅ VirtualTable initialized');
    }

    /**
     * Create table HTML structure
     */
    createTableStructure() {
        this.element.innerHTML = `
            <div class="virtual-table-container">
                <div class="virtual-table-header">
                    <table>
                        <thead id="table-header">
                            <tr></tr>
                        </thead>
                    </table>
                </div>
                <div class="virtual-table-viewport" id="table-viewport">
                    <div class="virtual-spacer" id="virtual-spacer"></div>
                    <table>
                        <tbody id="table-body"></tbody>
                    </table>
                </div>
                <div class="virtual-table-footer">
                    <span id="row-count">0 rows</span>
                    <span id="selected-count" style="display:none;">0 selected</span>
                </div>
            </div>
        `;

        // Store references
        this.headerElement = document.getElementById('table-header').querySelector('tr');
        this.bodyElement = document.getElementById('table-body');
        this.viewportElement = document.getElementById('table-viewport');
        this.spacerElement = document.getElementById('virtual-spacer');
        this.rowCountElement = document.getElementById('row-count');
        this.selectedCountElement = document.getElementById('selected-count');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Scroll event with requestAnimationFrame for 60fps
        let scrollTimeout;
        this.viewportElement.addEventListener('scroll', (e) => {
            this.scrollTop = e.target.scrollTop;

            // Use RAF to batch updates
            cancelAnimationFrame(scrollTimeout);
            scrollTimeout = requestAnimationFrame(() => {
                this.renderVisibleRows();
            });
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.updateDimensions();
            this.renderVisibleRows();
        });

        // Header clicks for sorting
        this.headerElement.addEventListener('click', (e) => {
            if (e.target.dataset.column) {
                this.sort(e.target.dataset.column);
            }
        });

        // Body clicks for selection (with Shift+click support)
        this.bodyElement.addEventListener('click', (e) => {
            // Guard: check if target has closest method
            if (!e.target || typeof e.target.closest !== 'function') return;

            const checkbox = e.target.closest('input[type="checkbox"]');
            if (checkbox) {
                const rowIndex = parseInt(checkbox.dataset.rowIndex);

                // Shift+click: select range
                if (e.shiftKey && this.lastSelectedIndex !== null) {
                    this.selectRange(this.lastSelectedIndex, rowIndex);
                } else {
                    // Normal click: toggle single row
                    this.toggleSelection(rowIndex);
                    this.lastSelectedIndex = rowIndex;
                }
            }
        });
    }

    /**
     * Set column definitions
     * @param {Array} columns - Column config array
     * @example
     * table.setColumns([
     *   { key: 'email', label: 'Email', width: '250px', sortable: true },
     *   { key: 'domain', label: 'Domain', width: '150px', sortable: true },
     *   { key: 'status', label: 'Status', width: '100px', sortable: true }
     * ])
     */
    setColumns(columns) {
        this.columns = columns;
        this._columnWidthsSynced = false; // Reset sync flag when columns change
        this.renderHeader();
    }

    /**
     * Get all columns configuration
     * @returns {Array} Array of column configurations
     */
    getColumns() {
        return this.columns;
    }

    /**
     * Render table header
     */
    renderHeader() {
        this.headerElement.innerHTML = '';

        // Checkbox column if selectable
        if (this.options.selectable) {
            const th = document.createElement('th');
            th.className = 'text-base-content';
            th.style.width = '40px';
            th.innerHTML = `<input type="checkbox" id="select-all" title="Select all">`;
            this.headerElement.appendChild(th);

            // Select all handler
            document.getElementById('select-all').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAll();
                } else {
                    this.clearSelection();
                }
            });
        }

        // Column headers
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.classList.add('text-base-content');

            // Support HTML in column labels (for interactive elements like checkboxes)
            // Use innerHTML if label contains HTML tags, otherwise use textContent for safety
            if (col.label && col.label.includes('<')) {
                th.innerHTML = col.label;
            } else {
                th.textContent = col.label;
            }

            if (col.width) th.style.width = col.width;

            if (col.sortable && this.options.sortable) {
                th.style.cursor = 'pointer';
                th.dataset.column = col.key;
                th.classList.add('sortable-header');

                // Sort indicator
                if (this.sortBy === col.key) {
                    th.classList.add(this.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            }

            this.headerElement.appendChild(th);
        });
    }

    /**
     * Set data for the table
     * @param {Array} data - Array of row objects
     */
    setData(data) {
        this.data = data;
        this.visibleData = data;
        this.selectedRows.clear();
        this.scrollTop = 0;
        this.updateDimensions();
        this.updateTableHeight();
        this.renderVisibleRows();
        this.updateRowCount();
    }

    /**
     * Add a single row
     * @param {Object} row - Row data
     */
    addRow(row) {
        this.data.push(row);
        this.visibleData = this.getSortedData();
        this.updateTableHeight();
        this.renderVisibleRows();
        this.updateRowCount();
    }

    /**
     * Remove row by index
     * @param {number} index - Row index
     */
    removeRow(index) {
        this.data.splice(index, 1);
        this.visibleData = this.getSortedData();
        this.updateTableHeight();
        this.renderVisibleRows();
        this.updateRowCount();
    }

    /**
     * Update row by index
     * @param {number} index - Row index
     * @param {Object} updates - Updates to apply
     */
    updateRow(index, updates) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = { ...this.data[index], ...updates };
            this.visibleData = this.getSortedData();
            this.renderVisibleRows();
        }
    }

    /**
     * Get sorted data based on current sort
     * @returns {Array} Sorted data
     */
    getSortedData() {
        let sorted = [...this.visibleData];

        if (this.sortBy) {
            sorted.sort((a, b) => {
                const aVal = a[this.sortBy];
                const bVal = b[this.sortBy];

                if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sorted;
    }

    /**
     * Sort by column
     * @param {string} columnKey - Column key to sort by
     */
    sort(columnKey) {
        if (this.sortBy === columnKey) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = columnKey;
            this.sortOrder = 'asc';
        }

        this.visibleData = this.getSortedData();
        this.renderVisibleRows();
        this.renderHeader();

        // Save sort preferences
        this.savePreferences();
    }

    /**
     * Load saved sort preferences
     */
    loadPreferences() {
        if (typeof window.preferencesManager === 'undefined') return;

        const sortBy = prefs.get(`tables.${this.componentName}.sortBy`);
        const sortOrder = prefs.get(`tables.${this.componentName}.sortOrder`);

        if (sortBy) {
            this.sortBy = sortBy;
            this.sortOrder = sortOrder || 'asc';
            console.log(`✅ Loaded sort preferences for ${this.componentName}:`, this.sortBy, this.sortOrder);
        }
    }

    /**
     * Save sort preferences
     */
    savePreferences() {
        if (typeof window.preferencesManager === 'undefined') return;

        prefs.set(`tables.${this.componentName}.sortBy`, this.sortBy);
        prefs.set(`tables.${this.componentName}.sortOrder`, this.sortOrder);
    }

    /**
     * Update visible dimensions
     */
    updateDimensions() {
        this.viewportHeight = this.viewportElement.clientHeight;
        this.visibleRowCount = Math.ceil(this.viewportHeight / this.options.rowHeight) + this.options.bufferSize * 2;

        // Sync column widths after dimensions are calculated
        this.syncColumnWidths();
    }

    /**
     * Sync column widths between header and body
     * Copies actual rendered widths from body cells to header cells
     */
    syncColumnWidths() {
        // Get first row from body (after rendering with actual content)
        const bodyRow = this.bodyElement.querySelector('tr');
        if (!bodyRow) return;

        const bodyCells = Array.from(bodyRow.querySelectorAll('td'));
        const headerCells = Array.from(this.headerElement.querySelectorAll('th'));

        // Remove old spacer column if exists
        const spacer = this.headerElement.querySelector('.scrollbar-spacer');
        if (spacer) spacer.remove();

        // Apply widths from body to header
        bodyCells.forEach((td, index) => {
            if (headerCells[index]) {
                const width = td.offsetWidth;
                headerCells[index].style.width = `${width}px`;
                headerCells[index].style.minWidth = `${width}px`;
                headerCells[index].style.maxWidth = `${width}px`;
                // Also set width on td for consistency
                td.style.width = `${width}px`;
            }
        });

        console.log('📐 Column widths synced:', bodyCells.length, 'columns');
    }

    /**
     * Update total table height for scrollbar
     */
    updateTableHeight() {
        const totalHeight = this.visibleData.length * this.options.rowHeight;

        // Set spacer height to create scrollable area
        if (this.spacerElement) {
            this.spacerElement.style.height = totalHeight + 'px';
        }
    }

    /**
     * Calculate which rows should be visible
     * @returns {Object} {startIndex, endIndex}
     */
    calculateVisibleRange() {
        const startIndex = Math.floor(this.scrollTop / this.options.rowHeight);
        const endIndex = startIndex + this.visibleRowCount;

        // Apply buffer
        const bufferedStart = Math.max(0, startIndex - this.options.bufferSize);
        const bufferedEnd = Math.min(this.visibleData.length, endIndex + this.options.bufferSize);

        return { startIndex: bufferedStart, endIndex: bufferedEnd };
    }

    /**
     * Render visible rows (main virtual scrolling logic)
     */
    renderVisibleRows() {
        const startTime = performance.now();
        const range = this.calculateVisibleRange();
        const offset = range.startIndex * this.options.rowHeight;

        // Clear body
        this.bodyElement.innerHTML = '';

        // Render visible rows
        for (let i = range.startIndex; i < range.endIndex; i++) {
            if (i < this.visibleData.length) {
                const row = this.visibleData[i];
                const tr = this.createRowElement(row, i);
                this.bodyElement.appendChild(tr);
            }
        }

        // Set offset using transform for better performance
        this.bodyElement.style.transform = `translateY(${offset}px)`;

        // Sync column widths after first render or when columns change
        if (this.bodyElement.children.length > 0 && !this._columnWidthsSynced) {
            requestAnimationFrame(() => {
                this.syncColumnWidths();
                this._columnWidthsSynced = true;
            });
        }

        // Performance logging
        const renderTime = performance.now() - startTime;
        if (renderTime > 16.67) {
            this.frameDropped = true;
            console.warn(`⚠️ Frame drop detected: ${renderTime.toFixed(2)}ms`);
        }
    }

    /**
     * Create a single row element
     * @param {Object} row - Row data
     * @param {number} index - Row index
     * @returns {HTMLElement} TR element
     */
    createRowElement(row, index) {
        const tr = document.createElement('tr');
        if (index % 2 === 0 && this.options.striped) tr.classList.add('striped');
        if (this.options.hover) tr.classList.add('hoverable');
        if (this.selectedRows.has(index)) tr.classList.add('selected');

        tr.dataset.rowIndex = index;

        // Checkbox column
        if (this.options.selectable) {
            const td = document.createElement('td');
            td.style.width = '40px'; // Match header checkbox column width
            td.innerHTML = `<input type="checkbox" data-row-index="${index}" ${this.selectedRows.has(index) ? 'checked' : ''}>`;
            tr.appendChild(td);
        }

        // Data columns
        this.columns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col.key];

            // Set explicit width to match header
            if (col.width) {
                td.style.width = col.width;
            }

            if (col.render) {
                td.innerHTML = col.render(value, row);
            } else {
                td.textContent = value || '';
            }

            tr.appendChild(td);
        });

        return tr;
    }

    /**
     * Toggle row selection
     * @param {number} rowIndex - Row index
     */
    toggleSelection(rowIndex) {
        const wasSelected = this.selectedRows.has(rowIndex);

        if (wasSelected) {
            this.selectedRows.delete(rowIndex);
            this.lastAction = 'deselect'; // Remember we deselected
        } else {
            this.selectedRows.add(rowIndex);
            this.lastAction = 'select'; // Remember we selected
        }

        this.updateSelectedCount();
        this.renderVisibleRows();

        // Dispatch custom event
        this.dispatchEvent('selection-changed', {
            selected: Array.from(this.selectedRows),
            items: Array.from(this.selectedRows).map(i => this.visibleData[i])
        });
    }

    /**
     * Select range of rows (for Shift+click)
     * @param {number} fromIndex - Start index
     * @param {number} toIndex - End index
     */
    selectRange(fromIndex, toIndex) {
        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);

        // Apply last action to all rows in range
        // If last action was deselect, deselect the range; otherwise select
        const shouldSelect = this.lastAction !== 'deselect';

        for (let i = start; i <= end; i++) {
            if (i >= 0 && i < this.visibleData.length) {
                if (shouldSelect) {
                    this.selectedRows.add(i);
                } else {
                    this.selectedRows.delete(i);
                }
            }
        }

        this.updateSelectedCount();
        this.renderVisibleRows();

        // Dispatch custom event
        this.dispatchEvent('selection-changed', {
            selected: Array.from(this.selectedRows),
            items: Array.from(this.selectedRows).map(i => this.visibleData[i])
        });

        const action = shouldSelect ? 'Selected' : 'Deselected';
        console.log(`📋 ${action} range: ${start}-${end} (${end - start + 1} rows)`);
    }

    /**
     * Select all rows
     */
    selectAll() {
        this.selectedRows.clear();
        for (let i = 0; i < this.visibleData.length; i++) {
            this.selectedRows.add(i);
        }
        this.lastSelectedIndex = null; // Reset for Shift+click
        this.lastAction = null; // Reset action tracking
        this.updateSelectedCount();
        this.renderVisibleRows();

        // Dispatch custom event
        this.dispatchEvent('selection-changed', {
            selected: Array.from(this.selectedRows),
            items: Array.from(this.selectedRows).map(i => this.visibleData[i])
        });
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedRows.clear();
        this.lastSelectedIndex = null; // Reset for Shift+click
        this.lastAction = null; // Reset action tracking
        this.updateSelectedCount();
        this.renderVisibleRows();

        // Dispatch custom event
        this.dispatchEvent('selection-changed', {
            selected: [],
            items: []
        });
    }

    /**
     * Get selected rows
     * @returns {Array} Selected row objects
     */
    getSelectedRows() {
        return Array.from(this.selectedRows).map(i => this.visibleData[i]);
    }

    /**
     * Update row count display
     */
    updateRowCount() {
        this.rowCountElement.textContent = `${this.visibleData.length} rows`;
    }

    /**
     * Update selected count display
     */
    updateSelectedCount() {
        if (this.selectedRows.size > 0) {
            this.selectedCountElement.style.display = 'inline';
            this.selectedCountElement.textContent = `${this.selectedRows.size} selected`;
        } else {
            this.selectedCountElement.style.display = 'none';
        }

        // Update header checkbox state
        this.updateHeaderCheckbox();
    }

    /**
     * Update header "select all" checkbox state
     */
    updateHeaderCheckbox() {
        const headerCheckbox = document.getElementById('select-all');
        if (!headerCheckbox || this.visibleData.length === 0) return;

        const totalRows = this.visibleData.length;
        const selectedCount = this.selectedRows.size;

        if (selectedCount === 0) {
            // Nothing selected
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (selectedCount === totalRows) {
            // All selected
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else {
            // Some selected (indeterminate state)
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        }
    }

    /**
     * Filter data
     * @param {Function|Object} predicate - Filter function or object for key matching
     */
    filter(predicate) {
        if (typeof predicate === 'function') {
            this.visibleData = this.data.filter(predicate);
        } else {
            // Object matching
            this.visibleData = this.data.filter(item => {
                return Object.entries(predicate).every(([key, value]) => {
                    return item[key]?.toString().toLowerCase().includes(value.toString().toLowerCase());
                });
            });
        }

        this.selectedRows.clear();
        this.visibleData = this.getSortedData();
        this.updateTableHeight();
        this.renderVisibleRows();
        this.updateRowCount();
    }

    /**
     * Search in all columns
     * @param {string} query - Search query
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        this.filter(item => {
            return JSON.stringify(item).toLowerCase().includes(lowerQuery);
        });
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event details
     */
    dispatchEvent(eventName, detail) {
        this.element.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    /**
     * Scroll to row
     * @param {number} index - Row index
     */
    scrollToRow(index) {
        const scrollTop = index * this.options.rowHeight;
        this.viewportElement.scrollTop = scrollTop;
    }

    /**
     * Get scroll position
     * @returns {number} Current scroll top
     */
    getScrollPosition() {
        return this.scrollTop;
    }

    /**
     * Set scroll position
     * @param {number} scrollTop - Scroll position
     */
    setScrollPosition(scrollTop) {
        this.viewportElement.scrollTop = scrollTop;
    }

    /**
     * Get performance stats
     * @returns {Object} Performance metrics
     */
    getPerformanceStats() {
        return {
            totalRows: this.visibleData.length,
            visibleRows: this.visibleRowCount,
            frameDropped: this.frameDropped,
            scrollTop: this.scrollTop,
            selectedCount: this.selectedRows.size
        };
    }
}
