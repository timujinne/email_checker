/**
 * Blocklist Manager
 * Main orchestrator for blocklist management
 * Integrates: VirtualTable, BlocklistSearch, BulkOperations, CSVImportWizard,
 *             StatsDashboard, ExportManager, UndoRedoManager
 *
 * @module BlocklistManager
 */

class BlocklistManager {
    /**
     * Create BlocklistManager instance
     * @param {string} elementId - Container element ID
     * @param {Object} options - Configuration
     */
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        if (!this.element) throw new Error(`Element #${elementId} not found`);

        this.options = {
            enableUndo: true,
            enableBulkOps: true,
            enableStats: true,
            enableCsvImport: true,
            ...options
        };

        // Sub-components
        this.table = null;
        this.search = new BlocklistSearch();
        this.bulkOps = new BulkOperations();
        this.undoRedo = this.options.enableUndo ? new UndoRedoManager() : null;
        this.exportManager = new ExportManager();
        this.statsDashboard = null;
        this.csvWizard = null;

        // State
        this.items = [];
        this.selectedItems = [];
        this.filteredItems = [];
        this.observers = [];

        // Filter state
        this.currentSearchQuery = '';
        this.currentStatusFilter = '';
        this.searchDebounceTimer = null;

        console.log('📋 BlocklistManager initialized');
        this.init();
    }

    /**
     * Initialize manager
     */
    init() {
        this.renderUI();
        this.initComponents();
        this.setupEventListeners();
        console.log('✅ BlocklistManager ready');
    }

    /**
     * Render main UI
     */
    renderUI() {
        this.element.innerHTML = `
            <div class="blocklist-manager">
                <!-- Stats bar (without duplicate header) -->
                <div class="blocklist-toolbar" style="justify-content: space-between; padding: 0.75rem 1rem;">
                    <div class="header-stats" style="display: flex; gap: 1rem; font-size: 0.9rem;">
                        <span id="total-count">0 items</span>
                        <span id="status-counts">-</span>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="blocklist-toolbar">
                    <div class="search-group">
                        <input type="text" id="blocklist-search-input" placeholder="Search emails or domains..." class="search-input">
                        <button id="blocklist-clear-search" class="btn btn-sm btn-ghost" style="display:none;">✕</button>
                    </div>

                    <div class="filter-group">
                        <select id="status-filter" class="filter-select">
                            <option value="">All Statuses</option>
                            <option value="blocked">Blocked</option>
                            <option value="allowed">Allowed</option>
                            <option value="new">New</option>
                        </select>
                    </div>

                    <div class="action-buttons">
                        <button id="btn-csv-import" class="btn btn-primary" title="Import CSV">📥 Import CSV</button>
                        <button id="btn-stats" class="btn btn-secondary" title="View Statistics">📊 Statistics</button>
                        <button id="btn-export" class="btn btn-secondary" title="Export Data">📤 Export</button>
                        <button id="btn-undo" class="btn btn-ghost" title="Undo" style="display:none;">↶ Undo</button>
                        <button id="btn-redo" class="btn btn-ghost" title="Redo" style="display:none;">↷ Redo</button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="blocklist-content">
                    <!-- Left: Table -->
                    <div class="table-panel">
                        <div id="no-results-message" style="display:none; padding: 3rem; text-align: center; color: #6b7280;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                            <h3 style="margin: 0 0 0.5rem 0;">No results found</h3>
                            <p style="margin: 0;">Try adjusting your search or filter criteria</p>
                        </div>
                        <div id="virtual-table-container" class="virtual-table-wrapper"></div>
                    </div>

                    <!-- Right: Details Panel -->
                    <div class="details-panel">
                        <div id="details-content" class="details-placeholder">
                            <p>Select an item to view details</p>
                        </div>
                    </div>
                </div>

                <!-- Bottom: Bulk Operations -->
                <div class="blocklist-footer" id="bulk-ops-footer" style="display:none;">
                    <div class="bulk-ops-info">
                        <span id="selected-count">0 items selected</span>
                    </div>
                    <div class="bulk-ops-buttons">
                        <button id="bulk-block" class="btn btn-danger">🚫 Block Selected</button>
                        <button id="bulk-allow" class="btn btn-success">✓ Allow Selected</button>
                        <button id="bulk-remove" class="btn btn-danger-outline">🗑️ Remove Selected</button>
                        <button id="bulk-cancel" class="btn btn-ghost">Cancel</button>
                    </div>
                </div>

                <!-- Modals -->
                <div id="csv-import-modal" class="modal" style="display:none;"></div>
                <div id="stats-modal" class="modal" style="display:none;"></div>
                <div id="export-modal" class="modal" style="display:none;"></div>
            </div>
        `;
    }

    /**
     * Initialize sub-components
     */
    initComponents() {
        // Virtual Table
        this.table = new VirtualTable('virtual-table-container', {
            rowHeight: 44,
            bufferSize: 10,
            sortable: true,
            selectable: true,
            striped: true
        });

        this.table.setColumns([
            { key: 'email', label: 'Email', width: '250px', sortable: true },
            { key: 'domain', label: 'Domain', width: '150px', sortable: true },
            { key: 'status', label: 'Status', width: '100px', sortable: true,
              render: (val) => `<span class="badge badge-${val === 'blocked' ? 'error' : val === 'allowed' ? 'success' : 'info'}">${val}</span>` },
            { key: 'source', label: 'Source', width: '120px', sortable: false },
            { key: 'importedAt', label: 'Added', width: '120px', sortable: true,
              render: (val) => val ? new Date(val).toLocaleDateString() : '-' }
        ]);

        // Statistics Dashboard (lazy initialization - will be created when stats button clicked)
        this.statsDashboard = null;

        // CSV Import Wizard (lazy initialization - will be created when import button clicked)
        this.csvWizard = null;

        // Setup listeners
        this.table.element.addEventListener('selection-changed', (e) => {
            this.handleSelectionChanged(e.detail);
        });

        // Undo/Redo listeners
        if (this.undoRedo) {
            this.undoRedo.subscribe((event, data) => {
                this.updateUndoRedoButtons();
            });
        }

        // Bulk operations listeners
        this.bulkOps.subscribe((event, data) => {
            if (event === 'operation-completed') {
                this.handleBulkOpComplete(data);
            }
        });
    }

    /**
     * Load blocklist data
     * @param {Array} items - Blocklist items
     */
    loadItems(items) {
        console.log(`📥 Loading ${items.length} items...`);

        this.items = items;
        this.filteredItems = items;

        // Build search index
        this.search.buildIndex(items);

        // Load into table
        this.table.setData(items);

        // Update UI
        this.updateCounts();

        this.notifyObservers('items-loaded', { count: items.length });
    }

    /**
     * Add single item
     * @param {Object} item - Item to add
     */
    addItem(item) {
        this.items.push(item);
        this.filteredItems.push(item);
        this.search.rebuildIndex();
        this.table.addRow(item);
        this.updateCounts();

        if (this.undoRedo) {
            this.undoRedo.execute(
                { type: 'add', data: item, description: `Added ${item.email}` },
                () => this.table.addRow(item),
                () => this.removeItem(item.email)
            );
        }

        this.notifyObservers('item-added', item);
    }

    /**
     * Remove item by email
     * @param {string} email - Email to remove
     */
    removeItem(email) {
        const index = this.items.findIndex(i => i.email === email);
        if (index >= 0) {
            const item = this.items[index];
            this.items.splice(index, 1);
            this.filteredItems = this.filteredItems.filter(i => i.email !== email);
            this.search.rebuildIndex();
            this.table.removeRow(index);
            this.updateCounts();

            if (this.undoRedo) {
                this.undoRedo.execute(
                    { type: 'remove', data: item, description: `Removed ${item.email}` },
                    () => this.table.removeRow(index),
                    () => this.addItem(item)
                );
            }

            this.notifyObservers('item-removed', item);
        }
    }

    /**
     * Update item
     * @param {string} email - Email to update
     * @param {Object} updates - Updates to apply
     */
    updateItem(email, updates) {
        const index = this.items.findIndex(i => i.email === email);
        if (index >= 0) {
            const oldItem = { ...this.items[index] };
            const newItem = { ...this.items[index], ...updates };
            this.items[index] = newItem;

            // Update filtered items
            const filteredIndex = this.filteredItems.findIndex(i => i.email === email);
            if (filteredIndex >= 0) {
                this.filteredItems[filteredIndex] = newItem;
            }

            this.search.rebuildIndex();
            this.table.updateRow(index, updates);

            if (this.undoRedo) {
                this.undoRedo.execute(
                    { type: 'update', data: newItem, previousState: oldItem, description: `Updated ${email}` },
                    () => this.table.updateRow(index, updates),
                    () => this.updateItem(email, oldItem)
                );
            }

            this.notifyObservers('item-updated', newItem);
        }
    }

    /**
     * Handle selection change
     * @private
     */
    handleSelectionChanged(detail) {
        this.selectedItems = detail.items;

        if (detail.items.length > 0) {
            document.getElementById('bulk-ops-footer').style.display = 'flex';
            document.getElementById('selected-count').textContent = `${detail.items.length} items selected`;
            this.showDetails(detail.items[0]);
        } else {
            document.getElementById('bulk-ops-footer').style.display = 'none';
            this.clearDetails();
        }
    }

    /**
     * Show item details
     * @private
     */
    showDetails(item) {
        const detailsEl = document.getElementById('details-content');
        detailsEl.innerHTML = `
            <div class="details-card">
                <h3>${item.email}</h3>
                <div class="detail-rows">
                    <div class="detail-row">
                        <span class="detail-label">Domain:</span>
                        <span class="detail-value">${item.domain}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="badge badge-${item.status === 'blocked' ? 'error' : item.status === 'allowed' ? 'success' : 'info'}">
                                ${item.status}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Source:</span>
                        <span class="detail-value">${item.source || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Added:</span>
                        <span class="detail-value">${item.importedAt ? new Date(item.importedAt).toLocaleString() : '-'}</span>
                    </div>
                    ${item.tags ? `
                        <div class="detail-row">
                            <span class="detail-label">Tags:</span>
                            <div class="detail-tags">
                                ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="detail-actions">
                    <button class="btn btn-sm btn-danger" data-action="remove">Remove</button>
                    <button class="btn btn-sm btn-secondary" data-action="change-status">Change Status</button>
                </div>
            </div>
        `;

        // Setup detail action listeners
        detailsEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'remove') {
                    this.removeItem(item.email);
                } else if (action === 'change-status') {
                    this.showStatusDialog(item);
                }
            });
        });
    }

    /**
     * Clear details panel
     * @private
     */
    clearDetails() {
        document.getElementById('details-content').innerHTML = `
            <p class="details-placeholder">Select an item to view details</p>
        `;
    }

    /**
     * Show status change dialog
     * @private
     */
    showStatusDialog(item) {
        const status = prompt('Enter new status (blocked/allowed/new):', item.status);
        if (status && ['blocked', 'allowed', 'new'].includes(status)) {
            this.updateItem(item.email, { status });
            this.showDetails(item);
        }
    }

    /**
     * Handle CSV import
     * @private
     */
    async handleCsvImport(data) {
        console.log(`📥 CSV Import: ${data.items.length} items`);

        // Add items with undo support
        for (const item of data.items) {
            this.addItem(item);
        }

        this.search.rebuildIndex();
        this.table.setData(this.items);
        this.updateCounts();

        this.notifyObservers('csv-imported', data);
        this.closeCsvModal();

        alert(`✅ Successfully imported ${data.items.length} items`);
    }

    /**
     * Handle bulk operation complete
     * @private
     */
    async handleBulkOpComplete(operation) {
        console.log(`✅ Bulk operation complete: ${operation.type}`);
        this.search.rebuildIndex();
        this.table.setData(this.items);
        this.updateCounts();
        this.notifyObservers('bulk-op-complete', operation);
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');

        // Search - use unique ID for blocklist
        const searchInput = document.getElementById('blocklist-search-input');
        if (!searchInput) {
            console.error('❌ CRITICAL: Search input element #blocklist-search-input not found!');
            console.error('❌ Available IDs in container:', Array.from(this.element.querySelectorAll('[id]')).map(el => el.id));
            return;
        }
        console.log('✅ Found blocklist search input element:', searchInput.placeholder);

        searchInput.addEventListener('input', (e) => {
            console.log('⌨️  INPUT EVENT TRIGGERED! Value:', e.target.value);
            this.handleSearch(e.target.value);
        });
        console.log('✅ Search input listener attached');

        // Test if input works
        searchInput.addEventListener('keydown', (e) => {
            console.log('⌨️  KEYDOWN:', e.key);
        });

        // Clear search button
        const clearSearchBtn = document.getElementById('blocklist-clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                console.log('🧹 Clear search clicked');
                searchInput.value = '';
                this.handleSearch('');
            });
            console.log('✅ Clear search button listener attached');
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                console.log('📊 Status filter changed to:', e.target.value);
                this.handleStatusFilter(e.target.value);
            });
            console.log('✅ Status filter listener attached');
        }

        // Buttons
        const btnImport = document.getElementById('btn-csv-import');
        const btnStats = document.getElementById('btn-stats');
        const btnExport = document.getElementById('btn-export');

        if (btnImport) btnImport.addEventListener('click', () => this.showCsvModal());
        if (btnStats) btnStats.addEventListener('click', () => this.showStatsModal());
        if (btnExport) btnExport.addEventListener('click', () => this.showExportModal());
        if (this.undoRedo) {
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) btnUndo.addEventListener('click', () => this.undoRedo.undo());
            if (btnRedo) btnRedo.addEventListener('click', () => this.undoRedo.redo());
        }

        console.log('✅ Button listeners attached');

        // Bulk operations
        const bulkBlock = document.getElementById('bulk-block');
        const bulkAllow = document.getElementById('bulk-allow');
        const bulkRemove = document.getElementById('bulk-remove');
        const bulkCancel = document.getElementById('bulk-cancel');

        if (bulkBlock) bulkBlock.addEventListener('click', () => this.bulkChangeStatus('blocked'));
        if (bulkAllow) bulkAllow.addEventListener('click', () => this.bulkChangeStatus('allowed'));
        if (bulkRemove) bulkRemove.addEventListener('click', () => this.bulkRemove());
        if (bulkCancel) bulkCancel.addEventListener('click', () => this.table.clearSelection());

        console.log('✅ All event listeners setup complete!');
    }

    /**
     * Apply combined filters (search + status)
     * @private
     */
    applyFilters() {
        let filtered = this.items;

        console.log(`🔍 Applying filters - Search: "${this.currentSearchQuery}", Status: "${this.currentStatusFilter}", Total items: ${this.items.length}`);

        // Apply status filter first (if active)
        if (this.currentStatusFilter) {
            filtered = this.search.filterByStatus(this.currentStatusFilter);
            console.log(`   ↳ After status filter: ${filtered.length} items`);
        }

        // Then apply search on filtered results (if active)
        if (this.currentSearchQuery) {
            const query = this.currentSearchQuery.toLowerCase();
            const beforeSearch = filtered.length;
            filtered = filtered.filter(item => {
                return (item.email?.toLowerCase().includes(query)) ||
                       (item.domain?.toLowerCase().includes(query)) ||
                       (item.source?.toLowerCase().includes(query));
            });
            console.log(`   ↳ After search filter: ${filtered.length} items (was ${beforeSearch})`);
        }

        console.log(`✅ Filter result: ${filtered.length} items`);

        this.filteredItems = filtered;

        // Show/hide "no results" message
        const noResultsMsg = document.getElementById('no-results-message');
        const tableContainer = document.getElementById('virtual-table-container');

        if (filtered.length === 0 && (this.currentSearchQuery || this.currentStatusFilter)) {
            // No results found
            noResultsMsg.style.display = 'block';
            tableContainer.style.display = 'none';
            console.warn('⚠️ No results found for current filters');
        } else {
            // Has results
            noResultsMsg.style.display = 'none';
            tableContainer.style.display = 'block';
            this.table.setData(this.filteredItems);
        }

        this.updateCounts();

        // Show/hide clear search button
        const clearBtn = document.getElementById('blocklist-clear-search');
        if (clearBtn) {
            clearBtn.style.display = this.currentSearchQuery ? 'block' : 'none';
        }
    }

    /**
     * Handle search
     * @private
     */
    handleSearch(query) {
        console.log(`🔎 Search input: "${query}"`);

        // Clear previous debounce timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // For short queries (≤3 chars), apply immediately
        // For longer queries, debounce for better performance
        if (query.length <= 3) {
            this.currentSearchQuery = query;
            this.applyFilters();
        } else {
            // Debounce: wait 200ms after user stops typing
            this.searchDebounceTimer = setTimeout(() => {
                this.currentSearchQuery = query;
                this.applyFilters();
            }, 200);
        }
    }

    /**
     * Handle status filter
     * @private
     */
    handleStatusFilter(status) {
        this.currentStatusFilter = status;
        this.applyFilters();
    }

    /**
     * Bulk change status
     * @private
     */
    async bulkChangeStatus(newStatus) {
        if (this.selectedItems.length === 0) {
            alert('No items selected');
            return;
        }

        await this.bulkOps.changeStatus(this.selectedItems, newStatus);

        // Update items
        this.selectedItems.forEach(item => {
            this.updateItem(item.email, { status: newStatus });
        });

        this.table.clearSelection();
    }

    /**
     * Bulk remove
     * @private
     */
    async bulkRemove() {
        if (this.selectedItems.length === 0) {
            alert('No items selected');
            return;
        }

        if (!confirm(`Remove ${this.selectedItems.length} items?`)) {
            return;
        }

        await this.bulkOps.removeItems(this.selectedItems);

        // Remove items
        this.selectedItems.forEach(item => {
            this.removeItem(item.email);
        });

        this.table.clearSelection();
    }

    /**
     * Show CSV modal
     * @private
     */
    showCsvModal() {
        const modal = document.getElementById('csv-import-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">✕</button>
                <h2>📥 Import CSV</h2>
                <div id="csv-wizard-temp"></div>
            </div>
        `;

        // Create CSV wizard on demand
        const wizardEl = document.getElementById('csv-wizard-temp');
        if (typeof CSVImportWizard !== 'undefined') {
            const wizard = new CSVImportWizard('csv-wizard-temp');
            wizard.subscribe((event, data) => {
                if (event === 'import-complete') {
                    this.handleCsvImport(data);
                }
            });
        } else {
            wizardEl.innerHTML = '<p>CSV Import feature not available. Make sure csv-import-wizard.js is loaded.</p>';
        }

        modal.style.display = 'flex';

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Close CSV modal
     * @private
     */
    closeCsvModal() {
        document.getElementById('csv-import-modal').style.display = 'none';
    }

    /**
     * Show stats modal
     * @private
     */
    showStatsModal() {
        const modal = document.getElementById('stats-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">✕</button>
                <h2>📊 Blocklist Statistics</h2>
                <div id="stats-modal-container"></div>
            </div>
        `;

        // Create stats dashboard on demand
        const container = document.getElementById('stats-modal-container');
        if (typeof StatsDashboard !== 'undefined') {
            const dashboard = new StatsDashboard('stats-modal-container');
            dashboard.setSearchIndex(this.search);
        } else {
            container.innerHTML = '<p>Statistics feature not available. Make sure stats-dashboard.js is loaded.</p>';
        }

        modal.style.display = 'flex';

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Show export modal
     * @private
     */
    showExportModal() {
        const modal = document.getElementById('export-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.closest('.modal').style.display='none'">✕</button>
                <h2>📤 Export Blocklist</h2>
                <div class="export-options">
                    <button class="export-btn" data-format="csv">📄 CSV</button>
                    <button class="export-btn" data-format="json">📋 JSON</button>
                    <button class="export-btn" data-format="txt">📝 TXT</button>
                    <button class="export-btn" data-format="html">🌐 HTML Report</button>
                </div>
                <p style="color: #999; margin-top: 10px;">
                    Total items: ${this.items.length}
                </p>
            </div>
        `;

        modal.style.display = 'flex';

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        modal.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.exportManager.exportAndDownload(this.items, format);
                modal.style.display = 'none';
            });
        });
    }

    /**
     * Update counts display
     * @private
     */
    updateCounts() {
        // Show filtered items count if filters are active
        const totalCount = this.filteredItems.length;
        const allCount = this.items.length;

        const totalEl = document.getElementById('total-count');
        if (totalCount < allCount) {
            // Show filtered count with total in parentheses
            totalEl.textContent = `${totalCount} items (${allCount} total)`;
            totalEl.style.color = '#f59e0b'; // Orange to indicate filtering is active
        } else {
            totalEl.textContent = `${allCount} items`;
            totalEl.style.color = ''; // Reset color
        }

        // Count statuses in filtered items (not all items)
        const statusCounts = {
            blocked: 0,
            allowed: 0,
            new: 0
        };

        this.filteredItems.forEach(item => {
            const status = (item.status || 'new').toLowerCase();
            if (statusCounts[status] !== undefined) {
                statusCounts[status]++;
            }
        });

        document.getElementById('status-counts').textContent =
            `${statusCounts.blocked} blocked • ${statusCounts.allowed} allowed • ${statusCounts.new} new`;
    }

    /**
     * Update undo/redo buttons
     * @private
     */
    updateUndoRedoButtons() {
        if (!this.undoRedo) return;

        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        undoBtn.style.display = this.undoRedo.canUndo() ? 'inline-block' : 'none';
        redoBtn.style.display = this.undoRedo.canRedo() ? 'inline-block' : 'none';
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
            items: this.items,
            selectedItems: this.selectedItems,
            filteredItems: this.filteredItems,
            stats: this.search.getStats()
        };
    }

    /**
     * Export state
     */
    exportState() {
        return JSON.stringify({
            items: this.items,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    }
}
