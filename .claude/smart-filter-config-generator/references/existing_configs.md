# Existing Configuration Examples

This reference documents existing smart filter configurations as examples for creating new configs.

## Available Configurations

### By Country

- **Czech Republic**: `czech_powder_metal.json`
- **Italy**: `italy_hydraulics.json`
- **Poland**: `poland_powder_metal.json`
- **Portugal**: `portugal_agriculture_hydraulics.json`
- **Spain**: `spain_agriculture.json`
- **Switzerland**: `swiss_machinery.json`

### By Industry

- **Powder Metallurgy**: poland_powder_metal, czech_powder_metal
- **Hydraulic Equipment**: italy_hydraulics, portugal_agriculture_hydraulics (hybrid)
- **Agricultural Machinery**: spain_agriculture, portugal_agriculture_hydraulics (hybrid)
- **General Machinery**: swiss_machinery

## Configuration Patterns

### Single-Industry Focus
Example: `italy_hydraulics.json`
- Narrow, specific industry keywords
- Deep terminology for one sector
- High precision, lower recall

### Multi-Industry Hybrid
Example: `portugal_agriculture_hydraulics.json`
- Combines related industries
- Broader keyword coverage
- Medium precision, higher recall

### Geographic-Specific
Example: `swiss_machinery.json`
- Multilingual support (DE, FR, IT, EN)
- Complex geographic priorities
- Region-specific legal entities

## Key Learnings from Existing Configs

### 1. Language Complexity

**Polish** (`poland_powder_metal.json`)
- Extensive use of diacritics: ł, ą, ę, ć, ś, ź, ż
- Both forms needed: "produkcja" and "produkcja" (with/without special chars)
- Regional variations significant

**Italian** (`italy_hydraulics.json`)
- Formal vs informal: "produttore" vs "fabbrica"
- Technical terms often borrowed from English
- Regional dialects less critical in B2B

**Portuguese** (`portugal_agriculture_hydraulics.json`)
- Distinguish PT-PT from PT-BR (Brazilian)
- Accent variants: "máquinas" and "maquinas"
- Galician overlap with Spanish

### 2. Geographic Prioritization

**Switzerland** (Multilingual Challenge)
- Multiple language zones require separate keyword sets
- German: hersteller, fertigung
- French: fabricant, production
- Italian: produttore, produzione
- English as common business language

**Portugal** (Border Market)
- High priority: Portugal itself
- Medium priority: Spain (especially Galicia, Extremadura, border regions)
- Low priority: France (southern regions)

**Italy** (Regional Economy)
- Northern regions (Lombardia, Veneto, Emilia-Romagna) are industrial heartland
- Specific city mentions important: Milano, Torino, Bologna
- San Marino, Ticino (Swiss) as medium priority

### 3. Industry-Specific Patterns

**Powder Metallurgy** (Specialized)
- Very technical terminology
- Limited to specific manufacturing sectors
- OEM relationships critical
- Domain patterns highly specific: "proszk", "powder", "sinter"

**Hydraulic Equipment** (Broad)
- Wide application range (agriculture, construction, industrial)
- Component-level keywords important
- Service/repair significant business
- Cross-industry applications

**Agricultural Machinery** (Seasonal)
- Brand loyalty significant (dealer networks)
- Spare parts/service major revenue
- Geographic/climatic specialization (vineyard equipment in wine regions)

### 4. Exclusion Strategies

**Personal Domains** vary significantly:
- Italy: libero.it, virgilio.it, tim.it (telco-based)
- Spain: terra.es, movistar.es, ya.com
- Poland: o2.pl, onet.pl, wp.pl
- Portugal: sapo.pt, clix.pt, meo.pt

**HR Prefixes** language patterns:
- English: hr@, jobs@, career@
- Spanish: rrhh@, trabajo@, empleo@
- Italian: lavoro@, carriera@, personale@
- Polish: kadry@, praca@, rekrutacja@
- Portuguese: emprego@, trabalho@, rh@

**Legal Entities** affect domain value:
- Italy: spa, srl, snc → high B2B probability
- Spain: s.l., s.a., slu → corporate entities
- Poland: sp.z.o.o, s.a. → manufacturing common
- Portugal: lda, s.a. → established businesses
- Switzerland: ag, gmbh, sa → multilingual forms

### 5. Successful Keyword Strategies

