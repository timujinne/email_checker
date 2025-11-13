---
name: smart-filter-expert
description: Comprehensive smart filter creation and management system for B2B email list validation. This skill should be used when creating new email filters, improving existing ones, analyzing blocklist patterns, or optimizing email filtering workflows. Provides both interactive quick-start and detailed 8-step professional workflows with quality metrics and troubleshooting capabilities.
---

# Smart Filter Expert Skill

## Overview

Smart Filter Expert is a comprehensive system for creating, validating, and optimizing email filters for B2B lead qualification. The skill combines interactive quick-start capabilities with professional-grade 8-step workflow processes, blocklist analysis, and quality assurance tools.

**Core capabilities:**
- Interactive filter generation with smart suggestions (3-5 minutes)
- Professional 8-step workflow for complex requirements
- Blocklist pattern analysis and automatic filter optimization
- Multi-language support (7+ languages) and geographic targeting
- Quality metrics dashboard and troubleshooting guidance
- Automated testing and validation capabilities

## When to Use This Skill

Use this skill when:
- Creating new smart filters for specific countries/industries
- Improving existing filter configurations
- Analyzing blocklist patterns for quality optimization
- Troubleshooting poor filtering results
- Setting up automated email qualification workflows
- Needing both quick-start and professional-grade options

## Quick Start (3-Minute Workflow)

For immediate results with common scenarios:

```bash
# Interactive mode with smart suggestions
cd smart_filter_expert
python3 filter_generator.py --interactive
```

**Example dialogue:**
```
🎯 Smart Filter Generator - Interactive Mode

1. Target country code (e.g., DE, FR, IT, ES, PL): DE
   ✅ Germany selected - Auto-detected: German business terminology
   ✅ Suggested languages: de, en (primary: German)

2. Target industry:
   [1] Hydraulics ✅ (template available)
   [2] Earthmoving
   [3] Automotive ✅ (template available)
   [4] Construction
   [5] Manufacturing

   Select (1-5): 1
   ✅ Hydraulics industry - Loaded template: 127 keywords

3. Filter name (auto-suggested: germany_hydraulics): [Enter]
   ✅ Using: germany_hydraulics

4. Generate filter? [Y/n]: [Enter]
   ✅ Created: configs/germany_hydraulics_config.json
   ✅ Created: germany_hydraulics_filter.py
   ✅ Auto-tested: Sample validation passed
```

## Professional Workflow (8-Step Process)

For complex requirements or maximum quality:

### Step 1: Requirements Analysis
Use `scripts/analyze_requirements.py` for comprehensive market analysis:
- Geographic scope and language requirements
- Industry focus and adjacent sectors
- Special considerations (multilingual markets, regional variants)

### Step 2: Template Selection
Consult reference materials for optimal starting points:
- `references/industry_templates.md` - Industry-specific patterns
- `references/quality_guide.md` - Best practices and metrics
- `assets/industry_templates/` - Proven template configurations

### Step 3: Configuration Building
Use `filter_generator.py` with advanced options:
```bash
python3 filter_generator.py --country DE --industry hydraulics --advanced
```

### Step 4: Quality Validation
Run comprehensive validation:
```bash
python3 filter_validator.py --validate germany_hydraulics --test-samples
```

### Step 5: Blocklist Integration
Optimize with real-world data:
```bash
python3 blocklist_analyzer.py --update-configs
```

### Step 6: Performance Testing
Automated performance validation:
```bash
python3 scripts/test_filter.py --config germany_hydraulics --benchmark
```

### Step 7: Documentation
Generate usage documentation:
```bash
python3 scripts/generate_docs.py --filter germany_hydraulics
```

### Step 8: Deployment and Monitoring
Deploy filter with quality tracking:
```bash
python3 scripts/deploy_filter.py --config germany_hydraulics --monitor
```

## Key Components

### Core Scripts

#### `filter_generator.py` - Enhanced Interactive Generator
- **Smart suggestions** based on country/industry selection
- **Real-time validation** with error prevention
- **Template adaptation** from existing successful filters
- **Quality scoring** with target metrics
- **Multi-language support** with automatic terminology

#### `blocklist_analyzer.py` - Pattern Analysis Engine
- **Statistical analysis** of 22K+ blocked emails/domains
- **Pattern detection** for temporary emails, spam domains, suspicious prefixes
- **Auto-configuration** suggestions for filter improvements
- **Quality metrics** tracking and reporting

#### `filter_validator.py` - Quality Assurance System
- **Automated testing** on sample datasets
- **Quality metrics** validation (HIGH: 0-10%, >90% relevance)
- **Performance benchmarking** against previous versions
- **Troubleshooting recommendations**

### Reference Materials

#### `references/quality_guide.md`
- Target metrics and quality benchmarks
- Best practices for scoring weights and thresholds
- Common optimization patterns

#### `references/troubleshooting.md`
- Frequent problems and solutions
- Performance optimization techniques
- Quality improvement strategies

