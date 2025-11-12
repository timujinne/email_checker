# Column Manager Integration Guide

## Overview

The Column Manager component provides table column visibility and ordering management with drag-and-drop reordering, localStorage persistence, and a clean daisyUI interface.

## Features

- ✅ Toggle column visibility with checkboxes
- ✅ Drag & drop reordering (HTML5 Drag and Drop API)
- ✅ Locked columns (cannot hide/reorder)
- ✅ LocalStorage persistence
- ✅ Reset to defaults
- ✅ daisyUI styling with dark/light theme support
- ✅ Mobile responsive

## Quick Start

### 1. Include the Component

Add to your HTML page:

```html
<script src="assets/js/components/column-manager.js"></script>
```

### 2. Define Column Configuration

```javascript
const defaultColumns = [
    { id: 'filename', label: 'Filename', visible: true, locked: true }, // Cannot hide
    { id: 'display_name', label: 'Display Name', visible: true, locked: false },
    { id: 'country', label: 'Country', visible: true, locked: false },
    { id: 'category', label: 'Category', visible: true, locked: false },
    { id: 'priority', label: 'Priority', visible: true, locked: false },
    { id: 'processed', label: 'Processed', visible: true, locked: false },
    { id: 'date_added', label: 'Date Added', visible: false, locked: false },
    { id: 'file_type', label: 'Type', visible: false, locked: false },
    { id: 'description', label: 'Description', visible: false, locked: false }
];
```

### 3. Initialize Component

```javascript
// Create container in your HTML
// <div id="column-manager-container"></div>

const columnManager = new ColumnManager(
    'column-manager-container',
    defaultColumns,
    (visibleColumns) => {
        console.log('Visible columns changed:', visibleColumns);
        // Update your table here
        updateTable(visibleColumns);
    }
);

columnManager.init();
```

## Integration with Lists Manager

### Step 1: Add Container to HTML

In `web/lists.html`, add the column manager container to the toolbar:

```html
<div class="flex items-center justify-between mb-4">
    <div class="flex gap-2">
        <!-- Existing buttons -->
        <button class="btn btn-primary" onclick="listsManager.uploadFile()">
            📤 Upload
        </button>
        <!-- ... other buttons ... -->
    </div>

    <!-- Add Column Manager here -->
    <div id="column-manager-container"></div>
</div>
```

### Step 2: Update Lists Manager Component

Add to `web/assets/js/components/lists-manager.js`:

