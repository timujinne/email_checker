/**
 * Lists Manager Component
 * Manages email lists UI and interactions with Column Manager and Bulk Edit
 */

class ListsManagerComponent {
    constructor() {
        this.lists = [];
        this.filteredLists = [];
        this.selectedFilenames = new Set();
        this.columnManager = null;
        this.visibleColumns = [];
        this._initialized = false;
        this._loading = false;  // Prevent concurrent loadLists() calls
        this.keyboardHandler = null;
        this.lastClickedCheckboxIndex = null;  // For shift-click range selection

        // Pagination state
        this.currentPage = 1;
        this.pageSize = 100;  // Default page size
        this.pageSizeOptions = [100, 500, 1000, 2000, 3000, 5000, 10000];
    }

    /**
     * Initialize Lists Manager
     */
    async init() {
        // Prevent duplicate initialization
        if (this._initialized) {
            console.log('ℹ️ Lists Manager already initialized, refreshing lists only...');
            const success = await this.loadLists();
            if (success) {
                this.renderTable();
                this.renderPaginationControls();
            }
            // If loadLists() failed, error message is already shown in container
            return;
        }

        console.log('📋 Initializing Lists Manager...');

        // Load saved page size from localStorage
        const savedPageSize = localStorage.getItem('listsPageSize');
        if (savedPageSize) {
            this.pageSize = parseInt(savedPageSize);
        }

        // Load lists first
        const success = await this.loadLists();

        // Only continue initialization if lists loaded successfully
        if (!success) {
            console.log('❌ Lists loading failed, aborting initialization');
            // Error message already shown by loadLists() in container
            return;
        }

        console.log('✅ Lists loaded successfully, continuing initialization...');

        // Initialize Column Manager
        this.initColumnManager();

        // Setup event listeners
        this.setupEventListeners();

        // Setup keyboard shortcuts (ONCE!)
        this.setupKeyboardShortcuts();

        // Initial render
        this.renderTable();
        this.renderPaginationControls();

        this._initialized = true;
        console.log('✅ Lists Manager initialized');
    }

    /**
     * Initialize Column Manager
     */
    initColumnManager() {
        console.log('📐 Initializing Column Manager...');

        // Check if column manager container exists
        const container = document.getElementById('column-manager-container');
        console.log('  - Column Manager container exists:', !!container);

        if (!container) {
            console.log('ℹ️ Column Manager container not found - using default columns');
            // Set default visible columns when Column Manager is not available
            this.visibleColumns = [
                { id: 'select', label: 'Выбор', visible: true, locked: true },
                { id: 'filename', label: 'Название файла', visible: true, locked: true },
                { id: 'display_name', label: 'Отображаемое имя', visible: true, locked: false },
                { id: 'country', label: 'Страна', visible: true, locked: false },
                { id: 'category', label: 'Категория', visible: true, locked: false },
                { id: 'file_type', label: 'Тип файла', visible: true, locked: false },
                { id: 'statistics', label: 'Статистика', visible: true, locked: false },
                { id: 'processed', label: 'Обработан', visible: true, locked: false },
                { id: 'actions', label: 'Действия', visible: true, locked: true }
            ];
            console.log('  - Default visible columns set:', this.visibleColumns);
            return;
        }

        console.log('  - Container found, creating ColumnManager instance...');

        const columns = [
            { id: 'select', label: 'Выбор', visible: true, locked: true },
            { id: 'filename', label: 'Название файла', visible: true, locked: true },
            { id: 'display_name', label: 'Отображаемое имя', visible: true, locked: false },
            { id: 'country', label: 'Страна', visible: true, locked: false },
            { id: 'category', label: 'Категория', visible: true, locked: false },
            { id: 'priority', label: 'Приоритет', visible: false, locked: false },
            { id: 'file_type', label: 'Тип файла', visible: true, locked: false },
            { id: 'statistics', label: 'Статистика', visible: true, locked: false },
            { id: 'processed', label: 'Обработан', visible: true, locked: false },
            { id: 'date_added', label: 'Дата добавления', visible: false, locked: false },
            { id: 'description', label: 'Описание', visible: false, locked: false },
            { id: 'actions', label: 'Действия', visible: true, locked: true }
        ];

        this.columnManager = new ColumnManager(
            'column-manager-container',
            columns,
            (visibleColumns) => {
                console.log('  - Column visibility changed, updating visible columns:', visibleColumns);
                this.visibleColumns = visibleColumns;
                this.renderTable();
            }
        );

        console.log('  - ColumnManager instance created, calling init()...');
        this.columnManager.init();

        this.visibleColumns = this.columnManager.getVisibleColumns();
        console.log('  - Visible columns retrieved:', this.visibleColumns);

        console.log('✅ Column Manager initialized with', this.visibleColumns.length, 'visible columns');
    }

    /**
     * Get column configuration by ID
     */
    getColumnConfig(columnId) {
        const configs = {
            select: { label: 'Выбор', sortable: false, width: '60px', align: 'center' },
            filename: { label: 'Название файла', sortable: true, width: '280px', align: 'left' },
            display_name: { label: 'Отображаемое имя', sortable: true, width: '200px', align: 'left' },
            country: { label: 'Страна', sortable: true, width: '120px', align: 'center' },
            category: { label: 'Категория', sortable: true, width: '140px', align: 'center' },
            priority: { label: 'Приоритет', sortable: true, width: '100px', align: 'center' },
            file_type: { label: 'Тип', sortable: true, width: '80px', align: 'center' },
            statistics: { label: 'Статистика', sortable: false, width: '150px', align: 'left' },
            processed: { label: 'Статус', sortable: true, width: '130px', align: 'center' },
            date_added: { label: 'Дата', sortable: true, width: '110px', align: 'center' },
            description: { label: 'Описание', sortable: false, width: '200px', align: 'left' },
            actions: { label: 'Действия', sortable: false, width: '120px', align: 'center' }
        };
        return configs[columnId] || { label: columnId, sortable: false, width: 'auto', align: 'left' };
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Remove old listener if exists
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            console.log('🗑️ Removed old keyboard handler');
        }

