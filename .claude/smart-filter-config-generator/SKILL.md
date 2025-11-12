---
name: smart-filter-config-generator
description: This skill should be used when creating or updating smart filter configurations for email list validation. Use this skill when the user wants to generate a JSON configuration file for filtering B2B email lists by country and industry, or when updating existing configurations with new keywords, exclusions, or geographic priorities.
---

# Smart Filter Config Generator

## Overview

Generate high-quality smart filter configurations for B2B email list validation. This skill creates JSON configuration files that filter and score email lists based on industry relevance, geographic targeting, and company quality indicators.

Smart filter configurations are used by the email_checker.py system to segment validated email lists into priority tiers (HIGH, MEDIUM, LOW, EXCLUDED) based on multi-factor scoring.

## When to Use This Skill

Use this skill when:
- Creating a new smart filter configuration for a country/industry combination
- User requests filtering for a specific market (e.g., "Spain powder metallurgy")
- Updating an existing configuration with new terms or exclusions
- Adapting a configuration template for a different geographic or industry target
- Troubleshooting low-quality filtering results

## Quick Start

To generate a new configuration:

1. **Identify Requirements**
   - Target country/countries
   - Target industry/industries
   - Primary language(s)

2. **Consult References**
   - `references/country_templates.md` → Language-specific terms, exclusions, domains
   - `references/industry_templates.md` → Industry keywords, applications, OEM indicators
   - `references/scoring_guidelines.md` → Best practices for scoring weights and thresholds
   - `references/existing_configs.md` → Examples and patterns from existing configurations

3. **Generate Configuration**
   - Use `scripts/generate_config.py` for automated generation
   - Or manually compose JSON using templates in `assets/config_template.json`

4. **Test and Validate**
   - Run on sample email list
   - Review HIGH priority results for relevance
   - Adjust keywords/exclusions as needed

## Core Workflow

### Step 1: Gather Requirements

Ask clarifying questions to understand the target market:

**Geographic Scope:**
- Primary target country?
- Adjacent/secondary markets to include?
- Language(s) spoken?
- Key industrial regions/cities?

**Industry Focus:**
- Specific industry or broader sector?
- Related/adjacent industries to include?
- B2B or B2C focus? (B2B assumed for smart filters)
- OEM manufacturers, distributors, or both?

**Special Considerations:**
- Multilingual market? (e.g., Switzerland: DE/FR/IT)
- Regional dialects or variants? (e.g., Catalan in Spain)
- Specific company types to exclude? (e.g., education, retail)

### Step 2: Select Base Templates

Consult `references/country_templates.md` for:
- Target market metadata (country_code, languages)
- Common business terminology in local language
- Legal entity formats (spa, s.l., gmbh, etc.)
- Personal email domains to exclude
- HR-related email prefixes
- Geographic priorities (cities, regions)

Consult `references/industry_templates.md` for:
- Core industry keywords (multilingual)
- Manufacturing processes
- Application areas
- Materials/technologies
- Components
- OEM indicators
- Domain patterns

### Step 3: Build Configuration Structure

Use the standard JSON structure:

```json
{
  "config_name": "{country}_{industry}",
  "display_name": "{Country} - {Industry}",
  "version": "1.0",
  "target_market": {
    "country_code": "XX",
    "country_name": "Country Name",
    "language_codes": ["xx", "en"],
    "primary_language": "xx"
  },
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
      "low_priority": 10,
      "exclude": 0
    }
  },
  "target_industry": "industry_name",
  "keywords": { /* See Step 4 */ },
  "geographic_priorities": { /* See Step 5 */ },
  "exclusions": { /* See Step 6 */ },
  "domain_patterns": { /* See Step 7 */ },
  "processing": { /* Standard, see template */ },
  "output": { /* Standard, see template */ }
}
```

### Step 4: Populate Industry Keywords

Create keyword categories based on industry:

**Core Industry Terms:**
```json
"keywords": {
  "primary_industry": [
    "native language term 1",
    "native language term 2",
    "English technical term 1",
    "English technical term 2",
    "abbreviations",
    "alternative spellings"
  ]
}
```

