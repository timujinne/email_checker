# 📚 Smart Filter Knowledge Base

**Глубокая база знаний о системе смарт-фильтрации email-списков**

*Этот документ предназначен для AI-помощников и разработчиков, создающих новые фильтры.*

---

## 🎯 Цель системы смарт-фильтрации

Система смарт-фильтрации решает задачу **качественной сегментации B2B email-контактов** для целевого маркетинга. В отличие от простой проверки по блок-листам, смарт-фильтр:

1. **Оценивает релевантность контакта** для конкретной индустрии и географии
2. **Приоритизирует лиды** по потенциальной ценности (HIGH/MEDIUM/LOW)
3. **Исключает нерелевантные контакты** на основе контекстного анализа
4. **Сохраняет метаданные** для последующей аналитики

---

## 🏗️ Архитектура системы

### 1. Двухэтапная фильтрация

```
RAW EMAIL LIST (input/*.txt, input/*.lvp)
    ↓
[ЭТАП 1: Базовая фильтрация]
    - Проверка формата email
    - Проверка по блок-листам (blocked_emails.txt, blocked_domains.txt)
    - Удаление дубликатов
    ↓
CLEAN EMAIL LIST (output/*_clean_*.txt)
    ↓
[ЭТАП 2: Смарт-фильтрация] ← МЫ ЗДЕСЬ
    - Жесткие исключения (hard exclusions)
    - Скоринг лидов (0-100 баллов)
    - Приоритизация (HIGH/MEDIUM/LOW/EXCLUDED)
    ↓
SEGMENTED LISTS
    - *_HIGH_PRIORITY_*.txt
    - *_MEDIUM_PRIORITY_*.txt
    - *_LOW_PRIORITY_*.txt
    - *_EXCLUDED_*.txt
```

### 2. Компоненты SmartFilterProcessor

```python
SmartFilterProcessor
├── SmartHardExclusionFilter    # Жесткие исключения
│   ├── Персональные домены
│   ├── HR/service email
│   ├── Географические ограничения
│   ├── Подозрительные паттерны
│   └── Исключенные индустрии
│
├── SmartHydraulicDetector      # Детектор индустрии (пример: гидравлика)
│   ├── Детекция терминологии
│   ├── Анализ доменов
│   └── Определение языка
│
├── SmartGeographicPrioritizer  # Географическая приоритизация
│   ├── HIGH priority (целевая страна)
│   ├── MEDIUM priority (соседние)
│   └── LOW priority (остальные)
│
└── SmartLeadScorer             # Скоринг лидов
    ├── Email Quality (10%)
    ├── Company Relevance (45%)
    ├── Geographic Priority (30%)
    └── Engagement (15%)
```

---

## 🎯 Система скоринга (детально)

### Общая формула

```
Overall Score =
  (Email Quality × 0.10) +
  (Company Relevance × 0.45) +
  (Geographic Priority × 0.30) +
  (Engagement × 0.15)

Final Score = Overall Score × Bonus Multipliers
```

### 1. Email Quality Score (0-100)

**Цель**: Оценить качество и надежность email-адреса

**Компоненты**:

```python
base_score = 25  # Базовый балл за валидный email

# Корпоративный vs бесплатный домен
if domain not in FREE_PROVIDERS:
    score += 35  # Корпоративный домен
else:
    score += 15  # Бесплатный провайдер (gmail, yahoo, etc.)

# Структура local part
if '.' in local_part:  # firstname.lastname
    score += 15

if 3 < len(local_part) < 25:  # Разумная длина
    score += 10

# Бонус за релевантный домен
if domain contains_industry_keywords:
    score += 25  # Например: "hydraulic" в домене

max_score = min(100, score)
```

**Примеры**:
- `info@gmail.com` → 50 (бесплатный, короткий)
- `marco.rossi@idraulica-torino.it` → 100 (корпоративный + структура + индустрия)
- `sales@hydraulic-solutions.com` → 85 (корпоративный + индустрия)

### 2. Company Relevance Score (0-100)

**Цель**: Оценить релевантность компании для целевой индустрии

**Принцип работы**:

```python
score = 0
text = f"{company_name} {description} {keywords}"

# Primary термины (высокий вес)
for term in PRIMARY_TERMS:
    if term in text.lower():
        score += 20-25  # Зависит от длины термина

# Secondary термины (средний вес)
for term in SECONDARY_TERMS:
    if term in text.lower():
        score += 8-10

# OEM индикаторы (высокий вес)
for term in OEM_INDICATORS:
    if term in text.lower():
        score += 12-15

# Негативные keywords (штраф)
for term in NEGATIVE_KEYWORDS:
    if term in text.lower():
        score -= 50  # Сильный штраф

# Релевантность домена
domain_score = check_domain_relevance(email_domain, web_domain)
score += domain_score

final_score = min(100, max(0, score))
```

**Примеры терминов (Hydraulics, Italian)**:

```json
{
  "primary": [
    "cilindro idraulico",      // +25 (длинный термин)
    "pompa idraulica",         // +25
    "valvola idraulica"        // +20
  ],
  "secondary": [
    "sistema idraulico",       // +10
    "olio idraulico",          // +8
    "pressione idraulica"      // +8
  ],
  "oem_indicators": [
    "produttore",              // +15
    "fabbricante",             // +15
    "OEM"                      // +12
  ],
  "negative_keywords": [
    "università",              // -50
    "e-commerce",              // -50
    "recruitment agency"       // -50
  ]
}
```

**Примеры**:
- Company: "Idraulica Torino SRL - Produttore cilindri idraulici" → 95
- Company: "Generic Trading Company" → 10
- Company: "University of Engineering" → -40 (→ 0)

### 3. Geographic Priority Score (0-100)

**Цель**: Приоритизировать контакты по географии

**Уровни приоритета**:

```python
# HIGH priority - целевая страна
if matches_target_country(text, email_domain):
    return 100

# MEDIUM priority - соседние страны / регион
elif matches_region(text, email_domain):
    return 60

# LOW priority - остальные страны
else:
    return 30
```

**Как определяется географический приоритет**:

1. **Email домен**: `.it`, `.de`, `.fr` и т.д.
2. **Текстовые маркеры**: "Milano", "Italia", "Italy"
3. **Веб-домен компании**

**Примеры (Italy Hydraulics)**:

```python
# HIGH (100 баллов)
"info@idraulica-milano.it"           # .it домен
"Idraulica Torino, Via Roma 123"     # Torino = Italian city

# MEDIUM (60 баллов)
"info@hydraulik-schweiz.ch"          # Switzerland (соседняя)
"Hydraulics Austria GmbH"            # Austria (соседняя)

# LOW (30 баллов)
"info@hydraulics-germany.de"         # Germany (не соседняя для IT)
"sales@hydraulic-usa.com"            # USA
```

### 4. Engagement Score (0-100)

**Цель**: Оценить вовлеченность на основе источника email

**Логика**:

```python
source = email_source.lower()

if 'product' in source or 'prodott' in source:
    return 85  # Email со страницы продукта
elif 'service' in source or 'serviz' in source:
    return 80  # Email со страницы услуг
elif 'contact' in source or 'contatt' in source:
    return 75  # Email со страницы контактов
elif 'about' in source or 'chi siamo' in source:
    return 65  # Email со страницы "о компании"
else:
    return 40  # Неизвестный источник
```

**Примеры**:
- Source: "product_hydraulic_cylinders" → 85
- Source: "contact_page" → 75
- Source: "footer" → 40

### 5. Bonus Multipliers (мультипликаторы)

**Применяются к итоговому score**:

```python
final_score = overall_score

# OEM manufacturer
if is_oem_manufacturer:
    final_score *= 1.3

# Target geography HIGH
if geographic_priority == 'high':
    final_score *= 2.0
elif geographic_priority == 'medium':
    final_score *= 1.4

# Domain match
if domain_matches_industry:
    final_score *= 1.5

final_score = min(100, final_score)
```

**Пример**:
```
Base score: 50
Company relevance: OEM detected → ×1.3 = 65
Geographic: Italy (HIGH) → ×2.0 = 130 → capped at 100
Final: 100 (HIGH PRIORITY)
```

### 6. Пороги приоритетов

