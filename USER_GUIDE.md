# 📖 User Guide - Email Checker

**Version:** 1.0.1
**Last Updated:** 26 October 2025

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [List Management](#list-management)
4. [Smart Filters](#smart-filters)
5. [Analytics](#analytics)
6. [Archive Manager](#archive-manager)
7. [Blocklist Management](#blocklist-management)
8. [Processing Queue](#processing-queue)
9. [Settings](#settings)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Accessing Email Checker

1. Open your browser
2. Navigate to the Email Checker application URL
3. You'll see the Dashboard page

### First Steps

1. **Dashboard:** View your email processing statistics
2. **Lists Manager:** Upload your first email list
3. **Analytics:** Monitor your progress
4. **Settings:** Configure preferences

---

## 📊 Dashboard

The Dashboard is your main hub for monitoring email processing activities.

### Key Elements

**KPI Cards** - Show your current statistics:
- **Processed:** Total emails checked
- **Clean:** Valid, non-blocked emails
- **Blocked:** Emails on blocklists
- **Queue:** Emails waiting to be processed

**Activity Feed** - Shows recent activities:
- List uploads
- Processing events
- Errors and warnings

**Quick Actions** - Perform common tasks:
- Start processing
- Reset progress
- Export reports

### Interpreting Data

- **Green metrics** = Good (no issues)
- **Yellow metrics** = Caution (monitor)
- **Red metrics** = Action needed

---

## 📂 List Management

### Uploading Email Lists

1. Click **Lists** in the sidebar
2. Click **Upload File** button
3. Select your email list (TXT or CSV format)
4. Files are automatically validated

### Supported Formats

**TXT Format:**
```
email1@example.com
email2@example.com
email3@example.com
```

**CSV Format:**
```
Email,Name
email1@example.com,John Doe
email2@example.com,Jane Smith
```

### File Limits

- Max file size: 100MB
- Max emails per file: 1,000,000
- Recommended: Process in batches of 10,000-50,000

### Processing Lists

1. Select lists to process
2. Click **Process** button
3. Monitor progress in Dashboard
4. Results available when complete

### Managing Lists

- **Edit:** Update list metadata
- **Preview:** View first 100 emails
- **Download:** Get results
- **Delete:** Remove list

---

## 🔍 Smart Filters

Smart Filters help you qualify leads and segment your list.

### Creating a Filter

1. Click **Smart Filters** in sidebar
2. Click **New Filter**
3. Follow the 5-step wizard:
   - Step 1: Select email list
   - Step 2: Choose filter type
   - Step 3: Configure parameters
   - Step 4: Preview results
   - Step 5: Generate report

### Filter Types

1. **Industry Filter** - By industry keywords
2. **Geography Filter** - By location/country
3. **Custom Filter** - Create your own rules
4. **Regex Filter** - Pattern matching

### Using Templates

1. Click **Templates** button
2. Select pre-built template
3. Customize parameters
4. Apply to your list

### Saving Filters

1. After creating filter, click **Save**
2. Give it a meaningful name
3. Add description (optional)
4. Filters are saved to your account

---

## 📈 Analytics

Monitor your email processing activities and trends.

### Dashboard Features

**Date Range Picker:**
- Choose preset ranges (Today, 7 days, 30 days, 90 days)
- Or select custom date range

**Chart Types:**
- **Trends:** Line chart showing progress over time
- **Comparison:** Bar chart comparing metrics
- **Distribution:** Pie chart showing breakdown
- **Heatmap:** Pattern analysis by day/hour

**KPI Cards:**
- Total emails processed
- Average emails per day
- Max/Min processing rates

### Creating Reports

1. Select date range
2. Choose metrics to include
3. Click **Generate Report**
4. View in browser or download

### Exporting Data

**Export Formats:**
- CSV (spreadsheet)
- JSON (programmatic use)
- PDF (printing)

---

## ☁️ Archive Manager

Store and manage your email lists in the cloud.

### Connecting to Cloud

1. Click **Archive** in sidebar
2. Click **Connect Google Drive**
3. Authorize application
4. Your account is now linked

### Local Archive

View all your processed lists stored locally.

**Actions:**
- Search by filename
- Filter by date
- Add tags
- Download
- Delete

### Cloud Storage

Access lists stored in Google Cloud Storage.

**Actions:**
- Browse files
- Download
- Manage versions
- Delete

### Syncing to Cloud

1. Select lists to sync
2. Click **Sync to Cloud**
3. Monitor progress
4. Lists are backed up

### File Tagging

Add tags to organize your lists:
1. Select file
2. Click **Add Tags**
3. Enter comma-separated tags
4. Use for filtering later

---

## 🚫 Blocklist Management

Manage blocklisted emails and domains.

### Viewing Blocklists

1. Click **Blocklist** in sidebar
2. View statistics
3. Browse blocked items

### Importing Blocklists

1. Click **Import** button
2. Upload CSV file
3. Map columns
4. Confirm import

### Managing Entries

**View Lists:**
- Blocked Emails (individual addresses)
- Blocked Domains (entire domains)
- Whitelist (exceptions)

**Actions:**
- Add/Remove entries
- Export list
- Clear all
- Search/filter

---

## ⚙️ Processing Queue

Monitor active and completed processing tasks.

### Queue Status

**Active Tasks:**
- Currently processing
- Progress bar
- Estimated time
- Pause/Resume options

**Completed Tasks:**
- Results available
- Download option
- Reprocess option
- View logs

### Batch Processing

Process multiple lists:
1. Select lists
2. Click **Batch Process**
3. Set processing order
4. Start processing
5. Monitor progress

### Performance

- Processing speed: 5,000-10,000 emails/second
- Typical file: Processed in 1-5 minutes
- Large files: May take 10-30 minutes

---

## ⚙️ Settings

Configure your preferences and application behavior.

### Theme

- **Light Mode:** Default, easy on eyes
- **Dark Mode:** Low-light viewing

### Email Preferences

- Language selection
- Notification settings
- Export format preferences

### Data Management

- Clear cache
- Reset statistics
- Export data
- Import configuration

### API Keys

If integrating with other systems:
1. Generate API key
2. Keep it secret
3. Use in applications
4. Revoke old keys

---

## 🆘 Troubleshooting

### Common Issues

**"Upload failed"**
- Check file format (TXT or CSV)
- Ensure file isn't corrupted
- Try smaller batch

**"Processing is slow"**
- System may be busy
- Try uploading smaller files
- Close other browser tabs

**"Lists disappeared"**
- Check if accidentally deleted
- Contact support with list name
- Data may be recoverable

**"Can't connect to cloud"**
- Check internet connection
- Verify Google credentials
- Try disconnecting/reconnecting

### Performance Tips

1. Process files in 10K-50K email batches
2. Use smart filters for lead qualification
3. Clear cache regularly
4. Archive old results
5. Schedule processing at off-peak times

### Getting Help

- Click **Help** button (bottom right)
- Chat with support
- Email: support@emailchecker.com
- Knowledge base: https://help.emailchecker.com

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + S` | Save current item |
| `Ctrl/Cmd + Z` | Undo last action |
| `Esc` | Close dialogs |
| `?` | Show help |

---

## 📝 Best Practices

### Email List Management

- Keep lists organized with clear names
- Use tags for easy categorization
- Archive completed lists
- Regular backups to cloud

### Processing Strategy

- Start with sample batches (100-1000 emails)
- Gradually increase batch size
- Monitor processing time
- Adjust parameters as needed

### Filter Optimization

- Test filters on sample data first
- Review filtered results
- Iterate and refine
- Save working filter configurations

### Data Safety

- Regularly backup to cloud
- Use archive manager
- Download important results
- Maintain blocklists

---

**For more help, visit:** [Documentation](./README.md)

**Last Updated:** 26 October 2025
✅ **Version 1.0.0 - Complete**