```javascript
class ListsManagerComponent {
    constructor() {
        this.lists = [];
        this.selectedRows = new Set();
        this.columnManager = null;  // Add this
        this.visibleColumns = null; // Add this
    }

    init() {
        console.log('📋 Initializing Lists Manager...');

        // Initialize Column Manager
        this.initColumnManager();

        // Setup event listeners
        this.setupEventListeners();

        // Load lists from API
        this.loadLists();

        console.log('✅ Lists Manager initialized');
    }

    /**
     * Initialize Column Manager
     */
    initColumnManager() {
        const defaultColumns = [
            { id: 'select', label: 'Select', visible: true, locked: true },
            { id: 'filename', label: 'Название', visible: true, locked: true },
            { id: 'file_type', label: 'Тип', visible: true, locked: false },
            { id: 'country', label: 'Страна', visible: true, locked: false },
            { id: 'category', label: 'Категория', visible: true, locked: false },
            { id: 'statistics', label: 'Статистика', visible: true, locked: false },
            { id: 'status', label: 'Статус', visible: true, locked: false },
            { id: 'date_added', label: 'Дата', visible: false, locked: false },
            { id: 'priority', label: 'Приоритет', visible: false, locked: false },
            { id: 'actions', label: 'Действия', visible: true, locked: true }
        ];

        this.columnManager = new ColumnManager(
            'column-manager-container',
            defaultColumns,
            (visibleColumns) => {
                this.visibleColumns = visibleColumns;
                this.renderTable(); // Re-render table with new columns
            }
        );

        this.columnManager.init();

        // Get initial visible columns
        this.visibleColumns = this.columnManager.getVisibleColumns();
    }

    /**
     * Render table with dynamic columns
     */
    renderTable(data = null) {
        const tableContainer = document.getElementById('lists-table-container');
        if (!tableContainer) return;

        const lists = data || this.lists;

        if (lists.length === 0) {
            tableContainer.innerHTML = `
                <div class="text-center opacity-70 py-12">
                    <p class="text-lg">📋 Нет списков для отображения</p>
                </div>
            `;
            return;
        }

        // Get visible columns
        const visibleColumns = this.visibleColumns || this.columnManager.getVisibleColumns();

        // Build header HTML dynamically
        let headerHtml = '';
        visibleColumns.forEach(colId => {
            switch (colId) {
                case 'select':
                    headerHtml += `
                        <th class="w-12">
                            <label>
                                <input type="checkbox" class="checkbox checkbox-sm" id="select-all"
                                       onchange="listsManager.selectAll(this.checked)">
                            </label>
                        </th>
                    `;
                    break;
                case 'filename':
                    headerHtml += `<th>Название</th>`;
                    break;
                case 'file_type':
                    headerHtml += `<th>Тип</th>`;
                    break;
                case 'country':
                    headerHtml += `<th>Страна</th>`;
                    break;
                case 'category':
                    headerHtml += `<th>Категория</th>`;
                    break;
                case 'statistics':
                    headerHtml += `<th>Статистика</th>`;
                    break;
                case 'status':
                    headerHtml += `<th>Статус</th>`;
                    break;
                case 'date_added':
                    headerHtml += `<th>Дата</th>`;
                    break;
                case 'priority':
                    headerHtml += `<th>Приоритет</th>`;
                    break;
                case 'actions':
                    headerHtml += `<th class="w-40">Действия</th>`;
                    break;
            }
        });

        let html = `
            <div class="overflow-x-auto">
                <table class="table table-zebra table-pin-rows w-full">
                    <thead>
                        <tr>${headerHtml}</tr>
                    </thead>
                    <tbody>
        `;

        // Build rows dynamically
        for (const list of lists) {
            html += '<tr class="hover">';

            visibleColumns.forEach(colId => {
                switch (colId) {
                    case 'select':
                        html += `
                            <th>
                                <label>
                                    <input type="checkbox" class="checkbox checkbox-sm" data-id="${list.id}"
                                           onchange="listsManager.toggleRow(${list.id})">
                                </label>
                            </th>
                        `;
                        break;
                    case 'filename':
                        const displayName = list.display_name || list.displayName || list.filename;
                        html += `
                            <td>
                                <div class="font-semibold">${displayName}</div>
                                <div class="text-xs opacity-60">${list.filename}</div>
                            </td>
                        `;
                        break;
                    case 'file_type':
                        const fileType = (list.file_type || list.fileType || 'TXT').toUpperCase();
                        html += `<td><span class="badge badge-primary badge-sm">${fileType}</span></td>`;
                        break;
                    case 'country':
                        const country = list.country || 'Unknown';
                        html += `<td><span class="badge badge-secondary badge-sm">${country}</span></td>`;
                        break;
                    case 'category':
                        const category = list.category || 'General';
                        html += `<td><span class="badge badge-accent badge-sm">${category}</span></td>`;
                        break;
                    case 'statistics':
                        const emails = list.emails || 0;
                        const clean = list.clean || 0;
                        const blocked = list.blocked || 0;
                        html += `
                            <td>
                                <div class="text-sm space-y-1">
                                    <div>📧 ${emails}</div>
                                    ${emails > 0 ? `<div class="text-xs opacity-70">✅ ${clean} / 🚫 ${blocked}</div>` : ''}
                                </div>
                            </td>
                        `;
                        break;
                    case 'status':
                        const isProcessed = list.processed || (list.status && list.status.includes('✓'));
                        const statusBadgeClass = isProcessed ? 'badge-success' : 'badge-warning';
                        const statusText = isProcessed ? '✓ Обработан' : '⏳ Ожидает';
                        html += `
                            <td>
                                <span class="badge ${statusBadgeClass} badge-sm">${statusText}</span>
                            </td>
                        `;
                        break;
                    case 'date_added':
                        const dateAdded = list.date_added || list.dateAdded || new Date().toISOString().split('T')[0];
                        html += `<td><div class="text-xs opacity-60">${dateAdded}</div></td>`;
                        break;
                    case 'priority':
                        const priority = list.priority || 'Normal';
                        html += `<td><span class="badge badge-outline badge-sm">${priority}</span></td>`;
                        break;
                    case 'actions':
                        html += `
                            <td>
                                <div class="flex gap-1">
                                    <button onclick="listsManager.processOne(${list.id})"
                                            class="btn btn-primary btn-xs"
                                            title="Обработать">
                                        ▶️
                                    </button>
                                    <button onclick="listsManager.editList(${list.id})"
                                            class="btn btn-ghost btn-xs"
                                            title="Редактировать">
                                        ✏️
                                    </button>
                                    <button onclick="listsManager.viewDetails(${list.id})"
                                            class="btn btn-info btn-xs"
                                            title="Детали">
                                        👁️
                                    </button>
                                    <button onclick="listsManager.deleteList(${list.id})"
                                            class="btn btn-error btn-xs"
                                            title="Удалить">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        `;
                        break;
                }
            });

            html += '</tr>';
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = html;
    }
}
```