**Additional Categories** (as applicable):
- `manufacturing` → Production-related terms
- `applications` → Use cases, end products
- `components` → Parts, accessories, materials
- `materials` → Raw materials, alloys, composites
- `oem_indicators` → Manufacturing, supplier, tier terminology

**Keyword Best Practices:**
- Native language first, English as fallback
- Include both formal and colloquial terms
- Add common abbreviations and acronyms
- Include regional variants
- Use specific terms (avoid overly generic)

Example from `poland_powder_metal.json`:
```json
"powder_metallurgy": [
  "metalurgia proszków",  // Polish formal term
  "proszki metalowe",     // Polish alternative
  "powder metallurgy",    // English
  "PM parts",             // Abbreviation
  "spiekanie",            // Process (PL)
  "sintering"             // Process (EN)
]
```

### Step 5: Define Geographic Priorities

Structure geographic priorities in tiers:

```json
"geographic_priorities": {
  "high": [
    "country name variants",
    "country TLD (.xx)",
    "capital and major cities",
    "industrial regions",
    "alternative spellings"
  ],
  "medium": [
    "adjacent countries",
    "countries with shared language",
    "historical trading partners"
  ],
  "low": [  // Optional
    "distant but relevant markets"
  ],
  "regions": [
    "state/province names",
    "economic zones",
    "industrial clusters"
  ]
}
```

**Tips:**
- Always include country TLD (.es, .it, .pl, etc.)
- Add major industrial cities even if not largest population
- Include language variants (e.g., "españa" and "spain")
- Consider economic relationships (EU, trade blocs)

### Step 6: Configure Exclusions

**⚠️ CRITICAL: All configurations MUST include the 7 mandatory exclusion categories below. Failure to include these caused the Powder Metal Incident (Oct 2025) where 200+ irrelevant contacts contaminated mailing lists.**

**📖 Complete Reference:** See `references/critical_exclusions_guide.md` for full multilingual templates.

**📋 Template:** Use `assets/critical_exclusions_template.json` as starting point.

#### 6.1 CRITICAL Exclusions (MANDATORY)

These 7 categories are **NON-NEGOTIABLE** for all B2B filter configurations:

**1. Medical & Healthcare**
```json
"medical_domain_patterns": [
  "hospital", "clinic", "medical", "health",        // Universal
  "szpital", "klinika", "przychodnia",              // Polish
  "hôpital", "clinique", "santé",                   // French
  "nemocnice", "poliklinika", "zdravotní"           // Czech
],
"medical_prefixes": [
  "patient@", "reception@", "diagnosis@",
  "pacient@", "rejestracja@", "diagnostyka@"        // Local variants
]
```

**2. Educational Institutions**
```json
"educational_domain_patterns": [
  "university", "school", "college", ".edu",        // Universal
  "uniwersytet", "szkoła", "akademia",              // Polish
  "université", "école", "académie",                // French
  "univerzita", "škola", "vysoká škola"             // Czech
],
"educational_prefixes": [
  "admissions@", "student@", "faculty@"
]
```

**3. Government & Public Sector**
```json
"government_domain_patterns": [
  "ministry", "office", "administration", ".gov",   // Universal
  "urząd", "gmina", "ministerstwo", "powiat",       // Polish
  "mairie", "préfecture", "ministère", ".gouv",     // French
  "ministerstvo", "úřad", "město", "správa"         // Czech
],
"government_prefixes": [
  "office@", "ministry@", "administration@",
  "urzad@", "gmina@", "mesto@"                      // Local variants
]
```

**4. Pharmacy** (NEW - Added Oct 2025)
```json
"pharmacy_domain_patterns": [
  "pharmacy", "pharmaceutical",                      // Universal
  "apteka", "farmaceuta", "farmaceutyczny",         // Polish
  "pharmacie", "pharmaceutique", "officine",        // French
  "lékárna", "lekarna", "farmaceutický"             // Czech
],
"pharmacy_prefixes": [
  "pharmacy@", "prescription@",
  "apteka@", "recepta@", "pharmacie@", "lekarna@"
]
```

