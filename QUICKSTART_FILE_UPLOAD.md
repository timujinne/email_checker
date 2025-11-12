# Quick Start: File Upload in FilterTester

## 5-Minute Setup

### Step 1: Start Server
```bash
python3 web_server.py
```

### Step 2: Open Browser
Navigate to: http://localhost:8080/smart-filter.html

### Step 3: Find Filter Tester
Scroll down to "Filter Tester" section

### Step 4: Upload Test File

**Option A: TXT File**
1. Click "Upload File" tab
2. Click "Choose File"
3. Select `test_emails.txt`
4. See 10 emails loaded
5. Test runs automatically

**Option B: CSV File**
1. Click "Upload File" tab
2. Click "Choose File"
3. Select `test_emails.csv`
4. See 10 emails with metadata
5. Test runs automatically

### Step 5: View Results
- See scored emails in table
- Check priority levels (HIGH/MEDIUM/LOW)
- Click details button (🔍) for breakdown
- Export results as CSV or JSON

## File Formats

### TXT (Simple)
```txt
info@company.it
sales@manufacturer.de
contact@supplier.com
```

### CSV (With Metadata)
```csv
Email,Company,Country
info@company.it,Company SRL,Italy
sales@manufacturer.de,Manufacturer GmbH,Germany
```

## Features

✅ **Automatic parsing** - Detects TXT/CSV format
✅ **Metadata extraction** - Company, country from CSV
✅ **Validation** - Max 5MB, valid format, not empty
✅ **Error handling** - Clear error messages
✅ **Auto-run** - Test runs after upload (optional)
✅ **Export** - Download results as CSV/JSON

## Common Issues

### File Not Uploading
- Check file size (max 5MB)
- Verify format (.txt or .csv)
- Ensure file not empty

### No Results Showing
- Check "Auto-run test" is checked
- Manually click "Run Test" button
- Verify emails in file are valid

### Parsing Errors
- Ensure UTF-8 encoding
- Check CSV structure (proper commas)
- Verify email format (contains @)

## Need More Help?

See **FILE_UPLOAD_TESTING_GUIDE.md** for:
- 10 detailed test scenarios
- Troubleshooting guide
- Advanced features
- Integration details

## Test Files Provided

- `test_emails.txt` - 10 emails (TXT format)
- `test_emails.csv` - 10 emails with metadata (CSV format)

Use these to verify everything works correctly!
