# 🎯 Phase 5: Analytics & Cloud Integration - Архитектурный План

**Created:** 25 October 2025
**Status:** Development
**Priority:** 🟠 HIGH

---

## 📐 Архитектура Phase 5

### Основные компоненты

```
Phase 5 Architecture
│
├── ANALYTICS SYSTEM (5.1-5.6)
│   ├── DateRangePicker (5.1)
│   │   ├── Calendar widget
│   │   ├── Preset ranges
│   │   └── Custom range validation
│   │
│   ├── ChartSystem (5.2)
│   │   ├── LineChart (trends over time)
│   │   ├── BarChart (comparisons)
│   │   ├── PieChart (distribution)
│   │   └── HeatmapChart (temporal patterns)
│   │
│   ├── Analytics Dashboard (5.3)
│   │   ├── Drill-down navigation
│   │   ├── Detail views
│   │   └── Chart interactivity
│   │
│   ├── ReportBuilder (5.4-5.6)
│   │   ├── Query builder
│   │   ├── Chart selector
│   │   ├── Filter configuration
│   │   └── Report designer
│   │
│   └── ReportExporter (5.5-5.6)
│       ├── CSV export
│       ├── PDF generation (jsPDF)
│       └── Report storage (localStorage)
│
├── ARCHIVE & CLOUD SYSTEM (5.7-5.12)
│   ├── OAuth Manager (5.7)
│   │   ├── Google login flow
│   │   ├── Token storage (secure)
│   │   └── Token refresh
│   │
│   ├── LocalArchive (5.8)
│   │   ├── File browser
│   │   ├── Metadata display
│   │   ├── Quick actions
│   │   └── Batch operations
│   │
│   ├── CloudStorage (5.9)
│   │   ├── GCS API wrapper
│   │   ├── Upload handler
│   │   ├── Download manager
│   │   ├── Sync status
│   │   └── Version history
│   │
│   ├── TaggingSystem (5.10-5.11)
│   │   ├── Tag management
│   │   ├── Archive search
│   │   ├── Filter by tags
│   │   └── Full-text search
│   │
│   └── ReUseWorkflow (5.12)
│       ├── Download from archive
│       ├── Process with existing filters
│       └── Export results
│
└── Data Flow:
    Analytics Page:
      DateRangePicker → Filter Data → ChartSystem → Dashboard
      Drill-down → Detail View
      Build Report → Export (CSV/PDF)
      Save Report → Retrieve Later

    Archive Page:
      Login with OAuth → List Files (Local + Cloud)
      Search/Filter → View Details
      Tag Management → Organize
      Re-use → Download → Process
```

---

## 📊 Component Specifications

### 5.1 Date Range Picker

**Purpose:** Select date ranges for analytics filtering

**Features:**
```javascript
constructor(elementId, options)
  - startDate: default 30 days ago
  - endDate: default today
  - presets: ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom']
  - format: 'YYYY-MM-DD'

Methods:
getDateRange()              // Returns {startDate, endDate}
setDateRange(start, end)    // Set dates programmatically
getSelectedPreset()         // Return active preset name
onRangeChange(callback)     // Subscribe to changes
validate()                  // Validate selected range
```

**Implementation:**
- Lightweight calendar picker (no external libs)
- Preset buttons for quick selection
- Date input fields
- Validation (end >= start)
- Observable pattern

### 5.2 Chart System (4 Chart Types)

**Purpose:** Display data insights with multiple chart types

**Charts:**

1. **LineChart** - Trends over time
   - X-axis: Time (daily/weekly/monthly)
   - Y-axis: Metrics (count, percentage, etc.)
   - Multiple series support
   - Hover tooltips with values
   - Download as PNG

2. **BarChart** - Comparisons
   - Horizontal or vertical bars
   - Grouped or stacked mode
   - Category labels
   - Value labels on bars
   - Color coding

3. **PieChart** - Distribution
   - Percentage display
   - Legend with values
   - Donut variant
   - Custom colors
   - Click for details

4. **HeatmapChart** - Temporal patterns
   - Matrix of values
   - Color intensity = value
   - X-axis: Time
   - Y-axis: Categories
   - Show patterns over time

**Key Methods:**
```javascript
renderChart(data, config)     // Main render
updateData(newData)           // Update without re-render
setDateRange(start, end)      // Filter by date
export()                      // Export as PNG/CSV
getChartData()               // Raw data
```

### 5.3 Drill-down Functionality

**Purpose:** Navigate from summary to detailed views