**5. Legal Services** (NEW - Added Oct 2025)
```json
"legal_domain_patterns": [
  "lawyer", "attorney", "law firm", "legal",        // Universal
  "notariusz", "prawnik", "adwokat", "kancelaria",  // Polish
  "notaire", "avocat", "juridique", "huissier",     // French
  "notář", "právník", "advokát", "právní"           // Czech
],
"legal_prefixes": [
  "legal@", "lawyer@", "attorney@",
  "notary@", "notariusz@", "avocat@", "notar@"
]
```

**6. Tourism & Travel** (NEW - Added Oct 2025)
```json
"tourism_domain_patterns": [
  "tourism", "travel", "hotel", "booking",          // Universal
  "turystyka", "podróże", "wycieczka", "pensjonat", // Polish
  "tourisme", "voyage", "hôtel", "hébergement",     // French
  "turismus", "cestování", "hotel", "ubytování"     // Czech
],
"tourism_prefixes": [
  "tourism@", "travel@", "booking@",
  "turystyka@", "podroze@", "voyage@", "cestovni@"
]
```

**7. Research Institutes & NGOs**
```json
"research_ngo_domain_patterns": [
  "research", "institute", "foundation", "fund",    // Universal
  "badania", "instytut", "fundacja", "stowarzyszenie", // Polish
  "recherche", "institut", "fondation", "association", // French
  "výzkum", "institut", "nadace", "společnost"      // Czech
],
"research_prefixes": [
  "research@", "foundation@",
  "badania@", "fundacja@", "recherche@", "vyzkum@"
]
```

**Excluded Industries (Include ALL 7 categories):**
```json
"excluded_industries": {
  "healthcare": [...],          // Medical + pharmacy combined
  "education": [...],
  "government_public": [...],
  "pharmacy": [...],            // Separate pharmacy category
  "legal_services": [...],      // Notaries, lawyers
  "tourism_travel": [...],      // Tourism + hospitality
  "research_ngo": [...],
  // Also include (existing):
  "retail_consumer": [...],
  "media_advertising": [...],
  "finance_insurance": [...],
  "hr_agencies": [...]
}
```

#### 6.2 Standard Exclusions

**Personal Domains:**
```json
"personal_domains": [
  "gmail.com",           // Universal
  "hotmail.{country}",   // Localized
  "country-specific ISPs", // Research current market
  "mobile carrier domains" // vodafone.xx, orange.xx
]
```

**Service Prefixes:**
```json
"service_prefixes": [
  "noreply@", "donotreply@",
  "admin@", "webmaster@",
  "gdpr@", "privacy@", "cert@"
]
```

**Excluded Country Domains:**
```json
"excluded_country_domains": [
  ".cn", ".com.cn", ".in", ".ru", ".br",
  ".au", ".za", ".jp", ".kr", ".vn"
]
```

**Suspicious Patterns (Regex):**
```json
"suspicious_patterns": [
  "^[a-f0-9]{20,}@",     // Long hex strings
  "^[a-z0-9]{15,}@",     // Long random strings
  "[\\u4e00-\\u9fff]",    // Chinese characters
  "[\\u0400-\\u04FF]"     // Cyrillic (if not target market)
]
```

### Step 7: Define Domain Patterns

Patterns that indicate relevant companies:

**Relevant Patterns:**
```json
"relevant_patterns": [
  "industry keywords",
  "manufacturing terms",
  "technical terminology",
  "product/service descriptors"
]
```

**High-Value Domains:**
```json
"high_value_domains": [
  "legal entity suffixes (spa, srl, gmbh, sa)",
  "group", "holding", "international",
  "engineering", "technology", "systems",
  "manufacturing", "industrial"
]
```

Example from `italy_hydraulics.json`:
```json
"domain_patterns": {
  "relevant_patterns": [
    "idraulico", "idraulica",  // Hydraulic (IT)
    "oleodinamico",             // Hydraulic variant
    "cilindro", "cilindri",     // Cylinder
    "macchinario", "macchine",  // Machinery
    "industriale"               // Industrial
  ],
  "high_value_domains": [
    "spa", "srl", "snc",        // Italian legal entities
    "group", "engineering",
    "manufacturing", "systems"
  ]
}
```