        // Create bound handler
        this.keyboardHandler = (e) => {
            // Ignore if typing in input/textarea/select
            if (e.target.matches('input, textarea, select')) {
                // Allow Enter in modal
                if (e.key === 'Enter' && this.isBulkEditModalOpen()) {
                    e.preventDefault();
                    document.getElementById('bulk-edit-apply')?.click();
                }
                return;
            }

            // Ctrl/Cmd + A: Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAllLists();
                return;
            }

            // Ctrl/Cmd + D: Deselect all
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.deselectAllLists();
                return;
            }

            // Ctrl/Cmd + E: Open bulk edit
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                const selectedCount = this.getSelectedFilenames().length;
                if (selectedCount > 0) {
                    this.openBulkEditModal();
                } else {
                    // User feedback when nothing selected
                    if (typeof toast !== 'undefined') {
                        toast.warning('⚠️ Сначала выберите списки для редактирования');
                    }
                }
                return;
            }

            // Ctrl/Cmd + R: Refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshLists();
                return;
            }

            // Escape: Close modal or clear selection
            if (e.key === 'Escape') {
                if (this.isBulkEditModalOpen()) {
                    this.closeBulkEditModal();
                } else {
                    this.deselectAllLists();
                }
                return;
            }

            // ?: Show shortcuts help (Shift+/ produces '?')
            if (e.key === '?') {
                e.preventDefault();
                this.showShortcutsHelp();
                return;
            }
        };

        // Add new listener
        document.addEventListener('keydown', this.keyboardHandler);
        console.log('⌨️ Keyboard shortcuts registered');
    }

    /**
     * Select all visible lists
     */
    selectAllLists() {
        const checkboxes = document.querySelectorAll('.checkbox[data-filename]');
        checkboxes.forEach(cb => cb.checked = true);
        this.updateSelectedCount();
        this.showToast(`✓ Выбрано ${checkboxes.length} списков`, 'success');
        this.announceToScreenReader(`Выбрано ${checkboxes.length} списков`);
    }

    /**
     * Deselect all lists
     */
    deselectAllLists() {
        const checkboxes = document.querySelectorAll('.checkbox[data-filename]:checked');
        const count = checkboxes.length;
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectedCount();
        if (count > 0) {
            this.showToast(`Снято выделение с ${count} списков`, 'info');
            this.announceToScreenReader(`Снято выделение с ${count} списков`);
        }
    }

    /**
     * Check if bulk edit modal is open
     */
    isBulkEditModalOpen() {
        const modal = document.getElementById('bulk-edit-modal');
        return modal && modal.open;
    }

    /**
     * Refresh lists from server
     */
    async refreshLists() {
        this.showLoadingIndicator('Обновление списков...');
        await this.loadLists();
        this.renderTable();
        this.hideLoadingIndicator();
        this.showToast('Списки обновлены', 'success');
    }

    /**
     * Scan input/ directory for new files
     */
    async scanNewFiles() {
        try {
            this.showLoadingIndicator('Сканирование новых файлов...');

            // Call API to scan input directory
            const response = await fetch('/api/scan-input-directory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const newFilesCount = result.new_files_count || 0;

                if (newFilesCount > 0) {
                    // Reload lists to show new files
                    await this.loadLists();
                    this.renderTable();

                    // Highlight new files in the table
                    this.highlightNewFiles(result.new_files);

                    this.showToast(
                        `Найдено ${newFilesCount} ${this.pluralizeFiles(newFilesCount)}!`,
                        'success'
                    );

                    console.log('✅ New files found:', result.new_files);
                } else {
                    this.showToast('Новых файлов не найдено', 'info');
                }
            } else {
                throw new Error(result.error || 'Unknown error');
            }

            this.hideLoadingIndicator();
        } catch (error) {
            console.error('❌ Error scanning new files:', error);
            this.hideLoadingIndicator();
            this.showToast(`Ошибка сканирования: ${error.message}`, 'error');
        }
    }

    /**
     * Pluralize files count (helper for Russian language)
     */
    pluralizeFiles(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return 'новых файлов';
        } else if (lastDigit === 1) {
            return 'новый файл';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            return 'новых файла';
        } else {
            return 'новых файлов';
        }
    }

    /**
     * Highlight new files in table
     */
    highlightNewFiles(newFiles) {
        if (!newFiles || newFiles.length === 0) return;

        const newFilenames = new Set(newFiles.map(f => f.filename));

        // Add visual indicator to new file rows
        setTimeout(() => {
            const rows = document.querySelectorAll('#lists-table tbody tr');
            rows.forEach(row => {
                const filenameCell = row.querySelector('[data-filename]');
                if (filenameCell) {
                    const filename = filenameCell.getAttribute('data-filename');
                    if (newFilenames.has(filename)) {
                        // Add highlight class
                        row.classList.add('bg-success', 'bg-opacity-10', 'animate-pulse');

                        // Remove animation after 3 seconds
                        setTimeout(() => {
                            row.classList.remove('animate-pulse');
                        }, 3000);

                        // Add "NEW" badge to display name
                        const displayNameCell = filenameCell;
                        const badge = document.createElement('span');
                        badge.className = 'badge badge-success badge-sm ml-2';
                        badge.textContent = 'NEW';
                        displayNameCell.appendChild(badge);
                    }
                }
            });
        }, 100);
    }

    /**
     * Show keyboard shortcuts help modal
     */
    showShortcutsHelp() {
        const modal = `
            <dialog id="shortcuts-modal" class="modal" role="dialog">
                <div class="modal-box bg-base-100">
                    <h3 class="font-bold text-lg mb-4">
                        ⌨️ Горячие клавиши
                    </h3>

                    <div class="space-y-3">
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Ctrl/Cmd+A</kbd>
                            <span class="text-sm flex-1">Выбрать все списки</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Ctrl/Cmd+D</kbd>
                            <span class="text-sm flex-1">Снять выделение</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Ctrl/Cmd+E</kbd>
                            <span class="text-sm flex-1">Редактировать выбранные</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Ctrl/Cmd+R</kbd>
                            <span class="text-sm flex-1">Обновить списки</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Escape</kbd>
                            <span class="text-sm flex-1">Закрыть / Снять выделение</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">Enter</kbd>
                            <span class="text-sm flex-1">Применить (в модальном окне)</span>
                        </div>
                        <div class="flex justify-between items-center gap-4">
                            <kbd class="kbd kbd-sm">?</kbd>
                            <span class="text-sm flex-1">Показать справку</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                <button class="btn btn-primary btn-sm gap-2" onclick="window.listsManager.showUploadModal()">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <button class="btn btn-ghost btn-sm gap-2" onclick="window.metadataManager.open()">
                    <i class="fas fa-tags"></i> Metadata
                </button>
                <button class="btn btn-ghost btn-sm btn-square" onclick="window.listsManager.loadLists()" title="Refresh">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
                    <div class="modal-action">
                        <button class="btn" onclick="document.getElementById('shortcuts-modal').close()">Закрыть</button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('shortcuts-modal');
        if (existingModal) existingModal.remove();

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modal);

        // Wait for DOM to fully render, then open modal
        // DaisyUI handles centering automatically - don't manually add classes
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const dialogElement = document.getElementById('shortcuts-modal');
                if (dialogElement) {
                    dialogElement.showModal();
                } else {
                    console.error('Failed to find shortcuts-modal element');
                }
            });
        });
    }

    /**
     * Show loading overlay indicator
     */
    showLoadingIndicator(text = 'Загрузка...', subtext = '') {
        const overlay = document.getElementById('loading-overlay');
        const textEl = document.getElementById('loading-text');
        const subtextEl = document.getElementById('loading-subtext');

        if (overlay) {
            if (textEl) textEl.textContent = text;
            if (subtextEl) subtextEl.textContent = subtext;
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay indicator
     */
    hideLoadingIndicator() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `
                <span class="loading loading-spinner loading-sm"></span>
                <span>Обработка...</span>
            `;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    /**
     * Announce to screen reader
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => announcement.remove(), 1000);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (typeof toast !== 'undefined') {
            toast[type](message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Load lists from API
     * @returns {Promise<boolean>} True if loading succeeded, false if failed
     */
    async loadLists() {
        console.log('📥 Starting loadLists()...');
        console.log('  - Current _loading flag:', this._loading);

        // Prevent concurrent loading
        if (this._loading) {
            console.log('ℹ️ Lists already loading, skipping...');
            return false;
        }

        this._loading = true;
        console.log('  - Set _loading flag to TRUE');

        // Set loading state
        store.set('loading', true);

        // Show loading indicator
        const container = document.getElementById('lists-table-container');
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 gap-4" role="status" aria-live="polite">
                    <span class="loading loading-spinner loading-lg text-primary" aria-label="Загрузка"></span>
                    <p class="opacity-70">Загрузка списков...</p>
                </div>
            `;
        }

        try {
            // Fetch lists from API
            console.log('🌐 Fetching lists from /api/lists...');
            const response = await api.get('/api/lists');
            console.log('  - API response received:', response);

            const data = response.data || response;
            console.log('  - Extracted data:', data);

            // Extract lists array
            this.lists = data.lists || [];
            console.log('  - Raw lists count:', this.lists.length);

            // Ensure each list has required fields
            this.lists = this.lists.map((list, index) => ({
                ...list,
                id: list.id || index,
                display_name: list.display_name || list.filename,
                file_type: list.file_type || 'TXT',
                country: list.country || 'Unknown',
                category: list.category || 'General',
                processed: list.processed ?? false,  // Используем ?? для булевых значений
                priority: list.priority || 100,
                date_added: list.date_added || new Date().toISOString().split('T')[0],
                description: list.description || ''
            }));

            // Initialize filtered lists
            this.filteredLists = [...this.lists];
            console.log('  - Filtered lists initialized:', this.filteredLists.length);

            // Store in global state
            store.set('lists', this.lists);
            console.log('  - Lists stored in global state');

            // Show success toast
            if (typeof toast !== 'undefined') {
                toast.success(`Загружено ${this.lists.length} списков`);
            }

            console.log('✅ Successfully loaded', this.lists.length, 'lists');
            console.log('  - Sample list:', this.lists[0]);

            // Populate filter dropdowns dynamically
            this.populateFilterCountries();
            this.populateFilterCategories();

            return true;  // Success
        } catch (error) {
            console.error('❌ Error loading lists:', error);

            // Show error in UI
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div class="flex-1">
                            <h3 class="font-bold">Ошибка загрузки списков</h3>
                            <div class="text-xs">${error.message || 'Не удалось загрузить списки с сервера'}</div>
                        </div>
                        <button class="btn btn-sm btn-ghost" id="retry-load-btn">
                            Повторить
                        </button>
                    </div>
                `;
            }

            // Show error toast
            if (typeof toast !== 'undefined') {
                toast.error(`Ошибка: ${error.message || 'Не удалось загрузить списки'}`);
            }

            // Store error in state
            store.set('error', error.message);

            // Ensure filteredLists is initialized even on error
            this.filteredLists = [];
            console.log('  - filteredLists set to empty array on error');

            return false;  // Failure
        } finally {
            // Clear loading state
            store.set('loading', false);
            this._loading = false;
            console.log('🏁 loadLists() completed');
            console.log('  - _loading flag reset to FALSE');
            console.log('  - Final lists count:', this.lists.length);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable();
            });
        }

        // Country filter
        const countryFilter = document.getElementById('country-filter');
        if (countryFilter) {
            countryFilter.addEventListener('change', (e) => {
                this.filterTable();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterTable();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterTable();
            });
        }

        // Bulk edit button
        const bulkEditBtn = document.getElementById('bulk-edit-btn');
        if (bulkEditBtn) {
            bulkEditBtn.addEventListener('click', () => {
                this.openBulkEditModal();
            });
        }

        // Help button
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showShortcutsHelp();
            });
        }

        // Bulk edit modal checkboxes (enable/disable fields)
        ['country', 'category', 'priority', 'processed', 'description'].forEach(field => {
            const checkbox = document.getElementById(`update-${field}-check`);
            const input = document.getElementById(`update-${field}`);

            if (checkbox && input) {
                checkbox.addEventListener('change', () => {
                    input.disabled = !checkbox.checked;
                    this.updateBulkEditPreview();
                    this.updateApplyButtonState();
                });

                input.addEventListener('input', () => {
                    this.updateBulkEditPreview();
                });
            }
        });

        // Bulk edit modal buttons
        const bulkEditCancel = document.getElementById('bulk-edit-cancel');
        if (bulkEditCancel) {
            bulkEditCancel.addEventListener('click', () => {
                this.closeBulkEditModal();
            });
        }

        const modalBackdropClose = document.getElementById('modal-backdrop-close');
        if (modalBackdropClose) {
            modalBackdropClose.addEventListener('click', () => {
                this.closeBulkEditModal();
            });
        }

        const bulkEditApply = document.getElementById('bulk-edit-apply');
        if (bulkEditApply) {
            bulkEditApply.addEventListener('click', () => {
                this.applyBulkEdit();
            });
        }

        // Event delegation for dynamically created buttons
        const tableContainer = document.getElementById('lists-table-container');
        if (tableContainer) {
            tableContainer.addEventListener('click', (e) => {
                // Retry button in error state
                if (e.target.id === 'retry-load-btn' || e.target.closest('#retry-load-btn')) {
                    console.log('🔄 Retry button clicked');
                    this.loadLists();
                }

                // Reset filters button in empty state
                if (e.target.id === 'reset-filters-btn' || e.target.closest('#reset-filters-btn')) {
                    console.log('🔄 Reset filters button clicked');
                    this.resetFilters();
                }
            });
        }
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        console.log('🧹 Resetting all filters...');

        const searchInput = document.getElementById('search-input');
        const countryFilter = document.getElementById('country-filter');
        const categoryFilter = document.getElementById('category-filter');
        const statusFilter = document.getElementById('status-filter');

        if (searchInput) searchInput.value = '';
        if (countryFilter) countryFilter.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        this.filterTable();
        console.log('✅ Filters reset');
    }

    /**
     * Filter table based on search and filters
     */
    filterTable() {
        const search = document.getElementById('search-input')?.value || '';
        const country = document.getElementById('country-filter')?.value || '';
        const category = document.getElementById('category-filter')?.value || '';
        const status = document.getElementById('status-filter')?.value || '';

        this.filteredLists = this.lists.filter(list => {
            const matchSearch = search === '' ||
                (list.display_name && list.display_name.toLowerCase().includes(search.toLowerCase())) ||
                (list.filename && list.filename.toLowerCase().includes(search.toLowerCase())) ||
                (list.country && list.country.toLowerCase().includes(search.toLowerCase()));

            const matchCountry = country === '' || list.country === country;
            const matchCategory = category === '' || list.category === category;

            // Status filter logic
            let matchStatus = true;
            if (status === 'processed') {
                matchStatus = list.processed === true;
            } else if (status === 'pending') {
                matchStatus = list.processed === false || !list.processed;
            }

            return matchSearch && matchCountry && matchCategory && matchStatus;
        });

        // Reset to first page when filtering
        this.currentPage = 1;

        this.renderTable();
        this.renderPaginationControls();
    }

    /**
     * Get paginated data for current page
     */
    getPaginatedData() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.filteredLists.slice(startIndex, endIndex);
    }

    /**
     * Get total number of pages
     */
    getTotalPages() {
        return Math.ceil(this.filteredLists.length / this.pageSize);
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = this.getTotalPages();

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        this.currentPage = page;
        this.renderTable();
        this.renderPaginationControls();

        // Scroll to top of table
        document.getElementById('lists-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Change page size
     */
    changePageSize(newSize) {
        this.pageSize = parseInt(newSize);
        this.currentPage = 1;  // Reset to first page
        this.renderTable();
        this.renderPaginationControls();

        // Save to localStorage
        localStorage.setItem('listsPageSize', this.pageSize);
    }

    /**
     * Next page
     */
    nextPage() {
        this.goToPage(this.currentPage + 1);
    }

    /**
     * Previous page
     */
    prevPage() {
        this.goToPage(this.currentPage - 1);
    }

    /**
     * Render table with dynamic columns
     */
    renderTable() {
        console.log('📊 renderTable() called');

        const tableContainer = document.getElementById('lists-table-container');
        console.log('  - Container exists:', !!tableContainer);
        console.log('  - Container element:', tableContainer);

        if (!tableContainer) {
            console.error('❌ lists-table-container not found! Cannot render table.');
            return;
        }

        // Safety check: ensure filteredLists is initialized
        if (!this.filteredLists || !Array.isArray(this.filteredLists)) {
            console.warn('⚠️ filteredLists is not initialized, initializing to empty array');
            this.filteredLists = [];
        }

        console.log('  - Total lists:', this.lists.length);
        console.log('  - Filtered lists:', this.filteredLists.length);
        console.log('  - Visible columns:', this.visibleColumns);

        const lists = this.getPaginatedData();
        console.log('  - Lists to render (page', this.currentPage, '):', lists.length);

        if (this.filteredLists.length === 0) {
            tableContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4 gap-4">
                    <svg class="w-16 h-16 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div class="text-center space-y-2">
                        <h3 class="text-lg font-semibold text-base-content">Нет списков для отображения</h3>
                        <p class="text-sm text-base-content/60 max-w-sm">
                            Попробуйте изменить фильтры или загрузите новые списки для обработки
                        </p>
                    </div>
                    <button class="btn btn-primary btn-sm gap-2" id="reset-filters-btn">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Сбросить фильтры
                    </button>
                </div>
            `;
            return;
        }

        // Build table header dynamically with fixed widths
        let headerHTML = '<thead><tr>';
        this.visibleColumns.forEach(col => {
            // Получаем ID колонки (поддерживаем как объекты, так и строковые ID для обратной совместимости)
            const colId = typeof col === 'string' ? col : col.id;
            const config = this.getColumnConfig(colId);
            const widthStyle = config.width ? `style="width: ${config.width}; min-width: ${config.width};"` : '';
            const alignClass = config.align === 'center' ? 'text-center' :
                config.align === 'right' ? 'text-right' : 'text-left';

            // Special handling for select column with header checkbox
            if (colId === 'select') {
                headerHTML += `
                    <th class="text-base-content ${alignClass}" ${widthStyle}>
                        <label>
                            <input type="checkbox"
                                   id="select-all"
                                   class="checkbox checkbox-sm"
                                   aria-label="Выбрать все видимые списки"
                                   title="Выбрать/снять все (Ctrl+A)">
                        </label>
                    </th>
                `;
            } else {
                headerHTML += `<th class="text-base-content ${alignClass}" ${widthStyle}>${config.label}</th>`;
            }
        });
        headerHTML += '</tr></thead>';

        // Build table body dynamically with alignment
        let bodyHTML = '<tbody>';
        lists.forEach(list => {
            bodyHTML += '<tr class="hover">';
            this.visibleColumns.forEach(col => {
                // Получаем ID колонки (поддерживаем как объекты, так и строковые ID)
                const colId = typeof col === 'string' ? col : col.id;
                const config = this.getColumnConfig(colId);
                const alignClass = config.align === 'center' ? 'text-center' :
                    config.align === 'right' ? 'text-right' : 'text-left';
                bodyHTML += `<td class="${alignClass}">${this.renderCell(list, colId)}</td>`;
            });
            bodyHTML += '</tr>';
        });
        bodyHTML += '</tbody>';

        tableContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="table table-zebra table-pin-rows table-fixed w-full">
                    ${headerHTML}
                    ${bodyHTML}
                </table>
            </div>
        `;

        console.log('✅ Table rendered successfully with', lists.length, 'rows');

        // Attach event listeners for checkboxes after render
        this.attachTableEventListeners();
        console.log('✅ Event listeners attached');
    }

    /**
     * Render pagination controls
     */
    renderPaginationControls() {
        const paginationContainer = document.getElementById('pagination-controls');
        if (!paginationContainer) return;

        const totalPages = this.getTotalPages();
        const totalItems = this.filteredLists.length;

        if (totalItems === 0) {
            paginationContainer.innerHTML = '';
            return;
        }

        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, totalItems);

        const prevDisabled = this.currentPage === 1 ? 'btn-disabled' : '';
        const nextDisabled = this.currentPage === totalPages ? 'btn-disabled' : '';

        paginationContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <!-- Page size selector -->
                <div class="flex items-center gap-2">
                    <label for="page-size-select" class="text-sm font-medium">
                        Строк на странице:
                    </label>
                    <select id="page-size-select"
                            class="select select-bordered select-sm"
                            aria-label="Количество строк на странице">
                        ${this.pageSizeOptions.map(size => `
                            <option value="${size}" ${size === this.pageSize ? 'selected' : ''}>
                                ${size}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Page info and navigation -->
                <div class="flex items-center gap-4">
                    <div class="text-sm text-base-content/70" role="status" aria-live="polite">
                        Показаны <span class="font-semibold">${startItem}-${endItem}</span>
                        из <span class="font-semibold">${totalItems}</span>
                    </div>

                    <div class="join">
                        <button class="join-item btn btn-sm ${prevDisabled}"
                                onclick="listsManager.prevPage()"
                                aria-label="Предыдущая страница"
                                ${this.currentPage === 1 ? 'disabled' : ''}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Назад
                        </button>

                        <button class="join-item btn btn-sm btn-ghost no-animation">
                            Страница ${this.currentPage} из ${totalPages}
                        </button>

                        <button class="join-item btn btn-sm ${nextDisabled}"
                                onclick="listsManager.nextPage()"
                                aria-label="Следующая страница"
                                ${this.currentPage === totalPages ? 'disabled' : ''}>
                            Вперёд
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Attach event listener for page size selector
        const pageSizeSelect = document.getElementById('page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.changePageSize(e.target.value);
            });
        }
    }

    /**
     * Attach event listeners to table elements
     */
    attachTableEventListeners() {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.selectAll(e.target.checked);
            });
        }

        // Individual checkboxes
        const checkboxes = document.querySelectorAll('.checkbox[data-filename]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCount();
            });
        });
    }

    /**
     * Render individual table cell
     */
    renderCell(list, columnId) {
        switch (columnId) {
            case 'select':
                return `
                    <label>
                        <input type="checkbox" class="checkbox checkbox-sm" data-filename="${list.filename}">
                    </label>
                `;

            case 'filename':
                return `
                    <div>
                        <div class="font-semibold">${list.display_name || list.filename}</div>
                        <div class="text-xs opacity-60">${list.filename}</div>
                    </div>
                `;

            case 'display_name':
                return list.display_name || list.filename || '';

            case 'country':
                return `<span class="badge badge-secondary badge-sm md:badge whitespace-nowrap" title="${list.country || 'Unknown'}">${list.country || 'Unknown'}</span>`;

            case 'category':
                return `<span class="badge badge-accent badge-sm md:badge whitespace-nowrap" title="${list.category || 'General'}">${list.category || 'General'}</span>`;

            case 'priority':
                return list.priority || 100;

            case 'file_type':
                return `<span class="badge badge-primary badge-sm md:badge whitespace-nowrap" title="${(list.file_type || 'TXT').toUpperCase()}">${(list.file_type || 'TXT').toUpperCase()}</span>`;

            case 'statistics':
                const emails = list.emails || 0;
                const clean = list.clean || 0;
                const blocked = list.blocked || 0;
                return `
                    <div class="text-sm space-y-1">
                        <div>📧 ${emails}</div>
                        ${emails > 0 ? `<div class="text-xs opacity-70">✅ ${clean} / 🚫 ${blocked}</div>` : ''}
                    </div>
                `;

            case 'processed':
                const isProcessed = list.processed || false;
                const statusBadgeClass = isProcessed ? 'badge-success' : 'badge-warning';
                const statusText = isProcessed ? '✓ Обработан' : '⏳ Ожидает';
                return `
                    <div class="space-y-1">
                        <span class="badge ${statusBadgeClass} badge-sm md:badge whitespace-nowrap" title="${statusText}">${statusText}</span>
                    </div>
                `;

            case 'date_added':
                return list.date_added || 'N/A';

            case 'description':
                return list.description || '';

            case 'actions':
                return `
                    <div class="flex gap-2">
                        <button onclick="listsManager.processOne('${list.filename}')"
                                class="btn btn-primary btn-sm"
                                title="Обработать"
                                aria-label="Обработать список ${list.filename}">
                            ▶️
                        </button>
                        <button onclick="listsManager.viewDetails('${list.filename}')"
                                class="btn btn-info btn-sm"
                                title="Детали"
                                aria-label="Просмотреть детали списка ${list.filename}">
                            👁️
                        </button>
                    </div>
                `;

            default:
                return '';
        }
    }

    /**
     * Select all rows
     */
    selectAll(checked) {
        const checkboxes = document.querySelectorAll('.checkbox[data-filename]');
        checkboxes.forEach(cb => {
            cb.checked = checked;
        });

        this.selectedFilenames.clear();
        if (checked) {
            this.filteredLists.forEach(list => this.selectedFilenames.add(list.filename));
        }

        this.updateSelectedCount();
    }

    /**
     * Update select-all checkbox state (checked/unchecked/indeterminate)
     */
    updateSelectAllCheckboxState() {
        const selectAllCheckbox = document.getElementById('select-all');
        if (!selectAllCheckbox) return;

        const visibleCheckboxes = document.querySelectorAll('.checkbox[data-filename]');
        const checkedCheckboxes = document.querySelectorAll('.checkbox[data-filename]:checked');

        if (checkedCheckboxes.length === 0) {
            // None selected
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === visibleCheckboxes.length) {
            // All selected
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            // Partial selection
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    /**
     * Update selected count badge and button state
     */
    updateSelectedCount() {
        // Get currently checked filenames
        const checkboxes = document.querySelectorAll('.checkbox[data-filename]:checked');
        this.selectedFilenames.clear();
        checkboxes.forEach(cb => {
            this.selectedFilenames.add(cb.dataset.filename);
        });

        const count = this.selectedFilenames.size;

        const badge = document.getElementById('selected-count-badge');
        const button = document.getElementById('bulk-edit-btn');

        if (badge) badge.textContent = count;
        if (button) button.disabled = count === 0;

        // Update select-all checkbox state
        this.updateSelectAllCheckboxState();
    }

    /**
     * Get selected filenames as array
     */
    getSelectedFilenames() {
        return Array.from(this.selectedFilenames);
    }

    /**
     * Open bulk edit modal
     */
    openBulkEditModal() {
        const selected = this.getSelectedFilenames();
        if (selected.length === 0) {
            this.showToast('Выберите хотя бы один список', 'warning');
            return;
        }

        // Populate modal selected count
        const modalCount = document.getElementById('modal-selected-count');
        if (modalCount) {
            modalCount.textContent = `(${selected.length} ${this.getPluralForm(selected.length, 'список', 'списка', 'списков')})`;
        }

        // Populate country and category options
        this.populateCountryOptions();
        this.populateCategoryOptions();

        // Reset form
        const form = document.getElementById('bulk-edit-form');
        if (form) {
            form.reset();
        }

        // Reset all checkboxes and disable inputs
        ['country', 'category', 'priority', 'processed', 'description'].forEach(field => {
            const checkbox = document.getElementById(`update-${field}-check`);
            const input = document.getElementById(`update-${field}`);

            if (checkbox) checkbox.checked = false;
            if (input) input.disabled = true;
        });

        // Show modal
        const modal = document.getElementById('bulk-edit-modal');
        if (modal) {
            modal.showModal();

            // Focus first checkbox after modal opens
            setTimeout(() => {
                document.getElementById('update-country-check')?.focus();
            }, 100);
        }

        this.updateBulkEditPreview();
        this.updateApplyButtonState();
    }

    /**
     * Close bulk edit modal
     */
    closeBulkEditModal() {
        const modal = document.getElementById('bulk-edit-modal');
        if (modal) {
            modal.close();

            // Return focus to bulk edit button
            setTimeout(() => {
                document.getElementById('bulk-edit-btn')?.focus();
            }, 100);
        }
    }

    /**
     * Populate country options from existing lists
     */
    populateCountryOptions() {
        const countries = [...new Set(this.lists.map(l => l.country).filter(Boolean))].sort();
        const select = document.getElementById('update-country');

        if (select) {
            // Clear existing options except first
            while (select.options.length > 1) {
                select.remove(1);
            }

            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                select.appendChild(option);
            });
        }
    }

    /**
     * Populate category options from existing lists
     */
    populateCategoryOptions() {
        const categories = [...new Set(this.lists.map(l => l.category).filter(Boolean))].sort();
        const select = document.getElementById('update-category');

        if (select) {
            // Clear existing options except first
            while (select.options.length > 1) {
                select.remove(1);
            }

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        }
    }

    /**
     * Populate filter country dropdown from existing lists
     */
    populateFilterCountries() {
        const countries = [...new Set(this.lists.map(l => l.country).filter(Boolean))].sort();
        const select = document.getElementById('country-filter');

        if (select) {
            // Save current selected value
            const currentValue = select.value;

            // Clear existing options except first (Все страны)
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add countries from data
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                select.appendChild(option);
            });

            // Restore selection if still valid
            if (currentValue && countries.includes(currentValue)) {
                select.value = currentValue;
            }

            console.log(`✅ Populated country filter with ${countries.length} countries:`, countries);
        }
    }

    /**
     * Populate filter category dropdown from existing lists
     */
    populateFilterCategories() {
        const categories = [...new Set(this.lists.map(l => l.category).filter(Boolean))].sort();
        const select = document.getElementById('category-filter');

        if (select) {
            // Save current selected value
            const currentValue = select.value;

            // Clear existing options except first (Все категории)
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add categories from data
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });

            // Restore selection if still valid
            if (currentValue && categories.includes(currentValue)) {
                select.value = currentValue;
            }

            console.log(`✅ Populated category filter with ${categories.length} categories:`, categories);
        }
    }

    /**
     * Update bulk edit preview text
     */
    updateBulkEditPreview() {
        const fields = [];

        ['country', 'category', 'priority', 'processed', 'description'].forEach(field => {
            const checkbox = document.getElementById(`update-${field}-check`);
            const input = document.getElementById(`update-${field}`);

            if (checkbox && checkbox.checked && input && input.value) {
                const label = checkbox.nextElementSibling.textContent;
                let displayValue = input.value;

                if (field === 'processed') {
                    displayValue = input.value === 'true' ? 'Обработан' : 'Не обработан';
                }

                fields.push(`${label}: ${displayValue}`);
            }
        });

        const preview = document.getElementById('bulk-edit-preview');
        if (preview) {
            if (fields.length > 0) {
                preview.textContent = `Будут изменены: ${fields.join(', ')}`;
            } else {
                preview.textContent = 'Выберите поля для изменения';
            }
        }
    }

    /**
     * Update apply button state
     */
    updateApplyButtonState() {
        const anyChecked = ['country', 'category', 'priority', 'processed', 'description']
            .some(field => {
                const checkbox = document.getElementById(`update-${field}-check`);
                return checkbox && checkbox.checked;
            });

        const applyBtn = document.getElementById('bulk-edit-apply');
        if (applyBtn) {
            applyBtn.disabled = !anyChecked;
        }
    }

    /**
     * Apply bulk edit changes
     */
    async applyBulkEdit() {
        const selected = this.getSelectedFilenames();
        const updates = {};

        // Collect updates
        ['country', 'category', 'priority', 'processed', 'description'].forEach(field => {
            const checkbox = document.getElementById(`update-${field}-check`);
            const input = document.getElementById(`update-${field}`);

            if (checkbox && checkbox.checked && input && input.value) {
                if (field === 'priority') {
                    updates[field] = parseInt(input.value);
                } else if (field === 'processed') {
                    updates[field] = input.value === 'true';
                } else {
                    updates[field] = input.value;
                }
            }
        });

        // Show loading indicator
        this.showLoadingIndicator(
            'Применение изменений...',
            `Обновление ${selected.length} ${this.getPluralForm(selected.length, 'списка', 'списков', 'списков')}`
        );

        // Set button loading states
        this.setButtonLoading('bulk-edit-apply', true);
        this.setButtonLoading('bulk-edit-cancel', true);

        try {
            // Call API
            const response = await api.post('/api/lists/bulk-update', {
                filenames: selected,
                updates: updates
            });

            const result = response.data || response;

            // Handle three cases: full success, partial success, total failure
            if (result.updated > 0) {
                // At least some updates succeeded
                if (result.failed === 0) {
                    // Full success
                    this.showToast(
                        `✅ Обновлено ${result.updated} ${this.getPluralForm(result.updated, 'список', 'списка', 'списков')}`,
                        'success'
                    );
                } else {
                    // Partial success
                    this.showToast(
                        `⚠️ Обновлено ${result.updated}, ошибок ${result.failed}: ${result.errors?.join(', ')}`,
                        'warning'
                    );
                }

                this.announceToScreenReader(`Успешно обновлено ${result.updated} списков`);

                // Animate updated rows
                selected.forEach(filename => {
                    const row = document.querySelector(`tr:has(.checkbox[data-filename="${filename}"])`);
                    if (row) {
                        row.style.backgroundColor = 'hsl(var(--su) / 0.2)';
                        setTimeout(() => {
                            row.style.backgroundColor = '';
                        }, 1000);
                    }
                });

                // Refresh lists with error handling
                try {
                    await this.loadLists();
                    this.renderTable();
                } catch (loadError) {
                    console.warn('Failed to reload lists after bulk edit:', loadError);
                    // Don't show error - updates already succeeded
                }

                // Close modal after short delay
                setTimeout(() => {
                    this.closeBulkEditModal();
                }, 1000);
            } else {
                // Total failure - no updates succeeded
                throw new Error(result.errors?.join(', ') || 'Не удалось обновить ни один список');
            }
        } catch (error) {
            console.error('Bulk update failed:', error);
            this.showToast(`❌ Ошибка: ${error.message}`, 'error');
        } finally {
            // Reset button states
            this.setButtonLoading('bulk-edit-apply', false);
            this.setButtonLoading('bulk-edit-cancel', false);
            this.hideLoadingIndicator();
        }
    }

    /**
     * Get Russian plural form
     */
    getPluralForm(count, one, few, many) {
        const mod10 = count % 10;
        const mod100 = count % 100;

        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    /**
     * Upload file
     */
    uploadFile() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput) {
            console.error('File input element not found');
            return;
        }

        fileInput.click();
        fileInput.onchange = async (e) => {
            const files = e.target.files;

            if (!files || files.length === 0) {
                return;
            }

            for (const file of files) {
                await this.uploadSingleFile(file);
            }

            // Clear input for next upload
            fileInput.value = '';
        };
    }

    /**
     * Upload single file to server
     */
    async uploadSingleFile(file) {
        try {
            console.log('📤 Uploading:', file.name);
            toast.info(`Загрузка ${file.name}...`);

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            // Upload to server
            const response = await fetch('/api/upload-file', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Handle 409 Conflict - file already exists
                if (response.status === 409) {
                    const action = await this.showFileConflictDialog(file.name);

                    if (action === 'overwrite') {
                        // Retry upload with overwrite flag
                        formData.append('overwrite', 'true');
                        const retryResponse = await fetch('/api/upload-file', {
                            method: 'POST',
                            body: formData
                        });

                        if (!retryResponse.ok) {
                            const retryError = await retryResponse.json();
                            throw new Error(retryError.error || 'Overwrite failed');
                        }

                        const retryResult = await retryResponse.json();
                        if (retryResult.success) {
                            toast.success(`Файл ${file.name} перезаписан!`);
                            await this.loadLists();
                            this.renderTable();
                            this.highlightNewFiles([{ filename: retryResult.filename || file.name }]);
                        }
                        return;

                    } else if (action === 'skip') {
                        toast.info(`Пропущен: ${file.name}`);
                        return;

                    } else if (action === 'cancel') {
                        toast.info('Загрузка отменена');
                        return;
                    }
                } else {
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
            }

            const result = await response.json();

            if (result.success) {
                toast.success(`Файл ${file.name} успешно загружен!`);
                console.log('✅ Upload successful:', result);

                // Reload lists to show the new file
                await this.loadLists();
                this.renderTable();

                // Highlight the new file
                this.highlightNewFiles([{
                    filename: result.filename || file.name
                }]);
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('❌ Upload error:', error);
            toast.error(`Ошибка загрузки ${file.name}: ${error.message}`);
        }
    }

    /**
     * Show dialog when file already exists
     * @param {string} filename - Conflicting filename
     * @returns {Promise<string>} Action: 'overwrite', 'skip', or 'cancel'
     */
    showFileConflictDialog(filename) {
        return new Promise((resolve) => {
            const content = `
                <div class="space-y-4">
                    <p class="text-base-content/80">
                        Файл <strong class="text-warning">${filename}</strong> уже существует.
                    </p>
                    <p class="text-base-content/70 text-sm">
                        Что вы хотите сделать?
                    </p>
                </div>
            `;

            const modal = new Modal('⚠️ Файл уже существует', content, {
                size: 'small',
                closable: true,
                buttons: [
                    {
                        label: 'Отмена',
                        type: 'secondary',
                        onClick: () => {
                            resolve('cancel');
                        }
                    },
                    {
                        label: 'Пропустить',
                        type: 'secondary',
                        onClick: () => {
                            resolve('skip');
                        }
                    },
                    {
                        label: 'Перезаписать',
                        type: 'danger',
                        onClick: () => {
                            resolve('overwrite');
                        }
                    }
                ]
            });

            modal.open();
        });
    }

    /**
     * Process selected lists
     */
    async processSelected() {
        const selected = this.getSelectedFilenames();
        if (selected.length === 0) {
            toast.warning('Выберите хотя бы один список');
            return;
        }

        console.log('🔄 Processing selected lists:', selected);

        // Спрашиваем подтверждение через модальное окно (как в Smart Filter)
        ModalService.confirm(
            'Обработка списков',
            `Обработать ${selected.length} ${this.pluralizeFiles(selected.length)}?`,
            async () => {
                try {
                    // Показываем loading overlay
                    this.showLoadingIndicator(`Запуск обработки ${selected.length} списков...`);

                    // Вызываем API для обработки
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            mode: 'check-all-incremental',
                            exclude_duplicates: true,
                            generate_html: true
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success) {
                        toast.success('✅ Обработка запущена!');
                        console.log('✅ Processing started:', result);

                        // Переход на Processing Queue для отслеживания прогресса
                        setTimeout(() => {
                            window.location.hash = 'processing';
                        }, 2000);
                    } else {
                        throw new Error(result.error || 'Ошибка запуска обработки');
                    }
                } catch (error) {
                    console.error('❌ Processing failed:', error);
                    toast.error(`Ошибка: ${error.message}`);
                } finally {
                    this.hideLoadingIndicator();
                }
            }
        );
    }

    /**
     * Process one list
     */
    async processOne(filename) {
        const list = this.lists.find(l => l.filename === filename);
        if (!list) {
            toast.error('Список не найден');
            return;
        }

        // Проверяем, обработан ли список
        if (list.processed) {
            // Список уже обработан - предупреждаем пользователя
            ModalService.confirm(
                'Список уже обработан',
                `Список "${list.display_name || filename}" уже обработан. Обработать повторно?`,
                async () => {
                    await this.executeProcessOne(filename, true);  // force_reprocess = true
                }
            );
        } else {
            // Список не обработан - обычное подтверждение
            ModalService.confirm(
                'Обработка списка',
                `Обработать список "${list.display_name || filename}"?`,
                async () => {
                    await this.executeProcessOne(filename, false);  // force_reprocess = false
                }
            );
        }
    }

    /**
     * Execute processing for one list
     * @param {string} filename - Имя файла
     * @param {boolean} forceReprocess - Принудительная переобработка
     */
    async executeProcessOne(filename, forceReprocess = false) {
        try {
            const list = this.lists.find(l => l.filename === filename);
            if (!list) {
                toast.error('Список не найден');
                return;
            }

            this.showLoadingIndicator(`Запуск обработки ${list.display_name || filename}...`);

            const response = await fetch('/api/process_one', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: filename,
                    exclude_duplicates: true,
                    generate_html: true,
                    force_reprocess: forceReprocess  // Новый параметр
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Если список уже обработан и пользователь не подтвердил переобработку
                if (response.status === 400 && errorData.already_processed) {
                    toast.warning(errorData.error || 'Список уже обработан');
                    return;
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                toast.success(`✅ Обработка "${list.display_name || filename}" запущена!`);

                // Перенаправление на страницу очереди обработки через 2 секунды
                setTimeout(() => {
                    window.location.hash = 'processing';
                }, 2000);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('Ошибка обработки списка:', error);
            toast.error(`Ошибка: ${error.message}`);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * View list details - opens Email Manager with filter
     */
    viewDetails(filename) {
        const list = this.lists.find(l => l.filename === filename);
        if (!list) {
            toast.error('Список не найден');
            return;
        }

        console.log('👁️ Opening Email Manager for:', filename);
        console.log('📊 List data:', list);

        // Navigate to bulk-lists page with filename parameter
        // The email-list-view component will auto-filter by this filename
        window.location.href = `/bulk-lists.html?list=${encodeURIComponent(filename)}`;
    }
}

// Global instance
const listsManager = new ListsManagerComponent();

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the lists page by looking for the container
    const listsContainer = document.getElementById('lists-table-container');
    if (listsContainer) {
        console.log('📋 Lists container found, initializing Lists Manager...');
        listsManager.init();
    } else {
        // Fallback: check router (for SPA navigation)
        if (router && router.getCurrentRoute() === 'lists') {
            console.log('📋 Router says we\'re on lists page, initializing...');
            listsManager.init();
        }
    }
});

// Reinitialize when navigating to lists page
document.addEventListener('hashchange', () => {
    if (router && router.getCurrentRoute() === 'lists') {
        listsManager.init();
    }
});

// Export to window for browser environment
window.listsManager = listsManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ListsManagerComponent, listsManager };
}