**Levels:**
1. **Level 1:** Summary (all data)
2. **Level 2:** By category/domain
3. **Level 3:** By time period
4. **Level 4:** Individual records

**Navigation:**
```javascript
drillDown(dimension, value)  // Go deeper
drillUp()                    // Go back
getCurrentLevel()            // Current hierarchy level
getHierarchyPath()          // Breadcrumb path
```

**Breadcrumbs:**
- Show current path
- Click to jump to level
- Visual hierarchy

### 5.4 Custom Report Builder

**Purpose:** Create custom reports with flexible configuration

**Components:**
1. **Metrics Selector** - Choose what to measure
2. **Dimension Selector** - Group by what
3. **Filter Builder** - Apply conditions
4. **Chart Type Selector** - Visualization
5. **Sorting & Pagination** - Data arrangement
6. **Preview** - See report before saving

**Report Structure:**
```javascript
{
  id: 'uuid',
  name: 'Report Name',
  description: 'Report description',
  metrics: ['metric1', 'metric2'],       // What to measure
  dimensions: ['dimension1'],             // Group by
  filters: [                              // Apply conditions
    { field: 'status', operator: '=', value: 'blocked' }
  ],
  chartType: 'line' | 'bar' | 'pie' | 'heatmap',
  dateRange: { start, end },
  created: timestamp,
  updated: timestamp,
  query: 'SQL-like query string'
}
```

### 5.5 Export to CSV/PDF

**Purpose:** Export reports and data in multiple formats

**Formats:**
1. **CSV** - Excel compatible
2. **PDF** - Pretty printable format with styling

**Export Features:**
```javascript
exportAsCSV(data, filename)
  - Include headers
  - Proper escaping
  - Date formatting

exportAsPDF(report, options)
  - Header with date range
  - Charts as images
  - Tables with formatting
  - Footer with export info
  - Page break handling
```

**Uses:**
- jsPDF for PDF generation
- html2canvas for chart images
- Custom styling for PDFs

### 5.6 Saved Reports Management

**Purpose:** Store and retrieve custom reports

**Features:**
```javascript
saveReport(report)               // Save new or update
getReport(reportId)              // Load by ID
listReports(filters)             // All saved reports
deleteReport(reportId)           // Remove report
duplicateReport(reportId)        // Clone report
shareReport(reportId, users)     // Share functionality
```

**Storage:**
- localStorage for local storage (max 50 reports)
- Optional backend sync
- Cloud storage option
- Version history

---

## 5.7-5.12 Archive & Cloud System

### 5.7 OAuth 2.0 Integration

**Purpose:** Authenticate with Google for Cloud Storage

**Flow:**
```
1. User clicks "Connect Google Drive"
2. Redirect to Google OAuth login
3. User approves permissions
4. Receive authorization code
5. Exchange for access token
6. Store token securely (encrypted localStorage)
7. Use token for API calls
8. Handle token refresh
```

**Implementation:**
```javascript
class OAuthManager {
  constructor(clientId, scope)

  authorize()                      // Start OAuth flow
  handleCallback(code)             // Process auth code
  getAccessToken()                 // Get current token
  refreshToken()                   // Refresh if expired
  logout()                         // Clear tokens
  isAuthorized()                   // Check if logged in
}
```

**Storage:**
- Encrypted localStorage (AES-256)
- Token expiry tracking
- Automatic refresh before expiry
- Logout clears all tokens

### 5.8 Local Archive View

**Purpose:** Browse locally stored files

**Features:**
```javascript
class LocalArchive {
  loadFiles()                      // List all local files
  getFileMetadata(filename)        // Size, date, tags
  quickDownload(filename)          // Download to computer
  deleteFile(filename)             // Remove file
  getFileStats()                   // Total size, count, etc.
  openFile(filename)               // Open in new tab
}
```

**Display:**
- Table of files with columns:
  - Filename
  - Size
  - Created date
  - Tags
  - Actions (download, delete, tag)
- Sorting and filtering
- Batch operations (select multiple)
- Search bar

### 5.9 Google Cloud Storage

**Purpose:** Store and sync files to Google Cloud

**Features:**
```javascript
class CloudStorage {
  constructor(accessToken)

  listBucketContents(prefix)      // List files in bucket
  uploadFile(file, destination)   // Upload to GCS
  downloadFile(path)              // Download from GCS
  deleteFile(path)                // Remove from GCS
  getSyncStatus()                 // What's synced
  getVersionHistory(filename)     // Previous versions
  syncLocalToCloud()              // Sync all local files
}
```

