# Email Checker UI Patterns

This guide provides specialized UI patterns for email list management interfaces, covering list views, bulk actions, status indicators, filtering, and real-time updates.

## List/Table Hybrid Views

### Desktop Table with Mobile Cards

A responsive pattern that shows a data table on desktop and cards on mobile:

```html
<!-- Desktop Table View -->
<div class="hidden lg:block overflow-x-auto">
  <table class="table table-zebra">
    <thead>
      <tr>
        <th><input type="checkbox" class="checkbox" id="selectAll" /></th>
        <th>Email</th>
        <th>Status</th>
        <th>Source</th>
        <th>Date Added</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" class="checkbox" value="1" /></td>
        <td>
          <div class="font-medium">user@example.com</div>
          <div class="text-sm text-base-content/70">Company: ABC Motors</div>
        </td>
        <td><span class="badge badge-success">Clean</span></td>
        <td>Italy_Contacts.txt</td>
        <td>2025-10-28</td>
        <td>
          <div class="dropdown dropdown-end">
            <button class="btn btn-ghost btn-xs">⋮</button>
            <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
              <li><a>View Details</a></li>
              <li><a>Add to Blocklist</a></li>
            </ul>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Mobile Card View -->
<div class="lg:hidden space-y-3">
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex items-start gap-3">
        <input type="checkbox" class="checkbox mt-1" value="1" />
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start gap-2 mb-2">
            <div class="font-medium truncate">user@example.com</div>
            <span class="badge badge-success badge-sm shrink-0">Clean</span>
          </div>
          <div class="text-sm text-base-content/70 space-y-1">
            <p>Company: ABC Motors</p>
            <p>Source: Italy_Contacts.txt</p>
            <p>Date: 2025-10-28</p>
          </div>
          <div class="card-actions justify-end mt-3">
            <button class="btn btn-sm btn-ghost">Details</button>
            <button class="btn btn-sm btn-error btn-outline">Block</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Sortable Table Headers

```html
<thead>
  <tr>
    <th>
      <button class="flex items-center gap-1 font-bold" onclick="sortBy('email')">
        Email
        <svg class="w-4 h-4" id="emailSort">
          <path d="M7 10l5 5 5-5z"/><!-- down arrow -->
        </svg>
      </button>
    </th>
    <th>
      <button class="flex items-center gap-1 font-bold" onclick="sortBy('status')">
        Status
        <svg class="w-4 h-4" id="statusSort"><path/></svg>
      </button>
    </th>
  </tr>
</thead>

<script>
let sortState = { column: null, direction: 'asc' };

function sortBy(column) {
  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.column = column;
    sortState.direction = 'asc';
  }
  
  updateSortIndicators();
  performSort();
}

function updateSortIndicators() {
  // Reset all indicators
  document.querySelectorAll('[id$="Sort"]').forEach(icon => {
    icon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
    icon.classList.remove('rotate-180');
  });
  
  // Update active indicator
  const activeIcon = document.getElementById(sortState.column + 'Sort');
  if (sortState.direction === 'asc') {
    activeIcon.classList.add('rotate-180');
  }
}
</script>
```

---

## Bulk Action Patterns

### Selection Toolbar

```html
<!-- Selection count and actions -->
<div id="selectionToolbar" class="hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
  <div class="bg-primary text-primary-content shadow-xl rounded-box p-4 flex items-center gap-4">
    <span id="selectionCount" class="font-semibold">0 selected</span>
    <div class="divider divider-horizontal"></div>
    <button class="btn btn-sm btn-ghost" onclick="exportSelected()">
      <svg class="w-4 h-4"><path d="..."/></svg>
      Export
    </button>
    <button class="btn btn-sm btn-ghost" onclick="blockSelected()">
      <svg class="w-4 h-4"><path d="..."/></svg>
      Block
    </button>
    <button class="btn btn-sm btn-ghost" onclick="deleteSelected()">
      <svg class="w-4 h-4"><path d="..."/></svg>
      Delete
    </button>
    <div class="divider divider-horizontal"></div>
    <button class="btn btn-sm btn-circle btn-ghost" onclick="clearSelection()">✕</button>
  </div>
