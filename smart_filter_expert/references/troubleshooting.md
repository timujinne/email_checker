# Troubleshooting Guide for Smart Filters

## Overview

This guide provides solutions to common issues encountered when creating and using smart filters for B2B email list validation.

## Quick Reference: Common Issues

| Issue | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| Too many HIGH priority emails | Keywords too broad | Add negative keywords, raise thresholds |
| Too few HIGH priority emails | Keywords too restrictive | Add synonyms, check spelling |
| Personal emails in results | Missing personal domains | Run blocklist analyzer, update exclusions |
| Slow processing speed | Complex regex patterns | Simplify patterns, optimize structure |
| HR departments in results | Missing HR prefixes | Add local HR terminology |
| Geographic precision low | Missing TLD/cities | Add country TLD, industrial cities |

## Detailed Troubleshooting

### 1. Quantity Issues

#### Problem: Too many HIGH priority emails (>15% of total)

**Symptoms:**
- Filter classifies too many emails as HIGH priority
- Quality of HIGH priority leads is poor
- Manual review shows many irrelevant contacts

**Root Causes:**
1. **Broad keywords**: Generic terms match too many companies
2. **Low thresholds**: HIGH priority threshold too low
3. **Insufficient exclusions**: Missing industry exclusions
4. **Overly aggressive bonuses**: Bonus multipliers too high

**Solutions:**

**Step 1: Add Negative Keywords**
```json
{
  "industry_keywords": {
    "negative_keywords": [
      "retail", "e-commerce", "online shop", "b2c",
      "university", "education", "school", "academic",
      "government", "public sector", "municipality",
      "media", "newspaper", "magazine", "blog"
    ]
  }
}
```

**Step 2: Increase Thresholds**
```json
{
  "scoring": {
    "thresholds": {
      "high_priority": 120,  // Increased from 100
      "medium_priority": 60,  // Increased from 50
      "low_priority": 15       // Increased from 10
    }
  }
}
```

**Step 3: Refine Keywords**
- Remove overly generic terms ("company", "business")
- Add more specific industry terms
- Use exact phrases instead of single words
- Include negative variants

#### Problem: Too few HIGH priority emails (<2% of total)

**Symptoms:**
- Filter is too restrictive
- Missing relevant business contacts
- Most emails classified as LOW or EXCLUDED

**Root Causes:**
1. **Restrictive keywords**: Too specific terminology
2. **Missing synonyms**: No variant spellings
3. **High thresholds**: Requirements too strict
4. **Over-aggressive exclusions**: Too many exclusions

**Solutions:**

**Step 1: Add Keyword Variants**
```json
{
  "industry_keywords": {
    "primary": [
      "hydraulics", "hydraulic", "hydraulische",
      "oleodinamica", "idraulico", "oleodinamico",
      "hydraulique", "hidráulica"
    ]
  }
}
```

**Step 2: Lower Thresholds**
```json
{
  "scoring": {
    "thresholds": {
      "high_priority": 85,   // Decreased from 100
      "medium_priority": 40, // Decreased from 50
      "low_priority": 5      // Decreased from 10
    }
  }
}
```

**Step 3: Review Exclusions**
- Remove overly broad negative keywords
- Check for false positive exclusions
- Review industry exclusions for relevance

### 2. Quality Issues

#### Problem: Personal emails in results

**Symptoms:**
- Gmail, Yahoo, Hotmail addresses appearing in results
- Personal email formats not being filtered out
- @gmail.com, @outlook.com in HIGH/MEDIUM categories

**Root Causes:**
1. **Outdated personal domains**: Missing new email providers
2. **Country-specific providers**: Local email services not covered
3. **Corporate personal services**: Business-style personal domains missing

**Solutions:**

**Step 1: Run Blocklist Analyzer**
```bash
python3 blocklist_analyzer.py --analyze
python3 blocklist_analyzer.py --update-configs
```

**Step 2: Add Personal Domains Manually**
```json
{
  "hard_exclusions": {
    "personal_domains": [
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
      "icloud.com", "me.com", "mac.com",
      "gmx.de", "web.de", "t-online.de",  // German
      "libero.it", "virgilio.it", "alice.it",  // Italian
      "sfr.fr", "orange.fr", "wanadoo.fr",   // French
      "movistar.es", "telefonica.net"        // Spanish
    ]
  }
}
```

**Step 3: Add Country-Specific Providers**
Research current email providers in target country:
- Germany: GMX, WEB, T-Online
- Italy: Libero, Virgilio, Alice
- France: SFR, Orange, Wanadoo
- Spain: Movistar, Telefonica

#### Problem: HR departments in results

**Symptoms:**
- HR@, jobs@, careers@ emails appearing
- Recruitment agency contacts in results
- Human resources prefixes not being filtered

**Root Causes:**
1. **Missing HR prefixes**: Only English prefixes covered
2. **Language variations**: Local HR terminology missing
3. **Recruitment agencies**: Specialized HR services not excluded

**Solutions:**

**Step 1: Add Multilingual HR Prefixes**
```json
{
  "hard_exclusions": {
    "hr_prefixes": {
      "en": ["hr@", "jobs@", "careers@", "recruitment@", "talent@"],
      "de": ["personal@", "karriere@", "jobs@", "hr@"],
      "it": ["lavoro@", "personale@", "risorseumane@", "hr@"],
      "fr": ["rh@", "emploi@", "carriere@", "jobs@"],
      "es": ["rrhh@", "trabajo@", "empleo@", "recursos@"]
    }
  }
}
```

**Step 2: Add Recruitment Agency Terms**
```json
{
  "industry_keywords": {
    "negative_keywords": [
      "recruitment", "staffing", "employment agency",
      "personaldienst", "agentzia di lavoro",
      "agence d'emploi", "agencia de empleo"
    ]
  }
}
```