**Features:**
- List bucket contents
- Upload with progress bar
- Download with resume
- Delete with confirmation
- Sync status tracking
- Version history
- Automatic backups

### 5.10 Tagging System

**Purpose:** Organize and manage file tags

**Features:**
```javascript
class TaggingSystem {
  addTag(filename, tags)          // Add tags to file
  removeTag(filename, tag)        // Remove tag
  listTags()                       // All available tags
  getFilesByTag(tag)              // Find files with tag
  renameTag(oldTag, newTag)       // Rename tag
  deleteTag(tag)                  // Remove tag from all files
  suggestTags(filename)           // AI suggestions
}
```

**UI:**
- Tag selector/creator
- Auto-complete from existing tags
- Bulk tag management
- Tag statistics (count per tag)
- Color-coded tags

### 5.11 Archive Search

**Purpose:** Find files by various criteria

**Search Types:**
```javascript
class ArchiveSearch {
  searchByName(query)             // Full-text search in filenames
  searchByTag(tags)               // Filter by tags
  searchByDate(startDate, endDate)// Date range
  searchBySize(minSize, maxSize)  // File size range
  searchByCombined(filters)       // Multi-filter search
}
```

**Filters:**
- Filename search
- Tag filters (OR logic)
- Date range
- File size
- Sync status (local/cloud/both)

### 5.12 Re-use Workflow

**Purpose:** Download archived files and process them

**Workflow:**
```
1. Select file from archive
2. Click "Re-use"
3. Download to local
4. Show available processors:
   - Smart Filter
   - Email Validator
   - Custom processing
5. Select processor
6. Configure parameters
7. Run processing
8. Export results
```

**Implementation:**
```javascript
class ReUseWorkflow {
  downloadFromArchive(filename)   // Get file locally
  listAvailableProcessors()       // What can process it
  applyProcessor(file, processor, config) // Run
  exportResults(results)          // Save output
}
```

---

## 📁 File Structure

```
web/
├── assets/js/components/
│   ├── ANALYTICS
│   │   ├── date-range-picker.js       (300 lines)
│   │   ├── chart-system.js            (600 lines)
│   │   ├── analytics-dashboard.js     (550 lines)
│   │   ├── report-builder.js          (500 lines)
│   │   ├── report-exporter.js         (350 lines)
│   │   └── report-manager.js          (300 lines)
│   │
│   ├── ARCHIVE & CLOUD
│   │   ├── oauth-manager.js           (350 lines)
│   │   ├── local-archive.js           (400 lines)
│   │   ├── cloud-storage.js           (500 lines)
│   │   ├── tagging-system.js          (300 lines)
│   │   ├── archive-search.js          (350 lines)
│   │   └── reuse-workflow.js          (350 lines)
│   │
│   └── [39 компонентов Phase 1-4]
│
├── analytics.html                     (350 lines)
├── archive.html                       (350 lines)
├── assets/js/main.js                  (updated routes)
└── assets/css/custom.css              (updated)

PHASE5_ARCHITECTURE.md                 (380 lines)
```

**Total Phase 5:** ~4,850 lines of code + documentation

---

## 🔌 Backend API Requirements

### Analytics APIs

```
GET  /api/analytics/metrics              # Available metrics
GET  /api/analytics/dimensions           # Available dimensions
GET  /api/analytics/data                 # Raw data
  ?startDate=YYYY-MM-DD
  &endDate=YYYY-MM-DD
  &metrics=metric1,metric2
  &dimensions=dim1,dim2
  &filters=status:blocked

GET  /api/analytics/trends              # Time-series data
GET  /api/analytics/summary             # KPI summary
POST /api/analytics/drilldown           # Detailed view
  { dimension: 'domain', value: 'gmail.com' }

GET  /api/analytics/export/csv          # Export as CSV
GET  /api/analytics/export/pdf          # Export as PDF
```

### Archive & Cloud APIs

```
POST /api/auth/oauth/google             # OAuth flow
GET  /api/auth/oauth/callback           # Callback handler
POST /api/auth/oauth/refresh            # Refresh token

GET  /api/archive/local                 # List local files
GET  /api/archive/local/:filename       # File details
DELETE /api/archive/local/:filename     # Delete file

GET  /api/archive/cloud                 # List cloud files
POST /api/archive/cloud/upload          # Upload file
GET  /api/archive/cloud/:filename       # Download file
DELETE /api/archive/cloud/:filename     # Delete from cloud
GET  /api/archive/cloud/:filename/versions # Version history

POST /api/archive/tags                  # Add tags
DELETE /api/archive/tags/:filename      # Remove tags
GET  /api/archive/search                # Search files
  ?query=text
  &tags=tag1,tag2
  &dateFrom=YYYY-MM-DD
  &dateTo=YYYY-MM-DD
```

