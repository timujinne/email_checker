# 🎯 Phase 3: Smart Filter Studio - Архитектурный План

**Created:** 25 October 2025
**Status:** Planning & Development
**Priority:** 🔴 HIGHEST

---

## 📐 Архитектура Smart Filter Studio

### Основные компоненты

```
SmartFilterStudio (main orchestrator)
│
├── FilterConfig (schema & validation)
│   ├── validateSchema()
│   ├── parseJSON()
│   └── generateDefaults()
│
├── VisualFilterBuilder (UI constructor)
│   ├── KeywordBuilder (industry keywords)
│   ├── GeographicSelector (target countries)
│   ├── ExclusionRulesBuilder (negative rules)
│   └── WeightSliders (scoring weights)
│
├── JSONEditor (code editor)
│   ├── Editor (textarea with syntax highlighting)
│   ├── Validator (real-time validation)
│   └── Formatter (pretty print)
│
├── FilterWizard (5-step workflow)
│   ├── Step 1: FileSelection
│   ├── Step 2: ConfigSelection
│   ├── Step 3: ParameterConfiguration
│   ├── Step 4: SamplePreview
│   └── Step 5: ResultsExport
│
├── TemplateLibrary (templates CRUD)
│   ├── LoadTemplates()
│   ├── SaveAsTemplate()
│   ├── EditTemplate()
│   └── DeleteTemplate()
│
├── FilterTester (playground)
│   ├── UploadSampleData()
│   ├── RunFilter()
│   └── ShowScoringBreakdown()
│
└── FilterScorer (real-time scoring)
    ├── calculateScore()
    ├── getBreakdown()
    └── handleWebSocketUpdates()
```

---

## 📄 Filter Config Schema

### Структура конфигурации фильтра

```javascript
{
  "metadata": {
    "id": "unique_id",
    "name": "Filter Name",
    "description": "What this filter does",
    "version": "1.0",
    "author": "user",
    "created": "2025-10-25T09:00:00Z",
    "updated": "2025-10-25T09:00:00Z"
  },

  "target": {
    "country": "Italy",
    "industry": "Hydraulics",
    "languages": ["en", "it"]
  },

  "scoring": {
    "weights": {
      "email_quality": 0.10,      // Domain quality, structure
      "company_relevance": 0.45,   // Industry keywords match
      "geographic_priority": 0.30, // Country relevance
      "engagement": 0.15           // Email type (service/contact/product)
    },
    "thresholds": {
      "high_priority": 100,   // score >= 100
      "medium_priority": 50,  // score >= 50
      "low_priority": 10      // score >= 10
    }
  },

  "company_keywords": {
    "primary_keywords": {
      "positive": [
        { "term": "hydraulic", "weight": 1.0 },
        { "term": "pump", "weight": 0.8 },
        { "term": "pressure", "weight": 0.7 }
      ],
      "negative": [
        { "term": "dropshipper", "weight": -0.5 },
        { "term": "reseller", "weight": -0.3 }
      ]
    },
    "secondary_keywords": {
      "positive": ["equipment", "systems"],
      "negative": ["marketplace", "auction"]
    }
  },

  "geographic_rules": {
    "target_regions": ["Italy", "Central Europe"],
    "exclude_regions": ["Asia", "Africa"],
    "multipliers": {
      "Italy": 2.0,
      "Germany": 1.5,
      "EU": 1.2,
      "Others": 0.5
    }
  },

  "email_quality": {
    "corporate_domains": true,        // Must be corporate domain
    "free_email_penalty": -0.5,
    "structure_quality": true,
    "suspicious_patterns": ["no-reply", "noreply", "donotreply"]
  },

  "domain_rules": {
    "oemEquipment": {
      "keywords": ["oem", "manufacturer", "factory"],
      "multiplier": 1.3
    }
  }
}
```

---

## 🎨 UI Components Breakdown

### 1. Filter Config Schema Validator
**File:** `web/assets/js/components/filter-config.js`
**Lines:** 300-400
**Exports:**
- `FilterConfig` class
- `validateSchema(config)` - validates structure
- `parseJSON(jsonString)` - parses with error handling
- `getDefaultConfig()` - returns template
- `mergeConfigs(base, override)` - merge configurations

### 2. Visual Filter Builder
**File:** `web/assets/js/components/visual-filter-builder.js`
**Lines:** 500-600
**Features:**
- Industry keywords builder (add/remove/weight)
- Geographic selector (checkboxes for countries)
- Exclusion rules builder (negative keywords)
- Weight sliders (drag to adjust scoring weights)
- Real-time JSON preview

### 3. JSON Editor
**File:** `web/assets/js/components/json-editor.js`
**Lines:** 400-500
**Features:**
- Textarea with monospace font
- Syntax highlighting (basic CSS)
- Live JSON validation
- Error indicators (red border on invalid)
- Format button (pretty print)
- Copy button

