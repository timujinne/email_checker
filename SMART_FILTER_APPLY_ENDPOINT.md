# Smart Filter Apply Endpoint Documentation

## Overview

The `/api/smart-filter/apply` endpoint allows you to apply a custom smart filter configuration to recent clean email lists. This endpoint accepts a filter configuration via POST request, saves it, and automatically applies it to all clean files modified within the last 7 days.

## Endpoint Details

**URL:** `/api/smart-filter/apply`
**Method:** `POST`
**Content-Type:** `application/json`
**Max Request Size:** 1MB

## Request Format

### Required Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | Object | Yes | Filter configuration object |
| `timestamp` | String | No | ISO 8601 timestamp for tracking |

### Config Object Structure

The `config` object must contain:

```json
{
  "config": {
    "metadata": {
      "name": "Filter Name",           // Required
      "description": "Description",     // Optional
      "version": "1.0"                  // Optional
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
    },
    "target_country": "US",              // Optional
    "languages": ["en"]                  // Optional
  },
  "timestamp": "2025-10-30T12:00:00Z"
}
```

### Validation Rules

1. **Config Required:** `config` parameter must be present
2. **Dict Type:** `config` must be a dictionary object
3. **Metadata Required:** `config.metadata.name` must exist
4. **Size Limit:** Request body must be < 1MB

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Filter 'Test Filter' saved and applied to recent clean files",
  "config_name": "Test Filter",
  "config_file": "smart_filters/configs/test_filter_config.json",
  "timestamp": "2025-10-30T12:00:00Z"
}
```

### Error Responses

**400 Bad Request - Missing Config:**
```json
{
  "error": "Missing config parameter"
}
```

**400 Bad Request - Invalid Config Type:**
```json
{
  "error": "Config must be a dictionary"
}
```

**400 Bad Request - Missing Metadata Name:**
```json
{
  "error": "Config missing metadata.name field"
}
```

**413 Request Entity Too Large:**
```json
{
  "error": "Request too large"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message details"
}
```

## Behavior

### What Happens When You Call This Endpoint?

1. **Config Validation:**
   - Validates request structure
   - Checks required fields
   - Ensures proper data types

2. **Config Persistence:**
   - Sanitizes config name for filesystem safety
   - Saves config to `smart_filters/configs/{name}_config.json`
   - Creates directory if it doesn't exist

3. **Background Processing:**
   - Starts asynchronous processing thread
   - Finds clean files modified in last 7 days
   - Applies filter to each file using SmartFilterProcessor
   - Generates priority-segmented output files

4. **Real-time Updates:**
   - Updates processing state with logs
   - Provides progress via `/api/status` endpoint
   - Reports completion/errors in processing logs

### Output Files

For each clean file processed, the endpoint generates:

- `*_HIGH_PRIORITY_*.txt` - Emails with score >= 100
- `*_MEDIUM_PRIORITY_*.txt` - Emails with score 50-99
- `*_LOW_PRIORITY_*.txt` - Emails with score 10-49
- `*_EXCLUDED_*.txt` - Emails with score < 10
- `*_EXCLUSION_REPORT_*.csv` - Detailed exclusion reasons

## Usage Examples

### Python (requests)

```python
import requests
import json
from datetime import datetime

config = {
    "metadata": {
        "name": "Italy Hydraulics Custom",
        "description": "Custom filter for Italian hydraulic companies"
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

response = requests.post(
    'http://localhost:8080/api/smart-filter/apply',
    json={
        'config': config,
        'timestamp': datetime.now().isoformat()
    }
)

print(response.json())
```

### JavaScript (Fetch API)

```javascript
const config = {
  metadata: {
    name: "Italy Hydraulics Custom",
    description: "Custom filter for Italian hydraulic companies"
  },
  scoring: {
    weights: {
      email_quality: 0.10,
      company_relevance: 0.45,
      geographic_priority: 0.30,
      engagement: 0.15
    },
    thresholds: {
      high_priority: 100,
      medium_priority: 50,
      low_priority: 10
    }
  }
};

fetch('/api/smart-filter/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: config,
    timestamp: new Date().toISOString()
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Filter applied:', data.config_name);
  } else {
    console.error('Error:', data.error);
  }
});
```

### cURL

```bash
curl -X POST http://localhost:8080/api/smart-filter/apply \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "metadata": {
        "name": "Test Filter",
        "description": "Test filter configuration"
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
    },
    "timestamp": "2025-10-30T12:00:00Z"
  }'