</div>

<script>
const checkboxes = document.querySelectorAll('input[type="checkbox"][value]');
const selectAll = document.getElementById('selectAll');
const toolbar = document.getElementById('selectionToolbar');
const countSpan = document.getElementById('selectionCount');

// Update selection count
function updateSelectionCount() {
  const selected = Array.from(checkboxes).filter(cb => cb.checked);
  countSpan.textContent = `${selected.length} selected`;
  toolbar.classList.toggle('hidden', selected.length === 0);
}

// Select all toggle
selectAll.addEventListener('change', (e) => {
  checkboxes.forEach(cb => cb.checked = e.target.checked);
  updateSelectionCount();
});

// Individual checkbox change
checkboxes.forEach(cb => {
  cb.addEventListener('change', updateSelectionCount);
});

// Get selected IDs
function getSelectedIds() {
  return Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

function clearSelection() {
  checkboxes.forEach(cb => cb.checked = false);
  selectAll.checked = false;
  updateSelectionCount();
}
</script>
```

### Bulk Action Modal

```html
<dialog id="bulkActionModal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Confirm Bulk Action</h3>
    <p class="py-4">
      Are you sure you want to <span id="actionType" class="font-semibold"></span> 
      <span id="actionCount" class="font-semibold"></span> emails?
    </p>
    <div class="modal-action">
      <button class="btn btn-ghost" onclick="bulkActionModal.close()">Cancel</button>
      <button class="btn btn-error" id="confirmBulkAction">Confirm</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>

<script>
function blockSelected() {
  const ids = getSelectedIds();
  if (ids.length === 0) return;
  
  document.getElementById('actionType').textContent = 'block';
  document.getElementById('actionCount').textContent = ids.length;
  bulkActionModal.showModal();
  
  document.getElementById('confirmBulkAction').onclick = async () => {
    await performBulkBlock(ids);
    bulkActionModal.close();
    clearSelection();
    refreshList();
  };
}
</script>
```

---

## Status Indicator Designs

### Badge-Based Status

```html
<!-- Clean emails -->
<span class="badge badge-success gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
  Clean
</span>

<!-- Blocked emails -->
<span class="badge badge-error gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
  </svg>
  Blocked
</span>

<!-- Invalid emails -->
<span class="badge badge-warning gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
  Invalid
</span>

<!-- Processing -->
<span class="badge badge-info gap-1">
  <span class="loading loading-spinner loading-xs"></span>
  Processing
</span>
```

### Status with Progress

```html
<div class="flex items-center gap-3">
  <span class="badge badge-info">Processing</span>
  <div class="flex-1">
    <progress class="progress progress-info w-full" value="45" max="100"></progress>
  </div>
  <span class="text-sm text-base-content/70">45%</span>
</div>
```

### Priority Indicators

```html
<!-- HIGH Priority -->
<div class="badge badge-error gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 6l5 10H7l5-10z"/>
  </svg>
  HIGH
</div>

<!-- MEDIUM Priority -->
<div class="badge badge-warning gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <circle cx="12" cy="12" r="10"/>
  </svg>
  MEDIUM
</div>

<!-- LOW Priority -->
<div class="badge badge-ghost gap-1">
  <svg class="w-3 h-3" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
  </svg>
  LOW
</div>
```

---

## Filter Sidebar Patterns

### Collapsible Filter Sidebar

```html
<div class="drawer lg:drawer-open">
  <input id="filter-drawer" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content">
    <!-- Main content with filter toggle -->
    <div class="p-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Email Lists</h1>
        <label for="filter-drawer" class="btn btn-primary drawer-button lg:hidden">
          <svg class="w-5 h-5"><path d="...filter icon"/></svg>
          Filters
        </label>
      </div>
      <!-- Email list content -->
    </div>
  </div>
  
  <!-- Filter sidebar -->
  <div class="drawer-side z-10">
    <label for="filter-drawer" class="drawer-overlay"></label>
    <aside class="menu p-4 w-80 min-h-full bg-base-200">
      <h2 class="text-lg font-bold mb-4">Filters</h2>
      
      <!-- Status filter -->
      <div class="form-control mb-4">
        <label class="label"><span class="label-text font-semibold">Status</span></label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" checked />
          <span class="label-text">Clean</span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" />
          <span class="label-text">Blocked</span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" />
          <span class="label-text">Invalid</span>
        </label>
      </div>
      
      <!-- Date range filter -->
      <div class="form-control mb-4">
        <label class="label"><span class="label-text font-semibold">Date Range</span></label>
        <input type="date" class="input input-bordered input-sm" />
        <span class="text-center my-1">to</span>
        <input type="date" class="input input-bordered input-sm" />
      </div>
      
      <!-- Source filter -->
      <div class="form-control mb-4">
        <label class="label"><span class="label-text font-semibold">Source</span></label>
        <select class="select select-bordered select-sm">
          <option value="">All sources</option>
          <option>Italy_Contacts.txt</option>
          <option>France_Leads.lvp</option>
        </select>
      </div>
      
      <!-- Apply/Reset buttons -->
      <div class="flex gap-2 mt-6">
        <button class="btn btn-primary btn-sm flex-1" onclick="applyFilters()">Apply</button>
        <button class="btn btn-ghost btn-sm flex-1" onclick="resetFilters()">Reset</button>
      </div>
    </aside>
  </div>
</div>
```

### Active Filter Tags

```html
<div class="flex flex-wrap gap-2 mb-4">
  <div class="badge badge-lg gap-2">
    Status: Clean
    <button class="btn btn-ghost btn-xs btn-circle" onclick="removeFilter('status')">✕</button>
  </div>
  <div class="badge badge-lg gap-2">
    Date: 2025-10-01 to 2025-10-31
    <button class="btn btn-ghost btn-xs btn-circle" onclick="removeFilter('date')">✕</button>
  </div>
  <button class="btn btn-ghost btn-sm" onclick="clearAllFilters()">Clear all</button>
</div>
```

---

## Processing Progress Displays

### Progress Card

```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h3 class="card-title">Processing Italy_Contacts.txt</h3>
    <div class="space-y-3">
      <!-- Overall progress -->
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span>Overall Progress</span>
          <span id="overallPercent">0%</span>
        </div>
        <progress class="progress progress-primary w-full" value="0" max="100" id="overallProgress"></progress>
      </div>
      
      <!-- Current step -->
      <div class="alert">
        <svg class="loading loading-spinner loading-sm"></ svg>
        <span id="currentStep">Loading emails...</span>
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="stat bg-base-200 rounded-lg p-2">
          <div class="stat-value text-success text-2xl" id="cleanCount">0</div>
          <div class="stat-title text-xs">Clean</div>
        </div>
        <div class="stat bg-base-200 rounded-lg p-2">
          <div class="stat-value text-error text-2xl" id="blockedCount">0</div>
          <div class="stat-title text-xs">Blocked</div>
        </div>
        <div class="stat bg-base-200 rounded-lg p-2">
          <div class="stat-value text-warning text-2xl" id="invalidCount">0</div>
          <div class="stat-title text-xs">Invalid</div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
function updateProgress(data) {
  document.getElementById('overallPercent').textContent = data.percent + '%';
  document.getElementById('overallProgress').value = data.percent;
  document.getElementById('currentStep').textContent = data.step;
  document.getElementById('cleanCount').textContent = data.clean;
  document.getElementById('blockedCount').textContent = data.blocked;
  document.getElementById('invalidCount').textContent = data.invalid;
}
</script>
```

### List of Processing Jobs

```html
<div class="space-y-3">
  <!-- Job 1: Processing -->
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold">Italy_Contacts.txt</h4>
          <p class="text-sm text-base-content/70">Started: 10:45 AM</p>
        </div>
        <span class="badge badge-info gap-1">
          <span class="loading loading-spinner loading-xs"></span>
          Processing
        </span>
      </div>
      <progress class="progress progress-info w-full mt-2" value="67" max="100"></progress>
      <p class="text-sm text-base-content/70 mt-1">67% complete - Extracting phrases...</p>
    </div>
  </div>
  
  <!-- Job 2: Completed -->
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold">France_Leads.lvp</h4>
          <p class="text-sm text-base-content/70">Completed: 10:42 AM</p>
        </div>
        <span class="badge badge-success">Complete</span>
      </div>
      <div class="flex gap-4 text-sm mt-2">
        <span class="text-success">4,890 clean</span>
        <span class="text-error">344 blocked</span>
        <span class="text-warning">15 invalid</span>
      </div>
      <div class="card-actions justify-end mt-2">
        <button class="btn btn-sm btn-primary">View Report</button>
      </div>
    </div>
  </div>
  
  <!-- Job 3: Failed -->
  <div class="card bg-base-100 border border-error">
    <div class="card-body p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold">Germany_Contacts.txt</h4>
          <p class="text-sm text-base-content/70">Failed: 10:38 AM</p>
        </div>
        <span class="badge badge-error">Failed</span>
      </div>
      <div class="alert alert-error mt-2">
        <svg class="w-5 h-5"><path d="..."/></svg>
        <span class="text-sm">Invalid file format</span>
      </div>
      <div class="card-actions justify-end mt-2">
        <button class="btn btn-sm btn-ghost">Retry</button>
      </div>
    </div>
  </div>
</div>
```

---

## Real-Time Update Patterns

### WebSocket Updates

```javascript
// Connect to WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:8080/updates');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch(update.type) {
    case 'progress':
      updateProgress(update.data);
      break;
    case 'complete':
      showComplete(update.data);
      break;
    case 'new_email':
      addEmailToList(update.data);
      break;
  }
};
```

### Server-Sent Events (SSE)

```javascript
const eventSource = new EventSource('/api/stream');

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  updateProgress(data);
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  showComplete(data);
  eventSource.close();
});
```

### Toast Notifications for Updates

```html
<div class="toast toast-top toast-end" id="toastContainer"></div>

