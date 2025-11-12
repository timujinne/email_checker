# Austria Hydraulic Cylinders - Smart Filter Guide

**Config File:** `austria_hydraulics.json`
**Version:** 1.0.0
**Created:** 2025-11-12
**Target:** Austrian hydraulic cylinders industry

---

## Quick Start

```bash
# 1. Process LVP file
python3 email_checker.py check "input/Austria HC 11.11.2025.lvp"

# 2. Apply smart filter to clean results
python3 email_checker.py smart-filter output/Austria_HC_11_11_2025_clean_*.txt

# Alternative: Use smart filter directly
python3 smart_filter.py output/Austria_HC_*_clean_*.txt --config austria_hydraulics
```

---

## Configuration Overview

### Target Market
- **Country:** Austria (AT)
- **Industry:** Hydraulic Cylinders
- **Languages:** German + English
- **Focus:** OEM manufacturers, component suppliers, machine builders

### Geographic Priorities

**HIGH PRIORITY (Austria):**
- Cities: Wien, Graz, Linz, Salzburg, Innsbruck, Klagenfurt, Villach, Wels, St. Pölten, Dornbirn, Steyr, Wiener Neustadt, Feldkirch, Bregenz
- Regions: Niederösterreich, Oberösterreich, Steiermark, Tirol, Vorarlberg, Kärnten, Burgenland
- TLD: .at

**MEDIUM PRIORITY (Neighbors):**
- Germany (.de), Switzerland (.ch)
- Czech Republic (.cz), Slovakia (.sk), Hungary (.hu)
- Italy (.it), Slovenia (.si)

**EXCLUDED (31 countries):**
- Asia: China, India, Turkey, Pakistan, Bangladesh, Vietnam, Thailand, Indonesia, Malaysia, Philippines
- Eastern Europe: Poland, Russia, Belarus, Ukraine
- Others: Brazil, Australia, South Africa, Kenya, Tanzania, Uganda, Ghana, Nigeria

---

## Exclusion System (11 Categories)

### ✅ MAXIMUM EXCLUSION CONTROL

The configuration includes **11 comprehensive exclusion categories** with bilingual terms:

| # | Category | German Terms | English Terms | Description |
|---|----------|--------------|---------------|-------------|
| 1 | **education** | 27 | 16 | Universities, schools, training centers |
| 2 | **media** | 21 | 20 | Newspapers, TV, radio, advertising agencies |
| 3 | **finance** | 23 | 19 | Banks, insurance, investment companies |
| 4 | **legal** | 18 | 17 | Notaries, law firms, courts |
| 5 | **tourism** | 25 | 23 | Hotels, restaurants, ski resorts, wellness |
| 6 | **healthcare** | 20 | 18 | Hospitals, clinics, doctors, nursing homes |
| 7 | **pharmacy** | 9 | 9 | Pharmacies, pharmaceutical companies |
| 8 | **government** | 16 | 14 | Ministries, public administration |
| 9 | **retail** | 19 | 17 | Shops, e-commerce, supermarkets |
| 10 | **research_ngo** | 11 | 12 | Research institutes, foundations, NGOs |
| 11 | **hr_agencies** | 12 | 11 | Recruitment agencies, staffing, temp work |

**Total Exclusion Terms:** 201 German + 176 English = **377 terms**

### Additional Hard Exclusions

**Personal Domains (33):**
- gmail.com, gmx.at, gmx.de, web.de, t-online.de
- aon.at, chello.at, hotmail.at, outlook.at, yahoo.at
- icloud.com, mail.ru, yandex.ru, qq.com, etc.

**HR Prefixes (42):**
- German: hr@, jobs@, karriere@, personal@, bewerbung@, recruiting@, ausbildung@, lehrstellen@, praktikum@, etc.
- English: jobs@, career@, recruitment@, hiring@, vacancy@, employment@, staff@, personnel@, resume@, cv@, talent@, etc.

**Service Prefixes (23):**
- noreply@, no-reply@, donotreply@, info@example, test@, demo@, webmaster@, admin@, datenschutz@, privacy@, legal@, security@, compliance@, etc.

---

## Industry Keywords

### Hydraulic Cylinders - German (8 Primary + 19 Secondary)

**Primary:**
- hydraulikzylinder, hydraulische zylinder
- hydraulikaktoren, hydraulische aktoren
- teleskopzylinder, hubzylinder
- hydraulikpresse, hydraulischer antrieb

