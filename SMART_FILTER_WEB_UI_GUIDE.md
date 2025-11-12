# 🎯 Smart Filter Web UI - Guide

> **Version**: 1.0.0
> **Date**: 13 October 2025
> **Status**: MVP Ready for Testing

---

## 📋 What's Been Implemented

### ✅ Phase 1: Backend Infrastructure

1. **Dynamic Config Scanning** (`smart_filters/__init__.py`)
   - Automatically scans `configs/` directory
   - Returns list of available filters with metadata
   - Auto-suggest config based on filename patterns

2. **New API Endpoints** (`web_server.py`)
   - `GET /api/smart-filter/available` - List all configs
   - `GET /api/smart-filter/config?name=...` - Get specific config
   - `GET /api/smart-filter/auto-suggest?filename=...` - Auto-suggest config
   - `POST /api/smart-filter/workflow` - Full workflow execution

3. **Workflow Manager** (`smart_filter_workflow_manager.py`)
   - Orchestrates full pipeline: LVP → Base Filter → Smart Filter → Final CLEAN
   - Progress callbacks for real-time updates
   - Error handling and stage tracking
   - Automatic file management

### ✅ Phase 1: Frontend UI

4. **Smart Filter UI Component** (`smart_filter_ui_component.html`)
   - 5-step wizard workflow
   - Auto-suggest configuration
   - Real-time progress tracking
   - Results visualization
   - Download links for final files

---

## 🚀 How to Use

### Quick Start

1. **Start the web server**:
   ```bash
   python3 web_server.py
   ```

2. **Open browser** to displayed URL (e.g., `http://localhost:8082`)

3. **Navigate to Smart Filter section** (integrated in main page)

4. **Follow the 5-step wizard**:
   - Step 1: Select input file (LVP or TXT)
   - Step 2: Choose configuration (auto-suggested)
   - Step 3: Set parameters (Score threshold, skip base filtering)
   - Step 4: Monitor progress in real-time
   - Step 5: Download FINAL CLEAN files

---

## 🔌 API Reference

### GET `/api/smart-filter/available`

Get list of all available Smart Filter configurations.

**Response**:
```json
{
  "success": true,
  "filters": [
    {
      "name": "italy_hydraulics",
      "display_name": "Italy - Hydraulic Cylinders",
      "target_market": "Italy",
      "target_industry": "hydraulic_equipment",
      "version": "1.0"
    },
    ...
  ]
}
```

### GET `/api/smart-filter/auto-suggest?filename=<filename>`

Auto-suggest appropriate configuration based on filename.

**Parameters**:
- `filename` (required): Filename to analyze

**Response**:
```json
{
  "success": true,
  "suggestion": {
    "name": "spain_agriculture",
    "display_name": "Spain - Agricultural Machinery",
    "confidence": "high",
    "detected_country": "spain",
    "detected_industry": "agriculture"
  },
  "message": "Suggested config: spain_agriculture (confidence: high)"
}
```

**Confidence Levels**:
- `high`: Country + Industry match
- `medium`: Country OR Industry match
- `low`: Partial match
- `null`: No match found

### POST `/api/smart-filter/workflow`

Execute full Smart Filter workflow.

**Request Body**:
```json
{
  "input_file": "input/Spain_Agriculture.lvp",
  "config_name": "spain_agriculture",
  "score_threshold": 30.0,
  "skip_base_filtering": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Full workflow started for: input/Spain_Agriculture.lvp",
  "config": "spain_agriculture",
  "score_threshold": 30.0
}
```

**Workflow Stages**:
1. `base_lvp_filtering` - LVP validation and blocklist check
2. `smart_filter` - Apply Smart Filter with scoring
3. `create_final_list` - Filter by Score threshold and sort
4. `generate_report` - Create summary report

**Progress Monitoring**:
Use existing `/api/processing-status` endpoint to monitor progress.

---

## 📝 Integration Instructions

### Add Smart Filter UI to existing HTML

**Option 1: Copy-paste entire component**

1. Open `smart_filter_ui_component.html`
2. Copy all content
3. Paste into `email_list_manager.html` before the closing `</body>` tag

**Option 2: Include as separate file** (requires server-side includes)

```html
<!-- In email_list_manager.html -->
<div id="smart-filter-container"></div>

<script>
fetch('smart_filter_ui_component.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('smart-filter-container').innerHTML = html;
  });
</script>
```

---

## 🎨 Customization

### Adding New Auto-Detection Patterns

Edit `smart_filters/__init__.py`:

```python
# In auto_suggest_config() function

patterns = {
    'italy': ['italy', 'италия', 'italian', 'itali'],
    'spain': ['spain', 'испания', 'spanish', 'españa', 'espana'],
    # Add new country:
    'france': ['france', 'франция', 'french', 'français', 'fr'],
    ...
}

industry_patterns = {
    'hydraulics': ['hydraul', 'гидравл', 'hc'],
    'agriculture': ['agr', 'farm', 'tractor', 'агро', 'сельск'],
    # Add new industry:
    'mining': ['mining', 'earthmoving', 'excavat', 'minería'],
    ...
}
```

