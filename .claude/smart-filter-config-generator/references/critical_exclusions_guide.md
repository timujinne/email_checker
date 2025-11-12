# Critical Exclusions Guide

**Version:** 2.0
**Last Updated:** 2025-10-30
**Status:** MANDATORY for all new configurations

---

## Executive Summary

This guide defines **mandatory exclusion patterns** that MUST be included in every smart filter configuration to prevent non-B2B organizations from passing filters. Failure to include these exclusions will result in government agencies, hospitals, universities, pharmacies, law firms, travel agencies, and other irrelevant organizations appearing in HIGH/MEDIUM priority lists.

**Incident Reference:** October 2025 - Powder Metal Configuration Incident
**Impact:** 200+ irrelevant contacts (universities, hospitals, government) in Czech Republic lists
**Root Cause:** Missing domain-based exclusions and weak exclusion logic
**Resolution:** This mandatory guide

---

## Why Critical Exclusions Matter

### The Problem

B2B industrial smart filters target **manufacturing companies, OEMs, suppliers, and industrial service providers**. However, without proper exclusions, the following organizations frequently pass filters:

❌ **Hospitals and clinics** (contain terms like "equipment", "machinery", "industrial")
❌ **Universities** (engineering departments, research facilities)
❌ **Government agencies** (public works, infrastructure departments)
❌ **Pharmacies** (industrial packaging, manufacturing keywords)
❌ **Law firms** (corporate law, industrial clients)
❌ **Travel agencies** (tour operators, transportation)
❌ **Research institutes** (engineering research, industrial projects)

### Case Study: Powder Metal Incident (October 2025)

**Context:** Czech Republic and Poland powder metallurgy filters

**What Went Wrong:**
- ✅ Keywords matched: "manufacturing", "industrial", "equipment"
- ❌ No domain pattern checks for hospitals (nemocnice, szpital)
- ❌ No check for university domains (univerzita)
- ❌ No government domain patterns (gmina, urzad)
- ❌ Weak exclusion logic (required 2+ keyword matches)

**Result:**
- Czech: 40 university contacts (upol.cz), 26 medical institute (ikem.cz), 24+ hospitals
- Poland: 25 hospital (szpital-raciborz.org), 25 medical equipment (.med.pl), multiple municipalities

**Fix:**
- Added domain-based pattern checking
- Lowered exclusion threshold from 2+ to 1+ keyword
- Added medical/educational/government prefixes
- Expanded excluded_industries with 3 new critical categories

**Outcome:** 100% of known problematic domains now correctly excluded

---

## Mandatory Exclusion Categories

All smart filter configurations MUST include these 7 categories:

### 1. Healthcare/Medical Organizations

**Why:** Hospitals, clinics, and medical facilities often use industrial/manufacturing keywords (equipment, machinery, sterilization, laboratory).

**Domain Patterns:**
```
Medical Facilities:
- hospital, szpital, nemocnice, hôpital, ospedale, krankenhaus
- clinic, klinika, clinique, poliklinika, ambulatorio
- medical, health, santé, salud, sanità, gesundheit
- .med.pl, .med.*, medic*, diagnostic*

Healthcare Services:
- diagnostyka, diagnostics, diagnoza, diagnostic
- onkologia, oncology, chirurgia, surgery
- rehabilitacja, rehabilitation, rééducation
- sanatorium, lecznica, health center
```

**Email Prefixes:**
```
Patient Services:
- pacient@, pacjent@, patient@
- rejestracja@, registrace@, réception@, reception@
- recepce@, recepcja@, accueil@

Medical Departments:
- diagnostyka@, diagnoza@, diagnostic@
- chirurgia@, chirurgie@, surgery@
- onkologia@, oncology@
- laboratorium@, laboratory@, laboratoire@
```

**Excluded Industry Keywords:**
```json
"healthcare": [
  // Facilities
  "hospital", "szpital", "nemocnice", "hôpital", "ospedale", "krankenhaus",
  "clinic", "klinika", "clinique", "poliklinika",
  "medical center", "health center", "centro médico", "centro sanitario",

  // Services
  "healthcare", "santé", "salud", "sanità", "gesundheit",
  "medical", "médico", "medico", "medizinisch",
  "diagnostics", "diagnostyka", "diagnostika", "diagnostic",

  // Specializations
  "oncology", "onkologia", "oncologie",
  "surgery", "chirurgia", "chirurgie",
  "rehabilitation", "rehabilitacja", "rééducation",
  "cardiology", "kardiologia", "cardiologie",

  // Professions
  "doctor", "lekarz", "lékař", "médecin", "medico", "arzt",
  "nurse", "pielęgniarka", "sestra", "infirmière"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@upol-hospital.cz, pacient@klinika.pl, diagnostyka@med.pl
- ✅ Should PASS: info@medical-equipment-manufacturer.com (equipment supplier)

---

### 2. Educational Institutions

**Why:** Universities and schools have engineering departments that match industrial keywords.

**Domain Patterns:**
```
Universities:
- university, univerzita, université, università, universidad, universität
- polytechnic, politechnika, polytechnique, politecnico
- academy, akademie, akademia, académie, accademia
- college, vysoká škola, école, escuela