**Layered Approach** (Best Practice):
1. Core industry terms (primary language + English)
2. Applications/use cases
3. Components/parts
4. Materials/technologies
5. OEM/manufacturing indicators

**Example from `poland_powder_metal.json`:**
```json
{
  "powder_metallurgy": [
    "metalurgia proszków",  // Core PL term
    "powder metallurgy",   // English fallback
    "PM parts",            // Industry abbreviation
    "spiekanie",           // Process (PL)
    "sintering"            // Process (EN)
  ],
  "applications": [
    "łożyska", "bearings",  // Product application
    "przekładnie", "gears"  // Another application
  ],
  "oem_indicators": [
    "producent", "manufacturer",  // Manufacturing
    "tier 1", "tier 2"            // Supply chain
  ]
}
```

## Best Configurations by Use Case

### High Precision B2B (OEM Focus)
**Use**: `czech_powder_metal.json` or `poland_powder_metal.json`
- Very specific industry keywords
- Strong OEM indicators
- Strict geographic focus
- Expected HIGH priority: 2-5%

### Balanced Coverage
**Use**: `italy_hydraulics.json`
- Specific industry but broad applications
- Moderate geographic scope
- Expected HIGH priority: 5-10%

### Broad Market Exploration
**Use**: `portugal_agriculture_hydraulics.json`
- Multi-industry hybrid
- Wide geographic net
- Expected HIGH priority: 10-15%

## Common Mistakes to Avoid

### From Configuration Analysis

1. **Over-Generic Keywords** (`spain_agriculture.json` early version)
   - "máquinas" too broad → matched sewing machines, coffee machines
   - Solution: "máquinas agrícolas", "maquinaria agrícola"

2. **Missing Regional Terms** (`italy_hydraulics.json` v1.0)
   - Omitted "oleodinamico" (Italian variant of "hydraulic")
   - Lost ~15% of relevant matches
   - Solution: Include both "idraulico" and "oleodinamico"

3. **Insufficient Personal Domain List** (All configs initially)
   - Country-specific ISPs often missing
   - Mobile operator domains overlooked
   - Solution: Research current market ISPs/telcos

4. **Wrong Geographic Assumptions** (`switzerland_machinery.json` v1.0)
   - Assumed German-only
   - Missed French-speaking and Italian-speaking cantons
   - Solution: Multi-language approach for multilingual markets

## Configuration Templates by Complexity

### Simple (Single Language, Single Industry)
```
Country: Homogeneous language market
Industry: Specific, well-defined sector
Example: Poland + Powder Metallurgy
Effort: 2-4 hours
Difficulty: ⭐⭐
```

### Moderate (Single Language, Multiple Industries)
```
Country: Single primary language
Industry: Related industries (agriculture + hydraulics)
Example: Portugal + Agriculture/Hydraulics
Effort: 4-6 hours
Difficulty: ⭐⭐⭐
```

### Complex (Multilingual, Single Industry)
```
Country: Multiple official languages
Industry: Specific sector
Example: Switzerland + Machinery
Effort: 6-10 hours
Difficulty: ⭐⭐⭐⭐
```

### Very Complex (Multilingual, Multiple Industries)
```
Country: Multiple languages + dialects
Industry: Broad or hybrid industries
Example: Switzerland + Agriculture/Hydraulics/Manufacturing
Effort: 10-15 hours
Difficulty: ⭐⭐⭐⭐⭐
```

## Where to Find Keywords

### Recommended Resources

1. **Industry Associations**
   - Trade groups publish glossaries
   - Technical standards documents
   - Industry magazines/publications

2. **Company Websites**
   - Read "About Us" pages in target language
   - Product descriptions
   - Service offerings

3. **Job Listings**
   - Manufacturing job postings show terminology
   - HR listings help identify exclusion prefixes

4. **Google Translate + Native Speaker Verification**
   - Start with EN technical terms
   - Translate to target language
   - VERIFY with native speaker (critical!)

5. **Existing Lists**
   - Previous campaigns in same market/industry
   - Competitor analysis
   - Trade show exhibitor lists

## Configuration File Locations

All configurations stored in: `configs/`

Format: `{country}_{industry}.json`

When creating new config, follow naming convention:
- Country: lowercase, English name
- Industry: lowercase, underscore-separated
- Examples:
  - `spain_powder_metal.json`
  - `germany_automotive_hydraulics.json`
  - `france_agricultural_machinery.json`
