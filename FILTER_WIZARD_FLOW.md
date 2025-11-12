# Filter Wizard - Data Flow Diagram

## Complete Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FilterWizard Component                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Step 1: Select List                           │
│                                                                   │
│  User opens wizard                                                │
│         │                                                         │
│         ▼                                                         │
│  constructor() → init() → loadLists()                            │
│                              │                                    │
│                              ▼                                    │
│                   Check cache.lists?                              │
│                    │              │                               │
│                 YES│              │NO                             │
│                    │              │                               │
│         Use cached │              │ API Call                      │
│             lists  │              ▼                               │
│                    │   api.get('/api/lists')                     │
│                    │              │                               │
│                    │              ▼                               │
│                    │   Response: {lists: [...]}                  │
│                    │              │                               │
│                    └──────┬───────┘                               │
│                           ▼                                       │
│                  Filter clean lists                               │
│           (*_clean_*.txt, exclude *_metadata_*)                  │
│                           │                                       │
│                           ▼                                       │
│                   Render list options                             │
│                   (display_name, country,                         │
│                    category, total_emails)                        │
│                           │                                       │
│                           ▼                                       │
│                  User selects list                                │
│                  onListSelect(filename)                           │
│                           │                                       │
│                           ▼                                       │
│              state.selectedList = list object                     │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Step 2: Choose Config                            │
│                                                                   │
│  User selects template (italy_hydraulics, generic, custom)       │
│         │                                                         │
│         ▼                                                         │
│  config = FilterConfig.getDefaultConfig(template)                │
│         │                                                         │
│         ▼                                                         │
│  state.selectedConfig = template                                 │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Step 3: Customize Parameters                     │
│                                                                   │
│  User adjusts:                                                    │
│   • Target country/industry                                       │
│   • Scoring weights (4 sliders)                                  │
│   • Priority thresholds (3 inputs)                               │
│                                                                   │
│  On change: updateWeight(name, value)                            │
│            updateConfig(path, value)                             │
│         │                                                         │
│         ▼                                                         │
│  Real-time config updates                                         │
│         │                                                         │
│         ▼                                                         │
│  checkWeightTotal()                                              │
│   (validates weights sum to 100%)                                │
│         │                                                         │
│         ▼                                                         │
│  User clicks "Next" → nextStep()                                 │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
                        if (currentStep === 3)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Step 4: Preview Results                          │
│                                                                   │
│  generatePreview() triggered automatically                        │
│         │                                                         │
│         ▼                                                         │
│  Check cache: previewData.has(cacheKey)?                         │
│         │              │                                          │
│      YES│              │NO                                        │
│         │              │                                          │
│  Return │              ▼                                          │
│  cached │   Build file path:                                     │
│  results│   "output/{selectedList.filename}"                     │
│         │              │                                          │
│         │              ▼                                          │
│         │   API Call:                                            │
│         │   api.get('/api/file-preview?path=...&lines=50')      │
│         │              │                                          │
│         │              ▼                                          │
│         │   Response: {content: "email1\nemail2\n..."}          │
│         │              │                                          │
│         │              ▼                                          │
│         │   Parse emails from content:                           │
│         │   lines.split('\n').map(line => {                     │
│         │     email: parts[0],                                   │
│         │     domain: email.split('@')[1],                       │
│         │     company: parts[1] || '',                           │
│         │     country: selectedList.country                      │
│         │   })                                                   │
│         │              │                                          │
│         │              ▼                                          │
│         │   Initialize FilterScorer:                             │
│         │   scorer = new FilterScorer(config)                    │
│         │              │                                          │
│         │              ▼                                          │
│         │   Score each email:                                    │
│         │   emails.map(email => {                                │
│         │     result = scorer.calculateScore(email)              │
│         │     return {                                           │
│         │       ...email,                                        │
│         │       score: result.score,                             │
│         │       priority: result.priority,                       │
│         │       breakdown: result.breakdown                      │
│         │     }                                                  │
│         │   })                                                   │
│         │              │                                          │
│         │              ▼                                          │
│         │   Cache results:                                       │
│         │   previewData.set(cacheKey, scoredResults)            │
│         │              │                                          │
│         └──────────────┘                                          │
│                        │                                          │
│                        ▼                                          │
│              state.previewResults = results                       │
│                        │                                          │
│                        ▼                                          │
│              Calculate statistics:                                │
│               • HIGH priority count                               │
│               • MEDIUM priority count                             │
│               • LOW priority count                                │
│               • EXCLUDED count                                    │
│                        │                                          │
│                        ▼                                          │
│              Render preview UI:                                   │
│               • Show first 10 emails                              │
│               • Color-coded by priority                           │
│               • Statistics grid                                   │
│               • "Regenerate Preview" button                       │
│                        │                                          │
│                        ▼                                          │
│              User reviews preview                                 │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Step 5: Export & Apply                           │
│                                                                   │
│  User selects export option:                                      │
│   • Apply Now                                                     │
│   • Save as Template                                              │
│   • Download JSON                                                 │
│         │                                                         │
│         ▼                                                         │
│  User clicks "Finish" → finish()                                 │
│         │                                                         │
│         ▼                                                         │
│  onComplete callback:                                             │
│    {                                                              │
│      config: this.config,                                         │
│      exportType: exportType,                                      │
│      selectedList: selectedList.filename                          │
│    }                                                              │
│         │                                                         │
│         ▼                                                         │
│  Parent component handles:                                        │
│   • Apply filter to list                                          │
│   • Save config to file                                           │
│   • Download JSON                                                 │
│         │                                                         │
│         ▼                                                         │
│  Toast notification: "Filter wizard completed!"                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## FilterScorer Integration Detail