```python
if final_score >= 100:
    priority = 'HIGH'
    category = 'primary_target'
elif final_score >= 50:
    priority = 'MEDIUM'
    category = 'secondary_target'
elif final_score >= 10:
    priority = 'LOW'
    category = 'potential'
else:
    priority = 'EXCLUDED'
    category = 'excluded'
```

---

## 🚫 Жесткие исключения (Hard Exclusions)

**Цель**: Исключить нерелевантные контакты **до** скоринга

### 1. Персональные домены

**Почему исключаем**: B2B фокус, персональные email менее надежны

**Примеры**:
```python
PERSONAL_DOMAINS = {
    # Универсальные
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'me.com', 'mac.com',

    # Итальянские
    'libero.it', 'virgilio.it', 'tin.it', 'tiscali.it', 'alice.it',

    # Немецкие
    'gmx.de', 'web.de', 't-online.de', 'freenet.de',

    # Французские
    'orange.fr', 'wanadoo.fr', 'free.fr', 'laposte.net',

    # Русские
    'mail.ru', 'yandex.ru',

    # Китайские
    '163.com', '126.com', 'qq.com', 'sina.com'
}
```

### 2. HR и сервисные email

**Почему исключаем**: Не decision makers, не релевантны для B2B sales

**Примеры**:
```python
HR_PREFIXES = {
    # Английский
    'hr@', 'jobs@', 'career@', 'recruitment@', 'hiring@',

    # Немецкий
    'karriere@', 'personal@', 'bewerbung@', 'stellenangebote@',

    # Французский
    'emploi@', 'recrutement@', 'rh@', 'carrieres@',

    # Итальянский
    'lavoro@', 'carriere@', 'risorse@', 'assunzioni@',

    # Испанский
    'empleo@', 'rrhh@', 'seleccion@', 'trabajo@'
}

SERVICE_PREFIXES = {
    'noreply@', 'no-reply@', 'donotreply@',
    'webmaster@', 'admin@', 'postmaster@',
    'info@example', 'contact@domain', 'test@', 'demo@'
}
```

### 3. Географические ограничения

**Почему исключаем**: Фокус на целевой регион

**Примеры (Italy Hydraulics)**:
```python
EXCLUDED_COUNTRY_DOMAINS = {
    # Китай
    '.cn', '.com.cn', '.hk', '.tw',

    # Индия
    '.in', '.co.in',

    # Турция
    '.tr', '.com.tr',

    # Польша (для Italy filter)
    '.pl',

    # Россия/СНГ
    '.ru', '.by', '.ua', '.kz',

    # Юго-Восточная Азия
    '.vn', '.th', '.id', '.my', '.ph'
}

EXCLUDED_CITIES = {
    # Индия
    'mumbai', 'delhi', 'bangalore', 'pune', 'chennai',

    # Китай
    'beijing', 'shanghai', 'guangzhou', 'shenzhen',

    # Польша
    'warszawa', 'krakow', 'gdansk', 'wroclaw',

    # Турция
    'istanbul', 'ankara', 'izmir'
}
```

### 4. Подозрительные паттерны

**Почему исключаем**: Вероятно спам или автоматически сгенерированные email

**Примеры**:
```python
SUSPICIOUS_PATTERNS = [
    r'^[a-f0-9]{20,}@',           # Хеш-подобные: f5d9a3b8c7e1...@domain.com
    r'^[a-z0-9]{15,}@',           # Случайные строки: xkq3m9p2zt...@domain.com
    r'[\u4e00-\u9fff]',           # Китайские символы
    r'[\u0590-\u05FF]',           # Иврит
    r'[\u0600-\u06FF]',           # Арабский
]
```

### 5. Исключенные индустрии

**Почему исключаем**: Не релевантны для B2B промышленного оборудования