### 3. Performance Issues

#### Problem: Slow processing speed

**Symptoms:**
- Filter processing takes >5 seconds per 1000 emails
- Memory usage is high
- System becomes unresponsive during processing

**Root Causes:**
1. **Complex regex patterns**: Too many regular expressions
2. **Large keyword lists**: Thousands of keywords
3. **Inefficient matching**: Poor algorithm implementation
4. **Memory issues**: Loading too much data into memory

**Solutions:**

**Step 1: Optimize Keyword Lists**
- Remove duplicate keywords
- Group similar keywords
- Use string matching instead of regex when possible
- Limit to most effective keywords

**Step 2: Simplify Patterns**
```json
{
  "domain_patterns": {
    "relevant_patterns": [
      "hydraul",  // Instead of complex regex
      "pump",
      "cylinder"
    ]
  }
}
```

**Step 3: Use Efficient Data Structures**
```python
# Use sets for fast lookups
personal_domains = set(personal_domains_list)
hr_prefixes = set(hr_prefixes_list)

# Use compiled regex patterns
import re
compiled_patterns = [re.compile(pattern) for pattern in patterns]
```

### 4. Geographic Issues

#### Problem: Poor geographic targeting

**Symptoms:**
- Emails from wrong countries appearing in results
- Geographic exclusions not working
- Country-specific domains not being prioritized

**Root Causes:**
1. **Missing TLD patterns**: Country domain extensions not covered
2. **Incomplete city lists**: Only major cities included
3. **Cross-border regions**: Neighboring countries not considered
4. **Spelling variations**: Alternative country names missing

**Solutions:**

**Step 1: Add Comprehensive Geographic Data**
```json
{
  "geographic": {
    "priority_high": [
      "germany", ".de", "deutschland",
      "berlin", "munich", "hamburg", "frankfurt",
      "stuttgart", "cologne", "dusseldorf", "dresden"
    ],
    "priority_medium": [
      "austria", ".at", "switzerland", ".ch",
      "netherlands", ".nl", "belgium", ".be"
    ],
    "excluded_countries": [
      ".cn", ".com.cn", ".ru", ".by", ".ua",
      ".in", ".co.in", ".tr", ".com.tr",
      ".br", ".com.br", ".za", ".com.za"
    ]
  }
}
```

**Step 2: Include Industrial Regions**
```json
{
  "geographic": {
    "regions": [
      "bavaria", "baden-württemberg", "north rhine-westphalia",
      "lombardy", "piedmont", "veneto", "emilia-romagna",
      "île-de-france", "auvergne-rhône-alpes", "provence-alpes-côte d'azur"
    ]
  }
}
```

### 5. Language-Specific Issues

#### Problem: Multilingual market challenges

**Symptoms:**
- Missing relevant emails in minority languages
- Keywords only in one language
- Cultural variations not considered

**Root Causes:**
1. **Single language focus**: Only primary language considered
2. **Missing translations**: No industry terms in other languages
3. **Cultural differences**: Different business terminology

**Solutions:**

**Step 1: Enable Multilingual Mode**
```json
{
  "target_country": "CH",
  "languages": ["de", "fr", "it", "en"],
  "multilingual_mode": true
}
```

**Step 2: Add Industry Terms in All Languages**
```json
{
  "industry_keywords": {
    "manufacturing_de": ["hersteller", "fertigung", "produktion"],
    "manufacturing_fr": ["fabricant", "production", "manufacture"],
    "manufacturing_it": ["produttore", "produzione", "fabbrica"],
    "manufacturing_en": ["manufacturer", "production", "factory"]
  }
}
```

## Advanced Troubleshooting

### Debug Mode Configuration

Add debug options to filter configuration:
```json
{
  "debug_mode": true,
  "log_level": "verbose",
  "classification_details": true
}
```

### Testing Methodology

1. **Sample Data Testing**
   - Use 100-500 representative emails
   - Include edge cases and variations
   - Manually verify classifications

2. **A/B Testing**
   - Create multiple configurations
   - Test against same dataset
   - Compare results and metrics

3. **Performance Profiling**
   - Measure processing time
   - Monitor memory usage
   - Identify bottlenecks

### Monitoring and Maintenance

**Weekly Checks:**
- Classification accuracy trends
- Processing speed variations
- Error rates and patterns

**Monthly Reviews:**
- Keyword performance analysis
- Exclusion effectiveness
- Geographic targeting accuracy

**Quarterly Updates:**
- Update personal domain lists
- Refresh industry terminology
- Review geographic data
- Quality score assessment

## Emergency Procedures

### Filter Producing Poor Results

**Immediate Actions:**
1. **Stop using the filter** for production
2. **Switch to backup configuration** if available
3. **Analyze recent changes** to identify cause
4. **Roll back** to previous working version

**Recovery Steps:**
1. **Validate configuration** with filter_validator.py
2. **Test with sample data** to confirm issues
3. **Apply targeted fixes** based on problem analysis
4. **Gradual deployment** with monitoring

### System Performance Issues

**Symptoms:**
- Processing times >10 seconds per 1000 emails
- Memory usage spikes
- System crashes during processing

**Immediate Actions:**
1. **Reduce processing batch sizes**
2. **Monitor system resources**
3. **Check for memory leaks**
4. **Review recent configuration changes**

**Long-term Solutions:**
1. **Optimize filter algorithms**
2. **Implement caching mechanisms**
3. **Upgrade system resources**
4. **Consider distributed processing**

---

**Version**: 1.0.0
**Last Updated**: 2024-12-15
**Maintained by**: Smart Filter Expert Team