#### `references/workflow_examples.md`
- Detailed walkthroughs for complex scenarios
- Multilingual market handling (Switzerland, Belgium)
- Hybrid industry configurations

### Asset Libraries

#### `assets/industry_templates/`
- Proven configurations for 5+ core industries
- Template adaptation patterns
- Performance benchmarks

#### `assets/language_library/`
- Business terminology in 7+ languages
- HR prefixes and exclusions by language
- Geographic and cultural variations

#### `assets/geographic_data/`
- Country-specific business patterns
- Regional economic zones and industrial clusters
- Cross-border market relationships

## Quality Metrics and Targets

### Performance Benchmarks
- **HIGH priority emails**: 0-10% of total, >90% relevance
- **MEDIUM priority**: 5-20% of total
- **LOW priority**: 60-80% of total
- **EXCLUDED**: 10-25% with justified reasons

### Quality Checklist
- [ ] Country TLD included in geographic priorities
- [ ] Native language keywords prioritized over English
- [ ] Personal domains cover country-specific providers
- [ ] HR terminology includes local variations
- [ ] Industry keywords cover both primary and secondary terms
- [ ] Negative keywords exclude irrelevant sectors
- [ ] Scoring weights follow recommended standards
- [ ] Thresholds align with quality targets

### Troubleshooting Common Issues

#### Too many HIGH priority emails (>15%)
**Cause**: Keywords too broad or scoring too generous
**Solution**:
- Add specific negative keywords to exclusions
- Reduce scoring weights for company relevance
- Increase HIGH priority threshold (100 → 120)

#### Too few HIGH priority emails (<2%)
**Cause**: Keywords too restrictive or missing key terms
**Solution**:
- Add synonyms and regional variants
- Check for spelling variations in local language
- Review MEDIUM tier for false negatives

#### Personal emails in results
**Cause**: Incomplete personal domain coverage
**Solution**:
- Run `blocklist_analyzer.py` for current market patterns
- Add country-specific email providers
- Include mobile operator domains

## Advanced Features

### Smart Adaptation
```bash
# Adapt existing successful filter to new market
python3 filter_generator.py --from-template italy_hydraulics --adapt-country ES
```

### Batch Processing
```bash
# Create multiple filters for a region
python3 scripts/batch_create.py --region "europe" --industry "automotive"
```

### Quality Monitoring
```bash
# Track filter performance over time
python3 scripts/monitor_quality.py --config germany_hydraulics --period "30d"
```

## Integration with Email Checker System

### Usage Examples
```bash
# Apply new filter to email list
python3 ../email_checker.py smart-filter output/germany_list_clean.txt --config germany_hydraulics

# Batch process multiple lists
python3 ../email_checker.py smart-filter-batch --pattern "output/*Germany*_clean_*.txt" --config germany_hydraulics
```

### Output Structure
```
smart_filters/configs/
├── germany_hydraulics.json          # Config files (UNIFIED location)
├── poland_powder_metal.json
└── ...

output/
├── Germany_Hydraulics_20241215_HIGH_PRIORITY.txt
├── Germany_Hydraulics_20241215_MEDIUM_PRIORITY.txt
├── Germany_Hydraulics_20241215_LOW_PRIORITY.txt
├── Germany_Hydraulics_20241215_EXCLUDED.txt
├── Germany_Hydraulics_20241215_EXCLUSION_REPORT.csv
└── Germany_Hydraulics_20241215_summary.html
```

## Best Practices

### For Quick Results
1. Start with interactive mode for smart suggestions
2. Use templates when available (marked with ✅)
3. Validate with sample data before full deployment
4. Monitor quality metrics for first week

### For Maximum Quality
1. Follow complete 8-step professional workflow
2. Consult reference materials for market-specific insights
3. Use blocklist analyzer for ongoing optimization
4. Document custom configurations for future reuse

### For Multilingual Markets
1. Enable multilingual mode for countries like Switzerland
2. Prioritize regional language variants
3. Test language-specific keyword performance
4. Monitor quality by language segment

## Skill Maintenance

### Regular Updates
- **Weekly**: Run blocklist analyzer for pattern updates
- **Monthly**: Review quality metrics and adjust thresholds
- **Quarterly**: Update language libraries with new terminology

### Performance Tracking
- Monitor conversion rates by priority tier
- Track exclusion reason patterns
- Analyze geographic distribution changes
- Document successful configuration patterns

## Support and Evolution

### Getting Help
1. Check `references/troubleshooting.md` for common issues
2. Review workflow examples in `examples/` directory
3. Use quality checklist for systematic validation
4. Consult blocklist analyzer insights for optimization

### Contributing Improvements
- Document successful configuration patterns
- Share quality metrics and benchmarks
- Add new language/industry templates
- Update troubleshooting solutions

---

**Version**: 2.0.0
**Last Updated**: 2024-12-15
**Quality Target**: 90%+ relevance for HIGH priority tier