**Примеры (мультиязычные)**:
```json
{
  "education": {
    "italian": ["scuola", "università", "formazione", "corso"],
    "english": ["school", "university", "education", "training"],
    "german": ["schule", "universität", "bildung", "kurs"],
    "french": ["école", "université", "formation", "cours"]
  },
  "media": {
    "italian": ["giornale", "rivista", "televisione", "radio"],
    "english": ["newspaper", "magazine", "television", "media"],
    "german": ["zeitung", "zeitschrift", "fernsehen", "radio"],
    "french": ["journal", "magazine", "télévision", "radio"]
  },
  "finance": {
    "italian": ["banca", "assicurazione", "finanza", "credito"],
    "english": ["bank", "insurance", "finance", "credit"],
    "german": ["bank", "versicherung", "finanzierung", "kredit"],
    "french": ["banque", "assurance", "finance", "crédit"]
  },
  "hr_agencies": {
    "italian": ["agenzia del lavoro", "ricerca personale"],
    "english": ["staffing agency", "recruitment agency"],
    "german": ["personalvermittlung", "zeitarbeit"],
    "french": ["agence de placement", "agence d'intérim"]
  },
  "retail": {
    "italian": ["negozio", "e-commerce", "vendita al dettaglio"],
    "english": ["shop", "store", "retail", "e-commerce"],
    "german": ["laden", "geschäft", "einzelhandel"],
    "french": ["magasin", "boutique", "commerce de détail"]
  }
}
```

---

## 🌐 Мультиязычная поддержка

### Принципы работы

1. **Автоматическое определение языка**:
   - По доменной зоне: `.de` → немецкий
   - По терминам: "cilindro idraulico" → итальянский
   - По контексту: смесь терминов → mixed

2. **Приоритет терминов**:
   - Primary термины на родном языке страны: **+25**
   - Primary термины на английском: **+20**
   - Secondary термины: **+8-10**

3. **Региональные особенности**:
   - Швейцария: DE + FR + IT + EN
   - Бельгия: NL + FR + EN
   - Канада: EN + FR

### Примеры терминов по языкам

#### Гидравлика (Hydraulics)

**Итальянский**:
```
Primary: cilindro idraulico, pompa idraulica, valvola idraulica,
         martinetto idraulico, motore idraulico
Secondary: sistema idraulico, olio idraulico, pressione idraulica,
           circuito idraulico, impianto oleodinamico
OEM: produttore, fabbricante, costruttore, manifattura
```

**Немецкий**:
```
Primary: Hydraulikzylinder, Hydraulikpumpe, Hydraulikventil,
         Hydraulikmotor, Hydraulikaggregat
Secondary: Hydrauliksystem, Hydrauliköl, Hydraulikdruck,
           Hydraulikkreislauf, Ölhydraulik
OEM: Hersteller, Produzent, Fabrikant, Fertigung
```

**Французский**:
```
Primary: vérin hydraulique, pompe hydraulique, distributeur hydraulique,
         moteur hydraulique, groupe hydraulique
Secondary: système hydraulique, huile hydraulique, pression hydraulique,
           circuit hydraulique, installation hydraulique
OEM: fabricant, producteur, constructeur, usine
```

**Английский**:
```
Primary: hydraulic cylinder, hydraulic pump, hydraulic valve,
         hydraulic motor, power unit
Secondary: hydraulic system, hydraulic oil, hydraulic pressure,
           hydraulic circuit, hydraulic installation
OEM: manufacturer, producer, maker, OEM, factory
```

**Испанский**:
```
Primary: cilindro hidráulico, bomba hidráulica, válvula hidráulica,
         motor hidráulico, central hidráulica
Secondary: sistema hidráulico, aceite hidráulico, presión hidráulica,
           circuito hidráulico, instalación hidráulica
OEM: fabricante, productor, constructor, fábrica
```

#### Землеройная техника (Earthmoving)

**Английский**:
```
Primary: excavator, backhoe, bulldozer, loader, wheel loader,
         track loader, skid steer, grader, compactor
Secondary: earthmoving, construction equipment, heavy machinery,
           bucket, boom, tracks, undercarriage
```

**Немецкий**:
```
Primary: Bagger, Radlader, Raupen, Planierraupen, Walzen,
         Grader, Kompaktlader, Mobilbagger
Secondary: Baumaschinen, Erdbaumaschinen, Tiefbaugeräte,
           Schaufel, Ausleger, Ketten, Fahrwerk
```

**Французский**:
```
Primary: pelle, chargeuse, bulldozer, chargeuse-pelleteuse,
         niveleuse, compacteur, mini-pelle
Secondary: engins de terrassement, machines de chantier,
           godet, flèche, chenilles, train de roulement
```