<script>
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} shadow-lg mb-2`;
  toast.innerHTML = `
    <div>
      <svg class="stroke-current flex-shrink-0 w-6 h-6"><path d="..."/></svg>
      <span>${message}</span>
    </div>
  `;
  
  document.getElementById('toastContainer').appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000);
}

// Usage
showToast('Processing completed: 5,234 emails processed', 'success');
showToast('New list uploaded: Italy_Contacts.txt', 'info');
showToast('Failed to process file', 'error');
</script>
```

---

## Search and Quick Actions

### Search Bar with Quick Filters

```html
<div class="form-control mb-4">
  <div class="input-group">
    <input 
      type="search" 
      placeholder="Search emails..." 
      class="input input-bordered w-full"
      id="searchInput" />
    <button class="btn btn-square">
      <svg class="w-5 h-5"><path d="...search icon"/></svg>
    </button>
  </div>
  <div class="flex gap-2 mt-2">
    <button class="btn btn-xs" onclick="quickFilter('clean')">Clean Only</button>
    <button class="btn btn-xs" onclick="quickFilter('blocked')">Blocked Only</button>
    <button class="btn btn-xs" onclick="quickFilter('today')">Added Today</button>
  </div>
</div>
```

These UI patterns provide a comprehensive toolkit for building a professional, user-friendly email list management interface with daisyUI.