**Secondary:**
- zylinder, kolben, stange, kolbenstange
- dichtung, dichtungen, dichtungssatz
- hydrauliköl, hydraulikflüssigkeit
- hydraulikpumpe, hydraulikventil
- hydraulik, hydraulisch, oleohydraulik
- druckzylinder, arbeitszylinder

**Applications (20):**
- Construction: baumaschinen, bagger, kran, radlader, baggerlader
- Agriculture: landmaschinen, traktor, mähdrescher
- Material Handling: materialhandling, stapler, gabelstapler
- Commercial Vehicles: nutzfahrzeuge, lkw, kipper
- Industrial: industriemaschinen, presse, schere, biegemaschine
- Mobile: mobile arbeitsmaschinen, forstmaschinen

### Hydraulic Cylinders - English (8 Primary + 19 Secondary)

**Primary:**
- hydraulic cylinder, hydraulic cylinders
- hydraulic actuator, hydraulic actuators
- telescopic cylinder, telescoping cylinder
- hydraulic ram, hydraulic jack

**Secondary:**
- cylinder, piston, rod, piston rod
- seal, seals, seal kit
- hydraulic oil, hydraulic fluid
- hydraulic pump, hydraulic valve
- hydraulics, hydraulic, oleodynamic
- pressure cylinder, working cylinder

**Applications (20):**
- Construction: construction equipment, excavator, crane, loader, backhoe
- Agriculture: agricultural machinery, tractor, combine harvester
- Material Handling: material handling, forklift, lift truck
- Commercial Vehicles: commercial vehicles, truck, dump truck
- Industrial: industrial machinery, press, shear, bending machine
- Mobile: mobile equipment, forestry equipment

### OEM Indicators

**German:** hersteller, produzent, fabrikant, fertigung, produktion, fabrik, werk, herstellung, OEM, erstausrüster, zulieferer, komponentenhersteller, zylinderhersteller

**English:** manufacturer, producer, maker, fabricator, production, factory, plant, facility, OEM, original equipment manufacturer, supplier, component supplier, cylinder manufacturer

### Negative Keywords (17)

headhunting, recruitment agency, staffing, personalvermittlung, zeitarbeit, student, schüler, universität, hochschule, hotel, restaurant, café, tourismus, retail, einzelhandel, mode, bekleidung

---

## Scoring System

### Weights
- **Email Quality:** 10%
  - Corporate domain structure
  - Email format validity
  - Domain reputation

- **Company Relevance:** 45% (Primary Factor)
  - Industry keyword matches (primary > secondary > applications)
  - OEM indicators
  - Domain pattern matches
  - Negative keyword penalties

- **Geographic Priority:** 30%
  - Austria (high): ×2.0 bonus
  - Neighbors (medium): ×1.2 bonus
  - Other: ×1.0 (no bonus)
  - Excluded countries: score = 0

- **Engagement:** 15%
  - Email source quality (contact@, sales@, info@ > general)
  - Company size indicators
  - Website presence

### Bonus Multipliers
- **OEM Manufacturer:** ×1.3 (production/manufacturing indicators)
- **Target Geography:** ×2.0 (Austrian .at domains, cities)
- **Domain Match:** ×1.5 (hydraulics/machinery terms in domain)

### Thresholds
- **High Priority:** score >= 100
- **Medium Priority:** score >= 50
- **Low Priority:** score >= 10
- **Excluded:** score < 10

---

## Output Files

The smart filter generates the following files:

### 📋 Clean Lists
**Pattern:** `Austria_Hydraulic_Cylinders_CLEAN_[timestamp].[ext]`

Formats: TXT, CSV, JSON

Contains all qualifying leads (score >= 10) with metadata.

### ❌ Excluded Lists
**Pattern:** `Austria_Hydraulic_Cylinders_EXCLUDED_[timestamp].[ext]`

Formats: TXT, CSV, JSON

Contains all excluded leads (score < 10) for reference.

### 📊 Exclusion Report
**Pattern:** `Austria_Hydraulic_Cylinders_EXCLUSION_REPORT_[timestamp].csv`

Detailed breakdown showing:
- Email address
- Domain
- Exclusion reason(s)
- Final score
- Matched negative terms

**Example rows:**
```csv
Email,Domain,Exclusion Reason,Score
hr@company.at,company.at,"HR prefix: hr@",0
info@university.at,university.at,"Education industry: universität",0
contact@hotel-vienna.at,hotel-vienna.at,"Tourism industry: hotel",5
```

---

## Key Features

### ✅ Strengths

1. **Maximum Exclusion Control**
   - 11 comprehensive industry categories
   - 377 bilingual exclusion terms
   - 42 HR prefixes (German + English)
   - 33 personal domains
   - 23 service prefixes