**Польский**:
```
Primary: koparka, ładowarka, spychacz, równiarka,
         walec, mini koparka, koparko-ładowarka
Secondary: maszyny budowlane, maszyny ziemne, sprzęt budowlany,
           łyżka, wysięgnik, gąsienice, podwozie
```

---

## 🌍 Географические паттерны

### Структура доменов по странам

#### Европа

| Страна | TLD | Корпоративные паттерны | Бесплатные провайдеры |
|--------|-----|------------------------|------------------------|
| 🇩🇪 Германия | .de | firma.de, gmbh.de, ag.de | gmx.de, web.de, t-online.de |
| 🇫🇷 Франция | .fr | societe.fr, sa.fr, sarl.fr | orange.fr, free.fr, wanadoo.fr |
| 🇮🇹 Италия | .it | azienda.it, srl.it, spa.it | libero.it, virgilio.it, tin.it |
| 🇪🇸 Испания | .es | empresa.es, sl.es, sa.es | hotmail.es, yahoo.es |
| 🇵🇱 Польша | .pl | firma.pl, spolka.pl | interia.pl, onet.pl, wp.pl |
| 🇨🇭 Швейцария | .ch | swiss.ch, ag.ch, sa.ch | bluewin.ch, gmx.ch |
| 🇦🇹 Австрия | .at | firma.at, gmbh.at | gmx.at, aon.at |
| 🇳🇱 Нидерланды | .nl | bedrijf.nl, bv.nl | ziggo.nl, xs4all.nl |
| 🇧🇪 Бельгия | .be | entreprise.be, sa.be | skynet.be, telenet.be |
| 🇵🇹 Португалия | .pt | empresa.pt, lda.pt | sapo.pt, clix.pt |

### Региональные особенности

#### Италия
- **Промышленные регионы**: Ломбардия (Milano, Brescia), Венето (Padova, Vicenza), Эмилия-Романья (Bologna, Modena)
- **Ключевые города**: Milano, Torino, Bologna, Brescia, Bergamo, Vicenza, Verona
- **Языки**: Итальянский (основной), Английский
- **Корпоративная культура**: SRL, SPA, SNC в названиях компаний

#### Германия
- **Промышленные регионы**: Баден-Вюртемберг, Бавария, Северный Рейн-Вестфалия
- **Ключевые города**: Stuttgart, München, Nürnberg, Düsseldorf, Essen
- **Языки**: Немецкий (основной), Английский
- **Корпоративная культура**: GmbH, AG в названиях

#### Франция
- **Промышленные регионы**: Иль-де-Франс, Рона-Альпы, Овернь-Рона-Альпы
- **Ключевые города**: Paris, Lyon, Marseille, Toulouse, Lille
- **Языки**: Французский (основной), Английский
- **Корпоративная культура**: SA, SARL, SAS в названиях

#### Швейцария
- **Особенность**: Мультиязычная (DE, FR, IT, EN)
- **Регионы по языкам**:
  - Немецкий: Zürich, Bern, Basel, Luzern
  - Французский: Genève, Lausanne, Neuchâtel
  - Итальянский: Lugano, Ticino
- **Корпоративная культура**: AG, SA, GmbH

---

## 📊 Паттерны корпоративных email

### Структуры local part

1. **firstname.lastname@** (высокий приоритет)
   - `marco.rossi@idraulica.it`
   - `hans.mueller@hydraulik.de`
   - `jean.dupont@engins.fr`

2. **role@** (средний приоритет)
   - `sales@company.com`
   - `info@company.it`
   - `export@company.de`

3. **department@** (низкий приоритет)
   - `marketing@company.fr`
   - `support@company.es`

4. **generic@** (исключать)
   - `info@example.com`
   - `contact@domain.com`

### Индикаторы качества

**Высокое качество** (score 80-100):
- Корпоративный домен с индустриальными терминами
- Структура firstname.lastname
- Разумная длина (5-20 символов)
- Примеры:
  - `andrea.bianchi@cilindriidraulici.it` → 100
  - `sales@hydraulikzylinder.de` → 85

**Среднее качество** (score 50-79):
- Корпоративный домен без индустриальных терминов
- Простая структура
- Примеры:
  - `info@azienda-italiana.it` → 60
  - `marco@company.com` → 55

