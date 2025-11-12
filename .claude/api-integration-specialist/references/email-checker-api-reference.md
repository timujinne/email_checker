# Email Checker API Reference

Complete reference for all API endpoints in the Email Checker application.

## Response Format

All endpoints return JSON with this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional details"
}
```

## Core Processing Endpoints

### GET /api/lists
Returns all email lists with metadata.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "italy_contacts.txt",
      "display_name": "Italy Contacts",
      "file_type": "txt",
      "country": "IT",
      "category": "Automotive",
      "priority": 1,
      "processed": false,
      "email_count": 5420,
      "date_added": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### POST /api/process
Triggers full incremental processing.

**Request:** None required

**Response:**
```json
{
  "success": true,
  "job_id": "proc_20251029_173042",
  "status": "processing"
}
```

### POST /api/process_one
Processes single list.

**Request:**
```json
{
  "filename": "italy_contacts.txt"
}
```

**Response:** Same as /api/process

### GET /api/status
Returns current processing status.

**Response:**
```json
{
  "success": true,
  "data": {
    "running": true,
    "progress": 45.5,
    "eta": "2m 15s",
    "current_file": "italy_contacts.txt",
    "total_files": 12,
    "processed_files": 5
  }
}
```

### POST /api/reset_processing
Resets all processed flags.

**Response:**
```json
{
  "success": true,
  "message": "Processing flags reset"
}
```

## Metadata Endpoints

### GET /api/metadata
Returns database statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_records": 26590,
    "unique_emails": 26369,
    "database_size": "174 MB",
    "available_fields": [
      "email", "company_name", "address",
      "phone", "website", "contact_person"
    ],
    "lvp_sources": 15
  }
}
```

### GET /api/email-metadata/:email
Fetches metadata for specific email.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "info@company.com",
    "company_name": "Example SRL",
    "address": "Via Roma 123, Milano",
    "phone": "+39 02 1234567",
    "website": "www.example.com",
    "contact_person": "Mario Rossi",
    "industry": "Manufacturing"
  }
}
```

### GET /api/lvp-sources
Lists available LVP files.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "italy_export_20251015.lvp",
      "size": "25.4 MB",
      "modified": "2025-10-15T14:22:00Z",
      "record_count": 8420
    }
  ]
}
```

### POST /api/import-lvp
Imports LVP file to database.

**Request:**
```json
{
  "filename": "italy_export_20251015.lvp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Imported 8420 records",
  "data": {
    "imported": 8420,
    "duplicates_skipped": 52,
    "errors": 0
  }
}
```

### POST /api/enrich-list
Enriches clean list with metadata.

**Request:**
```json
{
  "filename": "italy_contacts_clean_20251029.txt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "List enriched with metadata",
  "data": {
    "total_emails": 5420,
    "matched": 4890,
    "unmatched": 530,
    "output_files": [
      "italy_contacts_metadata_20251029.csv",
      "italy_contacts_metadata_20251029.json"
    ]
  }
}
```

### GET /api/metadata-search?q=query
Searches metadata by keywords.

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "email": "info@hydraulics.it",
        "company_name": "Hydraulics SRL",
        "match_fields": ["company_name", "industry"]
      }
    ],
    "total": 12,
    "query": "hydraulics"
  }
}
```

## Smart Filter Endpoints

### GET /api/smart-filter/available
Lists available filters.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "italy_hydraulics",
      "description": "Italian hydraulic equipment companies",
      "target_country": "IT",
      "target_industry": "hydraulics"
    }
  ]
}
```

### GET /api/smart-filter/config?name=filter_name
Returns filter configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "filter_name": "italy_hydraulics",
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
    "industry_keywords": { ... }
  }
}
```

### POST /api/smart-filter/process
Processes single file with filter.

**Request:**
```json
{
  "filename": "italy_contacts_clean_20251029.txt",
  "filter": "italy_hydraulics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Smart filter applied",
  "data": {
    "input_emails": 5420,
    "high_priority": 234,
    "medium_priority": 876,
    "low_priority": 1543,
    "excluded": 2767,
    "output_files": [
      "Italy_Hydraulics_HIGH_PRIORITY_20251029.txt",
      "Italy_Hydraulics_MEDIUM_PRIORITY_20251029.txt",
      "Italy_Hydraulics_LOW_PRIORITY_20251029.txt",
      "Italy_Hydraulics_EXCLUDED_20251029.txt",
      "Italy_Hydraulics_EXCLUSION_REPORT_20251029.csv"
    ]
  }
}
```

### POST /api/smart-filter/process-batch
Batch processes files with filter.

**Request:**
```json
{
  "pattern": "output/*Italy*_clean_*.txt",
  "filter": "italy_hydraulics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch processing started",
  "data": {
    "files_found": 3,
    "job_id": "batch_filter_20251029_173042"
  }
}
```

## Reports & Utilities

### GET /api/reports
Lists available HTML reports.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "report_20251029_173042.html",
      "size": "1.2 MB",
      "generated": "2025-10-29T17:30:42Z",
      "url": "/output/report_20251029_173042.html"
    }
  ]
}
```

### GET /api/blocklists
Returns blocklist statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "blocked_emails": 22543,
    "blocked_domains": 712,
    "last_updated": "2025-10-28T09:15:00Z",
    "memory_usage": "~50MB"
  }
}
```

### POST /api/update-blocklist
Adds emails/domains to blocklist.

**Request:**
```json
{
  "emails": ["spam@example.com"],
  "domains": ["spam-domain.com"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Blocklist updated",
  "data": {
    "emails_added": 1,
    "domains_added": 1,
    "duplicates_skipped": 0
  }
}
```

## Error Codes

- **400**: Bad request (invalid parameters)
- **404**: Resource not found
- **500**: Server error (processing failed)

See error-handling-strategies.md for handling patterns.
