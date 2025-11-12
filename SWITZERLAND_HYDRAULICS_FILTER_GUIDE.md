# Switzerland Hydraulic Cylinders Smart Filter Guide

## Configuration Overview

**File:** `smart_filters/configs/switzerland_hydraulics.json`
**Version:** 1.0.0
**Target:** Swiss hydraulic cylinders industry (B2B manufacturing)
**Languages:** German, French, Italian, English (Multilingual!)

## Key Features

### 1. Comprehensive Exclusions (705 terms!)

**11 Major Categories:**
- Education (79 terms)
- Media & Advertising (86 terms)
- Finance & Insurance (87 terms)
- Legal Services (46 terms)
- Tourism & Hospitality (98 terms) - **Critical for Switzerland!**
- Healthcare (70 terms)
- Pharmacy (32 terms)
- Government (54 terms)
- Retail (65 terms)
- Research & NGOs (46 terms)
- HR Agencies (42 terms)

**All categories include terms in DE/FR/IT/EN!**

### 2. Swiss-Specific Exclusions

**Personal Domains:**
- Swiss ISPs: bluewin.ch, swissonline.ch, sunrise.ch, hispeed.ch
- International: gmail.com, yahoo.*, hotmail.*, etc. (53 domains total)

**Geographic Exclusions:**
- 30 country TLDs (China, India, Russia, Poland, etc.)
- 42 major cities (Mumbai, Beijing, Warsaw, Istanbul, etc.)

### 3. Industry Keywords (283 terms)

**Hydraulic Cylinders Focus:**
- Primary terms: cylinders, actuators, pistons (13 per language)
- Secondary: systems, components, oil (14 per language)
- OEM indicators: manufacturer, producer, factory (16 per language)
- Applications: construction, agriculture, material handling (19 per language)

**All in 4 languages!**

### 4. Geographic Priorities

**High Priority (40 terms):**
- Switzerland: .ch, swiss, schweiz, suisse, svizzera
- Major cities: Zürich, Geneva, Basel, Bern, Lausanne, Lugano
- All cities in DE/FR/IT/EN variants (e.g., Genève/Genf/Geneva/Ginevra)

**Medium Priority (20 terms):**
- DACH region: Germany, Austria, Liechtenstein
- Neighbors: France, Italy

### 5. Scoring System

**Weights:**
- Email Quality: 10%
- Company Relevance: 45% (biggest factor!)
- Geographic Priority: 30%
- Engagement: 15%

**Bonuses:**
- OEM Manufacturer: 1.3x
- Target Geography (CH): 2.0x
- Domain Match: 1.5x

**Thresholds:**
- HIGH Priority: 100+
- MEDIUM Priority: 50+
- LOW Priority: 10+
- EXCLUDED: < 10

### 6. Output Settings

**Configuration:**
- `split_by_priority: false` - Generates unified output
- `generate_clean_list: true` - All qualified emails
- `generate_excluded_list: true` - All excluded emails
- `generate_exclusion_report: true` - Detailed reasons

**Output Files:**
- `Switzerland_Hydraulic_Cylinders_clean_YYYYMMDD.txt/csv/json`
- `Switzerland_Hydraulic_Cylinders_excluded_YYYYMMDD.txt/csv/json`
- `Switzerland_Hydraulic_Cylinders_EXCLUSION_REPORT_YYYYMMDD.csv`

## Usage Examples

### Basic Processing

```bash
# Process single file
python3 email_checker.py smart-filter output/Switherland_HC_11_11_2025_fixed_clean_20241111.txt

# Or using smart_filter.py directly
python3 smart_filter.py output/file_clean.txt --config switzerland_hydraulics
```

### Batch Processing

```bash
# Process all Switzerland files
python3 email_checker.py smart-filter-batch --pattern "output/*Switzerland*_clean_*.txt"

# Process all files with custom pattern
python3 email_checker.py smart-filter-batch --pattern "output/*HC*_clean_*.txt"
```

### Full Workflow

```bash
# 1. Process LVP file (if not done yet)
python3 email_checker.py check-lvp input/Switherland_HC_11.11.2025_fixed.lvp

# 2. Apply smart filter
python3 email_checker.py smart-filter output/Switherland_HC_11_11_2025_fixed_clean_20241111.txt

# 3. Review results
cat output/Switzerland_Hydraulic_Cylinders_clean_*.txt
cat output/Switzerland_Hydraulic_Cylinders_EXCLUSION_REPORT_*.csv
```

## What Gets Excluded

### Hard Exclusions (Always Removed)

