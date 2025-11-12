/**
 * Column Manager Component
 * Manages table column visibility and order with drag-and-drop reordering
 *
 * Features:
 * - Toggle column visibility
 * - Drag & drop reordering
 * - LocalStorage persistence
 * - Locked columns (cannot hide)
 * - Reset to defaults
 *
 * @module ColumnManager
 */

class ColumnManager {
    /**
     * Create ColumnManager instance
     * @param {string} containerId - Container element ID for dropdown
     * @param {Array} columns - Array of column configurations
     * @param {Function} onColumnChange - Callback when columns change
     * @param {Object} options - Configuration options
     * @param {string} options.renderMode - Render mode: 'dropdown' or 'inline' (default: 'dropdown')
     * @param {Object} options.groups - Column groups for organization
     */
    constructor(containerId, columns, onColumnChange, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Element #${containerId} not found`);
        }

        this.columns = columns || [];
        this.onColumnChange = onColumnChange || (() => {});
        this.defaultColumns = JSON.parse(JSON.stringify(columns)); // Deep copy
        this.storageKey = 'email-checker-column-preferences';

        // Configuration options
        this.renderMode = options.renderMode || 'dropdown';
        this.groups = options.groups || this.autoDetectGroups();

        // Drag and drop state
        this.draggedIndex = null;
        this.draggedElement = null;

