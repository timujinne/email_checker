# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commit Policy

**IMPORTANT:** When creating git commits, use simple, clear commit messages WITHOUT any attribution footers.

❌ **DO NOT ADD:**
- Generated with Claude Code links
- Co-Authored-By: Claude
- Co-Authored-By: Happy
- Any automated attribution messages

✅ **DO:**
- Write clear, concise commit messages
- Focus on what changed and why
- Use conventional commit format when appropriate (feat:, fix:, docs:, etc.)

## Project Overview

Email Checker is a high-performance email list validation tool that checks email addresses against blocklists and enriches them with metadata. It's designed for processing large email lists (7-8K emails in 1-2 seconds) with duplicate detection, blocklist filtering, and metadata integration from LVP (XML) validation files.

**Key Features:**
- Fast blocklist checking (22K emails + 700 domains, O(1) lookup)
- Duplicate detection with special '20' prefix handling
- Direct LVP processing with full metadata preservation
- Smart filtering system for industry/geography-specific lead qualification
- Web interface for visual management
- Incremental processing with cache support
- HTML reports with statistics and charts

## Quick Reference Commands

### Most Common Commands

```bash
# RECOMMENDED: Process all files (TXT + LVP) with unified deduplication
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html

# Start web interface (auto-finds port 8080-8180)
python3 web_server.py

# Apply smart filter to clean lists (industry-specific lead scoring)
python3 email_checker.py smart-filter output/list_clean.txt
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# Show list status and metadata
python3 email_checker.py status
python3 email_checker.py status --pattern "*motors*"
```

### Processing Commands by File Type

**TXT Files:**
```bash
python3 email_checker.py check input/list.txt
python3 email_checker.py check-sequence input/list1.txt input/list2.txt --exclude-duplicates
python3 email_checker.py batch --exclude-duplicates --generate-html
python3 email_checker.py incremental --exclude-duplicates --generate-html
```

**LVP Files (with metadata):**
```bash
python3 email_checker.py check-lvp input/file.lvp
python3 email_checker.py check-lvp-sequence input/file1.lvp input/file2.lvp --exclude-duplicates
python3 email_checker.py check-lvp-batch --exclude-duplicates --generate-html
```

**Unified Processing (TXT + LVP):**
```bash
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html
```

### Smart Filter Commands (NEW!)

Smart filters apply industry-specific scoring and lead qualification to clean lists:

```bash
# Process single clean file
python3 email_checker.py smart-filter output/list_clean_20251010.txt

# Batch process clean files matching pattern
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# Use specific filter config
python3 smart_filter.py output/list_clean.txt --config italy_hydraulics

# List available filters
python3 smart_filter.py --list-configs
```

**Available Filters:**
- `italy_hydraulics` - Italian hydraulic equipment companies (IT+EN terms, geographic scoring)

**Output Files:**
- `*_HIGH_PRIORITY_*.txt/csv/json` - Score >= 100 (top leads)
- `*_MEDIUM_PRIORITY_*.txt/csv/json` - Score 50-99
- `*_LOW_PRIORITY_*.txt/csv/json` - Score 10-49
- `*_EXCLUDED_*.txt/csv/json` - Score < 10
- `*_EXCLUSION_REPORT_*.csv` - Detailed exclusion reasons

### Blocklist Import Commands (NEW!)

Import email addresses from CSV email campaign logs into blocklists:

```bash
# Preview import (dry-run mode)
python3 email_checker.py import-csv-blocklist blocklists/*.csv --dry-run

# Import CSV files to blocklists
python3 email_checker.py import-csv-blocklist blocklists/logs-*.csv

# Import with optional statuses (e.g., "Unsubscribed" for GDPR)
python3 email_checker.py import-csv-blocklist blocklists/*.csv --include-optional

# Using standalone utility
python3 import_blocklist_csv.py blocklists/*.csv --dry-run
```

**Supported CSV formats:**
- SMTP logs: `st_text,ts,sub,frm,email,tag,mid,link`
- Unsubscribe logs: `Дата отписки;Email адреса;Причина`