```
┌─────────────────────────────────────────────────────────────────┐
│                    FilterScorer.calculateScore()                  │
│                                                                   │
│  Input: {                                                         │
│    email: "info@hydraulics.it",                                  │
│    domain: "hydraulics.it",                                      │
│    company: "Hydraulics Corp",                                   │
│    country: "Italy"                                              │
│  }                                                                │
│         │                                                         │
│         ▼                                                         │
│  1. scoreEmailQuality(email)                                     │
│      • Check corporate vs free domain                            │
│      • Validate email structure                                  │
│      • Detect suspicious patterns                                │
│      → Score: 0-10                                               │
│         │                                                         │
│         ▼                                                         │
│  2. scoreCompanyRelevance(email)                                 │
│      • Match primary keywords (positive/negative)                │
│      • Match secondary keywords                                  │
│      • Apply keyword weights                                     │
│      → Score: 0-100                                              │
│         │                                                         │
│         ▼                                                         │
│  3. scoreGeographicPriority(email)                               │
│      • Check target country match                                │
│      • Check target regions                                      │
│      • Apply geographic multipliers                              │
│      → Score: 0-100                                              │
│         │                                                         │
│         ▼                                                         │
│  4. scoreEngagement(email)                                       │
│      • Detect contact keywords (contact, info, sales)            │
│      • Detect product keywords                                   │
│      • Detect admin keywords (noreply, system)                   │
│      → Score: 0-100                                              │
│         │                                                         │
│         ▼                                                         │
│  5. Apply Weights:                                               │
│      rawScore = (emailQuality × 0.10) +                          │
│                 (companyRelevance × 0.45) +                      │
│                 (geographicPriority × 0.30) +                    │
│                 (engagement × 0.15)                              │
│         │                                                         │
│         ▼                                                         │
│  6. Calculate Bonuses:                                           │
│      • OEM manufacturer: ×1.3                                    │
│      • Target geography: ×2.0 (high) / ×1.2 (medium)            │
│      • Domain match: ×1.5                                        │
│         │                                                         │
│         ▼                                                         │
│  7. Apply Multipliers:                                           │
│      finalScore = rawScore × bonuses                             │
│         │                                                         │
│         ▼                                                         │
│  8. Determine Priority:                                          │
│      if (score >= 100) → HIGH                                    │
│      if (score >= 50)  → MEDIUM                                  │
│      if (score >= 10)  → LOW                                     │
│      else              → EXCLUDED                                │
│         │                                                         │
│         ▼                                                         │
│  Output: {                                                        │
│    score: 85.5,                                                  │
│    priority: "HIGH",                                             │
│    breakdown: {                                                  │
│      emailQuality: 8.5,                                          │
│      companyRelevance: 75,                                       │
│      geographicPriority: 70,                                     │
│      engagement: 80                                              │
│    },                                                            │
│    bonuses: {                                                    │
│      oem: 1.0,                                                   │
│      geography: 2.0,                                             │
│      domain: 1.0                                                 │
│    }                                                             │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cache Architecture                         │
│                                                                   │
│  cache.lists (in-memory)                                         │
│   │                                                               │
│   ├─ Cached after first loadLists()                             │
│   ├─ Persists for session                                        │
│   ├─ Cleared on retryLoadLists()                                │
│   └─ Benefit: ~80% reduction in API calls                       │
│                                                                   │
│  cache.previewData (Map)                                         │
│   │                                                               │
│   ├─ Key: ${filename}_${JSON.stringify(config.scoring)}         │
│   ├─ Value: Array of scored results                             │
│   ├─ Invalidated when:                                           │
│   │   • User changes config (new scoring)                        │
│   │   • User clicks "Regenerate Preview"                         │
│   │   • User selects different list                              │
│   └─ Benefit: Instant preview on revisit                        │
│                                                                   │
│  Cache Miss Flow:                                                │
│   1. Check cache → Miss                                          │
│   2. API call                                                    │
│   3. Process data                                                │
│   4. Store in cache                                              │
│   5. Return result                                               │
│                                                                   │
│  Cache Hit Flow:                                                 │
│   1. Check cache → Hit                                           │
│   2. Return cached result (instant)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Recovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Error Handling                             │
│                                                                   │
│  API Call Fails                                                  │
│         │                                                         │
│         ▼                                                         │
│  catch (error)                                                   │
│         │                                                         │
│         ├─→ console.error('API Error:', error)                  │
│         │                                                         │
│         ├─→ setState({ loading: false, error: error.message })  │
│         │                                                         │
│         └─→ toast.error(`Failed: ${error.message}`)             │
│                                                                   │
│  Render Error UI                                                 │
│         │                                                         │
│         ▼                                                         │
│  Show error box with:                                            │
│   • Error message                                                │
│   • Contextual help                                              │
│   • "Retry" button                                               │
│         │                                                         │
│         ▼                                                         │
│  User clicks "Retry"                                             │
│         │                                                         │
│         ▼                                                         │
│  retryLoadLists()                                                │
│   • Clear cache                                                  │
│   • Call loadLists() again                                       │
│   • Re-render on success/failure                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    FilterWizard Lifecycle                         │
│                                                                   │
│  1. Constructor                                                  │
│      • Initialize state & cache                                  │
│      • Set up config defaults                                    │
│      • Call init()                                               │
│                                                                   │
│  2. init() [async]                                               │
│      • Load lists from API                                       │
│      • Call render()                                             │
│                                                                   │
│  3. render()                                                     │
│      • Generate HTML for current step                            │
│      • Update DOM                                                │
│      • Attach event listeners                                    │
│                                                                   │
│  4. User Interactions                                            │
│      • Step navigation (next/prev)                               │
│      • List selection                                            │
│      • Config updates                                            │
│      • Preview regeneration                                      │
│                                                                   │
│  5. Navigation Triggers                                          │
│      • Step 3 → Step 4: generatePreview()                       │
│      • Step 5 Finish: finish() → onComplete callback            │
│                                                                   │
│  6. State Updates                                                │
│      • setState() → Object.assign(this.state, updates)          │
│      • No automatic re-render (call render() manually)           │
│                                                                   │
│  7. Cleanup                                                      │
│      • window.currentWizard reference                            │
│      • Event listeners attached to window                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Async Init Pattern
**Why:** Lists must load before rendering Step 1
**Implementation:** `constructor() → init() → loadLists() → render()`

### 2. Cache-First Strategy
**Why:** Reduce API calls, improve performance
**Implementation:** Check cache before every API call

### 3. Skeleton Loaders
**Why:** Better UX during loading
**Implementation:** `renderSkeletonLoader(count)` generates animated placeholders

### 4. Inline Event Handlers
**Why:** Simplify event delegation in dynamic HTML
**Implementation:** `onclick="window.currentWizard?.method()"`

### 5. Map-based Preview Cache
**Why:** Efficient key-value storage, automatic garbage collection
**Implementation:** `cache.previewData = new Map()`

### 6. Lazy Preview Generation
**Why:** Don't score until user reaches Step 4
**Implementation:** Trigger in `nextStep()` when `currentStep === 3`

---

## Integration Points

```
FilterWizard
    ├─ Depends on:
    │   ├─ window.api (services/api.js)
    │   ├─ FilterConfig (components/filter-config.js)
    │   ├─ FilterScorer (components/filter-scorer.js)
    │   └─ toast (optional, graceful degradation)
    │
    ├─ Calls Backend APIs:
    │   ├─ GET /api/lists
    │   └─ GET /api/file-preview?path=...&lines=50
    │
    └─ Triggers:
        └─ onComplete(result) callback
            → SmartFilterManager handles result
```

---

## Performance Metrics

**Expected Performance:**

| Operation | Time | Notes |
|-----------|------|-------|
| Load Lists | ~500ms | First load, cached thereafter |
| Generate Preview | ~1-2s | 50 emails, includes API + scoring |
| Regenerate Preview | <100ms | Cached results |
| Weight Update | <10ms | Real-time UI update |
| Step Navigation | <50ms | Render new step |

**Memory Usage:**
- Lists cache: ~50KB (100 lists)
- Preview cache: ~5KB per entry (50 emails)
- Total: <100KB for typical session

---

## Future Optimization Opportunities

1. **Persistent Cache:** Use localStorage for cross-session caching
2. **Incremental Preview:** Load emails in batches (10 at a time)
3. **Web Workers:** Score emails in background thread
4. **Virtual Scrolling:** For large preview lists (>100 emails)
5. **Prefetching:** Load preview data when entering Step 3