### Step 8: Validate and Test

**Pre-Deployment Checklist:**

**Basic Configuration:**
- [ ] All required fields present (config_name, display_name, version)
- [ ] Target market metadata accurate
- [ ] Scoring weights use standard values (0.10, 0.45, 0.30, 0.15)
- [ ] Thresholds use standard values (100, 50, 10, 0)
- [ ] Keywords include both native language and English
- [ ] Geographic priorities cover target country + TLD
- [ ] Processing and output sections use standard templates

**CRITICAL: 7 Mandatory Exclusion Categories (MUST ALL BE PRESENT):**
- [ ] **Medical** - `medical_domain_patterns` + `medical_prefixes` (hospital, clinic, etc.)
- [ ] **Educational** - `educational_domain_patterns` + `educational_prefixes` (university, school, etc.)
- [ ] **Government** - `government_domain_patterns` + `government_prefixes` (ministry, office, etc.)
- [ ] **Pharmacy** - `pharmacy_domain_patterns` + `pharmacy_prefixes` (apteka, pharmacie, lékárna, etc.)
- [ ] **Legal** - `legal_domain_patterns` + `legal_prefixes` (notary, lawyer, avocat, etc.)
- [ ] **Tourism** - `tourism_domain_patterns` + `tourism_prefixes` (travel, hotel, turystyka, etc.)
- [ ] **Research/NGO** - `research_ngo_domain_patterns` + `research_prefixes` (institute, foundation, etc.)

**Excluded Industries (MUST include ALL 7 + standard categories):**
- [ ] `healthcare` (medical + diagnostics + oncology)
- [ ] `education` (schools + universities)
- [ ] `government_public` (ministries + municipalities)
- [ ] `pharmacy` (pharmacies + pharmaceutical)
- [ ] `legal_services` (notaries + lawyers + law firms)
- [ ] `tourism_travel` (tourism + hotels + travel agencies)
- [ ] `research_ngo` (research institutes + foundations + NGOs)
- [ ] `retail_consumer`, `media_advertising`, `finance_insurance`, `hr_agencies`

**Standard Exclusions:**
- [ ] Personal domains include country-specific ISPs and mobile carriers
- [ ] HR prefixes cover local terminology
- [ ] Service prefixes (noreply@, admin@, gdpr@)
- [ ] Excluded country domains (non-target markets)
- [ ] Suspicious patterns (regex for hashes, invalid characters)

**Quality Checks:**
- [ ] Domain patterns include BOTH universal English AND native language terms
- [ ] Email prefixes include local variants (e.g., gmina@, urzad@, mairie@)
- [ ] All 7 critical categories have >= 5 domain patterns each
- [ ] All 7 critical categories have >= 3 email prefixes each

**Testing Process:**
1. Run smart filter on small sample (100-500 emails)
2. Review HIGH priority emails (should be >90% relevant)
3. Review EXCLUDED emails (should be justified exclusions)
4. Check for false negatives in LOW/MEDIUM tiers
5. Adjust keywords, exclusions, patterns as needed
6. Re-test until quality metrics achieved

**Quality Targets:**
- HIGH priority: 0-10% of valid emails, >90% relevance
- MEDIUM priority: 5-20% of valid emails
- LOW priority: 60-80% of valid emails
- EXCLUDED: 10-25% of valid emails

## Using the Generator Script

The `scripts/generate_config.py` automates configuration creation:

```bash
python scripts/generate_config.py \
  --country spain \
  --industry powder_metal \
  --output configs/spain_powder_metal.json
```

**Script Features:**
- Interactive prompts for missing information
- Auto-populates templates from reference files
- Validates JSON structure
- Checks for common mistakes
- Generates properly formatted output

**Required Arguments:**
- `--country` → Target country (spain, italy, poland, portugal, etc.)
- `--industry` → Target industry (powder_metal, hydraulics, agriculture, etc.)

**Optional Arguments:**
- `--output` → Output file path (default: configs/{country}_{industry}.json)
- `--language` → Primary language override
- `--multilingual` → Enable multilingual mode (for Switzerland, Belgium)
- `--hybrid` → Combine multiple industries (e.g., agriculture+hydraulics)

