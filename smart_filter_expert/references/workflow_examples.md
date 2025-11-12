# Workflow Examples for Smart Filter Creation

## Overview

This guide provides detailed walkthroughs for creating smart filters in various scenarios, from simple cases to complex multilingual markets.

## Quick Start Examples

### Example 1: German Automotive Filter (3-Minute Workflow)

**Scenario:** Need to filter German automotive suppliers for B2B sales campaign.

**Step 1: Start Interactive Generator**
```bash
cd smart_filter_expert
python3 filter_generator.py --interactive
```

**Step 2: Country Selection**
```
1️⃣  Select target country:
   🌟 Popular: Germany(DE), Italy(IT), France(FR), Spain(ES), Poland(PL)
   [ 1] DE - Germany
   [ 2] FR - France
   [ 3] IT - Italy
   ...
Select: 1
✅ Germany selected
```

**Step 3: Industry Selection**
```
2️⃣  Select target industry:
   [1] ✅ Hydraulics (45 keywords)
   [2] ✅ Automotive (67 keywords)
   [3] ⚪ Earthmoving (basic)
   [4] ⚪ Construction (basic)
Select: 2
✅ Automotive industry selected
✅ Loaded template: automotive_template.json
```

**Step 4: Smart Suggestions Applied**
```
📋 Smart Configuration Summary:
   🌍 Country: Germany (DE)
   🏭 Industry: Automotive
   📚 Suggested Languages: de, en
   🎯 Quality Thresholds: HIGH=95, MEDIUM=45
   📍 Priority Regions: germany, .de, berlin, munich, hamburg...
```

**Step 5: Advanced Options**
```
5️⃣  Advanced Options (optional):
   Quality mode [balanced/aggressive/conservative] (default: balanced): aggressive
   Enable auto-tuning? [Y/n] (default: Y): [Enter]
```

**Step 6: Generation and Validation**
```
🚀 Generating enhanced filter...
   ✅ Created: smart_filters/configs/germany_automotive_config.json
   ✅ Created: smart_filters/germany_automotive_filter.py
   ✅ Applied blocklist insights to germany_automotive

🧪 Running post-generation validation...
✅ Filter created and validated successfully!
   Quality Score: 95/100
   Estimated Performance: Optimized
```

**Result:**
```bash
# Apply to email list
python3 ../email_checker.py smart-filter german_leads.txt --config germany_automotive

# Output:
# - Germany_Automotive_20241215_HIGH_PRIORITY.txt (8% of total)
# - Germany_Automotive_20241215_MEDIUM_PRIORITY.txt (12%)
# - Germany_Automotive_20241215_LOW_PRIORITY.txt (65%)
# - Germany_Automotive_20241215_EXCLUDED.txt (15%)
```

## Complex Scenarios

### Example 2: Swiss Multilingual Machinery Filter

**Scenario:** Target Swiss machinery manufacturers supporting German, French, Italian, and English languages.

#### Step 1: Requirements Analysis
```bash
python3 scripts/analyze_requirements.py --country CH --industry machinery --multilingual
```

**Output:**
```
📊 Market Analysis: Switzerland - Machinery
   Languages: de (65%), fr (22%), it (8%), en (5%)
   Industrial Regions: Zurich, Geneva, Basel, Bern
   Special Considerations: 4 official languages, strong regional differences
   Recommended Approach: Multilingual configuration with regional weighting
```

#### Step 2: Enhanced Configuration Generation
```bash
python3 filter_generator.py --country CH --industry manufacturing --multilingual --advanced
```

**Configuration Highlights:**
```json
{
  "filter_name": "swiss_machinery",
  "target_country": "CH",
  "target_industry": "manufacturing",
  "languages": ["de", "fr", "it", "en"],
  "multilingual_mode": true,
  "regional_weighting": {
    "german_speaking": 0.65,
    "french_speaking": 0.22,
    "italian_speaking": 0.08,
    "english_speaking": 0.05
  },
  "industry_keywords": {
    "manufacturing_de": ["maschinenbau", "fertigung", "produktion", "werkzeugmaschine"],
    "manufacturing_fr": ["construction mécanique", "fabrication", "production", "machine-outil"],
    "manufacturing_it": ["costruzioni meccaniche", "produzione", "fabbricazione", "macchina utensile"],
    "manufacturing_en": ["manufacturing", "production", "fabrication", "machine tool"]
  }
}
```

#### Step 3: Quality Validation
```bash
python3 filter_validator.py --report swiss_machinery --sample-size 500
```

**Quality Report:**
```
📊 QUALITY REPORT SUMMARY
========================================
Filter: swiss_machinery
Overall Score: 92.5/100
Validation: ✅ PASSED
Testing Accuracy: 88.3%
Performance: Excellent

💡 Recommendations:
   • Add Italian-specific company suffixes (SAGL)
   • Consider regional industry variations
```

### Example 3: Spain Agriculture + Hydraulics Hybrid Filter