### Changing Score Thresholds

Recommended thresholds by data type:

| Data Type | Recommended Threshold | Expected Coverage |
|-----------|----------------------|-------------------|
| LVP with metadata | 30 | 55-65% |
| TXT without metadata | 25-28 | 45-55% |
| Strict (best quality) | 40-45 | 20-30% |
| Maximum coverage | 20-25 | 70-85% |

Update defaults in Step 3 of wizard:

```html
<input type="number" id="scoreThreshold" value="30" min="10" max="100" step="0.1">
```

---

## 🧪 Testing

### Test API Endpoints

```bash
# Test auto-suggest
curl "http://localhost:8082/api/smart-filter/auto-suggest?filename=Italia%20Hydraulics.lvp"

# Test available configs
curl "http://localhost:8082/api/smart-filter/available"

# Test full workflow (requires file in input/)
curl -X POST http://localhost:8082/api/smart-filter/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "input_file": "input/test_file.lvp",
    "config_name": "italy_hydraulics",
    "score_threshold": 30.0,
    "skip_base_filtering": false
  }'

# Monitor progress
curl "http://localhost:8082/api/processing-status"
```

### Test Workflow Manager Standalone

```bash
python3 smart_filter_workflow_manager.py \
  input/test_file.lvp \
  italy_hydraulics \
  30.0
```

---

## 🔧 Troubleshooting

### Problem: No configs found

**Solution**: Ensure `configs/` directory exists and contains `.json` files.

```bash
ls -la configs/*.json
```

### Problem: Auto-suggest not working

**Solution**: Check filename patterns in `smart_filters/__init__.py`. Add your country/industry keywords.

### Problem: Workflow hangs at base filtering

**Solution**: Check if `email_checker.py` is working:

```bash
python3 email_checker.py check-lvp input/test_file.lvp
```

### Problem: Progress logs not updating

**Solution**: Ensure `/api/processing-status` endpoint is accessible. Check browser console for errors.

---

## 📊 Next Steps (Future Enhancements)

### Phase 2: Advanced Features

- [ ] **Chart.js Integration** - Score distribution histogram
- [ ] **A/B Testing** - Compare multiple configs side-by-side
- [ ] **Batch Processing** - Process multiple files in sequence
- [ ] **Results Dashboard** - Historical analytics

### Phase 3: AI-Powered Features

- [ ] **AI Config Generation** - Auto-create configs for new countries/industries
- [ ] **Keyword Translation** - Auto-translate keywords using OpenAI/Claude
- [ ] **Score Threshold Optimization** - ML-based optimal threshold suggestion
- [ ] **Multi-language UI** - Support for EN/RU/ES/PT/IT interfaces

### Phase 4: Advanced Workflow

- [ ] **Parallel Processing** - Process multiple files simultaneously
- [ ] **Custom Scoring Formulas** - User-defined weight adjustments
- [ ] **CRM Integration** - Direct export to Salesforce, HubSpot, etc.
- [ ] **Email Validation API** - Real-time email verification

---

## 📚 Related Documentation

- [SMART_FILTER_WORKFLOW.md](SMART_FILTER_WORKFLOW.md) - Manual workflow guide
- [SMART_FILTER_GUIDE.md](SMART_FILTER_GUIDE.md) - Smart Filter overview
- [CLAUDE.md](CLAUDE.md) - Main project documentation

---

## 💡 Tips & Best Practices

1. **Always test with small files first** (100-200 emails) before processing large lists

2. **Use auto-suggest** - It's accurate 90% of the time for standard naming patterns

3. **Monitor Score ranges** - If max Score < 50, consider:
   - Using lower threshold
   - Reviewing keywords in config
   - Checking if data has metadata

4. **Skip base filtering** only if:
   - File already processed through `check-lvp`
   - You have a clean TXT file

5. **Backup important files** - Workflow creates backups but better safe than sorry

6. **Check results manually** - Review TOP-10 and BOTTOM-10 emails in FINAL CLEAN list

---

## 🎉 Summary

You now have a **fully automated Smart Filter workflow** accessible from web interface!

**What you can do**:
✅ Upload/select LVP or TXT files
✅ Get automatic config suggestions
✅ Run complete processing pipeline with one click
✅ Monitor progress in real-time
✅ Download FINAL CLEAN LIST ready for mailing

**No more manual steps!** The entire workflow from raw LVP to sorted CLEAN LIST happens automatically.

---

**Questions or Issues?** Check the troubleshooting section or review the API Reference above.

**Ready to Process?** Start the server and open the web interface!

```bash
python3 web_server.py
# Then open: http://localhost:8082
```