```

## Monitoring Progress

After calling the endpoint, you can monitor processing progress:

```bash
# Check processing status
curl http://localhost:8080/api/status

# View processing logs
curl http://localhost:8080/api/status | jq '.logs'
```

The logs will show:
- Number of clean files found
- Processing progress for each file
- Completion status
- Any errors encountered

## Integration with Frontend

This endpoint is designed to integrate with the Smart Filter Studio UI:

```javascript
// In smart-filter.js component
apiService.post('/api/smart-filter/apply', {
    config: this.currentConfig,
    timestamp: new Date().toISOString()
}).then(response => {
    if (response.success) {
        toast.success('Filter applied successfully!');
        // Optionally redirect to processing queue
        router.navigate('/processing-queue');
    } else {
        toast.error('Failed to apply filter');
    }
}).catch(error => {
    toast.error('Error applying filter: ' + error.message);
});
```

## Performance Considerations

- **Async Processing:** The endpoint returns immediately while processing runs in background
- **File Age Filter:** Only processes files modified in last 7 days (configurable)
- **Memory Usage:** Processes files sequentially to avoid memory issues
- **Error Handling:** Individual file errors don't stop batch processing

## Testing

Run the included test script:

```bash
# Python test suite
python test_smart_filter_apply.py

# Bash test script
bash test_apply_endpoint.sh
```

## Troubleshooting

### "No recent clean files found"

**Cause:** No clean files modified in last 7 days
**Solution:** Process some lists first: `python email_checker.py check-all-incremental`

### "Config missing metadata.name field"

**Cause:** Config object doesn't have metadata.name
**Solution:** Ensure your config includes:
```json
{
  "config": {
    "metadata": {
      "name": "Your Filter Name"
    }
  }
}
```

### "Request too large"

**Cause:** Request body exceeds 1MB
**Solution:** Simplify your config or split into multiple requests

### Processing Stuck

**Check status:**
```bash
curl http://localhost:8080/api/status
```

**Restart server if needed:**
```bash
# Kill existing server
pkill -f web_server.py

# Start new server
python web_server.py
```

## Related Endpoints

- `GET /api/smart-filter/available` - List available filter configs
- `GET /api/smart-filter/config?name=...` - Get specific config
- `POST /api/smart-filter/process` - Process single file
- `POST /api/smart-filter/process-batch` - Batch process files
- `POST /api/smart-filter/workflow` - Full processing workflow

## Security Notes

- **Input Validation:** All inputs are validated before processing
- **Filename Sanitization:** Config names are sanitized for filesystem safety
- **Size Limits:** Request size limited to 1MB
- **Error Handling:** Detailed error messages for debugging
- **Background Processing:** Long-running tasks don't block server

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-30 | Initial implementation |

## Implementation Details

**File:** `web_server.py`
**Handler Method:** `handle_smart_filter_apply()`
**Lines:** 2667-2812

**Key Components:**
1. Request validation (lines 2670-2693)
2. Config persistence (lines 2698-2712)
3. Background processing (lines 2715-2786)
4. Response formatting (lines 2798-2804)

## Contact & Support

For issues or questions:
- Check CLAUDE.md for development guidelines
- Review SMART_FILTER_GUIDE.md for filter documentation
- Test with included test scripts before reporting bugs