**Scenario:** Spanish agricultural equipment companies with hydraulic systems - hybrid industry approach.

#### Step 1: Hybrid Industry Definition
```bash
python3 filter_generator.py --country ES --industry hybrid --custom
```

**Custom Industry Configuration:**
```
🏭 Hybrid Industry Configuration:
   Primary Industry: agriculture
   Secondary Industry: hydraulics
   Hybrid Weight: 60% agriculture + 40% hydraulics
   Applications: Tractors, Irrigation systems, Harvesting equipment
```

#### Step 2: Specialized Keyword Development
```json
{
  "industry_keywords": {
    "agriculture_es": ["agricultura", "agrícola", "cultivo", "cosecha", "tractores"],
    "agriculture_en": ["agriculture", "farming", "harvest", "crops", "tractors"],
    "hydraulics_es": ["hidráulica", "oleohidráulica", "cilindro", "bomba", "válvula"],
    "hydraulics_en": ["hydraulic", "cylinder", "pump", "valve", "hydraulics"],
    "hybrid_applications": [
      "tractor hydraulics", "sistema hidráulico agrícola",
      "cosechadora hidráulica", "irrigación hidráulica",
      "maquinaria agrícola hidráulica"
    ]
  }
}
```

#### Step 3: Regional Focus Configuration
```json
{
  "geographic": {
    "priority_high": [
      "spain", ".es", "españa",
      "andalucía", "castilla la mancha", "valencia",
      "seville", "valencia", "murcia", "albacete"
    ],
    "agricultural_regions": [
      "andalucía", "extremadura", "castilla-la mancha",
      "aragón", "navarra", "la rioja"
    ]
  }
}
```

#### Step 4: Testing and Optimization
```bash
# Test with Spanish agricultural data
python3 filter_validator.py --test spain_agriculture_hydraulics --sample-size 200

# Benchmark performance
python3 filter_validator.py --benchmark spain_agriculture_hydraulics --sample-size 1000
```

## Professional Workflow Examples

### Example 4: Italy Hydraulics - Professional 8-Step Process

**Step 1: Requirements Analysis**
```bash
python3 scripts/analyze_requirements.py --country IT --industry hydraulics --detailed
```

**Analysis Results:**
```
📊 Detailed Market Analysis: Italy - Hydraulics
   Target Market Size: ~2,500 companies
   Key Regions: Lombardy, Emilia-Romagna, Piedmont, Veneto
   Language Requirements: Italian (primary), English (secondary)
   Special Considerations: Strong family-owned businesses, regional industrial clusters
   Quality Targets: HIGH ≤8%, relevance ≥95%
```

**Step 2: Template Selection and Customization**
```bash
# Review available templates
ls assets/industry_templates/hydraulics_template.json

# Customize for Italian market
python3 scripts/customize_template.py --template hydraulics --country IT
```

**Step 3: Configuration Building**
```python
# Build enhanced configuration
from filter_generator import FilterGenerator

generator = FilterGenerator()
config = generator.build_config_enhanced(
    filter_name="italy_hydraulics_professional",
    country_code="IT",
    industry="hydraulics",
    languages=["it", "en"],
    quality_targets={
        "high_priority_max_percent": 8,
        "high_priority_min_relevance": 95
    }
)
```

**Step 4: Quality Validation**
```bash
python3 filter_validator.py --validate italy_hydraulics_professional
```

**Step 5: Blocklist Integration**
```bash
# Analyze Italian blocklist patterns
python3 blocklist_analyzer.py --analyze --export-stats italy_blocklist_stats.json

# Apply insights to filter
python3 blocklist_analyzer.py --update-configs --filter italy_hydraulics_professional
```

**Step 6: Performance Testing**
```bash
# Comprehensive testing
python3 filter_validator.py --test italy_hydraulics_professional --sample-size 500

# Performance benchmark
python3 filter_validator.py --benchmark italy_hydraulics_professional --sample-size 2000
```

**Step 7: Documentation Generation**
```bash
python3 scripts/generate_docs.py --filter italy_hydraulics_professional --include-examples
```

**Step 8: Deployment and Monitoring**
```bash
# Deploy with monitoring
python3 scripts/deploy_filter.py --config italy_hydraulics_professional --monitor --quality-threshold 90
```

## Batch Processing Examples

### Example 5: European Regional Automotive Campaign

**Scenario:** Multi-country automotive campaign targeting Germany, France, Italy, and Spain.

#### Step 1: Batch Filter Creation
```bash
python3 scripts/batch_create.py \
  --countries "DE,FR,IT,ES" \
  --industry automotive \
  --quality-mode aggressive \
  --output-region "europe_automotive_2024"
```

**Generated Filters:**
- `germany_automotive_v2`
- `france_automotive_v2`
- `italy_automotive_v2`
- `spain_automotive_v2`

#### Step 2: Regional Testing
```bash
python3 scripts/batch_test.py \
  --filters "germany_automotive_v2,france_automotive_v2,italy_automotive_v2,spain_automotive_v2" \
  --sample-size 200 \
  --compare-results
```