1. **Personal emails:** gmail.com, bluewin.ch, yahoo.ch, etc.
2. **HR addresses:** hr@, jobs@, karriere@, recrutement@, lavoro@
3. **Service addresses:** noreply@, info@example, webmaster@
4. **Financial addresses:** finance@, investors@, ir@
5. **Wrong countries:** .cn, .in, .ru, .pl, .tr, .br, etc.
6. **Wrong cities:** Mumbai, Beijing, Warsaw, Istanbul, etc.

### Industry Exclusions (Scored, may exclude if < 10)

**Tourism (Critical for CH!):**
- hotel, tourismus, restaurant, ski, wellness, spa
- All variants: hôtel/hotel/albergo, ski/sci, restaurant/ristorante

**Education:**
- schule, université, università, school
- student, étudiant, studente

**Media:**
- zeitung, journal, giornale, newspaper
- werbung, publicité, pubblicità, advertising

**Finance:**
- bank, assurance, assicurazione, insurance
- leasing, factoring, broker

**Retail:**
- einzelhandel, magasin, negozio, shop
- mode, meubles, mobili, fashion

**HR Agencies:**
- personalvermittlung, intérim, lavoro temporaneo, temp agency

**Government:**
- behörde, ministère, ministero, authority
- stadt, ville, città, municipality

**Healthcare:**
- krankenhaus, hôpital, ospedale, hospital
- arzt, médecin, medico, doctor

**Legal:**
- notar, avocat, avvocato, lawyer
- kanzlei, cabinet juridique, studio legale

**Research/NGO:**
- forschung, recherche, ricerca, research
- verein, association, fondazione, foundation

## What Scores High

### Top Scoring Patterns

1. **Perfect Match (200+ points):**
   - Swiss domain (.ch) + hydraulic keywords + OEM indicator
   - Example: `verkauf@hydraulikzylinder.ch`

2. **Very High (150-199 points):**
   - Swiss location + hydraulic terms + manufacturing keywords
   - Example: `info@maschinenbau-basel.ch`

3. **High (100-149 points):**
   - Swiss/DACH + hydraulic or machinery terms
   - Example: `sales@industrial-equipment.ch`

4. **Medium (50-99 points):**
   - European location + manufacturing keywords
   - Example: `contact@machines-hydrauliques.fr`

5. **Low (10-49 points):**
   - Generic manufacturing, no geographic bonus
   - Example: `info@machinery-company.com`

6. **Excluded (< 10 points):**
   - No relevant keywords or in excluded industries
   - Example: `jobs@hotel-zurich.ch` (tourism + HR)

## Multilingual Examples

### German Terms
- **Include:** hydraulikzylinder, ölhydraulik, landmaschinen, baumaschinen
- **Exclude:** hotel, tourismus, zeitarbeit, versicherung, schule

### French Terms
- **Include:** vérins hydrauliques, huile hydraulique, machines agricoles, engins de chantier
- **Exclude:** hôtel, tourisme, intérim, assurance, école

### Italian Terms
- **Include:** cilindri idraulici, olio idraulico, macchine agricole, macchine movimento terra
- **Exclude:** hotel, turismo, lavoro temporaneo, assicurazione, scuola

### English Terms
- **Include:** hydraulic cylinders, hydraulic oil, agricultural machinery, construction equipment
- **Exclude:** hotel, tourism, temp agency, insurance, school

## Troubleshooting

### "Too many exclusions"
- Review `Switzerland_Hydraulic_Cylinders_EXCLUSION_REPORT_*.csv`
- Most common: tourism, retail, personal domains
- This is expected for Switzerland (high tourism industry)

### "Not enough results"
- Check if input file had many duplicates/blocked emails
- Verify input file is actually Swiss (not other country)
- Review metadata to see industries present

### "Wrong languages"
- Config supports DE/FR/IT/EN automatically
- No need to specify language, it handles all

## Statistics

**Configuration Size:**
- Total exclusion terms: 705
- Total industry keywords: 283
- Total domain patterns: 45
- Supported languages: 4

**Coverage:**
- 11 major industry exclusions
- 53 personal domain patterns
- 40 high-priority locations
- 30 excluded country TLDs
- 42 excluded cities

## Next Steps

1. Process your list with the filter
2. Review the exclusion report
3. Analyze clean list for top leads
4. Export results in preferred format (TXT/CSV/JSON)

## Support

For issues or questions, refer to:
- Main documentation: `SMART_FILTER_GUIDE.md`
- Project overview: `CLAUDE.md`
- Configuration file: `smart_filters/configs/switzerland_hydraulics.json`

---

**Created:** 2024-11-12
**Configuration Version:** 1.0.0
**Filter Type:** Industry-specific (Hydraulic Cylinders)
**Target Market:** Switzerland (B2B Manufacturing)