## Updating Existing Configurations

To update an existing configuration:

1. **Read Current Config**
   ```bash
   cat configs/spain_agriculture.json
   ```

2. **Identify What to Update**
   - Add new keywords discovered from campaign results
   - Update personal domain list with new ISPs
   - Expand geographic priorities
   - Refine exclusions based on false positives

3. **Increment Version**
   - Minor updates (keywords, domains): 1.0 → 1.1
   - Moderate changes (exclusions): 1.0 → 1.2
   - Major revisions (restructure): 1.0 → 2.0

4. **Document Changes**
   ```json
   {
     "version": "1.2",
     "changelog": "Added Basque terminology, updated ISP list"
   }
   ```

5. **Re-test**
   - Run on previous test set
   - Compare results to previous version
   - Ensure improvements without regression

## Common Patterns and Solutions

### Pattern: Multilingual Market

**Challenge:** Switzerland has German, French, Italian, and English

**Solution:**
```json
{
  "target_market": {
    "country_code": "CH",
    "language_codes": ["de", "fr", "it", "en"],
    "primary_language": "de"
  },
  "keywords": {
    "manufacturing": [
      "hersteller", "fertigung",         // German
      "fabricant", "production",         // French
      "produttore", "produzione",        // Italian
      "manufacturer", "production"       // English
    ]
  }
}
```

### Pattern: Hybrid Industry

**Challenge:** Agriculture + Hydraulics overlap

**Solution:**
```json
{
  "target_industry": "agricultural_machinery_hydraulics_hybrid",
  "keywords": {
    "agricultural_machinery": [...],
    "hydraulic_equipment": [...],
    "hybrid_applications": [
      "tractor hydraulics",
      "agricultural cylinders"
    ]
  }
}
```

### Pattern: Regional Variants

**Challenge:** Spain has Catalan, Basque, Galician

**Solution:**
```json
{
  "keywords": {
    "manufacturing": [
      "fabricación",           // Spanish
      "fabricació",            // Catalan
      "fabrikazio",            // Basque
      "fabricación"            // Galician (same as Spanish)
    ]
  },
  "geographic_priorities": {
    "regions": [
      "cataluña", "catalunya",      // Both variants
      "país vasco", "euskadi",      // Both variants
      "galicia", "galiza"           // Both variants
    ]
  }
}
```

## Resources

### Reference Files

**`references/country_templates.md`**
- Language-specific business terms
- Legal entity formats by country
- Personal email domains
- HR terminology
- Geographic priorities

**`references/industry_templates.md`**
- Industry keywords by sector
- Manufacturing processes
- Application areas
- Materials and technologies
- OEM indicators

**`references/scoring_guidelines.md`**
- Scoring weights explanation
- Threshold definitions
- Bonus multipliers
- Quality metrics
- Testing procedures

**`references/existing_configs.md`**
- Analysis of existing configurations
- Best practices from real deployments
- Common mistakes to avoid
- Configuration patterns by complexity

### Scripts

**`scripts/generate_config.py`**
Auto-generates configuration JSON from templates and reference data.

### Assets

**`assets/config_template.json`**
Base template with standard structure, processing, and output settings.

## Troubleshooting

### Problem: Non-B2B contacts in results (universities, hospitals, government, pharmacies, lawyers, travel agencies)

**⚠️ CRITICAL ISSUE** - This was the root cause of the Powder Metal Incident (Oct 2025)

**Cause:** Missing or incomplete critical exclusion categories

**Symptoms:**
- Universities (e.g., upol.cz, uniwersytet.pl, université.fr) in MEDIUM/HIGH priority
- Hospitals (e.g., szpital*, nemocnice*, hôpital*) in results
- Government offices (e.g., gmina*, urząd*, mairie*) not filtered
- Pharmacies, law firms, travel agencies passing through

