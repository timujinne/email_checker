# Example Workflow - Creating and Using a Smart Filter

## Scenario: German Automotive Market

**Goal**: Create a filter for German automotive industry to segment a clean email list.

---

## Step 1: Create the Filter

### Option A: Interactive Mode (Recommended)

```bash
cd e:\Shtim\Downloads\email_checker
python3 smart_filter_skill/filter_generator.py --interactive
```

**Dialog:**
```
🎯 Smart Filter Generator - Interactive Mode

1️⃣  Select target country:
   [1] DE - Germany
   [2] FR - France
   [3] IT - Italy
   ...

Select (1-10) or enter country code: 1
✅ Germany selected
✅ Auto-loaded: German geographic data
✅ Primary language: German (de)

2️⃣  Languages:
   Default: de, en
   Additional languages (comma-separated) or press Enter:
✅ Languages: de, en

3️⃣  Select industry:
   [1] ✓ Hydraulics
   [2] ✓ Earthmoving
   [3] ✓ Automotive
   [4] ✓ Construction
   [5] ✓ Manufacturing
   [6]   Custom

Select (1-6): 3
   ✅ Loaded template: automotive_template.json
✅ Automotive industry selected

4️⃣  Filter name:
   Name (default: de_automotive): germany_automotive
✅ Filter name: germany_automotive

5️⃣  Generate files? [Y/n]: Y

🔧 Generating filter files...
   ✅ Created: smart_filters/configs/germany_automotive_config.json
   ✅ Created: smart_filters/germany_automotive_filter.py
   ✅ Updated: smart_filters/__init__.py

✅ Filter created successfully!

📝 Next steps:
   1. Review config: smart_filters/configs/germany_automotive_config.json
   2. Test filter: python3 email_checker.py smart-filter <file> --config germany_automotive
```

### Option B: Command Line Mode

```bash
python3 smart_filter_skill/filter_generator.py \
  --country DE \
  --industry automotive \
  --languages de,en \
  --output germany_automotive
```

---

## Step 2: Review and Customize the Filter (Optional)

Open the generated config:

```bash
# View the config
cat smart_filters/configs/germany_automotive_config.json
```

**Review key sections:**

1. **Industry Keywords**: Check if all relevant terms are included
2. **Geographic Priorities**: Verify target cities/regions
3. **Hard Exclusions**: Ensure appropriate industries are excluded
4. **Scoring Weights**: Adjust if needed

**Example customization** (optional):

```json
{
  "scoring": {
    "weights": {
      "email_quality": 0.10,
      "company_relevance": 0.50,  // Increased from 0.45
      "geographic_priority": 0.25, // Decreased from 0.30
      "engagement": 0.15
    }
  }
}
```

---

## Step 3: Process Your Email List

### First: Basic Cleaning

```bash
# If you haven't already processed the list through basic filtering
python3 email_checker.py check input/germany_automotive_contacts.txt
```

**Output:**
```
📧 Processing: germany_automotive_contacts.txt
✅ Loaded 10,250 emails
🔍 Checking against blocklists...
   Blocked by email list: 347
   Blocked by domain list: 128
   Invalid format: 45
✅ Clean emails: 9,730

📁 Saved:
   - output/germany_automotive_contacts_clean_20250121.txt (9,730 emails)
   - output/germany_automotive_contacts_blocked_20250121.txt (520 emails)
```

### Second: Smart Filtering

```bash
python3 email_checker.py smart-filter \
  output/germany_automotive_contacts_clean_20250121.txt \
  --config germany_automotive
```

**Output:**
```
🎯 Smart Filter: germany_automotive

📊 Processing: 9,730 emails

⚙️  Hard exclusions:
   - Personal domains: 1,247
   - HR/service prefixes: 834
   - Excluded industries: 621
   - Geographic restrictions: 156
   - Suspicious patterns: 23
   Total excluded: 2,881

✅ Valid for scoring: 6,849

📈 Scoring results:
   - HIGH priority (≥100):    1,247 (18.2%)
   - MEDIUM priority (50-99): 2,834 (41.4%)
   - LOW priority (10-49):    2,156 (31.5%)
   - EXCLUDED (<10):          612 (8.9%)

⏱️  Processing time: 8.3 seconds

📁 Output files:
   ✅ Germany_Automotive_..._HIGH_PRIORITY_20250121_143022.txt (1,247 emails)
   ✅ Germany_Automotive_..._HIGH_PRIORITY_metadata_20250121_143022.csv
   ✅ Germany_Automotive_..._HIGH_PRIORITY_metadata_20250121_143022.json
   ✅ Germany_Automotive_..._MEDIUM_PRIORITY_... (2,834 emails)
   ✅ Germany_Automotive_..._LOW_PRIORITY_... (2,156 emails)
   ✅ Germany_Automotive_..._EXCLUDED_... (612 emails)
   ✅ Germany_Automotive_..._EXCLUSION_REPORT_20250121_143022.csv
```

