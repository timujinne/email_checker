# 🎯 Phase 4: Advanced Features - Архитектурный План

**Created:** 25 October 2025
**Status:** Development
**Priority:** 🔴 HIGHEST

---

## 📐 Архитектура Advanced Features

### Основные компоненты

```
Phase 4 Architecture
│
├── BLOCKLIST MANAGER (7 tasks)
│   ├── VirtualTable (4.1)
│   │   ├── renderVisibleRows()
│   │   ├── calculateRange()
│   │   └── handleScroll()
│   │
│   ├── BlocklistManager (4.2-4.7)
│   │   ├── SearchIndex (4.2)
│   │   ├── CSVImportWizard (4.3)
│   │   ├── StatsDashboard (4.4)
│   │   ├── BulkOperations (4.5)
│   │   ├── UndoRedoManager (4.6)
│   │   └── ExportManager (4.7)
│   │
│   └── Data Flow:
│       Input Files → VirtualTable → Search Index
│       ↓
│       CSV Import → Validation → BlocklistManager
│       ↓
│       Bulk Ops → Undo/Redo Stack → Export
│
├── PROCESSING QUEUE (6 tasks)
│   ├── ProcessingQueue (4.8-4.10)
│   │   ├── TaskMonitor (4.8)
│   │   ├── ProgressTracker (4.9-4.10)
│   │   └── WebSocket Handler
│   │
│   ├── TaskControls (4.11)
│   │   ├── PauseTask()
│   │   ├── ResumeTask()
│   │   └── CancelTask()
│   │
│   ├── NotificationSystem (4.12)
│   │   ├── ShowSuccess()
│   │   ├── ShowError()
│   │   └── DesktopNotification()
│   │
│   └── HistoryManager (4.13)
│       ├── LoadHistory(limit=100)
│       ├── Paginate()
│       └── Search()
│
└── Data Flow:
    WebSocket Event → TaskMonitor
    ↓
    Update Progress + ETA
    ↓
    Stream Logs with autoscroll
    ↓
    Task Controls + Notifications
    ↓
    History Pagination
```

---

## 📊 Component Specifications

### 4.1 Virtual Scrolling (VirtualTable)

**Purpose:** Render 22K+ items efficiently without DOM bloat

**Key Methods:**
```javascript
constructor(elementId, options)  // rowHeight, visibleRows, bufferRows
setData(items)                    // Set large dataset
renderVisibleRows()               // Calculate & render visible range
handleScroll(scrollTop)           // Efficient scroll handling
getScrollInfo()                   // { startIndex, endIndex, offset }
```

**Performance Targets:**
- Scroll 22K items < 16ms (60fps)
- Memory usage < 50MB
- Render 50 items at a time
- Buffer 10 items above/below viewport

**Technical Details:**
- Row height: Fixed at 44px (for calculations)
- Visible rows: ~20-30 depending on viewport
- Buffer size: 10 rows (prevents flashing)
- Total DOM nodes: ~60-70 max

### 4.2 Search & Index

**Purpose:** Fast email/domain lookup (O(1) on indexed fields)

**Key Methods:**
```javascript
buildIndex(items)                 // Create searchable index
searchEmail(query)                // Returns matching emails
searchDomain(query)               // Returns matching domains
filterByStatus(status)            // Blocked/Allowed/New
applyFilters(filters)             // Combined multi-filter
getStats()                        // Count by status
```

**Index Structure:**
```javascript
{
  emailMap: Map,        // email → item
  domainMap: Map,       // domain → [items]
  statusGroups: {
    blocked: Set,
    allowed: Set,
    new: Set
  },
  lastUpdate: timestamp
}
```

**Search Performance:**
- Email lookup: O(1)
- Domain lookup: O(1)
- Filter by status: O(1)
- Re-index 22K items: < 100ms

### 4.3 CSV Import Wizard

**Purpose:** 5-step guided CSV import with validation

**Steps:**
1. **File Upload & Detection**
   - Drag & drop or click to upload
   - Auto-detect format (SMTP logs, unsubscribe logs)
   - Preview first 5 rows