        console.log('📊 ColumnManager initialized with', this.columns.length, 'columns', `(${this.renderMode} mode)`);
    }

    /**
     * Initialize component
     */
    init() {
        // Load saved preferences
        this.loadFromLocalStorage();

        // Render UI
        this.render();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ ColumnManager ready');
    }

    /**
     * Render column manager (chooses mode automatically)
     */
    render() {
        if (this.renderMode === 'inline') {
            this.renderInline();
        } else {
            this.renderDropdown();
        }
    }

    /**
     * Render column manager as dropdown
     * @private
     */
    renderDropdown() {
        this.container.innerHTML = `
            <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Столбцы</span>
                </label>

                <div tabindex="0" class="dropdown-content z-[1] mt-2 w-72 rounded-box bg-base-200 shadow-xl">
                    <div class="menu p-2">
                        <div class="px-3 py-2 text-xs font-semibold opacity-60 uppercase">
                            Управление столбцами
                        </div>

                        <ul id="column-list" class="space-y-1 py-2">
                            ${this.renderColumnItems()}
                        </ul>

                        <div class="divider my-1"></div>

                        <button id="reset-columns-btn" class="btn btn-ghost btn-sm btn-block justify-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Сбросить настройки
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render column manager inline (for modals)
     * @private
     */
    renderInline() {
        const stats = this.getColumnStats();

        this.container.innerHTML = `
            <div class="space-y-4">
                <!-- Statistics & Actions -->
                <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div class="text-sm">
                        <span class="font-semibold">${stats.visible}</span> видимых /
                        <span class="opacity-60">${stats.hidden}</span> скрытых
                    </div>
                    <div class="flex gap-2">
                        <button id="show-all-btn" class="btn btn-xs btn-primary" ${stats.hidden === 0 ? 'disabled' : ''}>
                            Показать все
                        </button>
                        <button id="hide-all-btn" class="btn btn-xs btn-ghost" ${stats.unlockable === 0 ? 'disabled' : ''}>
                            Скрыть все
                        </button>
                    </div>
                </div>

                <!-- Column Groups -->
                <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                    ${this.renderColumnGroups()}
                </div>

                <!-- Reset Button -->
                <div class="divider my-2"></div>
                <button id="reset-columns-btn" class="btn btn-ghost btn-sm btn-block justify-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Сбросить настройки
                </button>
            </div>
        `;
    }

    /**
     * Render column items
     * @private
     */
    renderColumnItems() {
        return this.columns.map((column, index) => {
            const isLocked = column.locked;
            const checkboxDisabled = isLocked ? 'disabled' : '';
            const checkboxChecked = column.visible ? 'checked' : '';
            const dragHandle = isLocked ? '' : `
                <span class="drag-handle cursor-grab" data-index="${index}"
                      style="opacity: 0.5; margin-left: -0.25rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                </span>
            `;

            return `
                <li class="column-item ${isLocked ? 'opacity-50' : ''}"
                    data-index="${index}"
                    data-column-id="${column.id}"
                    draggable="${!isLocked}">
                    <label class="flex items-center gap-2 px-2 py-2 hover:bg-base-300 rounded-lg cursor-pointer">
                        ${dragHandle}
                        <input
                            type="checkbox"
                            class="checkbox checkbox-sm checkbox-primary"
                            data-column-id="${column.id}"
                            ${checkboxChecked}
                            ${checkboxDisabled}
                        >
                        <span class="flex-1 text-sm">${column.label}</span>
                        ${isLocked ? '<span class="badge badge-xs badge-ghost">закреплен</span>' : ''}
                    </label>
                </li>
            `;
        }).join('');
    }

    /**
     * Render column groups (inline mode)
     * @private
     */
    renderColumnGroups() {
        let html = '';

        Object.entries(this.groups).forEach(([groupName, columnIds]) => {
            const groupColumns = this.columns.filter(col => columnIds.includes(col.id));

            if (groupColumns.length === 0) return;

            html += `
                <div class="space-y-2">
                    <div class="text-xs font-semibold opacity-60 uppercase px-2">${groupName}</div>
                    <ul id="column-list" class="space-y-1">
                        ${groupColumns.map((column, index) => {
                            const globalIndex = this.columns.findIndex(c => c.id === column.id);
                            const isLocked = column.locked;
                            const checkboxDisabled = isLocked ? 'disabled' : '';
                            const checkboxChecked = column.visible ? 'checked' : '';
                            const dragHandle = isLocked ?
                                '<span class="w-4 opacity-30">🔒</span>' :
                                `<span class="drag-handle cursor-grab" data-index="${globalIndex}" style="opacity: 0.5;">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                    </svg>
                                </span>`;

                            return `
                                <li class="column-item ${isLocked ? 'opacity-60' : ''}"
                                    data-index="${globalIndex}"
                                    data-column-id="${column.id}"
                                    draggable="${!isLocked}">
                                    <label class="flex items-center gap-2 px-2 py-2 hover:bg-base-300 rounded-lg cursor-pointer transition-all">
                                        ${dragHandle}
                                        <input
                                            type="checkbox"
                                            class="checkbox checkbox-sm checkbox-primary"
                                            data-column-id="${column.id}"
                                            ${checkboxChecked}
                                            ${checkboxDisabled}
                                        >
                                        <span class="flex-1 text-sm">${column.label}</span>
                                        ${isLocked ? '<span class="badge badge-xs badge-ghost" title="Колонка закреплена и всегда видима">закреплен</span>' : ''}
                                    </label>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
        });

        return html;
    }

    /**
     * Auto-detect column groups based on common patterns
     * @private
     */
    autoDetectGroups() {
        const groups = {
            'Основные колонки': [],
            'Дополнительные данные': []
        };

        // Keywords for primary columns
        const primaryKeywords = ['email', 'name', 'company', 'domain', 'country', 'category', 'status', 'select', 'source'];

        this.columns.forEach(col => {
            const id = col.id.toLowerCase();
            const isPrimary = primaryKeywords.some(keyword => id.includes(keyword)) || col.locked;

            if (isPrimary) {
                groups['Основные колонки'].push(col.id);
            } else {
                groups['Дополнительные данные'].push(col.id);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });

        return groups;
    }

    /**
     * Get column statistics
     * @returns {Object} Statistics about columns
     */
    getColumnStats() {
        const visible = this.columns.filter(c => c.visible).length;
        const hidden = this.columns.filter(c => !c.visible).length;
        const locked = this.columns.filter(c => c.locked).length;
        const unlockable = this.columns.filter(c => !c.locked).length;

        return { visible, hidden, locked, unlockable, total: this.columns.length };
    }

    /**
     * Toggle all columns visibility
     * @param {boolean} visible - Show or hide all columns
     */
    toggleAllColumns(visible) {
        this.columns.forEach(column => {
            if (!column.locked) {
                column.visible = visible;
            }
        });

        console.log(`🔄 ${visible ? 'Показаны' : 'Скрыты'} все незакрепленные колонки`);

        // Re-render
        this.render();
        this.setupEventListeners();

        // Save to localStorage
        this.saveToLocalStorage();

        // Notify callback
        this.notifyChange();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        // Checkbox change events
        const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const columnId = e.target.dataset.columnId;
                this.toggleColumnVisibility(columnId, e.target.checked);
            });
        });

        // Reset button
        const resetBtn = this.container.querySelector('#reset-columns-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        // Show all button (inline mode)
        const showAllBtn = this.container.querySelector('#show-all-btn');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                this.toggleAllColumns(true);
            });
        }

        // Hide all button (inline mode)
        const hideAllBtn = this.container.querySelector('#hide-all-btn');
        if (hideAllBtn) {
            hideAllBtn.addEventListener('click', () => {
                this.toggleAllColumns(false);
            });
        }

        // Drag and drop events
        this.setupDragAndDrop();
    }

    /**
     * Setup drag and drop functionality
     * @private
     */
    setupDragAndDrop() {
        const columnItems = this.container.querySelectorAll('.column-item[draggable="true"]');

        columnItems.forEach(item => {
            // Drag start
            item.addEventListener('dragstart', (e) => {
                this.draggedIndex = parseInt(e.target.dataset.index);
                this.draggedElement = e.target;

                e.target.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);

                console.log('🔵 Drag started:', this.draggedIndex);
            });

            // Drag end
            item.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';

                // Remove all drag-over styles
                columnItems.forEach(item => {
                    item.classList.remove('border-primary', 'border-2');
                });

                console.log('🟢 Drag ended');
            });

            // Drag over (allow drop)
            item.addEventListener('dragover', (e) => {
                if (e.preventDefault) {
                    e.preventDefault();
                }

                e.dataTransfer.dropEffect = 'move';

                // Visual feedback
                if (e.target.closest('.column-item')) {
                    e.target.closest('.column-item').classList.add('border-primary', 'border-2');
                }

                return false;
            });

            // Drag enter
            item.addEventListener('dragenter', (e) => {
                if (e.target.closest('.column-item')) {
                    e.target.closest('.column-item').classList.add('bg-base-300');
                }
            });

            // Drag leave
            item.addEventListener('dragleave', (e) => {
                if (e.target.closest('.column-item')) {
                    const item = e.target.closest('.column-item');
                    item.classList.remove('bg-base-300', 'border-primary', 'border-2');
                }
            });

            // Drop
            item.addEventListener('drop', (e) => {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                const dropTarget = e.target.closest('.column-item');
                if (dropTarget && this.draggedElement !== dropTarget) {
                    const dropIndex = parseInt(dropTarget.dataset.index);

                    console.log('🎯 Drop:', this.draggedIndex, '→', dropIndex);

                    // Reorder columns
                    this.reorderColumns(this.draggedIndex, dropIndex);
                }

                // Remove visual feedback
                columnItems.forEach(item => {
                    item.classList.remove('bg-base-300', 'border-primary', 'border-2');
                });

                return false;
            });
        });

        // Handle drag on drag handles specifically
        const dragHandles = this.container.querySelectorAll('.drag-handle');
        dragHandles.forEach(handle => {
            handle.addEventListener('mousedown', () => {
                handle.style.cursor = 'grabbing';
            });

            handle.addEventListener('mouseup', () => {
                handle.style.cursor = 'grab';
            });
        });
    }

    /**
     * Toggle column visibility
     * @param {string} columnId - Column ID to toggle
     * @param {boolean} visible - New visibility state
     */
    toggleColumnVisibility(columnId, visible) {
        const column = this.columns.find(c => c.id === columnId);
        if (column && !column.locked) {
            column.visible = visible;

            console.log(`👁️ Column "${columnId}" visibility:`, visible);

            // Save to localStorage
            this.saveToLocalStorage();

            // Notify callback
            this.notifyChange();
        }
    }

    /**
     * Reorder columns
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Target index
     */
    reorderColumns(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        // Don't allow reordering locked columns
        if (this.columns[fromIndex].locked || this.columns[toIndex].locked) {
            console.warn('⚠️ Cannot reorder locked columns');
            return;
        }

        // Perform reordering
        const [movedColumn] = this.columns.splice(fromIndex, 1);
        this.columns.splice(toIndex, 0, movedColumn);

        console.log('🔄 Reordered columns:', fromIndex, '→', toIndex);

        // Re-render
        this.render();
        this.setupEventListeners();

        // Save to localStorage
        this.saveToLocalStorage();

        // Notify callback
        this.notifyChange();
    }

    /**
     * Reset columns to defaults
     */
    resetToDefaults() {
        console.log('🔄 Resetting columns to defaults');

        // Restore default columns
        this.columns = JSON.parse(JSON.stringify(this.defaultColumns));

        // Clear localStorage
        localStorage.removeItem(this.storageKey);

        // Re-render
        this.render();
        this.setupEventListeners();

        // Notify callback
        this.notifyChange();

        // Show feedback
        if (typeof toast !== 'undefined') {
            toast.success('Настройки столбцов сброшены');
        }
    }

    /**
     * Get visible columns in current order
     * @returns {Array} Array of visible column IDs
     */
    getVisibleColumns() {
        return this.columns
            .filter(col => col.visible)
            .map(col => col.id);
    }

    /**
     * Get all columns with metadata
     * @returns {Array} Array of column configurations
     */
    getAllColumns() {
        return this.columns;
    }

    /**
     * Save preferences to localStorage
     * @private
     */
    saveToLocalStorage() {
        try {
            const preferences = {
                columns: this.columns.map(col => ({
                    id: col.id,
                    visible: col.visible
                })),
                order: this.columns.map(col => col.id),
                version: '1.0',
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(preferences));
            console.log('💾 Column preferences saved');
        } catch (error) {
            console.error('❌ Failed to save column preferences:', error);
        }
    }

    /**
     * Load preferences from localStorage
     * @private
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const preferences = JSON.parse(saved);

            // Restore visibility
            preferences.columns.forEach(savedCol => {
                const column = this.columns.find(c => c.id === savedCol.id);
                if (column && !column.locked) {
                    column.visible = savedCol.visible;
                }
            });

            // Restore order
            if (preferences.order) {
                const orderedColumns = [];

                // First, add columns in saved order
                preferences.order.forEach(id => {
                    const column = this.columns.find(c => c.id === id);
                    if (column) {
                        orderedColumns.push(column);
                    }
                });

                // Then add any new columns not in saved order
                this.columns.forEach(column => {
                    if (!orderedColumns.find(c => c.id === column.id)) {
                        orderedColumns.push(column);
                    }
                });

                this.columns = orderedColumns;
            }

            console.log('📂 Column preferences loaded');
        } catch (error) {
            console.error('❌ Failed to load column preferences:', error);
        }
    }

    /**
     * Notify change callback
     * @private
     */
    notifyChange() {
        try {
            const visibleColumns = this.getVisibleColumns();
            this.onColumnChange(visibleColumns);
        } catch (error) {
            console.error('❌ Error in onColumnChange callback:', error);
        }
    }

    /**
     * Update columns configuration
     * @param {Array} newColumns - New columns configuration
     */
    updateColumns(newColumns) {
        this.columns = newColumns;
        this.render();
        this.setupEventListeners();
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        console.log('🗑️ ColumnManager destroyed');
    }
}

// Export to window for browser environment
if (typeof window !== 'undefined') {
    window.ColumnManager = ColumnManager;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColumnManager };
}
