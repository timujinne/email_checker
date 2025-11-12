/**
 * Email List View Component
 * Manages individual email records with metadata
 * Provides filtering, pagination, bulk operations, and export functionality
 */
class EmailListViewComponent {
    constructor() {
        this.emails = [];
        this.filteredEmails = [];
        this.selectedEmails = new Set();
        this.currentPage = 1;
        this.pageSize = 100;
        this.totalRecords = 0;
        this.totalPages = 0;
        this.virtualTable = null;
        this.columnManager = null;
        this.statusFilter = null;
        this.filters = {
            source: '',
            country: '',
            category: '',
            validation_status: [],
            has_phone: null,
            search: '',
            country_mismatch: null
        };
        this.sortBy = 'email';
        this.sortOrder = 'asc';
        this.debounceTimer = null;
        this._initialized = false;
    }

    async init() {
        // Prevent duplicate initialization
        if (this._initialized) {
            console.log('ℹ️ Email List View already initialized, refreshing data only...');
            await this.loadEmails();
            return;
        }

        console.log('📧 Initializing Email List View...');

        // Initialize virtual table for performance
        this.initVirtualTable();

        // Initialize column manager
        this.initColumnManager();

        // Initialize status filter
        this.initStatusFilter();

        // Setup filters
        await this.setupFilters();

        // Setup event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadEmails();

        this._initialized = true;
        console.log('✅ Email List View initialized');
    }

