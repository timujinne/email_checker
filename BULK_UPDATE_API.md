# Bulk List Update API

## Overview

The `/api/lists/bulk-update` endpoint allows you to update metadata for multiple lists in a single request. This is useful for batch operations like setting country, category, priority, or resetting processed flags for multiple lists at once.

## Endpoint

```
POST /api/lists/bulk-update
```

## Request Format

### Headers
- `Content-Type: application/json`

### Body
```json
{
  "filenames": ["list1.lvp", "list2.txt", "list3.lvp"],
  "updates": {
    "country": "Germany",
    "category": "Manufacturing",
    "priority": 100,
    "processed": false,
    "description": "Updated description",
    "display_name": "Custom Display Name"
  }
}
```

### Parameters

#### `filenames` (required)
- **Type**: Array of strings
- **Description**: List of filenames to update
- **Validation**:
  - Must be non-empty array
  - Each filename must be valid (no path traversal, max 255 chars)
  - Allowed extensions: `.txt`, `.lvp`, `.csv`, `.json`

#### `updates` (required)
- **Type**: Object
- **Description**: Fields to update for the specified lists
- **Allowed fields**:
  - `country` (string, non-empty)
  - `category` (string, non-empty)
  - `priority` (integer, 50-999)
  - `processed` (boolean)
  - `description` (string)
  - `display_name` (string)

## Response Format

### Success Response (HTTP 200)

```json
{
  "success": true,
  "updated": 3,
  "failed": 0,
  "errors": [],
  "results": [
    {"filename": "list1.lvp", "success": true},
    {"filename": "list2.txt", "success": true},
    {"filename": "list3.lvp", "success": true}
  ]
}
```

### Partial Success Response (HTTP 200)

When some files are not found:

```json
{
  "success": false,
  "updated": 2,
  "failed": 1,
  "errors": ["List not found: non_existent.txt"],
  "results": [
    {"filename": "list1.lvp", "success": true},
    {"filename": "list2.txt", "success": true},
    {"filename": "non_existent.txt", "success": false, "error": "List not found"}
  ]
}
```

### Error Responses

#### 400 Bad Request - Empty filenames
```json
{
  "error": "filenames array is empty"
}
```

#### 400 Bad Request - Empty updates
```json
{
  "error": "updates object is empty"
}
```

#### 400 Bad Request - Invalid priority
```json
{
  "error": "priority must be integer between 50 and 999"
}
```

#### 400 Bad Request - Invalid filename
```json
{
  "error": "Invalid filename 'bad_file.exe': Invalid file extension: .exe"
}
```

#### 400 Bad Request - Path traversal attempt
```json
{
  "error": "Invalid filename '../../../etc/passwd': Path traversal attempt detected in filename: ../../../etc/passwd"
}
```

#### 400 Bad Request - Invalid field
```json
{
  "error": "Field 'invalid_field' is not allowed for update"
}
```

#### 404 Not Found - Config file missing
```json
{
  "error": "Config file not found"
}
```

#### 413 Payload Too Large - Request > 1MB
```json
{
  "error": "Request too large"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to save config: <error details>"
}
```

## Examples

### Example 1: Update country and priority for multiple lists

**Request:**
```bash
curl -X POST http://localhost:8080/api/lists/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "Italy_Motors.txt",
      "Italy_Agriculture.lvp",
      "Italy_Manufacturing.txt"
    ],
    "updates": {
      "country": "Italy",
      "priority": 150,
      "category": "Automotive"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "updated": 3,
  "failed": 0,
  "errors": [],
  "results": [
    {"filename": "Italy_Motors.txt", "success": true},
    {"filename": "Italy_Agriculture.lvp", "success": true},
    {"filename": "Italy_Manufacturing.txt", "success": true}
  ]
}
```

### Example 2: Reset processed flags for all lists