2. **Format Selection**
   - SMTP logs: `st_text,ts,sub,frm,email,tag,mid,link`
   - Unsubscribe logs: `Дата отписки;Email адреса;Причина`
   - Custom separator (comma, semicolon, tab)

3. **Validation Rules**
   - Email format validation
   - Duplicate detection
   - Status mapping (hard bounce, blocked, etc.)
   - Preview validation results

4. **Confirmation**
   - Show import summary
   - Count new emails vs duplicates
   - Estimate time for import

5. **Process & Report**
   - Show progress bar
   - Display import statistics
   - Export report as CSV

**Validation:**
```javascript
validateEmail(email)              // Format check
checkDuplicate(email)             // Against existing
detectStatus(row, format)         // Auto-detect status
generateReport()                  // Import summary
```

### 4.4 Statistics Dashboard

**Purpose:** Visual stats with charts showing blocklist trends

**Charts:**
1. **Top Blocked Domains** (Bar chart)
   - Top 10 domains by count
   - Pie/bar chart toggle

2. **Blocking Trends** (Line chart)
   - Over time (7d, 30d, 90d)
   - New vs total blocked

3. **Status Distribution** (Pie chart)
   - Blocked/Allowed/New breakdown
   - Percentage labels

4. **Domain Risk Levels** (Heatmap)
   - High/Medium/Low risk
   - Risk score per domain

**Key Methods:**
```javascript
getTopDomains(limit=10)           // Top blocked domains
getTrends(days=30)                // Historical trends
getDistribution()                 // Status breakdown
getRiskScores()                   // Domain risk levels
refreshData()                     // Fetch latest stats
```

### 4.5 Bulk Operations

**Purpose:** Add/remove/update multiple items at once

**Operations:**
```javascript
addBlockedEmails(emails)          // Bulk add to blocklist
removeEmails(emails)              // Bulk remove
updateStatus(emails, newStatus)   // Bulk status change
tagItems(items, tags)             // Bulk tagging
exportSelection(items, format)    // Export selected
```

**Queue Management:**
- Queue operations in background
- Show progress for each operation
- Batch into smaller chunks (100 items)
- Cancel ongoing operations

### 4.6 Undo/Redo System

**Purpose:** Track and undo/redo all changes

**Architecture:**
```javascript
class UndoRedoManager {
  constructor(maxSize=100)        // Keep 100 changes
  execute(action)                 // Do action & store
  undo()                          // Undo last action
  redo()                          // Redo undone action
  canUndo()                       // Check if can undo
  canRedo()                       // Check if can redo
  clearHistory()                  // Reset stack
}

// Action structure
{
  type: 'add' | 'remove' | 'update',
  data: item,
  timestamp: Date,
  description: 'Added 5 emails'
}
```

**Operations Tracked:**
- Add/remove emails
- Update status
- Bulk operations
- CSV imports (as single action)

### 4.7 Export Functionality

**Purpose:** Export blocklist in multiple formats

**Formats:**
```javascript
exportAsCSV(items)                // CSV format
exportAsJSON(items)               // JSON format
exportAsTXT(items)                // TXT (one per line)
```

**Fields:**
- Email
- Domain
- Status
- Added date
- Source (CSV import, manual, etc.)
- Tags

---

## 4.8-4.13 Processing Queue Architecture

### 4.8 Real-time Task List (WebSocket)

**Purpose:** Monitor ongoing background tasks with live updates

**WebSocket Events:**
```javascript
// Server → Client
{
  type: 'task_created',
  data: { taskId, name, status, progress }
}

{
  type: 'task_progress',
  data: { taskId, progress, eta, processed, total }
}

{
  type: 'task_log',
  data: { taskId, message, level }
}

{
  type: 'task_completed',
  data: { taskId, result, stats }
}
```

**Task Structure:**
```javascript
{
  id: 'uuid',
  name: 'Process list_name.txt',
  status: 'running|paused|completed|failed',
  created: timestamp,
  started: timestamp,
  completed: timestamp,
  progress: 0-100,
  processed: 1000,
  total: 5000,
  eta: '00:05:23',
  logs: ['...', '...'],
  result: { stats: {...} }
}
```