**Низкое качество** (score 20-49):
- Бесплатный провайдер
- Длинный или короткий local part
- Примеры:
  - `marco.rossi@gmail.com` → 40
  - `info@libero.it` → 35

---

## 🔍 Типичные кейсы и решения

### Кейс 1: Слишком много исключений

**Симптомы**:
- 80%+ контактов попадают в EXCLUDED
- Мало контактов в HIGH/MEDIUM

**Диагностика**:
```bash
python3 smart_filter_skill/filter_generator.py --test <filter_name> --sample-file <file>

# Смотрим статистику исключений
```

**Решения**:
1. Смягчить hard_exclusions:
   ```json
   {
     "hard_exclusions": {
       "excluded_industries": {
         // Закомментировать ненужные
       }
     }
   }
   ```

2. Снизить негативные keywords:
   ```json
   {
     "industry_keywords": {
       "negative_keywords": []  // Удалить слишком общие
     }
   }
   ```

3. Снизить порог low_priority:
   ```json
   {
     "thresholds": {
       "low_priority": 5  // было 10
     }
   }
   ```

### Кейс 2: Мало HIGH priority контактов

**Симптомы**:
- <5% контактов в HIGH priority
- Большинство в MEDIUM/LOW

**Решения**:
1. Снизить порог high_priority:
   ```json
   {
     "thresholds": {
       "high_priority": 80  // было 100
     }
   }
   ```

2. Увеличить вес company_relevance:
   ```json
   {
     "weights": {
       "company_relevance": 0.55  // было 0.45
     }
   }
   ```

3. Добавить больше primary терминов

4. Увеличить bonus multipliers:
   ```json
   {
     "bonus_multipliers": {
       "target_geography": 2.5  // было 2.0
     }
   }
   ```

### Кейс 3: Пропускаются релевантные контакты

**Симптомы**:
- Релевантные компании попадают в EXCLUDED/LOW

**Решения**:
1. Проверить негативные keywords:
   ```bash
   # Поиск причин исключения
   grep "excluded" <exclusion_report>.csv
   ```

2. Добавить синонимы терминов:
   ```json
   {
     "industry_keywords": {
       "primary": [
         "original term",
         "synonym 1",
         "synonym 2"
       ]
     }
   }
   ```

3. Проверить географические исключения

### Кейс 4: Много FALSE POSITIVES в HIGH

**Симптомы**:
- Нерелевантные контакты в HIGH priority

**Решения**:
1. Усилить негативные keywords:
   ```json
   {
     "negative_keywords": [
       "retail", "e-commerce", "university", ...
     ]
   }
   ```

2. Добавить excluded_industries

3. Повысить порог high_priority:
   ```json
   {
     "thresholds": {
       "high_priority": 120  // было 100
     }
   }
   ```

---

## 🛠️ Best Practices для создания фильтров

### 1. Начинайте с шаблона

**НЕ создавайте с нуля**. Используйте:
- Существующие фильтры для адаптации
- Industry templates
- Quick start configs

### 2. Используйте принцип "80/20"

**80% эффекта дают 20% терминов**:
- Сфокусируйтесь на 10-15 primary терминах
- Не перегружайте secondary терминами
- Качество > количество

### 3. Тестируйте на реальных данных

```bash
# Создали фильтр
python3 filter_generator.py --country DE --industry automotive

# Протестируйте на 100-200 email
head -n 200 sample_list.txt > test_sample.txt
python3 email_checker.py smart-filter test_sample.txt --config germany_automotive

# Проверьте результаты
# - Релевантность HIGH priority
# - Ложные исключения
# - Баланс категорий
```

### 4. Итеративная оптимизация

1. **Первая итерация**: Базовый фильтр
2. **Анализ результатов**: Изучите exclusion report
3. **Оптимизация**: Добавьте термины, исправьте исключения
4. **Повтор**: 2-3 итерации для оптимального результата

### 5. Документируйте решения

Добавляйте комментарии в конфиг:
```json
{
  "// NOTE": "Removed 'university' from excluded_industries because many OEMs have research departments",
  "// OPTIMIZATION": "Increased high_priority threshold to 120 based on test results"
}
```

---

## 📈 Метрики качества фильтра

### Целевые показатели