**Request:**
```bash
curl -X POST http://localhost:8080/api/lists/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "list1.txt",
      "list2.lvp",
      "list3.txt"
    ],
    "updates": {
      "processed": false
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "updated": 3,
  "failed": 0,
  "errors": [],
  "results": [
    {"filename": "list1.txt", "success": true},
    {"filename": "list2.lvp", "success": true},
    {"filename": "list3.txt", "success": true}
  ]
}
```

### Example 3: Update with non-existent file

**Request:**
```bash
curl -X POST http://localhost:8080/api/lists/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "filenames": [
      "existing_list.txt",
      "non_existent.txt"
    ],
    "updates": {
      "country": "Germany"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "updated": 1,
  "failed": 1,
  "errors": ["List not found: non_existent.txt"],
  "results": [
    {"filename": "existing_list.txt", "success": true},
    {"filename": "non_existent.txt", "success": false, "error": "List not found"}
  ]
}
```

### Example 4: JavaScript/Fetch API

```javascript
async function bulkUpdateLists(filenames, updates) {
  try {
    const response = await fetch('/api/lists/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filenames: filenames,
        updates: updates
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Updated: ${data.updated}, Failed: ${data.failed}`);

      if (data.failed > 0) {
        console.warn('Errors:', data.errors);
      }

      return data;
    } else {
      console.error('Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Usage
bulkUpdateLists(
  ['Italy_Motors.txt', 'Italy_Agriculture.lvp'],
  { country: 'Italy', priority: 150 }
);
```

## Validation Rules

### Filename Validation
- ✅ Must not contain path traversal (`..`, `/`, `\\`)
- ✅ Must not exceed 255 characters
- ✅ Must have valid extension (`.txt`, `.lvp`, `.csv`, `.json`)
- ✅ Must not contain dangerous characters (`;`, `&`, `|`, `` ` ``, `$`, etc.)

### Field Validation
- **country**: Non-empty string
- **category**: Non-empty string
- **priority**: Integer between 50 and 999 (inclusive)
- **processed**: Boolean (`true` or `false`)
- **description**: String (can be empty)
- **display_name**: String (can be empty)

### Update Behavior
- Only fields specified in `updates` are modified
- Other fields remain unchanged
- Missing fields in list objects are created if specified in `updates`
- Config file is saved only if at least one update succeeds
- Transaction-like behavior: all-or-nothing for file save

## Error Handling

The endpoint handles errors gracefully:

1. **File not found**: Marked as failed, but processing continues for other files
2. **Invalid filename**: Request rejected immediately (400)
3. **Invalid field values**: Request rejected immediately (400)
4. **Config file missing**: Request rejected (404)
5. **Save failure**: Request fails after updates (500)

## Security

The endpoint includes multiple security layers:

- ✅ Filename validation with whitelist of allowed characters
- ✅ Path traversal prevention
- ✅ File extension validation
- ✅ Field whitelist validation
- ✅ Request size limit (1MB)
- ✅ Type checking for all fields
- ✅ Range validation for numeric fields

## Performance

- **Request time**: O(n × m) where n = number of filenames, m = number of lists in config
- **Memory usage**: Config loaded once, kept in memory during processing
- **File I/O**: One read + one write (if updates successful)

## Testing

Run the test suite:

```bash
# Start the web server
python3 web_server.py

# In another terminal, run tests
python3 test_bulk_update.py
```

## Integration with Web UI

The endpoint can be integrated into the web interface for:

- Batch country assignment
- Bulk priority updates
- Resetting processed flags for reprocessing
- Bulk category assignment
- Mass description updates

Example UI workflow:
1. User selects multiple lists (checkboxes)
2. User clicks "Bulk Update" button
3. Modal opens with update form
4. User specifies fields to update
5. Request sent to `/api/lists/bulk-update`
6. UI shows success/failure for each list

## Changelog

### Version 1.0 (2025-10-30)
- Initial implementation
- Support for 6 updatable fields
- Comprehensive validation
- Security measures
- Detailed error reporting