### 4.9 Progress Bars + ETA

**Purpose:** Show real-time progress with estimated completion time

**Calculations:**
```javascript
calculateETA(processed, total, startTime) {
  const elapsed = Date.now() - startTime;
  const rate = processed / elapsed;
  const remaining = total - processed;
  const eta = remaining / rate;
  return formatTime(eta);
}
```

**Display:**
- Overall progress bar (0-100%)
- Items processed / total
- Current speed (items/sec)
- Time elapsed
- ETA (HH:MM:SS format)

### 4.10 Log Streaming with Autoscroll

**Purpose:** Show real-time logs with automatic scrolling

**Features:**
- Max 500 log lines in DOM
- Auto-remove old logs
- Autoscroll when new logs arrive
- Color coding by level (INFO, WARN, ERROR)
- Search/filter logs
- Copy to clipboard

### 4.11 Task Controls

**Purpose:** Pause/resume/cancel ongoing tasks

**Controls:**
```javascript
pauseTask(taskId)                 // Pause task
resumeTask(taskId)                // Resume task
cancelTask(taskId)                // Cancel task
retryTask(taskId)                 // Retry failed task
```

**Handling:**
- Send control events to backend
- Show confirmation modals
- Handle cancellation state
- Show error if task cannot be controlled

### 4.12 Notification System

**Purpose:** Alert user about task completion

**Notifications:**
```javascript
showNotification(type, message) {
  // type: 'success' | 'error' | 'warning' | 'info'
  // Shows toast + desktop notification (if permitted)
}

// Desktop API (Notifications API)
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Task completed', { ... });
}
```

**Triggers:**
- Task completed
- Task failed
- Important milestones (25%, 50%, 75%, 100%)

### 4.13 History Pagination

**Purpose:** View last 100 completed tasks with pagination

**Structure:**
```javascript
{
  completed: [
    { taskId, name, status, createdAt, completedAt, result },
    ...
  ],
  total: 5421,
  page: 1,
  pageSize: 20,
  totalPages: 271
}
```

**Features:**
- Load 100 tasks from backend
- Paginate in UI (20 per page)
- Search by task name
- Filter by status
- Show task duration
- Download full history as CSV

---

## 📁 File Structure

```
web/
├── assets/js/components/
│   ├── virtual-table.js           (400 lines) - Virtual scrolling
│   ├── blocklist-manager.js       (500 lines) - Main orchestrator
│   ├── blocklist-search.js        (300 lines) - Search & index
│   ├── csv-import-wizard.js       (500 lines) - 5-step wizard
│   ├── stats-dashboard.js         (400 lines) - Charts & stats
│   ├── bulk-operations.js         (300 lines) - Bulk actions
│   ├── undo-redo-manager.js       (250 lines) - Undo/redo system
│   ├── export-manager.js          (200 lines) - Export formats
│   │
│   ├── processing-queue.js        (500 lines) - Main orchestrator
│   ├── task-monitor.js            (350 lines) - WebSocket handler
│   ├── progress-tracker.js        (300 lines) - Progress & ETA
│   ├── log-streamer.js            (250 lines) - Log display
│   ├── task-controls.js           (200 lines) - Control buttons
│   ├── notification-system.js     (150 lines) - Notifications
│   └── history-manager.js         (250 lines) - History pagination
│
├── blocklist.html                 (250 lines) - Blocklist page
├── processing-queue.html          (250 lines) - Processing page
└── assets/css/custom.css          (updated)
```

**Total Phase 4:** ~4,700 lines of code + documentation

---

## 🔌 Backend API Requirements

### Blocklist Manager

```
GET  /api/blocklist/list           # Load blocklist (pagination)
GET  /api/blocklist/search?q=...   # Search emails/domains
POST /api/blocklist/import-csv     # Import CSV
POST /api/blocklist/bulk-add       # Bulk add emails
POST /api/blocklist/bulk-remove    # Bulk remove
POST /api/blocklist/bulk-update    # Bulk update status
GET  /api/blocklist/stats          # Statistics
POST /api/blocklist/export         # Export format
```

### Processing Queue