**Auto-imported statuses:**
- Hard bounce (email doesn't exist)
- Blocked (blocked by recipient server)
- Complaint (spam complaint)
- Unsubscribed (recipient unsubscribed)
- Invalid Email (invalid format)
- "Отметил рассылку как спам" (marked as spam)

**Features:**
- Auto-deduplication with existing blocklists
- Email normalization (lowercase, prefix removal)
- Problematic domain detection (≥5 blocked emails)
- Detailed import report generation

See [BLOCKLIST_IMPORT_GUIDE.md](BLOCKLIST_IMPORT_GUIDE.md) for full documentation.

### Metadata Operations

```bash
# Import LVP files to database
python3 lvp_importer.py output/file.lvp
python3 lvp_importer.py --scan output/

# Export metadata database to LVP
python3 lvp_exporter.py output_file.lvp

# Enrich clean lists with metadata
python3 email_enricher.py output/list_clean.txt
python3 email_enricher.py --enrich-all
python3 email_enricher.py --force output/list_clean.txt
```

### Performance & Maintenance

```bash
# Migrate JSON cache to SQLite (90% size reduction)
python3 migrate_to_optimized_cache.py

# Clean up old cache files
python3 cleanup_cache.py

# Optimize databases
python3 optimize_databases.py

# Export cached emails to TXT
python3 export_txt_files.py
```

### Testing

**Backend Testing:**
```bash
# Test LVP parser
python3 test_lvp_parser.py

# Test new architecture
python3 -c "from unified_processor import UnifiedEmailProcessor; print('✅ OK')"

# Test core components
python3 -c "from cache_manager import CacheManager; from metadata_store import MetadataStore; from progress_tracker import ProgressTracker; print('✅ OK')"
```

**Frontend Testing:**
```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests with Cypress
npm run test:e2e              # Headless mode
npm run test:e2e:open         # Interactive mode

# Run both unit and E2E tests
npm run test:all
```

## Architecture Overview

### Core Components

1. **EmailChecker** (`email_checker.py`) - Main processing engine
   - Blocklist checking with O(1) lookups using sets
   - Duplicate detection between/within lists
   - Result caching for incremental updates
   - HTML report generation

2. **Unified Processor** (`unified_processor.py`) - Modern architecture (NEW)
   - Handles all file types (TXT, LVP) with error handling
   - Integrated metadata preservation and caching
   - Real-time progress tracking with ETA

3. **Metadata System**
   - `EmailMetadataManager` - Loads emails with metadata from various formats
   - `LVPParser` (`email_metadata.py`) - Parses XML with invalid character sanitization
   - `MetadataDatabase` (`metadata_database.py`) - SQLite storage (174MB+)
   - `MetadataIntegrator` (`metadata_integration.py`) - Enriches lists by matching LVP sources

4. **New Architecture Modules** (2025 Refactoring)
   - `MetadataStore` - Preserves LVP metadata when reprocessing TXT files
   - `CacheManager` - SQLite-based caching (90% smaller than JSON)
   - `ProgressTracker` - Real-time progress tracking with ETA
   - `EmailProcessor` - Unified processing for all file types

5. **Smart Filter System** (NEW!)
   - `SmartFilterProcessor` (`smart_filter_processor_v2.py`) - Main processor
   - `ItalyHydraulicsFilter` (`smart_filters/italy_hydraulics_filter.py`) - Industry-specific filter
   - Config-driven scoring system with multilingual support
   - Lead qualification: email quality + company relevance + geography + engagement

6. **Web Server** (`web_server.py`)
   - HTTP server with REST API
   - Serves HTML interface from `web/` directory
   - Background processing with subprocess calls
   - API endpoints for lists, metadata, reports, smart filters
   - WebSocket support for real-time updates

7. **Frontend Architecture** (Modern Web UI)
   - **Component-based**: 50+ reusable JavaScript components in `web/assets/js/components/`
   - **State Management**: Centralized state with `utils/state.js`
   - **Routing**: Client-side routing with `utils/router.js`
   - **Styling**: Tailwind CSS + daisyUI with custom theme (dark/light modes)
   - **Real-time**: WebSocket integration for live updates (`services/websocket.js`)
   - **Performance**: Virtual scrolling for large datasets (22K+ blocklist items)
   - **ML Features**: Client-side analytics dashboard with 10+ ML components

### Data Flow

#### Unified Processing (Recommended)
```
Input (input/*.txt, input/*.lvp)
    ↓
EmailChecker.check_all_incremental()
    ↓
Process TXT files → Process LVP files (with metadata)
    ↓
Cross-type deduplication (exclude_duplicates=True)
    ↓
Blocklist checking (blocked_emails.txt, blocked_domains.txt)
    ↓
Output (output/*_clean_*.txt, *_metadata_*.csv/json, *_blocked_*.txt)
    ↓
[Optional] Smart Filter → Priority-based segmentation
    ↓
[Optional] HTML Report
```

#### Smart Filter Data Flow (NEW)
```
Clean List (output/*_clean_*.txt)
    ↓
Load with metadata (if available from LVP/metadata.db)
    ↓
SmartFilterProcessor
    ↓
Score each email:
  - Email Quality (10%): corporate domain, structure
  - Company Relevance (45%): industry keywords, negative filters
  - Geographic Priority (30%): target country/region
  - Engagement (15%): email source (product/service/contact)
    ↓
Segment by priority thresholds:
  - HIGH: score >= 100
  - MEDIUM: score >= 50
  - LOW: score >= 10
  - EXCLUDED: score < 10
    ↓
Output segmented files (TXT/CSV/JSON) + Exclusion Report
```

### File Structure

```
email_checker/
├── input/                          # Email lists to process (*.txt, *.lvp)
├── blocklists/                     # Blocklists for filtering
│   ├── blocked_emails.txt          # Individual blocked emails (22K+)
│   └── blocked_domains.txt         # Blocked domains (700+)
├── output/                         # Processing results
│   ├── *_clean_*.txt               # Valid, non-blocked emails
│   ├── *_metadata_*.csv/json       # Full metadata from LVP files
│   ├── *_blocked_*.txt             # Blocked emails/domains
│   ├── *_invalid_*.txt             # Invalid email formats
│   ├── *_HIGH_PRIORITY_*.txt       # Smart filter results (score >= 100)
│   ├── *_MEDIUM_PRIORITY_*.txt     # Smart filter results (50-99)
│   ├── *_LOW_PRIORITY_*.txt        # Smart filter results (10-49)
│   ├── *_EXCLUDED_*.txt            # Smart filter excluded (< 10)
│   ├── *_EXCLUSION_REPORT_*.csv    # Exclusion reasons
│   └── *_report_*.html             # Visual reports
├── smart_filters/                  # Smart filter configs and filters
│   ├── configs/                    # JSON configs for each filter
│   └── *_filter.py                 # Filter implementations
├── .cache/                         # Processing cache (SQLite/JSON)
├── metadata.db                     # SQLite metadata database (174MB+)
├── lists_config.json               # List metadata and processing status
├── web/                            # Modern web interface
│   ├── index.html                  # Dashboard (main page)
│   ├── lists.html                  # Lists manager
│   ├── smart-filter.html           # Smart filter studio
│   ├── blocklist.html              # Blocklist manager
│   ├── processing-queue.html       # Processing queue
│   ├── analytics.html              # Analytics & reports
│   ├── ml-analytics.html           # ML-powered analytics
│   ├── archive.html                # Archive & cloud storage
│   ├── settings.html               # Settings page
│   └── assets/
│       ├── css/
│       │   ├── custom.css          # Custom styles
│       │   └── output.css          # Compiled Tailwind CSS
│       └── js/
│           ├── main.js             # Application entry point
│           ├── components/         # 50+ reusable components
│           ├── services/           # API and WebSocket services
│           └── utils/              # State, routing, theme management
└── package.json                    # Node.js dependencies and npm scripts
```

### Frontend Pages Overview

The web interface consists of 9 distinct pages:

1. **Dashboard** (`index.html`) - KPI metrics, activity feed, system status
2. **Lists Manager** (`lists.html`) - Email list management with virtual scrolling
3. **Smart Filter Studio** (`smart-filter.html`) - Visual filter builder with scoring preview
4. **Blocklist Manager** (`blocklist.html`) - Manage 22K+ blocked emails/domains
5. **Processing Queue** (`processing-queue.html`) - Real-time processing monitor
6. **Analytics** (`analytics.html`) - Statistical analysis and reports
7. **ML Analytics** (`ml-analytics.html`) - Machine learning insights
8. **Archive** (`archive.html`) - Cloud storage integration
9. **Settings** (`settings.html`) - Application configuration
```

## Key Development Patterns

### Email Normalization & Validation

**Normalization** (applied before validation):
- Removes '//' prefix: `//user@domain.com` → `user@domain.com`
- Removes '20' prefix: `20user@domain.com` → `user@domain.com`
- Strips invalid start characters (`.`, `-`, `+`, `_`)
- Removes trailing dots from local part

See [email_checker.py:195-259](email_checker.py#L195-L259)

**Validation** filters out:
- MD5 hashes (32 hex chars)
- SHA1 hashes (40 hex chars)
- UUIDs (8-4-4-4-12 format)
- Technical monitoring domains (sentry, bugsnag, etc.)
- Excessive length (>64 chars for local part)

See [email_checker.py:123-190](email_checker.py#L123-L190)

### Duplicate Detection

1. **Between Lists**: `--exclude-duplicates` flag makes each list exclude emails from previous lists
2. **Prefix '20' Duplicates**: Removes `20user@domain.com` if `user@domain.com` exists
3. **Internal Duplicates**: Safety net deduplication in both architectures (FIXED Oct 2025)
   - LVP source files may contain duplicate records
   - Dictionary-based deduplication preserves first occurrence with metadata
   - See [email_checker.py:1116-1133](email_checker.py#L1116-L1133) and [email_processor.py:237-252](email_processor.py#L237-L252)

### Incremental Processing

Uses MD5 file hashing to detect changes:
1. Loads cache from `.cache/processed_files.json` or SQLite cache
2. Compares current file hash with cached hash
3. Only processes new or modified files
4. Loads previous results from cache for unchanged files

See [email_checker.py:784-842](email_checker.py#L784-L842)

### List Configuration

Lists tracked in `lists_config.json` with auto-detected metadata:
- `filename`, `display_name`, `file_type` (txt/lvp)
- `country` - auto-detected from filename patterns
- `category` - business type (Automotive, Agriculture, etc.)
- `priority` - processing order
- `processed` - boolean flag for incremental updates
- `date_added` - timestamp

Auto-detection patterns in [email_checker.py:606-695](email_checker.py#L606-L695)

### Smart Filter Scoring System (NEW!)

**Scoring Components:**
```python
overall_score = (
    email_quality * 0.10 +
    company_relevance * 0.45 +
    geographic_priority * 0.30 +
    engagement * 0.15
) * bonuses

# Bonuses (multiplicative)
- OEM manufacturer: ×1.3
- Target geography: ×2.0 (high) / ×1.2 (medium) / ×1.0 (low)
- Domain match: ×1.5
```

**Priority Thresholds:**
- HIGH: score >= 100
- MEDIUM: score >= 50
- LOW: score >= 10
- EXCLUDED: score < 10

See [SMART_FILTER_GUIDE.md](SMART_FILTER_GUIDE.md) for full documentation.

### Frontend Development Patterns

#### Component Architecture
All components follow a consistent pattern:

```javascript
// Component in web/assets/js/components/example.js
class ExampleComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.state = {};
    }

    async init() {
        await this.loadData();
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `...`;
    }

    attachEventListeners() {
        // Event delegation for dynamic content
    }
}
```

**Key Components:**
- `dashboard.js` - Main dashboard with KPIs and charts
- `lists-manager.js` - Email list management with virtual table
- `smart-filter.js` - Visual filter builder
- `blocklist-manager.js` - Manages 22K+ blocklist with virtual scrolling
- `virtual-table.js` - High-performance table for large datasets
- `toast.js` - Notification system
- `modal.js` - Modal dialog system

#### State Management Pattern

Global state managed by `utils/state.js`:

```javascript
// Subscribe to state changes
store.subscribe('lists', (lists) => {
    console.log('Lists updated:', lists);
    updateUI(lists);
});

// Update state
store.setState({ lists: newLists });

// Get state
const currentLists = store.getState('lists');
```

#### WebSocket Integration

Real-time updates via `services/websocket.js`:

```javascript
// Subscribe to events
ws.on('task.progress', (data) => {
    progressTracker.update(data.id, data.processed, data.total);
});

ws.on('task.completed', (data) => {
    toast.success(`Task ${data.name} completed!`);
    store.setState({ taskCompleted: data });
});
```

**Event Types:**
- `task.started` - Task begins
- `task.progress` - Progress update
- `task.completed` - Task finished
- `notification` - General notifications
- `system.status` - System health updates

#### Virtual Scrolling Pattern

For large datasets (22K+ items), use `virtual-table.js`:

```javascript
const virtualTable = new VirtualTable({
    container: '#table-container',
    data: largeDataset,           // 22K+ items
    rowHeight: 40,                 // Fixed row height
    visibleRows: 20,               // Visible at once
    columns: [                     // Column definitions
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status' }
    ]
});

virtualTable.init();
```

**Performance:**
- Only renders visible rows (20-30 DOM elements)
- Smooth scrolling for 22K+ items
- ~16ms render time (60fps)
- Memory: ~5MB for 22K items

#### Build System

**Development:**
```bash
# Watch Tailwind CSS changes
npm run css:watch

# Watch for JavaScript changes (if using webpack)
npm run dev
```

**Production:**
```bash
# Build optimized CSS
npm run css:build

# Build and start server
npm run start
```

**Tailwind Configuration:**
- Custom color palette (dark blue + dark red)
- daisyUI components with custom themes
- Dark/light mode support via `data-theme` attribute
- See [tailwind.config.js](tailwind.config.js) for full config

#### Theme Switching

Managed by `utils/theme.js`:

```javascript
// Switch theme
themeManager.setTheme('dark');  // or 'light'

// Get current theme
const currentTheme = themeManager.getTheme();

// Theme persisted to localStorage automatically
```

## Frontend Development Commands

### Setup
```bash
# Install Node.js dependencies
npm install

# First time build
npm run css:build
```

### Development Workflow
```bash
# Watch CSS changes (run in terminal 1)
npm run css:watch

# Start Python backend (run in terminal 2)
python3 web_server.py

# Open browser to http://localhost:8080
```

### Testing
```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e:open
```

### Performance Analysis
```bash
# Build production assets
npm run build

# Run Lighthouse audit
npm run lighthouse

# Or combined
npm run performance
```

## Web API Endpoints

### Core Processing
```
GET  /api/lists                    # Get all lists with metadata
GET  /api/status                   # Processing status
GET  /api/reports                  # Available HTML reports
POST /api/process                  # Run full processing
POST /api/process_one              # Process single list
POST /api/reset_processing         # Reset processed flags
POST /api/lists/bulk-update        # Bulk update list metadata (NEW!)
```

### Metadata
```
GET  /api/metadata                 # Metadata database stats
GET  /api/email-metadata/:email    # Metadata for specific email
GET  /api/lvp-sources              # Available LVP files
GET  /api/metadata-search?q=...    # Search metadata
POST /api/import-lvp               # Import LVP file to database
POST /api/enrich-list              # Enrich list with metadata
```

### Smart Filter (NEW!)
```
GET  /api/smart-filter/available           # List available filters
GET  /api/smart-filter/config?name=...     # Get filter config
POST /api/smart-filter/process             # Process single file
POST /api/smart-filter/process-batch       # Batch process files
```

## Important Implementation Notes

### Performance
- Blocklists loaded once into memory as sets (O(1) lookup)
- Typical speed: 5,000-10,000 emails/sec
- Memory usage: ~50MB for blocklists + cache
- SQLite cache: 90% smaller than JSON, 10x faster lookups
- Smart filter: ~1-3 seconds per 1000 emails

### XML Parsing (LVP Files)
LVP files may contain invalid XML characters. `LVPParser` includes sanitization:
- Removes control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)
- Handles multiple namespace variations
- Falls back to alternative element paths

### Output Formats
1. **TXT**: One email per line (backward compatible)
2. **CSV**: All metadata fields in columns
3. **JSON**: Full structured metadata with nested objects
4. **HTML**: Visual reports with charts (Google Charts CDN)

### Security Notes (Web Server)
- Command whitelist validation (`ALLOWED_COMMANDS`)
- Filename validation (no path traversal, length limits, extension checks)
- Uses `shlex.quote()` for safe shell escaping
- See [web_server.py:40-91](web_server.py#L40-L91) for validation functions

## Common Workflows

### Quick Start - Mixed File Processing

```bash
# 1. Place files (TXT and/or LVP) in input/ directory
# 2. Run unified processing
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html
# 3. Apply smart filter to clean results (optional)
python3 email_checker.py smart-filter-batch --pattern "output/*_clean_*.txt"
# 4. Check results in output/ directory
```

**Why use check-all-incremental:**
- ✅ Processes both TXT and LVP in one run
- ✅ Cross-type deduplication
- ✅ Single unified HTML report
- ✅ Cache-aware
- ✅ Metadata preserved

### Using Web Interface

```bash
# 1. Start server
python3 web_server.py
# Server auto-finds free port (8080-8180) and displays URL

# 2. Open browser to displayed URL
# 3. View/edit list metadata (TXT and LVP files)
# 4. Click "Process" to run checks (auto-detects file type)
# 5. Apply smart filters in dedicated section
# 6. Download results directly
```

### Smart Filter Workflow

```bash
# 1. Basic processing to get clean lists
python3 email_checker.py check input/italy_contacts.txt

# 2. Apply smart filter for industry-specific scoring
python3 email_checker.py smart-filter output/italy_contacts_clean_20251010.txt

# 3. Get top priority contacts
cat output/Italy_Hydraulics_*_HIGH_PRIORITY_*.txt > top_leads.txt

# 4. Or batch process all clean files
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"
```

### Creating Custom Smart Filter

1. **Create config** in `smart_filters/configs/your_filter_config.json`:
```json
{
  "filter_name": "Your Filter Name",
  "target_country": "US",
  "target_industry": "your_industry",
  "languages": ["en"],
  "industry_keywords": {
    "category_name": {
      "primary": ["keyword1", "keyword2"],
      "secondary": ["keyword3"]
    }
  },
  "scoring": {
    "weights": {
      "email_quality": 0.10,
      "company_relevance": 0.45,
      "geographic_priority": 0.30,
      "engagement": 0.15
    },
    "thresholds": {
      "high_priority": 100,
      "medium_priority": 50,
      "low_priority": 10
    }
  }
}
```

2. **Register filter** in `smart_filters/__init__.py`:
```python
AVAILABLE_FILTERS = [
    "italy_hydraulics",
    "your_filter_name"
]
```

3. **Use filter**:
```bash
python3 smart_filter.py output/list_clean.txt --config your_filter_name
```

## Claude Code Skills

This project includes 5 specialized Claude Code Skills for web interface development using a **hybrid architecture** (Orchestrator → Task Agents → Skills). Skills provide domain expertise that Task Agents load and use to complete specific tasks.

**Architecture Overview:**
- **Orchestrator (Opus)**: High-level project management, phase planning, task delegation, result validation
- **Task Agents (Sonnet)**: Load Skills, execute specific technical tasks, generate code/configs
- **Skills**: Domain expertise knowledge bases (Webpack, daisyUI, API integration, testing, performance)

### Available Skills

**Location:** `.claude/` directory

| Skill | Description | When to Use | Phases |
|-------|-------------|-------------|--------|
| [frontend-build-specialist](.claude/frontend-build-specialist/) | Webpack 5, Tailwind CLI, PostCSS, npm scripts expertise | Build system setup, migrating from CDN, optimizing bundles, debugging build issues | 1.1 |
| [daisyui-component-expert](.claude/daisyui-component-expert/) | daisyUI components, responsive design, themes, accessibility | Building UI components, converting HTML to daisyUI, implementing responsive layouts, customizing themes | 1.2-1.4, 2.2-2.4 |
| [api-integration-specialist](.claude/api-integration-specialist/) | REST API, WebSocket, state management, error handling | Integrating backend APIs, implementing real-time updates, building robust error handling | 2.1, 3-7 |
| [testing-infrastructure-builder](.claude/testing-infrastructure-builder/) | Jest unit tests, Cypress E2E, test fixtures, mocking | Setting up testing infrastructure, adding test coverage, debugging flaky tests | 8 |
| [performance-optimizer](.claude/performance-optimizer/) | Bundle optimization, virtual scrolling, lazy loading, Lighthouse | Optimizing slow pages, reducing bundle sizes, implementing virtual scrolling for large lists (22K+ items) | 8 |

### Skill Architecture

**Hybrid Pattern:**
```
Orchestrator (Claude Code)
    ↓ Delegates task
Task Agent (Sonnet)
    ↓ Loads skill
Skill (Expertise + Templates)
    ↓ Executes with domain knowledge
Result → Orchestrator
```

**Key Benefits:**
- **Separated Concerns**: Orchestrator manages phases, Skills provide expertise, Task Agents execute
- **Clean Context**: Skills load in Task Agents (not in Orchestrator), preventing context overflow
- **Reusable Patterns**: Skills contain references, templates, and best practices
- **Parallel Execution**: Multiple Task Agents can work simultaneously with different Skills

### Skill Structure

Each skill contains:

**SKILL.md** (~2,500-3,900 words):
- Core competencies and when to invoke
- Comprehensive guides for the domain area
- Integration notes specific to Email Checker project

**references/** (4-6 markdown files):
- Detailed patterns, examples, and best practices
- Configuration guides and troubleshooting
- Project-specific integration patterns

**assets/** (3-5 template files):
- Production-ready configuration templates
- Code examples and boilerplates
- Copy-paste starting points for development

### Usage Example

**Scenario:** Set up frontend build system (Phase 1.1)

**Orchestrator delegates to Task Agent:**
```python
# Orchestrator (you) creates task
Task(
    subagent_type="general-purpose",
    model="sonnet",
    prompt="""
    Load the frontend-build-specialist skill.

    Task: Set up webpack + Tailwind CLI build pipeline.

    Requirements:
    - Webpack 5 for JS bundling
    - Tailwind CSS CLI (not CDN)
    - npm scripts for dev/prod workflows
    - Production optimization

    Use templates from skill's assets/ directory.
    Adapt for Email Checker project structure.
    """
)
```

**Task Agent (internal process):**
1. Invokes `Skill("frontend-build-specialist")`
2. Loads SKILL.md (Webpack, Tailwind, PostCSS expertise)
3. References `webpack-vanilla-config.md` for patterns
4. Adapts `webpack.config.template.js` from assets
5. Creates production-ready configurations
6. Returns results to Orchestrator

**Result:**
- Orchestrator receives complete build setup
- Configurations follow best practices from skill
- Context stays manageable (skill loaded in agent)

### When to Invoke Skills

**Frontend Build (Phase 1.1):**
```
Use frontend-build-specialist when:
- Setting up webpack configuration
- Migrating from CDN to Tailwind CLI
- Configuring npm scripts
- Debugging build issues
- Optimizing production builds
```

**UI Components (Phases 1.2-1.4, 2.2-2.4):**
```
Use daisyui-component-expert when:
- Converting HTML to daisyUI components
- Building responsive tables, forms, modals
- Implementing theme switching
- Ensuring accessibility (ARIA, keyboard nav)
- Creating Email Checker-specific UI patterns
```

**API Integration (Phases 2.1, 3-7):**
```
Use api-integration-specialist when:
- Integrating /api/* endpoints
- Implementing WebSocket for real-time updates
- Building error handling with retry logic
- Managing application state
- Optimizing request patterns
```

**Testing (Phase 8):**
```
Use testing-infrastructure-builder when:
- Setting up Jest + Cypress
- Writing unit tests with mocking
- Creating E2E test suites
- Generating test fixtures
- Achieving coverage targets (80%+)
```

**Performance (Phase 8):**
```
Use performance-optimizer when:
- Implementing virtual scrolling (critical for 22K blocklist)
- Reducing bundle sizes (<200KB target)
- Optimizing Lighthouse scores (>90 target)
- Debugging performance bottlenecks
- Implementing lazy loading patterns
```

### Skill Statistics

| Metric | Count |
|--------|-------|
| Total Skills | 5 |
| Total Documentation | 4,426 lines |
| Reference Files | 29 files |
| Asset Templates | 25 files |
| Validation Status | ✅ All validated |

**Coverage:**
- Build systems and tooling
- UI components and styling
- API integration and state
- Testing infrastructure
- Performance optimization

### Validation

All skills validated with:
```bash
cd .claude
python skill-creator/scripts/quick_validate.py <skill-name>
```

**Validation checks:**
- YAML frontmatter (name, description)
- Directory structure correctness
- Required files present
- Naming conventions followed

## Dependencies & Environment

### Backend (Python)

**Python Version:** 3.6+

**Dependencies:** Standard library only - no external packages required for core functionality

**Optional:** For HTML reports generation
- Google Charts (loaded via CDN)

### Frontend (Node.js)

**Node.js Version:** 14.0.0+

**Core Dependencies (package.json):**
- `tailwindcss` - Utility-first CSS framework
- `daisyui` - Component library for Tailwind
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixing

**Development Dependencies:**
- `jest` - Unit testing framework
- `cypress` - E2E testing framework
- `eslint` - JavaScript linter
- `webpack` - Module bundler (optional)
- `lighthouse` - Performance auditing

**Installation:**
```bash
# Install all dependencies
npm install

# Or install specific packages
npm install tailwindcss daisyui --save-dev
```

**Browser Requirements:**
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Build Warnings

### CSS @property Warning (daisyUI v5 + Tailwind v4)

**Warning Message:**
```
Found 1 warning while optimizing generated CSS:
│ @property --radialprogress {
┆  Unknown at rule: @property
```

**What is it:**
- daisyUI v5.4.2 uses CSS `@property` for radial-progress component
- Technical limitation: `@property` is placed inside `@layer base {}` which violates CSS spec
- Lightning CSS (Tailwind v4 engine) correctly reports this as invalid

**Impact:**
- ❌ **NOT CRITICAL** - This is a cosmetic warning only
- ✅ CSS builds successfully and works correctly
- ✅ Tailwind v4.1 automatically detects @property support and provides fallbacks
- ✅ All components (shadows, transforms, gradients, radial-progress) work correctly

**Browser Support:**
- Chrome 85+ (2020) ✅
- Edge 85+ (2020) ✅
- Safari 16.4+ (2023) ✅
- Firefox 105+ (2022) ✅

**Status:**
- **Known Issue:** [GitHub saadeghi/daisyui#3882](https://github.com/saadeghi/daisyui/issues/3882) (Open since Oct 2024)
- **Action:** Safe to ignore - will be fixed in future daisyUI release when @property is moved to top level
- **Tailwind v4 + daisyUI v5 are fully compatible** - this is just a technical warning

**Commands:**
```bash
# Normal build (warning appears but CSS works)
npm run css:build

# Watch mode
npm run css:watch
```

## Recent Critical Fixes (October 2025)

### Internal Duplication Bug - RESOLVED ✅

**Issue:** LVP files contained internal duplicates where same email appeared multiple times (221 duplicates in 26,590 records).

**Fix Applied:**
- Dictionary-based deduplication in `save_results_with_metadata()` and `_process_lvp_file()`
- Preserves first occurrence with metadata
- Logs: `🧹 Удалено N внутренних дубликатов`

**Status:** Fully tested and verified ✅

## Development Best Practices

### Debugging Frontend Issues

**Browser DevTools Console:**
```javascript
// Global debug object available in browser console
debug.state()     // Check application state
debug.theme()     // Check current theme
debug.route()     // Check current route
debug.ws()        // Check WebSocket status
debug.store()     // Inspect full state tree
```

**Common Issues:**

1. **WebSocket Connection Failed**
   - Check backend is running: `python3 web_server.py`
   - Verify WebSocket URL in `web/assets/js/services/websocket.js`
   - Check browser console for connection errors

2. **Theme Not Persisting**
   - Verify localStorage is enabled in browser
   - Clear browser cache: `localStorage.clear()`
   - Check `utils/theme.js` for initialization errors

3. **Virtual Table Performance Issues**
   - Ensure fixed row heights in configuration
   - Check data array length (22K+ should work)
   - Monitor render times in Performance tab

4. **API Calls Failing**
   - Verify backend server is running
   - Check CORS headers from server
   - Inspect Network tab for failed requests
   - Verify API base URL in `services/api.js`

### Code Quality

**Linting:**
```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Code Coverage:**
```bash
# Generate coverage report
npm run test:coverage

# View in browser
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

**Performance Monitoring:**
- Use `performance-monitor.js` component for real-time metrics
- Monitor FPS, memory usage, DOM node count
- Check Lighthouse scores: Target >90 for all metrics

### Frontend Architecture Notes

**Component Lifecycle:**
1. Constructor - Initialize state
2. `init()` - Load data, render, attach events
3. `render()` - Update DOM
4. `destroy()` - Cleanup (if needed)

**Event Handling:**
- Use event delegation for dynamic content
- Prevent memory leaks by removing listeners in `destroy()`
- Use `once` option for one-time events

**State Updates:**
- Always use `store.setState()` for global state
- Subscribe to state changes with `store.subscribe()`
- Avoid direct state mutations

**API Error Handling:**
```javascript
try {
    const response = await api.get('/api/lists');
    // Handle success
} catch (error) {
    console.error('API Error:', error);
    toast.error(`Failed: ${error.message}`);
    // Handle error gracefully
}
```

## Documentation References

- [README.md](README.md) - General documentation (Russian)
- [SMART_FILTER_GUIDE.md](SMART_FILTER_GUIDE.md) - Smart filter detailed guide
- [REFACTORING.md](REFACTORING.md) - New architecture documentation
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Component and integration testing
- [PERFORMANCE_SUMMARY.md](PERFORMANCE_SUMMARY.md) - Performance analysis
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration to optimized architecture
- [WEB_INTERFACE.md](WEB_INTERFACE.md) - Web interface documentation
- [web/README.md](web/README.md) - Frontend development guide