    initVirtualTable() {
        // Virtual table configuration for handling large datasets
        this.virtualTable = new VirtualTable('email-table-container', {
            rowHeight: 44,
            bufferSize: 20,
            sortable: true,
            selectable: true,
            striped: true
        });

        // Define default columns
        // Note: VirtualTable adds checkbox column automatically due to selectable: true option
        const columns = [
            {
                key: 'email',
                label: 'Email',
                width: '250px',
                sortable: true,
                render: (value) => `<span class="font-mono text-sm">${value || ''}</span>`
            },
            {
                key: 'domain',
                label: 'Domain',
                width: '150px',
                sortable: true,
                render: (value) => value || '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'company_name',
                label: 'Компания',
                width: '200px',
                sortable: true,
                render: (value) => value || '<span class="text-base-content opacity-40">N/A</span>'
            },
            {
                key: 'source_file',
                label: 'Список',
                width: '150px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-base-content opacity-40">—</span>';
                    // Truncate long filenames
                    const shortName = value.length > 20 ? value.substring(0, 17) + '...' : value;
                    return `<span class="text-xs" title="${value}">${shortName}</span>`;
                }
            },
            {
                key: 'country',
                label: 'Страна',
                width: '100px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="badge badge-ghost badge-sm whitespace-nowrap">N/A</span>';
                    const flagMap = {
                        'Germany': '🇩🇪',
                        'Poland': '🇵🇱',
                        'Italy': '🇮🇹',
                        'Austria': '🇦🇹',
                        'Russia': '🇷🇺',
                        'Finland': '🇫🇮',
                        'Bulgaria': '🇧🇬',
                        'Czechia': '🇨🇿',
                        'Slovakia': '🇸🇰',
                        'Hungary': '🇭🇺'
                    };
                    const flag = flagMap[value] || '';
                    return `<span class="badge badge-secondary badge-sm whitespace-nowrap">${flag} ${value}</span>`;
                }
            },
            {
                key: 'category',
                label: 'Категория',
                width: '140px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-base-content opacity-40">—</span>';
                    const shortCategory = value.length > 18 ? value.substring(0, 15) + '...' : value;
                    return `<span class="badge badge-accent badge-sm whitespace-nowrap" title="${value}">${shortCategory}</span>`;
                }
            },
            {
                key: 'phone',
                label: 'Телефон',
                width: '140px',
                sortable: false,
                render: (value) => value ? `<span class="font-mono text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'validation_status',
                label: 'Статус',
                width: '100px',
                sortable: true,
                render: (value) => this.renderStatusBadge(value)
            }
        ];

        this.virtualTable.setColumns(columns);

        // Listen to sort changes
        document.getElementById('email-table-container').addEventListener('sort-changed', (e) => {
            this.onSortChanged(e.detail);
        });

        // Listen to selection changes
        document.getElementById('email-table-container').addEventListener('selection-changed', (e) => {
            this.onSelectionChanged(e.detail);
        });
    }

    renderStatusBadge(status) {
        const statusConfig = {
            'Valid': { class: 'badge-success', text: '✓ Valid', emoji: '✅' },
            'Invalid': { class: 'badge-error', text: '✗ Invalid', emoji: '❌' },
            'NotSure': { class: 'badge-warning', text: '? Not Sure', emoji: '❓' },
            'Temp': { class: 'badge-info', text: '⏳ Temp', emoji: '⏳' },
            'Unknown': { class: 'badge-ghost', text: '— Unknown', emoji: '❔' }
        };

        const config = statusConfig[status] || statusConfig['Unknown'];
        return `<span class="badge ${config.class} badge-sm whitespace-nowrap">${config.text}</span>`;
    }

    initColumnManager() {
        const columns = [
            { id: 'select', label: 'Выбор', visible: true, locked: true },
            { id: 'email', label: 'Email', visible: true, locked: true },
            { id: 'domain', label: 'Domain', visible: true, locked: false },
            { id: 'company_name', label: 'Компания', visible: true, locked: false },
            { id: 'source_file', label: 'Список', visible: true, locked: false },
            { id: 'country', label: 'Страна', visible: true, locked: false },
            { id: 'category', label: 'Категория', visible: true, locked: false },
            { id: 'phone', label: 'Телефон', visible: true, locked: false },
            { id: 'validation_status', label: 'Статус', visible: true, locked: false },
            { id: 'city', label: 'Город', visible: false, locked: false },
            { id: 'address', label: 'Адрес', visible: false, locked: false },
            { id: 'page_title', label: 'Заголовок страницы', visible: false, locked: false },
            { id: 'source_url', label: 'URL источника', visible: false, locked: false },
            { id: 'meta_description', label: 'Мета описание', visible: false, locked: false },
            { id: 'meta_keywords', label: 'Мета ключевые слова', visible: false, locked: false },
            { id: 'created_at', label: 'Дата создания', visible: false, locked: false },
            { id: 'updated_at', label: 'Дата обновления', visible: false, locked: false }
        ];

        // Define column groups for better organization
        const groups = {
            'Основные колонки': ['select', 'email', 'domain', 'company_name', 'source_file', 'country', 'category', 'validation_status'],
            'Контактная информация': ['phone', 'address', 'city'],
            'Метаданные страниц': ['page_title', 'source_url', 'meta_description', 'meta_keywords'],
            'Системная информация': ['created_at', 'updated_at']
        };

        this.columnManager = new ColumnManager(
            'email-list-column-manager-content',
            columns,
            (visibleColumns) => {
                this.updateVisibleColumns(visibleColumns);
            },
            {
                renderMode: 'inline',
                groups: groups
            }
        );

        this.columnManager.init();

        // Setup column manager button
        document.getElementById('column-manager-btn').addEventListener('click', () => {
            document.getElementById('email-list-column-manager-modal').showModal();
        });
    }

    initStatusFilter() {
        const statusOptions = [
            { value: 'Valid', label: 'Valid', color: 'success' },
            { value: 'Invalid', label: 'Invalid', color: 'error' },
            { value: 'NotSure', label: 'Not Sure', color: 'warning' },
            { value: 'Temp', label: 'Temporary', color: 'info' }
        ];

        this.statusFilter = new MultiSelectFilter('filter-status-container', statusOptions);
        this.statusFilter.onChange = (selectedStatuses) => {
            this.filters.validation_status = selectedStatuses;
            this.currentPage = 1;
            this.loadEmails();
        };
        this.statusFilter.init();
    }

    async setupFilters() {
        // Populate source filter
        await this.populateSourceFilter();

        // Setup search input with debouncing
        this.setupSearchInput();

        // Setup filter change listeners
        document.getElementById('filter-source').addEventListener('change', (e) => {
            this.filters.source = e.target.value;
            this.currentPage = 1;
            this.loadEmails();
        });

        document.getElementById('filter-country').addEventListener('change', (e) => {
            this.filters.country = e.target.value;
            this.currentPage = 1;
            this.loadEmails();
        });

        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadEmails();
        });
    }

    async populateSourceFilter() {
        try {
            const response = await api.get('/api/lvp-sources');
            const sources = response.data?.sources || [];

            const select = document.getElementById('filter-source');
            select.innerHTML = '<option value="">Все списки</option>';

            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source.filename;
                option.textContent = `${source.filename} (${source.total_emails} emails)`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load sources:', error);
        }
    }

    setupSearchInput() {
        const searchInput = document.getElementById('search-email');

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);

            this.debounceTimer = setTimeout(() => {
                this.filters.search = e.target.value.trim();
                this.currentPage = 1;
                this.loadEmails();
            }, 300); // Wait 300ms after user stops typing
        });
    }

    setupEventListeners() {
        // Note: Select-all checkbox is handled by VirtualTable internally
        // No need for additional handler here

        // Page size selector
        document.getElementById('page-size-selector').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadEmails();
        });

        // Pagination buttons
        document.getElementById('prev-page-btn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadEmails();
            }
        });

        document.getElementById('next-page-btn').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadEmails();
            }
        });

        // Bulk edit field selector
        document.getElementById('bulk-edit-field').addEventListener('change', (e) => {
            const field = e.target.value;
            const valueInput = document.getElementById('bulk-edit-value');
            const statusSelect = document.getElementById('bulk-edit-status');

            if (field === 'validation_status') {
                valueInput.classList.add('hidden');
                statusSelect.classList.remove('hidden');
            } else {
                valueInput.classList.remove('hidden');
                statusSelect.classList.add('hidden');
            }
        });

        // Listen to checkbox changes via event delegation
        document.getElementById('email-table-container').addEventListener('change', (e) => {
            if (e.target.classList.contains('email-checkbox')) {
                const email = e.target.dataset.email;
                if (e.target.checked) {
                    this.selectedEmails.add(email);
                } else {
                    this.selectedEmails.delete(email);
                }
                this.updateSelectionUI();
            }
        });
    }

    async loadEmails() {
        try {
            // Show loading state
            document.getElementById('loading-state').classList.remove('hidden');
            document.getElementById('email-table-container').classList.add('hidden');

            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize,
                sort_by: this.sortBy,
                sort_order: this.sortOrder
            });

            // Add filters to params
            if (Object.keys(this.filters).length > 0) {
                params.append('filters', JSON.stringify(this.filters));
            }

            const response = await api.get(`/api/emails?${params.toString()}`);

            // API returns {status, data, headers} where data is the JSON response
            const jsonResponse = response.data;

            if (!jsonResponse.success) {
                throw new Error(jsonResponse.error || 'Failed to load emails');
            }

            const data = jsonResponse.data;

            this.emails = data.emails;
            this.totalRecords = data.pagination.total_records;
            this.totalPages = data.pagination.total_pages;
            this.currentPage = data.pagination.page;

            // Update virtual table
            if (this.virtualTable) {
                this.virtualTable.setData(this.emails);
            }

            // Update pagination UI
            this.updatePaginationUI();

            // Clear selection
            this.selectedEmails.clear();
            this.updateSelectionUI();

            // Hide loading state
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('email-table-container').classList.remove('hidden');

            // Show success message
            if (this.emails.length > 0) {
                toast.success(`Загружено ${this.emails.length} email адресов`);
            } else {
                toast.info('Не найдено email адресов с указанными фильтрами');
            }

        } catch (error) {
            console.error('Failed to load emails:', error);
            toast.error(`Ошибка загрузки: ${error.message}`);

            // Hide loading state even on error
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('email-table-container').classList.remove('hidden');
        }
    }

    updatePaginationUI() {
        const from = (this.currentPage - 1) * this.pageSize + 1;
        const to = Math.min(this.currentPage * this.pageSize, this.totalRecords);

        document.getElementById('showing-from').textContent = from;
        document.getElementById('showing-to').textContent = to;
        document.getElementById('total-records').textContent = this.totalRecords;
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = this.totalPages;

        // Update pagination buttons
        document.getElementById('prev-page-btn').disabled = this.currentPage <= 1;
        document.getElementById('next-page-btn').disabled = this.currentPage >= this.totalPages;
    }

    updateSelectionUI() {
        const count = this.selectedEmails.size;

        // Update selected count
        document.getElementById('selected-count').textContent = count;
        document.getElementById('selected-count-badge').classList.toggle('hidden', count === 0);

        // Enable/disable individual bulk action buttons
        const bulkButtons = [
            'bulk-status-btn',
            'bulk-country-btn',
            'bulk-export-btn',
            'bulk-delete-btn'
        ];

        bulkButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = (count === 0);
            }
        });

        // Note: Select-all checkbox state is managed by VirtualTable
    }

    selectAll(checked) {
        if (checked) {
            // Add all current page emails to selection
            this.emails.forEach(email => {
                this.selectedEmails.add(email.email);
            });
        } else {
            // Remove all current page emails from selection
            this.emails.forEach(email => {
                this.selectedEmails.delete(email.email);
            });
        }

        // Update checkboxes in the table
        const checkboxes = document.querySelectorAll('.email-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = checked;
        });

        this.updateSelectionUI();
    }

    onSortChanged(detail) {
        this.sortBy = detail.column;
        this.sortOrder = detail.order;
        this.loadEmails();
    }

    onSelectionChanged(detail) {
        // Sync selectedEmails with VirtualTable selection
        this.selectedEmails.clear();

        if (detail && detail.items) {
            detail.items.forEach(item => {
                if (item && item.email) {
                    this.selectedEmails.add(item.email);
                }
            });
        }

        // Update UI (enable/disable bulk action buttons)
        this.updateSelectionUI();
    }

    updateVisibleColumns(visibleColumns) {
        console.log('🔄 Updating visible columns:', visibleColumns);

        // Update virtual table columns based on visibility
        // Note: VirtualTable column definitions are in initVirtualTable()
        const allColumnDefinitions = [
            {
                key: 'email',
                label: 'Email',
                width: '250px',
                sortable: true,
                render: (value) => `<span class="font-mono text-sm">${value || ''}</span>`
            },
            {
                key: 'domain',
                label: 'Домен',
                width: '150px',
                sortable: true,
                render: (value) => value || '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'company_name',
                label: 'Компания',
                width: '200px',
                sortable: true,
                render: (value) => value || '<span class="text-base-content opacity-40">N/A</span>'
            },
            {
                key: 'source_file',
                label: 'Список',
                width: '150px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-base-content opacity-40">—</span>';
                    const shortName = value.length > 20 ? value.substring(0, 17) + '...' : value;
                    return `<span class="text-xs" title="${value}">${shortName}</span>`;
                }
            },
            {
                key: 'country',
                label: 'Страна',
                width: '100px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="badge badge-ghost badge-sm whitespace-nowrap">N/A</span>';
                    const flagMap = {
                        'Germany': '🇩🇪', 'Poland': '🇵🇱', 'Italy': '🇮🇹',
                        'Austria': '🇦🇹', 'Russia': '🇷🇺', 'Finland': '🇫🇮',
                        'Bulgaria': '🇧🇬', 'Czechia': '🇨🇿', 'Slovakia': '🇸🇰', 'Hungary': '🇭🇺'
                    };
                    const flag = flagMap[value] || '';
                    return `<span class="badge badge-secondary badge-sm whitespace-nowrap">${flag} ${value}</span>`;
                }
            },
            {
                key: 'category',
                label: 'Категория',
                width: '140px',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-base-content opacity-40">—</span>';
                    const shortCategory = value.length > 18 ? value.substring(0, 15) + '...' : value;
                    return `<span class="badge badge-accent badge-sm whitespace-nowrap" title="${value}">${shortCategory}</span>`;
                }
            },
            {
                key: 'phone',
                label: 'Телефон',
                width: '140px',
                sortable: false,
                render: (value) => value ? `<span class="font-mono text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'validation_status',
                label: 'Статус',
                width: '100px',
                sortable: true,
                render: (value) => this.renderStatusBadge(value)
            },
            {
                key: 'city',
                label: 'Город',
                width: '120px',
                sortable: true,
                render: (value) => value || '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'address',
                label: 'Адрес',
                width: '200px',
                sortable: false,
                render: (value) => value ? `<span class="text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'page_title',
                label: 'Заголовок страницы',
                width: '200px',
                sortable: false,
                render: (value) => value ? `<span class="text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'source_url',
                label: 'URL источника',
                width: '200px',
                sortable: false,
                render: (value) => value ? `<a href="${value}" target="_blank" class="link link-primary text-xs">${value}</a>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'meta_description',
                label: 'Мета описание',
                width: '200px',
                sortable: false,
                render: (value) => value ? `<span class="text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'meta_keywords',
                label: 'Мета ключевые слова',
                width: '200px',
                sortable: false,
                render: (value) => value ? `<span class="text-xs">${value}</span>` : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'created_at',
                label: 'Дата создания',
                width: '140px',
                sortable: true,
                render: (value) => value ? new Date(value).toLocaleString('ru-RU') : '<span class="text-base-content opacity-40">—</span>'
            },
            {
                key: 'updated_at',
                label: 'Дата обновления',
                width: '140px',
                sortable: true,
                render: (value) => value ? new Date(value).toLocaleString('ru-RU') : '<span class="text-base-content opacity-40">—</span>'
            }
        ];

        // Filter columns based on visibility (excluding 'select' which is managed by VirtualTable)
        const visibleColumnDefs = allColumnDefinitions.filter(col =>
            visibleColumns.includes(col.key)
        );

        console.log('✅ Setting columns:', visibleColumnDefs.map(c => c.key));

        // Update VirtualTable columns
        this.virtualTable.setColumns(visibleColumnDefs);

        // Re-render table with current data
        if (this.emails && this.emails.length > 0) {
            this.virtualTable.setData(this.emails);

            // Force header re-render after data update to ensure perfect sync
            // This fixes the "съезжает" (misalignment) issue
            this.virtualTable.renderHeader();
        }

        toast.success(`Обновлено ${visibleColumnDefs.length} колонок`);
    }

    async exportSelected() {
        if (this.selectedEmails.size === 0) {
            toast.warning('Выберите email адреса для экспорта');
            return;
        }

        // Show export modal
        document.getElementById('export-count').textContent = this.selectedEmails.size;
        document.getElementById('email-list-export-modal').showModal();
    }

    async applyExport() {
        const format = document.getElementById('export-format').value;
        const includeMetadata = document.getElementById('export-include-metadata').checked;

        try {
            const response = await api.post('/api/emails/export', {
                emails: Array.from(this.selectedEmails),
                format: format,
                include_metadata: includeMetadata
            });

            // The API returns the file content directly, need to trigger download
            const blob = new Blob([response], { type: `text/${format}` });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${Date.now()}.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success(`Экспортировано ${this.selectedEmails.size} email адресов`);
            document.getElementById('email-list-export-modal').close();

        } catch (error) {
            toast.error(`Ошибка экспорта: ${error.message}`);
        }
    }

    async bulkUpdateStatus() {
        // Use the same modal window as for other fields
        this.bulkUpdateField('validation_status');
    }

    async bulkUpdateField(field) {
        if (this.selectedEmails.size === 0) {
            toast.warning('Выберите email адреса для изменения');
            return;
        }

        // Show bulk edit modal
        const countEl = document.getElementById('bulk-edit-count');
        const fieldEl = document.getElementById('bulk-edit-field');
        const modalEl = document.getElementById('email-list-bulk-edit-modal');

        if (!countEl || !fieldEl || !modalEl) {
            console.error('⚠️ Modal elements not found!', {
                countEl: !!countEl,
                fieldEl: !!fieldEl,
                modalEl: !!modalEl
            });
            toast.error('Ошибка: модальное окно не найдено. Обновите страницу с Ctrl+Shift+R');
            return;
        }

        countEl.textContent = this.selectedEmails.size;
        fieldEl.value = field || 'country';

        // Trigger change event to show/hide appropriate input
        const changeEvent = new Event('change');
        fieldEl.dispatchEvent(changeEvent);

        modalEl.showModal();
    }

    async applyBulkEdit() {
        const field = document.getElementById('bulk-edit-field').value;
        let value;

        if (field === 'validation_status') {
            value = document.getElementById('bulk-edit-status').value;
        } else {
            value = document.getElementById('bulk-edit-value').value.trim();
        }

        if (!value) {
            toast.warning('Введите значение');
            return;
        }

        try {
            const updates = {};
            updates[field] = value;

            const response = await api.post('/api/emails/bulk-update', {
                emails: Array.from(this.selectedEmails),
                updates: updates
            });

            // API returns {status, data, headers} - access data property
            const result = response.data || response;
            console.log('Bulk update response:', result);

            // Check if any emails were updated (not just success flag)
            if (result.updated > 0) {
                // Handle partial success vs full success
                if (result.failed && result.failed > 0) {
                    toast.warning(`⚠️ Обновлено ${result.updated}, ошибок ${result.failed}`);
                } else {
                    toast.success(`✅ Обновлено ${result.updated} email адресов`);
                }

                document.getElementById('email-list-bulk-edit-modal').close();

                // Reload emails with error handling
                try {
                    await this.loadEmails();
                } catch (loadError) {
                    console.warn('Failed to reload emails after bulk edit:', loadError);
                    // Don't show error - updates already succeeded
                }

                // Clear selection after successful update
                this.selectedEmails.clear();
                this.updateSelectionUI();
            } else if (result.errors && result.errors.length > 0) {
                toast.error(`Ошибка: ${result.errors.join(', ')}`);
            } else {
                toast.error(`Ошибка: ${result.error || 'Не удалось обновить email адреса'}`);
            }

        } catch (error) {
            toast.error(`Ошибка обновления: ${error.message}`);
        }
    }

    async bulkDelete() {
        if (this.selectedEmails.size === 0) {
            toast.warning('Выберите email адреса для удаления');
            return;
        }

        // Show delete confirmation modal
        const deleteCountEl = document.getElementById('delete-count');
        const deleteModalEl = document.getElementById('email-list-delete-modal');

        if (!deleteCountEl || !deleteModalEl) {
            console.error('⚠️ Delete modal elements not found!', {
                deleteCountEl: !!deleteCountEl,
                deleteModalEl: !!deleteModalEl
            });
            toast.error('Ошибка: модальное окно удаления не найдено. Обновите страницу с Ctrl+Shift+R');
            return;
        }

        deleteCountEl.textContent = this.selectedEmails.size;
        deleteModalEl.showModal();
    }

    async confirmDelete() {
        try {
            const response = await api.post('/api/emails/bulk-delete', {
                emails: Array.from(this.selectedEmails)
            });

            // API returns {status, data, headers} - access data property
            const result = response.data || response;
            console.log('Bulk delete response:', result);

            // Check if any emails were deleted (not just success flag)
            if (result.deleted > 0) {
                toast.success(`Удалено ${result.deleted} email адресов`);
                document.getElementById('email-list-delete-modal').close();

                // Reload current page
                await this.loadEmails();

                // Clear selection
                this.selectedEmails.clear();
                this.updateSelectionUI();
            } else if (result.errors && result.errors.length > 0) {
                toast.error(`Ошибка: ${result.errors.join(', ')}`);
            } else {
                toast.error(`Ошибка: ${result.error || 'Не удалось удалить email адреса'}`);
            }

        } catch (error) {
            toast.error(`Ошибка удаления: ${error.message}`);
        }
    }
}

// Export for use in other modules
window.EmailListViewComponent = EmailListViewComponent;