```
GET  /api/tasks/list               # List running tasks
GET  /api/tasks/:id                # Get task details
POST /api/tasks/:id/pause          # Pause task
POST /api/tasks/:id/resume         # Resume task
POST /api/tasks/:id/cancel         # Cancel task
GET  /api/tasks/history            # Get completed tasks
WS   /ws/tasks                     # WebSocket for live updates
```

---

## 🎨 UI/UX Patterns

### Blocklist Manager Page
- **Left Panel:** Virtual table with search bar
- **Right Panel:** Selected item details + actions
- **Bottom:** Bulk operations toolbar
- **Modal Dialogs:**
  - CSV Import Wizard
  - Stats Dashboard
  - Confirmation modals

### Processing Queue Page
- **Top:** Active tasks with progress bars
- **Middle:** Real-time logs with autoscroll
- **Bottom:** Task history pagination
- **Right Sidebar:** Task statistics

---

## ⚡ Performance Targets

| Component | Target | Technique |
|-----------|--------|-----------|
| Virtual Table | Scroll 22K items @ 60fps | Virtual scrolling + RAF |
| Search | < 100ms for 22K items | Hash map indexing |
| CSV Import | 1000 items < 2s | Chunk processing |
| Charts | Render < 500ms | Lazy initialization |
| WebSocket | < 100ms latency | Binary compression |
| Memory | < 100MB total | Efficient data structures |

---

## 🚨 Known Issues & Mitigation

| Issue | Probability | Mitigation |
|-------|-------------|-----------|
| Virtual scrolling + search conflict | High | Separate virtual scroll & search logic |
| WebSocket disconnect during long tasks | High | Auto-reconnect with state sync |
| 22K+ items performance degradation | Medium | Incremental loading + caching |
| CSV import validation errors | Medium | Detailed error reporting + preview |
| Large memory consumption | Low | Stream processing + cleanup |

---

## 📋 Testing Strategy

### Unit Tests
- VirtualTable rendering calculations
- Search index building & lookup
- ETA calculations
- Status transitions

### Integration Tests
- CSV import end-to-end
- Bulk operations + undo/redo
- WebSocket task updates
- Export formats

### Performance Tests
- Virtual scrolling 22K items
- Search on large dataset
- Concurrent task monitoring
- Memory usage under load

---

## 🎯 Success Criteria

- ✅ Virtual table handles 22K items smoothly
- ✅ Search < 100ms on 22K items
- ✅ CSV import validates correctly
- ✅ Charts render quickly
- ✅ WebSocket updates real-time (< 100ms)
- ✅ Undo/redo functional for all operations
- ✅ Export works in all formats
- ✅ 90%+ code coverage
- ✅ Zero memory leaks
- ✅ Full dark/light theme support

---

## 📊 Estimated Breakdown

| Component | Lines | Time |
|-----------|-------|------|
| Virtual Table | 400 | 2h |
| Blocklist Manager | 500 | 3h |
| CSV Import | 500 | 3h |
| Stats Dashboard | 400 | 2.5h |
| Bulk Operations | 300 | 2h |
| Undo/Redo | 250 | 1.5h |
| Export | 200 | 1h |
| Processing Queue | 500 | 3h |
| Task Monitor | 350 | 2h |
| Progress Tracker | 300 | 2h |
| Log Streamer | 250 | 1.5h |
| Task Controls | 200 | 1h |
| Notifications | 150 | 1h |
| History | 250 | 1.5h |
| HTML Pages | 500 | 2h |
| Testing & Docs | 400 | 3h |
| **TOTAL** | **4,700** | **~35 hours** |

---

## 📝 Architecture Decisions

1. **Virtual Scrolling** - Use fixed row height for predictable calculations
2. **Search Index** - Build on-demand, cache until data changes
3. **CSV Wizard** - 5 steps for clear UX and validation
4. **Charts** - Use Chart.js with lazy loading
5. **WebSocket** - Reconnect with state sync on disconnect
6. **Undo/Redo** - Store actions in circular buffer (max 100)
7. **Exports** - Support TXT, CSV, JSON formats

---

Created: 25 Oct 2025
Status: Ready for Implementation