## Public API Methods

### `getVisibleColumns()`
Returns array of visible column IDs in current order.

```javascript
const visibleColumns = columnManager.getVisibleColumns();
// => ['filename', 'country', 'category', 'status']
```

### `getAllColumns()`
Returns array of all columns with metadata.

```javascript
const allColumns = columnManager.getAllColumns();
// => [{ id: 'filename', label: 'Filename', visible: true, locked: true }, ...]
```

### `resetToDefaults()`
Resets columns to default configuration.

```javascript
columnManager.resetToDefaults();
```

### `updateColumns(newColumns)`
Updates column configuration.

```javascript
columnManager.updateColumns([
    { id: 'new_col', label: 'New Column', visible: true, locked: false }
]);
```

### `destroy()`
Cleanup and destroy component.

```javascript
columnManager.destroy();
```

## LocalStorage Format

Preferences are saved to `localStorage` with key `email-checker-column-preferences`:

```json
{
    "columns": [
        { "id": "filename", "visible": true },
        { "id": "country", "visible": true },
        { "id": "date_added", "visible": false }
    ],
    "order": ["filename", "country", "category", "status"],
    "version": "1.0",
    "savedAt": "2025-10-30T12:00:00.000Z"
}
```

## Styling

The component uses daisyUI classes and supports dark/light themes automatically:

- `dropdown` - Dropdown container
- `dropdown-end` - Right-aligned dropdown
- `dropdown-content` - Dropdown menu
- `menu` - Menu component
- `checkbox` - Checkbox inputs
- `badge` - Badge for locked columns
- `btn` - Button styles
- `divider` - Visual separator

## Drag & Drop Behavior

- Drag handles (⋮⋮) appear only for non-locked columns
- Visual feedback during drag: opacity change, borders, background
- Locked columns cannot be reordered
- Smooth animations for visual feedback

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires HTML5 Drag and Drop API support.

## Testing

```javascript
// Test initialization
const columnManager = new ColumnManager('container', defaultColumns, (cols) => {
    console.log('Columns changed:', cols);
});
columnManager.init();

// Test visibility toggle
columnManager.toggleColumnVisibility('country', false);

// Test reordering
columnManager.reorderColumns(1, 3);

// Test persistence
localStorage.getItem('email-checker-column-preferences');

// Test reset
columnManager.resetToDefaults();
```

## Troubleshooting

### Dropdown not opening
- Check if daisyUI CSS is loaded
- Verify `tabindex="0"` on dropdown elements

### Drag & drop not working
- Ensure columns are not locked
- Check `draggable="true"` attribute
- Verify drag event listeners are attached

### Preferences not persisting
- Check localStorage is enabled in browser
- Verify storage key is correct
- Check browser console for errors

## Example Implementation

See `web/assets/js/components/column-manager.js` for full implementation.

For integration example, see the "Integration with Lists Manager" section above.