---

## Step 4: Analyze Results

### Check HIGH priority contacts

```bash
# View first 20 HIGH priority emails
head -n 20 output/Germany_Automotive_*_HIGH_PRIORITY_*.txt
```

**Example output:**
```
info@bosch-automotive.de
sales@continental-automotive.de
export@zf-group.com
kontakt@mahle.de
info@schaeffler-automotive.de
...
```

### Check exclusion report

```bash
# View exclusion reasons
head -n 20 output/Germany_Automotive_*_EXCLUSION_REPORT_*.csv
```

**Example:**
```
email,exclusion_reason,category,details
hr@volkswagen.de,hr_service_prefix,critical,"HR email prefix detected"
info@university-stuttgart.de,excluded_industry,critical,"Education industry"
info@gmail.com,personal_domain,critical,"Personal domain: gmail.com"
...
```

---

## Step 5: Use Segmented Lists

### For email campaigns:

**Campaign 1: HIGH Priority (Hot Leads)**
```
Target: 1,247 contacts
File: Germany_Automotive_..._HIGH_PRIORITY_*.txt
Message: Personalized, direct pitch
Expected conversion: 5-10%
```

**Campaign 2: MEDIUM Priority (Warm Leads)**
```
Target: 2,834 contacts
File: Germany_Automotive_..._MEDIUM_PRIORITY_*.txt
Message: General value proposition
Expected conversion: 2-5%
```

**Campaign 3: LOW Priority (Cold Leads)**
```
Target: 2,156 contacts
File: Germany_Automotive_..._LOW_PRIORITY_*.txt
Message: Educational content, nurturing
Expected conversion: 1-2%
```

---

## Step 6: Iterate and Optimize

### Analyze first campaign results

After running campaigns, analyze which contacts converted:

```bash
# Example: 67 conversions from HIGH priority
# Calculate actual conversion rate: 67/1247 = 5.4% ✅

# If conversion is lower than expected:
# 1. Review HIGH priority contacts manually
# 2. Check if filter is too lenient or strict
# 3. Adjust scoring thresholds or weights
```

### Optimize filter

```bash
# Option 1: Adjust thresholds in config
# Edit: smart_filters/configs/germany_automotive_config.json

# Option 2: Add more industry-specific terms
# Edit industry_keywords section

# Option 3: Strengthen exclusions
# Add more negative_keywords or excluded_industries

# Then re-run smart-filter with updated config
python3 email_checker.py smart-filter \
  output/germany_automotive_contacts_clean_20250121.txt \
  --config germany_automotive
```

---

## Best Practices

### ✅ DO:

- Always review a sample of HIGH priority contacts manually
- Check exclusion report for false positives
- Iterate on filter settings based on campaign results
- Keep filters updated with new industry terms
- Use metadata CSV files for deeper analysis

### ❌ DON'T:

- Skip the basic cleaning step (blocklists first!)
- Use smart filter on uncleaned lists
- Ignore the exclusion report
- Set thresholds too high (you'll miss opportunities)
- Forget to back up your filter configs

---

## Troubleshooting

### Problem: Too many exclusions

**Solution**: Review and soften hard_exclusions

```bash
# Check what's being excluded
python3 smart_filter_skill/blocklist_analyzer.py --analyze

# Review filter config
cat smart_filters/configs/germany_automotive_config.json | grep -A 20 "excluded_industries"
```

### Problem: Too few HIGH priority

**Solution**: Lower threshold or increase weights

```json
{
  "scoring": {
    "thresholds": {
      "high_priority": 80  // Was 100
    }
  }
}
```

### Problem: False positives in HIGH

**Solution**: Add negative keywords or strengthen exclusions

```json
{
  "industry_keywords": {
    "negative_keywords": [
      "retail",
      "e-commerce",
      "university"
    ]
  }
}
```

---

## Summary

✅ **Created** germany_automotive filter in 2 minutes
✅ **Processed** 9,730 emails in 8 seconds
✅ **Segmented** into 4 priority tiers
✅ **Identified** 1,247 high-priority leads (18%)
✅ **Excluded** 2,881 irrelevant contacts (30%)

**Total time**: ~15 minutes (including customization)
**Result**: High-quality, segmented contact list ready for targeted campaigns