**Solution:**
1. **Immediately add ALL 7 mandatory exclusion categories:**
   - `medical_domain_patterns` + `medical_prefixes`
   - `educational_domain_patterns` + `educational_prefixes`
   - `government_domain_patterns` + `government_prefixes`
   - `pharmacy_domain_patterns` + `pharmacy_prefixes`
   - `legal_domain_patterns` + `legal_prefixes`
   - `tourism_domain_patterns` + `tourism_prefixes`
   - `research_ngo_domain_patterns` + `research_prefixes`

2. **Use the template:** Copy patterns from `assets/critical_exclusions_template.json`

3. **Reference guide:** Consult `references/critical_exclusions_guide.md` for complete multilingual terms

4. **Update filter code:** Ensure filter `.py` file checks domain patterns with `>= 1` keyword threshold (NOT `>= 2`)

5. **Test against known problematic domains:**
   ```python
   # Test cases (should ALL be excluded)
   test_emails = [
       "info@upol.cz",              # University
       "office@szpital.pl",         # Hospital
       "contact@gmina.example.pl",  # Municipality
       "info@pharmacie.fr",         # Pharmacy
       "contact@avocat.fr",         # Lawyer
       "booking@hotel-tourism.pl"   # Tourism
   ]
   ```

6. **Expected EXCLUDED rate:** Should increase from 5-10% to 15-25% after adding all 7 categories

**Prevention:**
- NEVER create a new config without ALL 7 critical categories
- Use Pre-Deployment Checklist in Step 8
- Reference existing configs (czech_powder_metal.json, poland_powder_metal.json) as examples

### Problem: Too many HIGH priority emails (>15%)

**Cause:** Keywords too broad or bonuses too generous

**Solution:**
- Make keywords more specific
- Add negative keywords to exclusions
- Review domain_patterns for overly generic terms

### Problem: Too few HIGH priority emails (<2%)

**Cause:** Keywords too restrictive or missing key terms

**Solution:**
- Add synonyms and variants
- Check for spelling variations
- Review LOW/MEDIUM tiers for false negatives
- Consult industry-specific glossaries

### Problem: Many personal emails in results

**Cause:** Incomplete personal domain list

**Solution:**
- Research current ISPs in target country
- Add mobile operator email domains
- Update free email provider list

### Problem: HR departments in results

**Cause:** Missing local HR terminology

**Solution:**
- Research local HR job listings
- Add language-specific HR prefixes
- Include recruitment agency terminology

### Problem: Low geographic precision

**Cause:** Missing TLD or city names

**Solution:**
- Always include country TLD (.es, .it, etc.)
- Add top 20 industrial cities
- Include regional economic zones
- Add alternative spellings

## Best Practices Summary

1. **⚠️ CRITICAL EXCLUSIONS FIRST** → ALWAYS include ALL 7 mandatory categories (medical, educational, government, pharmacy, legal, tourism, research/NGO) with domain patterns + email prefixes. Use `critical_exclusions_template.json` as starting point.

2. **Reference Critical Exclusions Guide** → Consult `references/critical_exclusions_guide.md` for complete multilingual templates. This is NON-NEGOTIABLE for all configs.

3. **Start with Country + Industry Templates** → Consult `country_templates.md` + `industry_templates.md` for base patterns

4. **Native Language First** → Local terms before English (e.g., "szpital" before "hospital")

5. **Test Early with Known Problematic Domains** → Validate exclusions work by testing against universities, hospitals, government offices from target country

6. **Document Changes** → Version numbers + changelogs, especially when adding new exclusion categories

7. **Iterate Based on Results** → Review EXCLUDED tier for false positives, HIGH priority for false negatives

8. **Keep Exclusions Updated** → Quarterly review of:
   - Personal domains (new ISPs, mobile carriers)
   - Critical categories (new government agencies, hospitals)
   - Country-specific terms

9. **Be Specific** → Narrow, precise keywords beat broad terms. Avoid generic words like "services", "company", "international"

10. **Consider Context** → Regional dialects (Catalan, Basque), economic zones, trade relationships

11. **Validate JSON** → Use JSON linter before deployment. Check for missing commas, unclosed brackets

12. **Benchmark Quality** → Track metrics:
    - EXCLUDED: 15-25% (should include ALL 7 critical categories)
    - HIGH: 0-10%, >95% relevance
    - Conversion rate from HIGH priority lists
