# Smart Filter Configurations

This directory contains configuration files for Smart Filters - industry and geography-specific lead qualification systems.

## Available Configurations

### Universal Template
- **universal_exclusion_template.json** - Universal multilingual exclusion template (EN/DE/FR)
  - 13 exclusion categories (healthcare, education, finance, legal, etc.)
  - 200+ keywords across 3 languages
  - Use as standalone filter or as base for custom filters
  - See [UNIVERSAL_FILTER_GUIDE.md](../../UNIVERSAL_FILTER_GUIDE.md) for details

### Country-Specific Filters

#### Hydraulics Industry
- **austria_hydraulics.json** - Austrian hydraulic equipment
- **germany_hydraulics.json** - German hydraulic equipment
- **switzerland_hydraulics.json** - Swiss hydraulics (DE/FR/IT/EN)

#### Powder Metallurgy Industry
- **poland_powder_metal.json** - Polish powder metallurgy
- **czech_powder_metal.json** - Czech powder metallurgy
- **france_powder_metal.json** - French powder metallurgy

## Configuration Structure

Each config file includes:

```json
{
  "filter_name": "Display Name",
  "config_name": "file_name",
  "target_country": "XX",
  "target_industry": "industry_name",
  "languages": ["en", "de"],
  "geographic_priorities": {
    "high": ["country_terms"],
    "medium": ["region_terms"]
  },
  "exclusions": {
    "personal_domains": [...],
    "medical_domain_patterns": [...],
    "excluded_industries": {...}
  },
  "keywords": {
    "category_name": [...]
  },
  "scoring": {
    "weights": {...},
    "thresholds": {...}
  }
}
```

## Quick Start

### Use existing filter:
```bash
python3 email_checker.py smart-filter output/list_clean.txt --config poland_powder_metal
```

### Create custom filter:
```bash
# 1. Copy universal template
cp universal_exclusion_template.json my_filter.json

# 2. Edit my_filter.json:
#    - Change filter_name, config_name
#    - Set target_country, target_industry
#    - Add industry-specific keywords
#    - Configure geographic priorities

# 3. Apply filter
python3 email_checker.py smart-filter output/list_clean.txt --config my_filter
```

## Naming Convention

Configuration files should be named:
- `{country}_{industry}.json` - e.g., `poland_powder_metal.json`
- `universal_*.json` - for universal templates
- Use lowercase with underscores

## Best Practices

1. **Base on Universal Template**: Start with `universal_exclusion_template.json` to inherit common exclusions
2. **Add Industry Keywords**: Focus on industry-specific terms in your language(s)
3. **Configure Geography**: Set `geographic_priorities` for target markets
4. **Test Thoroughly**: Run on sample data before production use
5. **Document Changes**: Update version and description fields

## Scoring System

Standard scoring weights:
- Email Quality: 10%
- Company Relevance: 45%
- Geographic Priority: 30%
- Engagement: 15%

Standard thresholds:
- HIGH: score ≥ 100
- MEDIUM: score ≥ 50
- LOW: score ≥ 10
- EXCLUDED: score < 10

## See Also

- [UNIVERSAL_FILTER_GUIDE.md](../../UNIVERSAL_FILTER_GUIDE.md) - Universal template guide
- [SMART_FILTER_GUIDE.md](../../SMART_FILTER_GUIDE.md) - Complete Smart Filter documentation
- [CLAUDE.md](../../CLAUDE.md) - Project documentation