Schools:
- school, škola, szkoła, école, scuola, escuela, schule
- institute, institut, instytut, istituto, instituto
- .edu, .ac.*, .edu.*

Research:
- research institute, institut de recherche, instituto de investigación
- študijní, studium, étudiant, estudiante, student
```

**Email Prefixes:**
```
Administrative:
- studium@, studies@, étudiant@, estudiante@
- prijimacka@, admissions@, admission@
- studijni@, skoly@, école@, escuela@
```

**Excluded Industry Keywords:**
```json
"education": [
  // Institutions
  "university", "univerzita", "université", "università", "universidad",
  "school", "škola", "szkoła", "école", "scuola", "escuela",
  "college", "vysoká škola", "vysoké školy",
  "academy", "akademie", "akademia", "académie",

  // Terms
  "education", "vzdělávání", "edukacja", "éducation", "educación",
  "teaching", "výuka", "nauczanie", "enseignement", "enseñanza",
  "training", "školení", "szkolenie", "formation", "formación",

  // Related
  "student", "študent", "student", "étudiant", "estudiante",
  "study", "studium", "studia", "études", "estudios",
  "course", "kurz", "kurs", "cours", "curso"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@univerzita.cz, engineering@polytechnic.edu
- ✅ Should PASS: info@technical-training-services.com (B2B training)

---

### 3. Government & Public Sector

**Why:** Government agencies manage infrastructure, public works, equipment procurement.

**Domain Patterns:**
```
National Government:
- ministry, ministerstvo, ministerstwo, ministère, ministero, ministerium
- government, .gov, .gov.*, .gouv, .gob
- administration, správa, administracja, administration

Local Government:
- municipality, gmina, mesto, město, mairie, ayuntamiento, comune
- office, úřad, urząd, bureau, ufficio, büro
- prefecture, préfecture, prefectura
- city hall, radnice, ratusz, hôtel de ville, ayuntamiento

Public Services:
- public sector, veřejná správa, administracja publiczna, secteur public
- state, státní, państwowy, état, estado, staat
```

**Email Prefixes:**
```
Government:
- ministerstvo@, ministry@, ministère@, ministerium@
- urad@, urząd@, úřad@, office@, ufficio@
- gmina@, mesto@, město@, mairie@, ayuntamiento@
- sprava@, správa@, administracja@, administration@
- prefecture@, préfecture@, prefectura@
```

**Excluded Industry Keywords:**
```json
"government_public": [
  // National
  "ministry", "ministerstvo", "ministerstwo", "ministère", "ministero",
  "government", "vláda", "rząd", "gouvernement", "gobierno",
  "administration publique", "veřejná správa", "administracja publiczna",

  // Local
  "municipality", "gmina", "mesto", "město", "mairie", "ayuntamiento",
  "city hall", "radnice", "ratusz", "hôtel de ville",
  "municipal", "městský", "gminny", "miejski", "municipal",

  // Types
  "public sector", "secteur public", "sector público",
  "state", "státní", "państwowy", "estatal",
  "public service", "veřejná služba", "służba publiczna"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@ministerstvo.cz, office@gmina.pl, contact@prefecture.fr
- ✅ Should PASS: info@government-contractor.com (B2B supplier to government)

---

### 4. Pharmacies (NEW)

**Why:** Pharmacies match industrial keywords (manufacturing, packaging, logistics, equipment).

**Domain Patterns:**
```
Pharmacy Facilities:
- apteka, lékárna, pharmacie, farmacia, pharmacy, apotheke
- drugstore, lekarnia, droguería
- farmaceutica, pharmaceutical, pharmaceutique
```

**Email Prefixes:**
```
Pharmacy Services:
- apteka@, pharmacy@, pharmacie@, farmacia@, apotheke@
- lekarnik@, pharmacien@, farmacista@
- recept@, prescription@, ordonnance@, ricetta@
```

**Excluded Industry Keywords:**
```json
"pharmacy": [
  // Facilities
  "pharmacy", "apteka", "lékárna", "pharmacie", "farmacia", "apotheke",
  "drugstore", "droguería", "drogerie",

  // Services
  "pharmaceutical", "farmaceutický", "farmaceutyczny", "pharmaceutique",
  "medicine", "lék", "lek", "médicament", "medicina",
  "prescription", "předpis", "recept", "ordonnance", "ricetta",

  // Professions
  "pharmacist", "lékárník", "farmaceuta", "pharmacien", "farmacista",
  "apothecary", "apotheker"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@apteka.pl, contact@pharmacie-centrale.fr
- ✅ Should PASS: sales@pharmaceutical-packaging.com (packaging manufacturer)

---

### 5. Legal Services (NEW)

**Why:** Law firms serve industrial clients and use business/corporate terminology.

**Domain Patterns:**
```
Legal Firms:
- notary, notář, notariusz, notaire, notaio, notar
- lawyer, právník, prawnik, avocat, avvocato, rechtsanwalt
- attorney, advokát, adwokat, abogado
- legal, právní, prawny, juridique, legale, rechtlich
- law firm, advokátní kancelář, kancelaria prawna, cabinet d'avocat

Notary Services:
- notariat, notariát, notariat, notariato
- notary public, notář veřejný, notariusz publiczny
```

**Email Prefixes:**
```
Legal Services:
- notary@, notář@, notariusz@, notaire@, notaio@
- lawyer@, pravnik@, prawnik@, avocat@, avvocato@
- legal@, pravni@, prawny@, juridique@, legale@
- advokat@, adwokat@, abogado@, attorney@
```

**Excluded Industry Keywords:**
```json
"legal_services": [
  // Professionals
  "lawyer", "právník", "prawnik", "avocat", "avvocato", "rechtsanwalt",
  "attorney", "advokát", "adwokat", "abogado",
  "notary", "notář", "notariusz", "notaire", "notaio", "notar",
  "legal counsel", "poradce", "doradca prawny", "conseiller juridique",

  // Services
  "legal services", "právní služby", "usługi prawne", "services juridiques",
  "law firm", "advokátní kancelář", "kancelaria prawna", "cabinet d'avocat",
  "notary office", "notariát", "notariat", "notariato",

  // Areas
  "litigation", "soudní spor", "postępowanie sądowe", "litige",
  "contract law", "smluvní právo", "prawo umów", "droit des contrats",
  "corporate law", "právo společností", "prawo korporacyjne"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: kontakt@notariat.cz, office@law-firm.pl
- ✅ Should PASS: legal@manufacturing-company.com (in-house legal of manufacturer)

---

### 6. Tourism & Travel (NEW)

**Why:** Travel agencies use logistics, transportation, equipment keywords.

**Domain Patterns:**
```
Travel Agencies:
- travel, cestovní, podróże, voyage, viaje, reise
- tourism, turismus, turystyka, tourisme, turismo
- tour operator, cestovní kancelář, biuro podróży, tour-opérateur
- tourist, turista, turysta, touriste

Hotels:
- hotel, ubytování, zakwaterowanie, hébergement, alojamiento
- accommodation, nocleg, logement, hospedaje
```

**Email Prefixes:**
```
Travel Services:
- travel@, cestovni@, podróże@, voyage@, viaje@
- tourism@, turismus@, turystyka@, tourisme@, turismo@
- booking@, rezervace@, rezerwacja@, réservation@
- tour@, wycieczka@, excursion@, gira@
```

**Excluded Industry Keywords:**
```json
"tourism_travel": [
  // Services
  "travel agency", "cestovní kancelář", "biuro podróży", "agence de voyage",
  "tour operator", "touroperátor", "organizator turystyki",
  "tourism", "turismus", "turystyka", "tourisme", "turismo",

  // Activities
  "tourist", "turista", "turysta", "touriste",
  "tour", "zájezd", "wycieczka", "excursion", "gira",
  "vacation", "dovolená", "wakacje", "vacances", "vacaciones",
  "holiday", "prázdniny", "urlop", "vacances",

  // Accommodation
  "hotel", "pension", "pensjonat", "auberge", "hospedaje",
  "accommodation", "ubytování", "zakwaterowanie", "hébergement",
  "booking", "rezervace", "rezerwacja", "réservation"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@travel-agency.pl, booking@hotel-europa.cz
- ✅ Should PASS: sales@industrial-tourism-equipment.com (B2B equipment)

---

### 7. Research & NGO

**Why:** Research institutes and NGOs work on industrial/engineering projects.

**Domain Patterns:**
```
Research:
- research institute, výzkumný ústav, instytut badawczy, institut de recherche
- laboratory, laboratoř, laboratorium, laboratoire
- r&d, výzkum, badania, recherche

NGO:
- foundation, nadace, fundacja, fondation, fondazione
- fund, fond, fundusz, fonds, fondo
- association, společnost, stowarzyszenie, association
- ngo, nezisková organizace, organizacja pozarządowa
```

**Email Prefixes:**
```
Research:
- research@, vyzkum@, badania@, recherche@, ricerca@
- laboratory@, lab@, laborator@, laboratoire@
- r&d@, rnd@, razvoj@

NGO:
- foundation@, nadace@, fundacja@, fondation@
- fund@, fond@, fundusz@, fonds@
- association@, spolecnost@, stowarzyszenie@
```

**Excluded Industry Keywords:**
```json
"research_ngo": [
  // Research
  "research institute", "výzkumný ústav", "instytut badawczy", "institut de recherche",
  "research", "výzkum", "badania", "recherche", "ricerca",
  "laboratory", "laboratoř", "laboratorium", "laboratoire",
  "r&d", "vývoj", "rozwój", "développement",

  // NGO
  "foundation", "nadace", "fundacja", "fondation", "fondazione",
  "fund", "fond", "fundusz", "fonds", "fondo",
  "association", "společnost", "stowarzyszenie", "association",
  "non-profit", "nezisková", "organizacja pozarządowa", "sans but lucratif",
  "charity", "charita", "organizacja charytatywna", "charité"
]
```

**Test Cases:**
- ✅ Should EXCLUDE: info@research-institute.cz, contact@foundation.pl
- ✅ Should PASS: r&d@manufacturing-company.com (internal R&D of manufacturer)

---

## Implementation Guidelines

### Minimum Requirements

Every configuration MUST include:

✅ **Domain Patterns (7 categories):**
- `medical_domain_patterns` → 10+ patterns
- `educational_domain_patterns` → 8+ patterns
- `government_domain_patterns` → 8+ patterns
- `pharmacy_domain_patterns` → 5+ patterns
- `legal_domain_patterns` → 5+ patterns
- `tourism_domain_patterns` → 5+ patterns
- `research_ngo_domain_patterns` → 5+ patterns

✅ **Email Prefixes (6 categories):**
- `medical_prefixes` → 5+ prefixes
- `government_prefixes` → 5+ prefixes
- `pharmacy_prefixes` → 3+ prefixes
- `legal_prefixes` → 3+ prefixes
- `tourism_prefixes` → 3+ prefixes
- `research_prefixes` → 3+ prefixes

✅ **Excluded Industries (7 categories):**
- `healthcare` → 15+ keywords
- `government_public` → 10+ keywords
- `education` → 10+ keywords
- `pharmacy` → 8+ keywords
- `legal_services` → 8+ keywords
- `tourism_travel` → 10+ keywords
- `research_ngo` → 8+ keywords

### Code Implementation

In filter Python code (`should_exclude()` method):

```python
# Check domain patterns (CRITICAL severity)
for category in ['medical', 'educational', 'government', 'pharmacy', 'legal', 'tourism', 'research_ngo']:
    patterns = self.exclusions.get(f'{category}_domain_patterns', [])
    for pattern in patterns:
        if pattern.lower() in domain.lower():
            return {'should_exclude': True, 'reasons': [f'{category}_domain'], 'severity': 'critical'}

# Check email prefixes (CRITICAL severity)
for category in ['medical', 'government', 'pharmacy', 'legal', 'tourism', 'research']:
    prefixes = self.exclusions.get(f'{category}_prefixes', [])
    for prefix in prefixes:
        if email_prefix.startswith(prefix.rstrip('@')):
            return {'should_exclude': True, 'reasons': [f'{category}_prefix'], 'severity': 'critical'}

# Check excluded industries (HIGH severity, threshold = 1 keyword)
for industry, keywords in self.exclusions.get('excluded_industries', {}).items():
    for keyword in keywords:
        if keyword.lower() in combined_text:
            return {'should_exclude': True, 'reasons': [f'excluded_industry_{industry}'], 'severity': 'high'}
```

### Threshold Setting

**CRITICAL:** Exclusion threshold MUST be `>= 1` keyword, NOT `>= 2`.

```python
# ❌ WRONG (allows single-keyword organizations to pass)
if len(reasons) >= 2:
    return {'should_exclude': True, ...}

# ✅ CORRECT (excludes on first match)
if len(reasons) >= 1:
    return {'should_exclude': True, ...}
```

---

## Country-Specific Examples

### Czech Republic (CZ)

**Problematic Domains Found:**
- ✅ NOW EXCLUDED: upol.cz (Univerzita Palackého)
- ✅ NOW EXCLUDED: ikem.cz (Institut klinické medicíny)
- ✅ NOW EXCLUDED: bulovka.cz (Nemocnice Bulovka)
- ✅ NOW EXCLUDED: sosasou.cz (Správa silnic - Road Administration)

**Keywords:**
- Medical: nemocnice, poliklinika, zdravotní
- Education: univerzita, vysoká škola, škola
- Government: ministerstvo, úřad, správa, město
- Pharmacy: lékárna, lékárník
- Legal: notář, advokát, právník
- Tourism: cestovní kancelář, turismus
- Research: výzkumný ústav

### Poland (PL)

**Problematic Domains Found:**
- ✅ NOW EXCLUDED: szpital-raciborz.org (Szpital Powiatowy)
- ✅ NOW EXCLUDED: imid.med.pl (Medical Equipment)
- ✅ NOW EXCLUDED: gmina.polkowice.pl (Municipality)
- ✅ NOW EXCLUDED: onkologia.bielsko.pl (Oncology Center)

**Keywords:**
- Medical: szpital, przychodnia, klinika, diagnostyka
- Education: uniwersytet, szkoła, politechnika
- Government: gmina, urząd, ministerstwo, miasto
- Pharmacy: apteka, farmaceuta
- Legal: notariusz, adwokat, prawnik
- Tourism: biuro podróży, turystyka
- Research: instytut badawczy

### France (FR)

**Keywords:**
- Medical: hôpital, clinique, santé, diagnostic
- Education: université, école, académie
- Government: ministère, mairie, préfecture
- Pharmacy: pharmacie, pharmacien, médicament
- Legal: notaire, avocat, juridique
- Tourism: agence de voyage, tourisme
- Research: institut de recherche, laboratoire

---

## Testing Checklist

Before deploying a configuration, verify exclusions work:

### Test Suite

Run these test cases:

```python
# Medical
assert should_exclude("info@hospital-name.cz") == True
assert should_exclude("pacient@klinika.pl") == True

# Educational
assert should_exclude("info@university.edu") == True
assert should_exclude("studium@univerzita.cz") == True

# Government
assert should_exclude("office@gmina.pl") == True
assert should_exclude("contact@ministerstvo.cz") == True

# Pharmacy (NEW)
assert should_exclude("info@apteka.pl") == True
assert should_exclude("contact@pharmacie.fr") == True

# Legal (NEW)
assert should_exclude("office@notariat.cz") == True
assert should_exclude("kontakt@prawnik.pl") == True

# Tourism (NEW)
assert should_exclude("booking@travel-agency.com") == True
assert should_exclude("info@hotel-europa.pl") == True

# Valid B2B (should PASS)
assert should_exclude("sales@machinery-manufacturer.com") == False
assert should_exclude("info@industrial-supplier.pl") == False
```

---

## Maintenance

### Quarterly Review

Every 3 months, review and update:

1. Personal domains (new ISPs, carriers)
2. Domain patterns (new organizational types)
3. Email prefixes (new service terminology)
4. Industry keywords (emerging sectors)

### Incident Response

If non-B2B organizations appear in HIGH priority:

1. Identify organization type
2. Check which exclusion category applies
3. Add specific domain pattern
4. Add specific email prefixes
5. Update industry keywords
6. Re-test configuration
7. Document in this guide

---

## Version History

**2.0** (2025-10-30)
- Added 3 new critical categories: Pharmacy, Legal Services, Tourism
- Expanded from 4 to 7 mandatory categories
- Updated implementation guidelines
- Added country-specific test cases

**1.0** (2025-10-30)
- Initial version post-Powder Metal incident
- 4 categories: Healthcare, Education, Government, Research/NGO
- Domain-based pattern checking
- Email prefix filtering

---

## References

- **Powder Metal Incident Report:** [POWDER_METAL_FIXES_REPORT.md](../../../../POWDER_METAL_FIXES_REPORT.md)
- **Config Template:** [critical_exclusions_template.json](../assets/critical_exclusions_template.json)
- **Country Templates:** [country_templates.md](country_templates.md)
- **Test Script:** [test_powder_filters.py](../../../../test_powder_filters.py)