### 4. Filter Wizard
**File:** `web/assets/js/components/filter-wizard.js`
**Lines:** 600-700
**Steps:**
- Step 1: File selection (which email list to process)
- Step 2: Config selection (choose template or create new)
- Step 3: Parameters (customize scoring)
- Step 4: Sample preview (show scoring for sample data)
- Step 5: Results export (download filtered results)

### 5. Template Library
**File:** `web/assets/js/components/template-library.js`
**Lines:** 300-400
**Features:**
- Modal dialog with list of templates
- Load button for each template
- Save as button (from current filter)
- Edit button (modify existing)
- Delete button (with confirmation)
- localStorage persistence

### 6. Filter Tester (Playground)
**File:** `web/assets/js/components/filter-tester.js`
**Lines:** 400-500
**Features:**
- Upload sample CSV/TXT file
- Run filter on sample data
- Show top 10 results by score
- Display scoring breakdown for each email
- Export sample results

### 7. Filter Scorer
**File:** `web/assets/js/components/filter-scorer.js`
**Lines:** 300-400
**Features:**
- `calculateScore(email, config)` - compute score
- `getScoreBreakdown(email, config)` - detailed breakdown
- `scoreEmails(emails, config)` - batch scoring
- Theme-aware colors for visualization

---

## 📊 Page Structure (smart-filter.html)

```html
<div class="smart-filter-container">
  <!-- Header -->
  <div class="page-header">
    <h1>🎯 Smart Filter Studio</h1>
    <p>Create and test email filters with visual configuration</p>
  </div>

  <!-- Tab Navigation -->
  <div class="filter-tabs">
    <button class="tab-button active" data-tab="visual">🎨 Visual Builder</button>
    <button class="tab-button" data-tab="json">{ } JSON Editor</button>
    <button class="tab-button" data-tab="wizard">📋 Wizard</button>
    <button class="tab-button" data-tab="templates">📚 Templates</button>
    <button class="tab-button" data-tab="tester">🧪 Test & Preview</button>
  </div>

  <!-- Tab 1: Visual Builder -->
  <div class="tab-content active" id="tab-visual">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Builder Controls -->
      <div id="visual-builder-container"></div>

      <!-- Right: JSON Preview -->
      <div id="json-preview-container"></div>
    </div>
  </div>

  <!-- Tab 2: JSON Editor -->
  <div class="tab-content" id="tab-json">
    <div id="json-editor-container"></div>
  </div>

  <!-- Tab 3: Wizard -->
  <div class="tab-content" id="tab-wizard">
    <div id="wizard-container"></div>
  </div>

  <!-- Tab 4: Templates -->
  <div class="tab-content" id="tab-templates">
    <div id="templates-container"></div>
  </div>

  <!-- Tab 5: Tester -->
  <div class="tab-content" id="tab-tester">
    <div id="tester-container"></div>
  </div>

  <!-- Action Buttons -->
  <div class="action-buttons">
    <button id="save-filter-btn" class="btn btn-primary">💾 Save Filter</button>
    <button id="apply-filter-btn" class="btn btn-success">▶️ Apply to Lists</button>
    <button id="reset-btn" class="btn btn-secondary">🔄 Reset</button>
  </div>
</div>
```

---

## 🔄 Data Flow

### Visual Builder → JSON
```
User edits visual elements
  ↓
onChange handlers trigger
  ↓
Configuration object updated in state
  ↓
JSON preview re-renders in real-time
  ↓
Validation runs (shows errors if invalid)
```

### JSON Editor → Visual Builder
```
User pastes/edits JSON
  ↓
Live validation
  ↓
If valid: parse and update state
  ↓
Visual builder re-renders
  ↓
If invalid: show error, prevent update
```

### Wizard Flow
```
Step 1: Select file
  ↓
Step 2: Choose/create config
  ↓
Step 3: Customize parameters
  ↓
Step 4: Preview scoring on sample
  ↓
Step 5: Export results
```

### Testing Flow
```
Upload sample data
  ↓
Run filter with current config
  ↓
Calculate scores for all emails (debounced)
  ↓
Display results sorted by score
  ↓
Click email to see scoring breakdown
```

---

## 🎯 Key Features & Implementation Details

### 1. Real-time JSON Validation
```javascript
// Type checking
- Is valid JSON? ✓
- Has required fields? ✓
- Types correct? ✓
- Values in valid ranges? ✓

// Show visual feedback
- Green border: valid
- Red border + error message: invalid
- Yellow border + warning: incomplete
```

