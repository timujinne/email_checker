# Smart Filter Scoring Guidelines

This reference provides best practices and guidelines for configuring the smart filter scoring system.

## Scoring Weights (Standard for All Configs)

The scoring system uses four components with fixed weights that have been optimized through testing:

```json
{
  "weights": {
    "email_quality": 0.10,
    "company_relevance": 0.45,
    "geographic_priority": 0.30,
    "engagement": 0.15
  }
}
```

### Component Breakdown

**Email Quality (10%)**
- Corporate domain vs. personal email
- Email structure quality
- Domain reputation signals
- Professional email patterns

**Company Relevance (45%)** - *Most Important*
- Industry keyword matches
- OEM indicators presence
- Domain pattern relevance
- Manufacturing/production signals

**Geographic Priority (30%)**
- Target country/region match
- High-priority locations
- Medium-priority proximity markets
- Regional economic zones

**Engagement (15%)**
- Email source type (product, service, contact)
- Department/role indicators
- B2B communication signals

### Why These Weights?

- **Company Relevance is highest (45%)** because targeting the right industry is critical for B2B campaigns
- **Geographic Priority is second (30%)** because location significantly affects logistics and business relationships
- **Engagement is third (15%)** because the right contact point improves conversion rates
- **Email Quality is lowest (10%)** because it's a baseline filter - we assume most emails passed basic validation

## Priority Thresholds (Standard)

```json
{
  "thresholds": {
    "high_priority": 100,
    "medium_priority": 50,
    "low_priority": 10,
    "exclude": 0
  }
}
```

### Threshold Meanings

**HIGH Priority (≥100 points)**
- Perfect or near-perfect matches
- Target country + target industry + OEM indicators
- Corporate emails from relevant domains
- Typically 0-5% of total list
- **Use for**: Immediate outreach, high-value campaigns

**MEDIUM Priority (50-99 points)**
- Good matches with some missing elements
- Target industry but adjacent geography
- Or target geography but broader industry match
- Typically 5-15% of total list
- **Use for**: Secondary outreach, nurture campaigns

**LOW Priority (10-49 points)**
- Weak matches, uncertain relevance
- Peripheral industries or distant geographies
- May include personal emails in target industry
- Typically 70-85% of total list
- **Use for**: Research, future prospecting, low-priority nurture

**EXCLUDED (< 10 points)**
- Clear mismatches
- Personal domains, HR departments, excluded industries
- Wrong geographic markets
- Typically 10-20% of total list
- **Action**: Remove from mailing list

## Bonus Multipliers

The system applies bonus multipliers to base scores for special cases:

### OEM Manufacturer Bonus: ×1.3
Applied when email contains strong OEM indicators:
- "manufacturer", "producer", "factory", "fabricante", "produttore"
- Tier 1/Tier 2 supplier indicators
- Contract manufacturing signals

### Geographic Match Bonus
- **High Priority Geography**: ×2.0
- **Medium Priority Geography**: ×1.2
- **Low Priority Geography**: ×1.0 (no bonus)

### Domain Match Bonus: ×1.5
Applied when domain contains relevant industry patterns:
- Industry-specific terms in domain name
- Manufacturing/engineering indicators
- Technical/professional domain structure

### Combined Bonuses
Bonuses multiply together. Example:
```
Base score: 50
+ OEM bonus (×1.3)
+ High geography bonus (×2.0)
+ Domain match bonus (×1.5)
= 50 × 1.3 × 2.0 × 1.5 = 195 points (HIGH priority)
```

## Configuration Best Practices

### 1. Keyword Selection

**DO:**
- Include native language terms first
- Add English technical terms as fallback
- Use both formal and informal variants
- Include common abbreviations and acronyms
- Cover industry-specific jargon

**DON'T:**
- Use overly generic terms (e.g., "metal", "machine")
- Rely only on English keywords for non-English markets
- Include ambiguous terms that match unrelated industries
- Forget regional variations (e.g., "catalogue" vs "catálogo")

### 2. Geographic Priorities

**High Priority:**
- Target country and its TLD
- Major industrial cities
- Key economic regions
- Direct neighbors with shared language/culture

**Medium Priority:**
- Adjacent countries
- Countries with strong trade relationships
- Regions with similar industries
- Diaspora markets

**Low Priority (if needed):**
- Distant but relevant markets
- Emerging markets with potential
- Historical trading partners

**Exclude:**
- Markets with trade restrictions
- Non-target continents (unless specific reason)
- Countries with different technical standards

### 3. Exclusion Lists

**Personal Domains:**
- Always include major free email providers
- Add country-specific free email services
- Include mobile carrier email domains
- Regional ISP email services

**HR Prefixes:**
- Include all language variants
- Cover formal and informal terms
- Add regional HR terminology
- Include internship/trainee-related terms

**Excluded Industries:**
- Education (conflicts with B2B targeting)
- Retail/Consumer (wrong business model)
- Media/Publishing (non-manufacturing)
- Finance/Insurance (unrelated sector)
- Tourism/Hospitality (service vs. manufacturing)
- Government/Municipal (procurement complexity)

### 4. OEM Indicators

Strong OEM indicators boost relevance:
- Manufacturing-specific terms ("factory", "plant", "works")
- Legal entities suggesting manufacturing (GmbH, S.p.A., LLC)
- Production/engineering departments
- Supply chain terminology ("tier 1", "supplier", "subcontractor")
- Quality certifications (ISO, QS, TS)

### 5. Domain Patterns

**Relevant Patterns:**
- Industry keywords in domain
- Manufacturing/technical terms
- Geographic indicators
- Product/service descriptors