---

## 🎨 UI/UX Design

### Analytics Page Layout
```
┌─────────────────────────────────────┐
│  Analytics Dashboard                │
├─────────────────────────────────────┤
│ [Date Range Picker] [Report Preset] │
├─────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ │
│ │  Chart 1      │ │  Chart 2      │ │
│ │ (Line/Bar)    │ │ (Pie/Heatmap) │ │
│ └───────────────┘ └───────────────┘ │
├─────────────────────────────────────┤
│ [Build Report] [Save Report] [Export]
├─────────────────────────────────────┤
│  Saved Reports List                 │
│  ┌─────────────────────────────┐    │
│  │ Report 1  | 2025-10-25      │    │
│  │ Report 2  | 2025-10-24      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Archive Page Layout
```
┌─────────────────────────────────────┐
│  Archive Manager                    │
├─────────────────────────────────────┤
│ [Search] [Filter by Tag] [Auth Btn] │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ Local Archive                 │   │
│ ├───────────────────────────────┤   │
│ │ File | Size | Date | Tags     │   │
│ │ list1 | 100M| 10/25| prod,v2  │   │
│ │ list2 | 50M | 10/24| test     │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ Cloud Storage (GCS)           │   │
│ ├───────────────────────────────┤   │
│ │ File | Size | Sync | Version  │   │
│ │ file1| 200M | ✓    | v3       │   │
│ │ file2| 150M | ✓    | v2       │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ [Sync] [Upload] [Download] [Re-use] │
└─────────────────────────────────────┘
```

---

## ⚡ Performance Targets

| Component | Target | Technique |
|-----------|--------|-----------|
| Date picker load | < 100ms | Lightweight calendar |
| Chart render | < 500ms | Chart.js + caching |
| Report generation | < 2s | Async processing |
| PDF export | < 5s | html2canvas + jsPDF |
| Archive list | < 300ms | Virtual scrolling |
| Cloud sync | < 30s | Batch operations |
| Search | < 100ms | Indexed search |

---

## 🚨 Known Issues & Mitigation

| Issue | Probability | Mitigation |
|-------|-------------|-----------|
| Large PDF generation | Medium | Progressive rendering + streamed output |
| GCS quota exceeded | Medium | Quota monitoring + user alerts |
| OAuth token expiry | Low | Auto-refresh + retry logic |
| Network timeout on upload | Medium | Resume capability + chunks |
| Chart memory leak | Low | Proper cleanup on destroy |

---

## 🎯 Success Criteria

- ✅ Analytics page shows interactive charts
- ✅ Date range picker works smoothly
- ✅ Custom reports can be created and saved
- ✅ Reports can be exported to CSV and PDF
- ✅ OAuth flow works for Google authentication
- ✅ Local archive displays all files
- ✅ GCS integration uploads/downloads files
- ✅ Tagging system functional
- ✅ Search finds files by name/tag/date
- ✅ Re-use workflow processes archived files

---

## 📋 Estimated Breakdown

| Component | Lines | Time |
|-----------|-------|------|
| Date Range Picker | 300 | 1h |
| Chart System | 600 | 3h |
| Analytics Dashboard | 550 | 2.5h |
| Report Builder | 500 | 2.5h |
| Report Exporter | 350 | 2h |
| Report Manager | 300 | 1.5h |
| OAuth Manager | 350 | 2h |
| Local Archive | 400 | 2h |
| Cloud Storage | 500 | 3h |
| Tagging System | 300 | 1.5h |
| Archive Search | 350 | 1.5h |
| Re-use Workflow | 350 | 1.5h |
| HTML Pages | 700 | 2h |
| Testing & Docs | 400 | 2h |
| **TOTAL** | **4,850** | **~27 hours** |

---

## 📚 Architecture Decisions

1. **Chart.js** - Popular, lightweight, responsive
2. **jsPDF + html2canvas** - Client-side PDF generation
3. **localStorage** - Client-side report storage
4. **Encrypted localStorage** - Token security
5. **Virtual scrolling** - Archive file performance
6. **Async processing** - Long-running operations
7. **OAuth flow** - Standard Google authentication
8. **WebSocket optional** - Real-time sync (Phase 6)

---

Created: 25 Oct 2025
Status: Ready for Implementation