1. **Precision (точность)**:
   - HIGH priority: 80%+ релевантных
   - MEDIUM priority: 60%+ релевантных
   - Цель: Минимизировать false positives

2. **Recall (охват)**:
   - 70%+ релевантных контактов в HIGH+MEDIUM
   - Цель: Не пропустить ценные лиды

3. **Баланс категорий**:
   - HIGH: 10-20% от qualified leads
   - MEDIUM: 30-40%
   - LOW: 30-40%
   - EXCLUDED: 10-20%

4. **Скорость обработки**:
   - 1000 email: 1-3 секунды
   - 10,000 email: 10-30 секунд

### Как измерить

```bash
# Обработать тестовый набор
python3 email_checker.py smart-filter test_list.txt --config your_filter

# Вручную проверить 50 HIGH priority контактов
head -n 50 output/*_HIGH_PRIORITY_*.txt

# Подсчитать релевантность
relevant_count / 50 * 100 = precision%
```

---

## 🚀 Продвинутые техники

### 1. Мультиязычный scoring

Для стран с несколькими языками (Швейцария, Бельгия):

```python
# Разные веса для терминов на разных языках
if primary_term in GERMAN_TERMS:
    score += 25
elif primary_term in FRENCH_TERMS:
    score += 20  # Немного ниже, если French не primary
```

### 2. Доменные паттерны

Усиленное детектирование по домену:

```python
DOMAIN_PATTERNS = {
    'hydraulics': ['hydraul', 'idraul', 'oleod', 'pompa', 'cilind'],
    'earthmoving': ['bagger', 'excavat', 'terrassement', 'grader'],
    'automotive': ['auto', 'car', 'vehicle', 'fahrzeug', 'vehicule']
}

if any(pattern in domain for pattern in DOMAIN_PATTERNS[industry]):
    score *= 1.5  # Мультипликатор
```

### 3. Комбинированные фильтры

Создание фильтра для нескольких смежных индустрий:

```json
{
  "filter_name": "Industrial Equipment (Multi-industry)",
  "industry_keywords": {
    "hydraulics": {...},
    "pneumatics": {...},
    "automation": {...}
  },
  "scoring": {
    "// NOTE": "Any industry match qualifies"
  }
}
```

### 4. Региональная адаптация

Для больших стран с разными регионами:

```json
{
  "geographic": {
    "priority_very_high": ["region1", "city1"],
    "priority_high": ["region2", "city2"],
    "priority_medium": ["region3"]
  },
  "scoring": {
    "geographic_scores": {
      "very_high": 100,
      "high": 80,
      "medium": 60
    }
  }
}
```

---

## 📝 Checklist создания нового фильтра

### Pre-flight

- [ ] Определить целевую страну
- [ ] Определить целевую индустрию
- [ ] Собрать примеры компаний (10-20)
- [ ] Определить языки
- [ ] Найти похожий существующий фильтр

### Создание

- [ ] Запустить filter_generator (интерактивно или CLI)
- [ ] Выбрать industry template
- [ ] Добавить специфичные термины для страны
- [ ] Настроить geographic priorities
- [ ] Настроить hard_exclusions
- [ ] Добавить персональные домены страны
- [ ] Добавить HR префиксы на языках страны

### Тестирование

- [ ] Создать тестовый набор (100-200 email)
- [ ] Запустить фильтр
- [ ] Проверить HIGH priority (manual check 50 email)
- [ ] Проверить EXCLUDED (нет ли ложных исключений)
- [ ] Проверить баланс категорий
- [ ] Изучить exclusion report

### Оптимизация

- [ ] Добавить пропущенные термины
- [ ] Исправить ложные исключения
- [ ] Настроить пороги (если нужно)
- [ ] Настроить веса (если нужно)
- [ ] Повторить тестирование

### Финализация

- [ ] Создать документацию фильтра
- [ ] Добавить примеры использования
- [ ] Зарегистрировать в `__init__.py`
- [ ] Коммит в репозиторий

---

**Версия**: 1.0.0
**Последнее обновление**: 2025-01-21
**Автор**: Email Checker Team

---

*Этот документ - живая база знаний. Добавляйте новые кейсы, паттерны и best practices по мере работы с системой.*