**High-Value Domains:**
- Corporate legal entities
- "Group", "Holding", "International" suffixes
- Technical terms ("engineering", "systems", "technology")
- Professional TLDs (.pro, .tech, .engineering)

## Common Pitfalls to Avoid

### 1. Over-Reliance on Keywords
**Problem:** Too many broad keywords → false positives
**Solution:** Use specific, industry-focused terms; exclude broader terms

### 2. Ignoring Language Variants
**Problem:** Missing regional differences (español vs castellano, português vs português brasileiro)
**Solution:** Research local terminology, consult native speakers

### 3. Weak Geographic Filtering
**Problem:** Including too many countries dilutes targeting
**Solution:** Focus on 1-3 core markets, add adjacent markets as medium priority

### 4. Insufficient Exclusions
**Problem:** Personal emails and HR departments in results
**Solution:** Comprehensive personal domain list + HR prefix patterns

### 5. Static Configurations
**Problem:** Not updating based on campaign results
**Solution:** Regular review of exclusion reports, adjust keywords/exclusions

## Quality Metrics

Good configuration should achieve:
- **HIGH priority**: 0-10% of validated emails
- **MEDIUM priority**: 5-20% of validated emails
- **LOW priority**: 60-80% of validated emails
- **EXCLUDED**: 10-25% of validated emails

If metrics fall outside these ranges:
- **Too many HIGH**: Relax thresholds or reduce bonus multipliers
- **Too few HIGH**: Strengthen keyword matching, verify industry terms
- **Too many EXCLUDED**: Review exclusion lists for over-filtering
- **Too few EXCLUDED**: Add more exclusion patterns, personal domains

## Testing New Configurations

### Validation Checklist

1. **Language Coverage**
   - [ ] Native language keywords present
   - [ ] English fallbacks included
   - [ ] Regional variants covered
   - [ ] Industry jargon included

2. **Geographic Accuracy**
   - [ ] Target country in high priority
   - [ ] Major cities listed
   - [ ] TLD and common domains included
   - [ ] Adjacent markets in medium priority

3. **Exclusions Complete**
   - [ ] Country-specific personal domains
   - [ ] Local HR terminology
   - [ ] Industry exclusions appropriate
   - [ ] Suspicious patterns defined

4. **Industry Relevance**
   - [ ] Core industry keywords specific
   - [ ] OEM indicators well-defined
   - [ ] Application areas covered
   - [ ] Technical terms accurate

5. **Domain Patterns**
   - [ ] Relevant patterns specific enough
   - [ ] High-value domains include legal entities
   - [ ] Patterns match target market norms

### Test Process

1. Run configuration on small sample (100-500 emails)
2. Review HIGH priority emails manually - should be >90% relevant
3. Review EXCLUDED emails - should be justified exclusions
4. Check MEDIUM priority for false negatives
5. Adjust keywords, exclusions, and patterns
6. Re-run and validate improvements
7. Deploy to full list

## Example Scoring Scenarios

### Scenario 1: Perfect Match
```
Email: info@polishpowdermetals.pl
Domain: polishpowdermetals.pl (powder + metal in domain)
Country: Poland (high priority)
Industry: Powder metallurgy manufacturer

Calculation:
- Email quality: 10/10 (corporate domain)
- Company relevance: 45/45 (perfect industry match + OEM + domain match)
- Geographic priority: 30/30 (Poland + .pl domain)
- Engagement: 10/15 (info@ is good but not best)
= 95 base score

Bonuses:
- OEM manufacturer: ×1.3
- High geography: ×2.0
- Domain match: ×1.5
= 95 × 1.3 × 2.0 × 1.5 = 370.5 points

Result: HIGH PRIORITY
```

### Scenario 2: Adjacent Market
```
Email: sales@czechmachinery.cz
Domain: czechmachinery.cz
Country: Czech Republic (medium priority for Poland campaign)
Industry: General machinery (related but not exact)

Calculation:
- Email quality: 10/10
- Company relevance: 25/45 (related industry, some keywords)
- Geographic priority: 18/30 (medium priority market)
- Engagement: 12/15 (sales@ is excellent)
= 65 base score

Bonuses:
- Medium geography: ×1.2
= 65 × 1.2 = 78 points

Result: MEDIUM PRIORITY
```

### Scenario 3: Excluded
```
Email: hr@company.pl
Domain: company.pl
Country: Poland (high priority)
Industry: Unknown

Calculation:
- Email quality: 10/10
- Company relevance: 0/45 (no industry match)
- Geographic priority: 30/30
- Engagement: 0/15 (HR department - penalty)
= 40 base score

Exclusions:
- HR prefix detected → -40 points
= 0 points

Result: EXCLUDED
```

## Maintenance and Updates

### When to Update Configurations

- **Quarterly**: Review exclusion reports, update personal domain lists
- **After Each Campaign**: Analyze HIGH priority conversion rates, adjust keywords if needed
- **When Expanding Markets**: Add new geographic priorities, language variants
- **Industry Changes**: Update terminology when new technologies emerge
- **Regulatory Changes**: Adjust exclusions for GDPR/privacy requirements

### Version Control

Always increment version number when making significant changes:
- **1.0**: Initial release
- **1.1**: Minor updates (added keywords, domains)
- **1.2**: Moderate changes (exclusion list updates)
- **2.0**: Major revision (changed scoring logic, major keyword overhaul)

### Documentation

Document all significant changes in configuration comments or changelog:
```json
{
  "config_name": "spain_powder_metal",
  "version": "1.2",
  "changelog": "Added Basque region terms, updated personal domain list with new ISPs"
}
```