2. **Bilingual Support**
   - German (primary): 201 terms
   - English (secondary): 176 terms
   - Seamless integration of both languages

3. **Austrian Geography Focus**
   - 32 high-priority Austrian terms
   - 27 medium-priority neighbor countries
   - 31 excluded countries
   - 38 excluded cities

4. **Industry-Specific Keywords**
   - 8 primary hydraulic cylinder terms per language
   - 19 secondary technical terms per language
   - 20 application areas per language
   - 13 OEM indicators per language

5. **Detailed Reporting**
   - Single clean list (no HIGH/MEDIUM/LOW split)
   - Comprehensive exclusion list
   - Detailed exclusion report with reasons
   - Score transparency

### 🎯 Use Cases

**Ideal for:**
- Austrian hydraulic cylinder manufacturers
- Component suppliers (OEM)
- Machine builders using hydraulic systems
- B2B lead generation in Austria + DACH region

**Not suitable for:**
- Retail/end-user sales
- Educational/training services
- HR/recruitment
- Non-manufacturing industries

---

## Workflow Example

### Step 1: Process LVP File
```bash
python3 email_checker.py check "input/Austria HC 11.11.2025.lvp"
```

**Output:**
- `output/Austria_HC_11_11_2025_clean_[timestamp].txt`
- `output/Austria_HC_11_11_2025_blocked_[timestamp].txt`
- `output/Austria_HC_11_11_2025_metadata_[timestamp].csv`

### Step 2: Apply Smart Filter
```bash
python3 email_checker.py smart-filter output/Austria_HC_11_11_2025_clean_20251112_*.txt
```

**Output:**
- `output/Austria_Hydraulic_Cylinders_CLEAN_[timestamp].txt/csv/json`
- `output/Austria_Hydraulic_Cylinders_EXCLUDED_[timestamp].txt/csv/json`
- `output/Austria_Hydraulic_Cylinders_EXCLUSION_REPORT_[timestamp].csv`

### Step 3: Review Results

**Clean List Analysis:**
```bash
# Count qualifying leads
wc -l output/Austria_Hydraulic_Cylinders_CLEAN_*.txt

# View sample with metadata (CSV)
head -20 output/Austria_Hydraulic_Cylinders_CLEAN_*.csv
```

**Exclusion Analysis:**
```bash
# Count excluded leads
wc -l output/Austria_Hydraulic_Cylinders_EXCLUDED_*.txt

# Review exclusion reasons
head -50 output/Austria_Hydraulic_Cylinders_EXCLUSION_REPORT_*.csv

# Find most common exclusion reasons
cut -d',' -f3 output/Austria_Hydraulic_Cylinders_EXCLUSION_REPORT_*.csv | sort | uniq -c | sort -rn
```

---

## Troubleshooting

### Issue: Too many exclusions

**Solution:** Review exclusion report to identify patterns. Common causes:
- Too many HR emails (check HR prefix list)
- Educational institutions (check education keywords)
- Tourism/hospitality (check tourism keywords)

**Action:** Adjust config if needed or accept high exclusion rate for cleaner leads.

### Issue: Missing relevant leads

**Solution:** Check if leads are being over-filtered:
1. Review excluded list manually
2. Check negative keywords (might be too aggressive)
3. Verify geographic exclusions aren't too broad
4. Consider lowering threshold (currently 10)

### Issue: Low-quality leads in clean list

**Solution:** Increase threshold or add more negative keywords:
1. Review clean list for patterns
2. Identify unwanted company types
3. Add relevant negative keywords to config
4. Re-run smart filter

---

## Configuration Maintenance

### When to Update

**Add exclusions when:**
- New irrelevant industries appear in results
- Specific companies repeatedly appear (add to excluded_domains)
- New HR prefix patterns emerge (jobs-AT@, careers-vienna@)

**Add keywords when:**
- Relevant companies are being excluded
- New application areas emerge
- Industry terminology evolves

### Version History

**v1.0.0 (2025-11-12):**
- Initial release
- 11 exclusion categories
- 377 bilingual terms
- Austrian geography focus
- Hydraulic cylinders industry keywords

---

## Support

For questions or issues:
1. Check `CLAUDE.md` for general Email Checker documentation
2. Check `SMART_FILTER_GUIDE.md` for smart filter system overview
3. Review this guide for Austria-specific configuration
4. Test with small sample files first before processing large datasets

---

## License & Attribution

Part of Email Checker project.
Configuration created with Claude Code smart filter config generator.
Based on Italy Hydraulics and Swiss Machinery reference configurations.