#### Step 3: Unified Processing
```bash
# Process all country lists with respective filters
python3 ../email_checker.py smart-filter-batch \
  --pattern "output/*[DE,FR,IT,ES]_*_clean_*.txt" \
  --filter-mapping "DE:germany_automotive_v2,FR:france_automotive_v2,IT:italy_automotive_v2,ES:spain_automotive_v2"
```

## Troubleshooting Workflows

### Example 6: Filter Performance Optimization

**Problem:** German construction filter producing too many HIGH priority results (18%).

#### Step 1: Diagnosis
```bash
# Analyze current performance
python3 filter_validator.py --report germany_construction --sample-size 1000

# Check classification patterns
python3 scripts/analyze_classifications.py --filter germany_construction --category HIGH
```

**Diagnosis Results:**
```
📊 Performance Analysis: germany_construction
   HIGH Priority: 18% (target: ≤10%)
   Main Issues:
     • Keywords too broad ("bau", "construction")
     • Missing negative keywords
     • Low threshold (100 vs recommended 110)
```

#### Step 2: Root Cause Analysis
```bash
# Analyze misclassified HIGH priority emails
python3 scripts/misclassification_analysis.py --filter germany_construction --false-positives
```

**Key Findings:**
- Many construction services companies included
- Real estate developers classified as HIGH
- Missing "real estate" negative keywords

#### Step 3: Targeted Fixes
```json
{
  "industry_keywords": {
    "negative_keywords": [
      "immobilien", "real estate", "property development",
      "hausverwaltung", "property management",
      "architekturbüro", "architecture firm"
    ]
  },
  "scoring": {
    "thresholds": {
      "high_priority": 110,  // Increased from 100
      "medium_priority": 55  // Increased from 50
    }
  }
}
```

#### Step 4: Validation and Deployment
```bash
# Test updated configuration
python3 filter_validator.py --test germany_construction_v2 --sample-size 1000

# Deploy if improved
if [ $accuracy -gt 85 ] && [ $high_percent -lt 12 ]; then
    python3 scripts/deploy_filter.py --config germany_construction_v2 --backup
fi
```

## Quality Assurance Workflows

### Example 7: Comprehensive Filter Quality Audit

**Scenario:** Quarterly quality audit of all active filters.

#### Step 1: Automated Quality Assessment
```bash
python3 scripts/quality_audit.py --all-filters --detailed-report
```

#### Step 2: Manual Review Process
```bash
# Review worst-performing filters
python3 scripts/review_filter.py --filter poorest_performer --sample-size 500 --manual-review
```

#### Step 3: Benchmark Comparison
```bash
# Compare against previous quarter
python3 scripts/benchmark_comparison.py --period "Q4_2024" --baseline "Q3_2024"
```

#### Step 4: Optimization Implementation
```bash
# Apply recommended improvements
python3 scripts/optimize_filters.py --targets "low_quality_filters" --auto-apply-safe-changes
```

#### Step 5: Documentation Update
```bash
# Update quality documentation
python3 scripts/update_quality_docs.py --quarter "Q4_2024" --include-metrics
```

## Integration Examples

### Example 8: CRM Integration Workflow

**Scenario:** Integrating smart filter results with Salesforce CRM.

#### Step 1: Filter Application
```bash
python3 ../email_checker.py smart-filter crm_leads.csv --config industry_specific --format csv
```

#### Step 2: CRM Data Enrichment
```python
# Python script for CRM integration
import pandas as pd
from smart_filter_expert.filter_validator import FilterValidator

def enrich_crm_data(input_file, filter_name):
    # Load CRM data
    crm_data = pd.read_csv(input_file)

    # Apply smart filter
    validator = FilterValidator()
    results = validator.test_filter_with_samples(filter_name, len(crm_data))

    # Add classification to CRM data
    crm_data['lead_priority'] = results['classifications']
    crm_data['quality_score'] = results['scores']

    # Save enriched data
    crm_data.to_csv(f'enriched_{input_file}', index=False)

    return crm_data

# Usage
enriched_leads = enrich_crm_data('sales_leads.csv', 'technology_b2b')
```

#### Step 3: Automated Lead Scoring
```python
def calculate_lead_score(row):
    base_score = 0

    # Email quality
    if row['email_quality'] == 'corporate':
        base_score += 30
    elif row['email_quality'] == 'business':
        base_score += 20

    # Company relevance
    base_score += row['relevance_score'] * 0.5

    # Geographic priority
    if row['geographic_match'] == 'high':
        base_score += 25
    elif row['geographic_match'] == 'medium':
        base_score += 15

    return min(100, base_score)

# Apply to enriched data
enriched_leads['crm_lead_score'] = enriched_leads.apply(calculate_lead_score, axis=1)
```

---

**Version**: 1.0.0
**Last Updated**: 2024-12-15
**Maintained by**: Smart Filter Expert Team