### 2. Visual Filter Builder
```
Industry Keywords Section:
├── Primary Keywords
│   ├── Positive keywords (add/remove buttons)
│   │   └── Weight slider for each keyword
│   └── Negative keywords (add/remove buttons)
│
├── Geographic Selection
│   ├── Checkboxes for each country
│   ├── Multiplier slider for each
│   └── Geographic bonus visualization
│
└── Exclusion Rules
    ├── Suspicious patterns input
    ├── Domain blocklist editor
    └── Brand protection keywords
```

### 3. Scoring Preview
```
Email: john@hydraulics.it

Score Breakdown:
├── Email Quality: 8/10 (0.8 points)
│   ├── Corporate domain: ✓ +1.0
│   ├── Suspicious patterns: ✓ -0.2
│   └── Valid structure: ✓ +0.0
│
├── Company Relevance: 45/100 (20.25 points)
│   ├── "hydraulic" keyword: ✓ +1.0
│   ├── "pump" keyword: ✓ +0.8
│   └── "pressure" keyword: ✓ +0.7
│
├── Geographic Priority: 30/100 (9.0 points)
│   ├── Target country (Italy): ✓ ×2.0
│   └── EU match: ✓ ×1.2
│
└── Engagement: 15/100 (2.25 points)
    └── Contact type email: ✓ +0.15

TOTAL SCORE: 32.30 → PRIORITY: MEDIUM ⚠️
```

### 4. Debounced Real-time Scoring
```javascript
// When config changes:
- Debounce for 500ms
- If sample data loaded, run scoring
- Update preview results
- Show loading spinner during calculation
- Animate score changes
```

### 5. Template System
```javascript
// Built-in templates:
- italy_hydraulics (predefined)
- germany_manufacturing
- ...add more

// User templates:
- Saved in localStorage
- Can be exported/imported as JSON
- Version control (save previous versions)
```

---

## 🔗 Integration Points

### With Existing Components
1. **ApiService** - POST /api/smart-filter/test for backend scoring
2. **WebSocketService** - Listen for real-time scoring updates
3. **ModalService** - Confirmations, templates picker
4. **ToastService** - Success/error notifications
5. **StateManager** - Global filter state persistence

### With Backend (Phase 3 requirement)
- `POST /api/smart-filter/create` - Save new filter
- `PUT /api/smart-filter/:id` - Update filter
- `POST /api/smart-filter/:id/test` - Test with backend scoring
- `GET /api/smart-filter/templates` - Get available templates

---

## ⚡ Performance Considerations

### 1. Debouncing
```javascript
// Real-time scoring debounce: 500ms
// Visual builder onChange debounce: 300ms
// JSON editor onChange debounce: 200ms
```

### 2. Sample Data Handling
```javascript
// Max 1000 emails for preview
// If file larger: take first 1000
// Processing in chunks (100 at a time)
// Show progress bar
```

### 3. Scoring Optimization
```javascript
// Cache compiled regex patterns
// Pre-compile keyword trees
// Batch operations instead of loops
// Lazy load sample data
```

---

## 📝 Implementation Order

1. ✅ **Weeks 1-2:** Filter Config Schema + Validator
2. ✅ **Weeks 2-3:** Visual Filter Builder UI
3. ✅ **Weeks 3-4:** JSON Editor
4. ✅ **Weeks 4-5:** Filter Wizard (5 steps)
5. ✅ **Weeks 5-6:** Template Library + Filter Tester

---

## 🚨 Known Challenges

### Challenge 1: Real-time Preview Performance
**Problem:** Scoring 1000 emails on every config change could be slow
**Solution:** Debounce (500ms) + show progress + cache results

### Challenge 2: Visual Builder Complexity
**Problem:** Many input fields, difficult UI to design
**Solution:** Tabs/sections to organize, collapsible panels

### Challenge 3: JSON Validation UX
**Problem:** JSON errors are confusing for users
**Solution:** Show specific error location + suggestion

### Challenge 4: Synchronization
**Problem:** Visual builder and JSON editor must stay in sync
**Solution:** Single source of truth (state) + watchers on both sides

### Challenge 5: Sample Data Sync
**Problem:** Sample data may be outdated
**Solution:** Auto-fetch from last processed clean lists

---

## ✅ Success Criteria for Phase 3

1. ✅ Visual filter builder fully functional
2. ✅ JSON editor with validation
3. ✅ 5-step wizard complete
4. ✅ Template system working
5. ✅ Real-time scoring preview
6. ✅ Testing playground functional
7. ✅ No console errors
8. ✅ Performance < 1 second for all operations
9. ✅ WebSocket integration for real-time updates
10. ✅ localStorage persistence working

---

**Next Steps:**
1. Start with filter-config.js (schema + validation)
2. Create smart-filter.html structure
3. Build visual-filter-builder.js
4. Implement json-editor.js
5. Create filter-wizard.js
6. Add template-library.js
7. Finish with filter-tester.js
8. Test everything end-to-end
