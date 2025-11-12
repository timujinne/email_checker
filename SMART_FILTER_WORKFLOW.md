# 📖 Инструкция: Обработка Email-Списков с Smart Filter

> **Версия**: 1.0
> **Дата**: 13 октября 2025
> **Автор**: Email Checker System

---

## 📋 Содержание

1. [Введение](#введение)
2. [Требования](#требования)
3. [Обзор процесса](#обзор-процесса)
4. [Пошаговая инструкция](#пошаговая-инструкция)
5. [Примеры сценариев](#примеры-сценариев)
6. [Шаблоны конфигураций](#шаблоны-конфигураций)
7. [Таблица результатов](#таблица-результатов)
8. [Troubleshooting](#troubleshooting)
9. [Чек-лист](#чек-лист)

---

## Введение

Эта инструкция описывает полный процесс обработки email-списков с использованием **Smart Filter** - системы умной фильтрации, которая применяет score-based подход для выявления наиболее качественных и релевантных контактов.

### Что делает Smart Filter?

- ✅ **Анализирует email-адреса** по 4 критериям: качество email, релевантность компании, географический приоритет, источник контакта
- ✅ **Присваивает Score (0-100)** каждому email
- ✅ **Исключает нежелательные контакты**: personal domains, HR emails, government, suspicious patterns
- ✅ **Сортирует результаты** от лучших к худшим
- ✅ **Создаёт финальные CLEAN LIST** для рассылки

### Уже выполнено

| Страна | Индустрия | Конфиг | Результат |
|--------|-----------|--------|-----------|
| 🇮🇹 Италия | Гидравлика | `italy_hydraulics.json` | 2,012 emails (18.2%) |
| 🇪🇸 Испания | Агротехника | `spain_agriculture.json` | 2,699 emails (47.8%) |
| 🇵🇹 Португалия | Агро + Гидравлика | `portugal_agriculture_hydraulics.json` | 1,583 emails (63.1%) |

**Всего готово**: 6,294 qualified emails

---

## Требования

### Софт и зависимости

- ✅ Python 3.6+
- ✅ Все модули из `email_checker.py`, `smart_filter.py`, `smart_filter_processor_v2.py`
- ✅ Стандартная библиотека Python (json, csv, datetime, pathlib)

### Структура проекта

```
email_checker/
├── input/                    # Входные LVP файлы
├── output/                   # Результаты обработки
├── configs/                  # Smart Filter конфигурации
│   ├── italy_hydraulics.json
│   ├── spain_agriculture.json
│   └── portugal_agriculture_hydraulics.json
├── blocklists/              # Блок-листы
├── email_checker.py         # Основной движок
├── smart_filter.py          # Launcher для Smart Filter
└── smart_filter_processor_v2.py  # Процессор фильтрации
```

---

## Обзор процесса

```
┌─────────────────────────────────────────────────────────────┐
│                    ИСХОДНЫЙ LVP ФАЙЛ                        │
│              (input/NewCountry_Industry.lvp)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 1: АНАЛИЗ ФАЙЛА                                        │
│  - Определить страну, индустрию                             │
│  - Проверить наличие метаданных                             │
│  - Оценить размер и структуру                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 2: БАЗОВАЯ LVP ФИЛЬТРАЦИЯ (если нужно)                │
│  python3 email_checker.py check-lvp input/file.lvp          │
│  → Фильтрация Status=Invalid, blocklists                    │
│  → Результат: *_clean_*.txt (Valid emails)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 3: ВЫБОР/СОЗДАНИЕ КОНФИГУРАЦИИ                         │
│  - Использовать существующую OR                             │
│  - Создать новую configs/country_industry.json              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 4: ПРИМЕНЕНИЕ SMART FILTER                             │
│  python3 smart_filter.py output/file_clean.txt \            │
│    --config country_industry --verbose                      │
│  → Scoring, exclusions, prioritization                      │
│  → Результат: smart_filtered_*.json/csv/txt                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 5: СОЗДАНИЕ FINAL CLEAN LIST                           │
│  - Фильтрация по Score >= 30 (или другой порог)            │
│  - Сортировка от лучших к худшим                            │
│  - Создание TXT + CSV файлов                                │
│  → Результат: FINAL_CLEAN_COUNTRY_ALL_SORTED_*.txt/csv      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ШАГ 6: ОЧИСТКА И ФИНАЛИЗАЦИЯ                               │
│  - Удалить промежуточные файлы                              │
│  - Проверить результаты                                     │
│  - Создать отчёт                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Пошаговая инструкция

### ШАГ 1: Анализ исходного файла

#### 1.1. Проверка файла

```bash
# Проверить размер и дату
ls -lh input/your_file.lvp

# Посмотреть первые записи
head -100 input/your_file.lvp

# Извлечь примеры ключевых полей
grep -m 10 "Column_Keywords\|Column_METADescription\|Column_Category" input/your_file.lvp
```

#### 1.2. Определить характеристики

**Вопросы для анализа**:

1. **Страна**: Какая страна/регион? (проверить Column_Country, телефоны, домены)
2. **Индустрия**: Какая индустрия? (проверить Keywords, Categories, Descriptions)
3. **Тип данных**: Есть ли метаданные? (LVP с metadata vs TXT без metadata)
4. **Язык**: Какие языки в описаниях? (определяет keywords для конфига)

**Примеры индустрий**:
- Agricultural machinery (tractores, maquinaria agrícola)
- Hydraulic equipment (cilindros hidráulicos, bombas)
- Mining & earthmoving (minería, excavadoras)
- Construction equipment (construcción, maquinaria pesada)

#### 1.3. Проверка предыдущей обработки

```bash
# Проверить, был ли файл уже обработан базовой фильтрацией
ls output/*filename*_clean_*.txt

# Если есть - можно сразу использовать для Smart Filter
# Если нет - нужно сначала выполнить базовую LVP фильтрацию
```

---

### ШАГ 2: Базовая LVP фильтрация (если нужно)

Если файл ещё не обработан базовой фильтрацией:

```bash
# Обработка LVP файла
python3 email_checker.py check-lvp "input/YourFile.lvp"

# Ожидаемые результаты:
# ✅ output/YourFile_clean_YYYYMMDD_HHMMSS.txt       - Valid emails
# ❌ output/YourFile_invalid_YYYYMMDD_HHMMSS.txt     - Invalid (Status=2)
# ❌ output/YourFile_blocked_email_YYYYMMDD_HHMMSS.txt  - В blocklist
# 📊 output/YourFile_clean_metadata_*.json/csv       - Metadata (если LVP)
```

**Проверка результатов**:

```bash
# Посмотреть количество
wc -l output/YourFile_clean_*.txt

# Примеры emails
head -20 output/YourFile_clean_*.txt
```

---

### ШАГ 3: Выбор или создание конфигурации

#### 3.1. Использование существующей конфигурации

**Когда можно использовать**:

- ✅ **italy_hydraulics**: Для любой страны с гидравлическим оборудованием
- ✅ **spain_agriculture**: Для любой испаноязычной страны с агротехникой
- ✅ **portugal_agriculture_hydraulics**: Для португалоязычных стран с агро+гидравлика

**Адаптация существующего конфига**:

```bash
# Скопировать похожий конфиг
cp configs/spain_agriculture.json configs/france_agriculture.json

# Отредактировать:
# 1. config_name, display_name
# 2. target_market (country_code, primary_language)
# 3. keywords (перевести на нужный язык)
# 4. geographic_priorities
# 5. exclusions (personal_domains, hr_prefixes с учётом языка)
```

#### 3.2. Создание нового конфига

**Шаблон структуры** (см. раздел "Шаблоны конфигураций" ниже)

**Основные секции**:

1. **target_market**: Страна, языки
2. **scoring weights**: Пропорции Score (обычно: email 10%, relevance 45%, geo 30%, engagement 15%)
3. **keywords**: Ключевые слова по индустрии (4-5 категорий)
4. **geographic_priorities**: high/medium/low списки стран и городов
5. **exclusions**: personal_domains, hr_prefixes, excluded_industries, excluded_country_domains
6. **domain_patterns**: relevant_patterns, high_value_domains

**Важно**:
- Используйте **multilingual keywords** (локальный язык + English)
- Адаптируйте **personal_domains** под страну (например, sapo.pt для Португалии)
- Включайте **региональные варианты** (например, español/castellano для Испании)

---

### ШАГ 4: Применение Smart Filter

#### 4.1. Запуск обработки

```bash
# Синтаксис
python3 smart_filter.py "output/YourFile_clean_*.txt" \
  --config your_config_name \
  --verbose

# Пример для Франции
python3 smart_filter.py "output/France_Agriculture_clean_20251013.txt" \
  --config france_agriculture \
  --verbose
```

#### 4.2. Интерпретация результатов

**Консольный вывод**:

```
✅ Обработка завершена успешно!
📊 Статистика:
   Всего обработано: 3000
   Квалифицированные лиды: 2700
   Исключено: 300
   Приоритетные: High=0, Medium=100, Low=2600
   Ошибки: 0
   Время обработки: 2.50 сек
```

**Ключевые метрики**:

- **Qualified rate**: (Qualified / Всего) × 100%
  - **90%+** - отлично (файл с хорошими данными)
  - **80-90%** - хорошо
  - **<80%** - проверить exclusions, возможно слишком строгие

- **Medium Priority**: Обычно 3-5% от qualified
  - Emails с Score > 50
  - Начинать рассылку с них

- **Time**: ~1,000-2,000 emails/сек (нормально)

#### 4.3. Созданные файлы

```bash
# Проверить созданные файлы
ls -lh output/smart_filtered_YourFile_clean_*.{txt,csv,json}

# JSON - полная детализация
# CSV - табличный формат (удобно для анализа)
# TXT - только emails
```

---

### ШАГ 5: Создание финального CLEAN LIST

#### 5.1. Выбор порога Score

**Рекомендации по порогам**:

| Тип данных | Рекомендуемый порог | Ожидаемый охват |
|------------|---------------------|-----------------|
| **LVP с метаданными** | Score >= 30 | 55-65% |
| **TXT без метаданных** | Score >= 30 | 45-55% |
| **Strict (только лучшие)** | Score >= 40.8 | 20-30% |
| **Maximum coverage** | Score >= 25 | 70-80% |

**Факторы выбора**:
- Если есть метаданные (LVP) → можно порог выше (30-40)
- Если только TXT → порог ниже (25-30)
- Если нужно качество → порог выше (40+)
- Если нужен охват → порог ниже (25-30)

#### 5.2. Создание файлов

**Скрипт для создания FINAL CLEAN LIST**:

```bash
cd output && python << 'SCRIPT'
import json
import csv

# Загрузить JSON с результатами Smart Filter
with open('smart_filtered_YourFile_clean_*.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Фильтровать по Score >= 30 (настроить порог!)
qualified_emails = []
for item in results:
    score = item.get('final_score', 0)
    priority = item.get('priority', 'low')
    breakdown = item.get('indicators', {}).get('scoring_breakdown', {})

    # ПОРОГ SCORE (настроить!)
    if score >= 30:  # <-- ИЗМЕНИТЬ ПРИ НЕОБХОДИМОСТИ
        qualified_emails.append({
            'email': item['email'],
            'score': score,
            'priority': priority,
            'relevance': breakdown.get('relevance', 0),
            'geographic': breakdown.get('geographic', 0),
            'email_quality': breakdown.get('email', 0),
            'engagement': breakdown.get('engagement', 0)
        })

# Сортировать по Score от большего к меньшему
qualified_emails.sort(key=lambda x: x['score'], reverse=True)

print(f"✅ Qualified (Score >= 30): {len(qualified_emails)}")
print(f"📊 Score диапазон: {qualified_emails[0]['score']:.1f} - {qualified_emails[-1]['score']:.1f}")
print(f"🔥 Medium priority: {sum(1 for e in qualified_emails if e['priority'] == 'medium')}")
print(f"📊 Low priority: {sum(1 for e in qualified_emails if e['priority'] == 'low')}")

# Сохранить TXT (только emails)
with open('FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.txt', 'w', encoding='utf-8') as f:
    for item in qualified_emails:
        f.write(item['email'] + '\n')

# Сохранить CSV с метаданными
with open('FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['email', 'priority', 'final_score', 'relevance', 'geographic', 'email_quality', 'engagement'])
    for item in qualified_emails:
        writer.writerow([
            item['email'],
            item['priority'],
            f"{item['score']:.1f}",
            item['relevance'],
            item['geographic'],
            item['email_quality'],
            item['engagement']
        ])

print(f"\n✅ FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.txt created ({len(qualified_emails)} emails)")
print(f"✅ FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.csv created")
SCRIPT
```

#### 5.3. Проверка результатов

```bash
# Количество
wc -l FINAL_CLEAN_COUNTRY_ALL_SORTED_*.txt

# TOP-10 лучших
head -10 FINAL_CLEAN_COUNTRY_ALL_SORTED_*.txt

# Последние 10 (минимальный Score)
tail -10 FINAL_CLEAN_COUNTRY_ALL_SORTED_*.txt

# Проверить CSV
head -5 FINAL_CLEAN_COUNTRY_ALL_SORTED_*.csv
```

---

### ШАГ 6: Очистка и финализация

#### 6.1. Удаление промежуточных файлов

```bash
cd output

# Удалить промежуточные Smart Filter файлы
rm -v smart_filtered_YourFile_clean_*.{txt,csv,json}

# Оставить:
# ✅ FINAL_CLEAN_COUNTRY_ALL_SORTED_*.txt/csv (финальные)
# ✅ YourFile_clean_*.txt (исходный после базовой фильтрации)
# ✅ YourFile_clean_metadata_*.json/csv (метаданные LVP - для истории)
```

#### 6.2. Проверка качества

**Чек-лист финальной проверки**:

- [ ] Количество emails соответствует ожиданиям (30-65% от исходного clean)
- [ ] Score диапазон разумный (минимум 30+, максимум 60-85)
- [ ] TXT файл содержит только email-адреса (по одному на строку)
- [ ] CSV файл открывается корректно и содержит все колонки
- [ ] Emails отсортированы по Score от лучших к худшим
- [ ] Нет дубликатов в финальном списке

#### 6.3. Создание отчёта

**Минимальный отчёт** (скопировать в README или отдельный файл):

```markdown
## Обработка: [Страна] [Индустрия]

**Дата**: 2025-10-13
**Конфигурация**: `country_industry.json`

### Входные данные
- Файл: `input/FileName.lvp`
- Исходный clean: X,XXX emails

### Результаты Smart Filter
- Qualified: X,XXX (XX.X%)
- Excluded: XXX (X.X%)
- Medium Priority: XX
- Low Priority: X,XXX

### Финальный CLEAN LIST
- Порог Score: >= 30
- Финальных emails: X,XXX (XX.X% охват)
- Score диапазон: XX.X - XX.X
- Файлы:
  - `FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.txt` (X,XXX emails)
  - `FINAL_CLEAN_COUNTRY_ALL_SORTED_20251013.csv` (с метаданными)

### Выводы
- [Комментарии о качестве данных]
- [Рекомендации по рассылке]
```

---

## Примеры сценариев

### Сценарий A: Новая страна, существующая индустрия

**Пример**: Франция - Agricultural Machinery

**Подход**:
1. Использовать конфиг **spain_agriculture.json** как базу
2. Скопировать в **france_agriculture.json**
3. Адаптировать:
   - `country_code`: "FR"
   - `primary_language`: "fr"
   - `keywords`: Перевести на французский (tracteurs, moissonneuse-batteuse, etc.)
   - `geographic_priorities`: Paris, Lyon, Marseille, Bordeaux, etc.
   - `personal_domains`: orange.fr, free.fr, laposte.net, wanadoo.fr
   - `hr_prefixes`: emploi@, recrutement@, carrières@

**Score порог**: 30 (если есть LVP metadata)

---

### Сценарий B: Существующая страна, новая индустрия

**Пример**: Испания - Mining & Earthmoving

**Подход**:
1. Использовать конфиг **spain_agriculture.json** как базу (география и язык уже готовы)
2. Скопировать в **spain_mining_earthmoving.json**
3. Заменить только **keywords**:
   - `hydraulic_cylinders` → minería, excavadoras, cargadoras, bulldozers, mining equipment, excavators
   - `applications` → minería subterránea, minería a cielo abierto, construcción, obras públicas
   - `components` → repuestos minería, componentes excavadoras
   - `oem_indicators` → fabricante maquinaria pesada, distribuidor equipos mineros

**География и exclusions** остаются те же!

**Score порог**: 30

---

### Сценарий C: Hybrid подход (две индустрии)

**Пример**: Бельгия - Agriculture + Construction Equipment

**Подход** (как Португалия - агро + гидравлика):
1. Создать новый конфиг **belgium_agriculture_construction.json**
2. Объединить keywords:
   - Agricultural: tracteurs, moissonneuse, matériel agricole
   - Construction: engins de chantier, bulldozer, pelle mécanique
3. Dual language: Французский + Нидерландский (+ English)
4. География: Belgium + близкие регионы (Нидерланды, север Франции, Люксембург)

**Score порог**: 30 (hybrid даёт больше охват)

**Преимущество**: Компании, работающие с обеими индустриями, получают высокий Score

---

### Сценарий D: TXT файл без метаданных

**Пример**: Германия - только список emails (TXT)

**Проблема**: Нет описаний компаний → relevance score всегда около 0

**Решение**:
1. Создать конфиг **germany_industry.json** с акцентом на:
   - **email_quality** (корпоративные домены)
   - **geographic_priority** (.de домены, немецкие города)
   - **domain_patterns** (ключевые слова в доменах: agrar, hydraulik, maschinen)
2. Использовать **более низкий порог Score**: 25-28 (вместо 30)
3. Ожидать **меньший охват**: 45-55% (вместо 60-65%)

**Альтернатива**: Если есть метаданные в JSON/CSV - сначала обогатить TXT файл метаданными

---

## Шаблоны конфигураций

### Базовый шаблон конфигурации

```json
{
  "config_name": "country_industry",
  "display_name": "Country - Industry Name",
  "version": "1.0",

  "target_market": {
    "country_code": "XX",
    "country_name": "Country",
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

  "keywords": {
    "hydraulic_cylinders": [
      "keyword1_local_language",
      "keyword1_english",
      "keyword2_local_language",
      "keyword2_english"
    ],
    "applications": [
      "application1_local",
      "application1_english"
    ],
    "components": [
      "component1_local",
      "component1_english"
    ],
    "oem_indicators": [
      "manufacturer_local",
      "manufacturer_english",
      "distributor_local",
      "distributor_english"
    ]
  },

  "geographic_priorities": {
    "high": [
      "country", ".cc", "capital", "major_cities"
    ],
    "medium": [
      "neighboring_countries"
    ],
    "low": [
      "regional_neighbors"
    ]
  },

  "exclusions": {
    "personal_domains": [
      "gmail.com", "yahoo.com", "hotmail.com",
      "local_free_email_providers"
    ],
    "hr_prefixes": [
      "hr@", "jobs@", "career@",
      "local_hr_prefixes"
    ],
    "service_prefixes": [
      "example@", "test@", "demo@", "noreply@",
      "webmaster@", "admin@", "support@"
    ],
    "suspicious_domains": [
      "sentry.io", "panjiva.com", "temp-mail.org"
    ],
    "excluded_country_domains": [
      ".cn", ".hk", ".tw", ".in", ".tr", ".jp", ".kr"
    ],
    "excluded_industries": {
      "education": ["school", "university", "college"],
      "media": ["newspaper", "magazine", "television"],
      "finance": ["bank", "insurance", "finance"],
      "retail": ["shop", "store", "retail"],
      "government": ["government", "municipal", "ministry"]
    },
    "suspicious_patterns": [
      "^[a-f0-9]{20,}@",
      "^[a-z0-9]{15,}@"
    ]
  },

  "domain_patterns": {
    "relevant_patterns": [
      "industry_keyword1", "industry_keyword2"
    ],
    "high_value_domains": [
      "ltd", "inc", "corp", "group",
      "local_business_suffixes"
    ]
  },

  "processing": {
    "batch_size": 100,
    "max_retries": 3,
    "processing_delay": 50,
    "backup_original": true,
    "preserve_metadata": true,
    "generate_reports": true
  },

  "output": {
    "prefix": "smart_filtered_",
    "include_metadata": true,
    "metadata_format": "csv",
    "generate_statistics": true,
    "create_backup": true
  }
}
```

### Примеры ключевых слов по индустриям

#### Agricultural Machinery

**Основные термины**:
- EN: tractor, combine harvester, seeder, plough, cultivator, sprayer, farm equipment
- ES: tractor, cosechadora, sembradora, arado, cultivador, pulverizador, maquinaria agrícola
- PT: trator, colheitadeira, semeadora, arado, cultivador, pulverizador, máquinas agrícolas
- FR: tracteur, moissonneuse-batteuse, semoir, charrue, cultivateur, pulvérisateur
- DE: Traktor, Mähdrescher, Sämaschine, Pflug, Grubber, Sprühgerät

#### Hydraulic Equipment

**Основные термины**:
- EN: hydraulic cylinder, hydraulic pump, hydraulic motor, hydraulic valve, hydraulic oil
- IT: cilindro idraulico, pompa idraulica, motore idraulico, valvola idraulica, olio idraulico
- ES: cilindro hidráulico, bomba hidráulica, motor hidráulico, válvula hidráulica, aceite hidráulico
- PT: cilindro hidráulico, bomba hidráulica, motor hidráulico, válvula hidráulica, óleo hidráulico
- FR: vérin hydraulique, pompe hydraulique, moteur hydraulique, valve hydraulique
- DE: Hydraulikzylinder, Hydraulikpumpe, Hydraulikmotor, Hydraulikventil

#### Mining & Earthmoving

**Основные термины**:
- EN: excavator, bulldozer, loader, mining equipment, earthmoving machinery, dump truck
- ES: excavadora, bulldozer, cargadora, equipo minero, maquinaria movimiento tierra, volquete
- PT: escavadora, bulldozer, carregadeira, equipamento mineração, dumper
- FR: pelle mécanique, bulldozer, chargeuse, équipement minier, tombereau
- DE: Bagger, Bulldozer, Radlader, Bergbauausrüstung, Muldenkipper

#### Construction Equipment

**Основные термины**:
- EN: crane, concrete mixer, scaffolding, construction machinery, building equipment
- ES: grúa, hormigonera, andamio, maquinaria construcción, equipo edificación
- PT: guindaste, betoneira, andaime, maquinaria construção
- FR: grue, bétonnière, échafaudage, matériel de construction
- DE: Kran, Betonmischer, Gerüst, Baumaschinen

---

## Таблица результатов

### Выполненные обработки

| Страна | Индустрия | Тип данных | Исходный clean | Smart Filter qualified | Score порог | Final CLEAN | Охват | Max Score | Время |
|--------|-----------|------------|----------------|------------------------|-------------|-------------|-------|-----------|-------|
| 🇮🇹 **Италия** | Hydraulics | LVP + metadata | 11,039 | 4,024 (36.5%) | 40.8 | **2,012** | 18.2% | 65.8 | 3.4s |
| 🇪🇸 **Испания** | Agriculture | TXT без metadata | 5,651 | 5,313 (94.0%) | 30.0 | **2,699** | 47.8% | 63.5 | 3.4s |
| 🇵🇹 **Португалия** | Agro + Hydraulics (hybrid) | LVP + metadata | 2,509 | 2,305 (91.9%) | 30.0 | **1,583** | 63.1% | 84.2 | 1.5s |

**Итого**: 6,294 qualified emails готовы к рассылке

### Рекомендации по порогам Score

| Тип данных | Qualified rate | Рекомендуемый Score | Ожидаемый охват | Примечания |
|------------|----------------|---------------------|-----------------|------------|
| **LVP с rich metadata** | 90-95% | **30** | 55-65% | Лучший вариант, высокая точность |
| **LVP с базовыми metadata** | 85-90% | **28-30** | 50-60% | Хороший результат |
| **TXT без metadata** | 90-95% | **25-30** | 45-55% | Меньше данных для relevance |
| **Hybrid (2+ индустрии)** | 90-95% | **30** | 60-70% | Больше охват за счёт keywords |
| **Strict (только top)** | 90-95% | **40-45** | 20-30% | Для premium рассылок |
| **Maximum coverage** | 90-95% | **20-25** | 70-85% | Для массовых рассылок |

### Формула расчёта Score

```
Final Score = (Email Quality × 0.10) +
              (Company Relevance × 0.45) +
              (Geographic Priority × 0.30) +
              (Engagement Source × 0.15)

Где:
- Email Quality: 0-100 (корпоративный домен, структура, длина)
- Company Relevance: 0-100 (keywords matching в описании, category, domain)
- Geographic Priority: 0-100 (целевая страна/регион)
- Engagement Source: 0-100 (источник контакта: product, service, contact, about)
```

**Компоненты Score**:

| Компонент | Вес | Что оценивает | Максимум |
|-----------|-----|---------------|----------|
| **Email Quality** | 10% | Корпоративный домен, структура email, длина | 10 |
| **Company Relevance** | 45% | Keywords matching, category, domain patterns | 45 |
| **Geographic Priority** | 30% | Целевая страна, регион, TLD | 30 |
| **Engagement Source** | 15% | Источник контакта (product > service > contact) | 15 |
| **TOTAL** | 100% | | **100** |

---

## Troubleshooting

### Проблема 1: Слишком мало qualified leads (<80%)

**Симптомы**:
```
Квалифицированные лиды: 1500
Исключено: 1000
→ Qualified rate: 60%
```

**Возможные причины**:
1. Слишком строгие exclusions (особенно personal_domains, excluded_industries)
2. Неправильные geographic exclusions
3. Слишком много suspicious_patterns

**Решение**:
- Проверить JSON файл со Smart Filter результатами
- Найти exclusion_reasons для excluded emails
- Скорректировать конфиг: убрать излишние exclusions

```bash
# Анализ причин исключения
cd output
python3 << 'SCRIPT'
import json
from collections import Counter

with open('smart_filtered_*.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Подсчитать причины исключений
excluded = [item for item in results if item.get('exclusion_reasons')]
reasons = []
for item in excluded:
    reasons.extend(item['exclusion_reasons'])

print("Топ причин исключений:")
for reason, count in Counter(reasons).most_common(10):
    print(f"  {reason}: {count}")
SCRIPT
```

### Проблема 2: Слишком низкий Score у всех emails

**Симптомы**:
```
Score диапазон: 35.2 - 18.5
→ Максимальный Score < 40
```

**Возможные причины**:
1. TXT файл без метаданных → relevance = 0
2. Неправильные keywords (не matching с данными)
3. Geographic priority не настроен для страны

**Решение**:
- Если TXT без metadata → использовать порог Score ≥ 25-28 (вместо 30)
- Проверить keywords: должны matching с реальными данными
- Добавить больше географических вариантов (города, регионы, TLD)

### Проблема 3: Ошибки с Cyrillic в путях файлов

**Симптомы**:
```bash
rm: cannot remove 'output/Италия': No such file or directory
```

**Причина**: Bash splitting на пробелах в Cyrillic именах

**Решение**:
```bash
# Правильно: использовать кавычки
rm "output/Италия Агро файл.txt"

# Или find + xargs
find output/ -name "*Италия*" -delete

# Или создать alias без Cyrillic
cp "output/Италия файл.txt" output/Italy_file.txt
```

### Проблема 4: CSV field size limit error

**Симптомы**:
```
_csv.Error: field larger than field limit (131072)
```

**Причина**: Большие поля в CSV (например, длинные Description)

**Решение**:
```python
import sys
import csv

# Добавить в начало скрипта
csv.field_size_limit(sys.maxsize)
```

### Проблема 5: Все emails помечены как "excluded" в target_category

**Симптомы**:
```json
{
  "target_category": "excluded",
  "exclusion_reasons": [],
  "final_score": 42.5
}
```

**Причина**: Баг в `get_target_category()` - слишком строгий relevance check

**Решение**: Игнорировать `target_category`, фильтровать только по `final_score`

```python
# НЕ использовать target_category
if item.get('target_category') != 'excluded':  # ❌ НЕПРАВИЛЬНО

# Использовать только Score
if item.get('final_score', 0) >= 30:  # ✅ ПРАВИЛЬНО
```

---

## Чек-лист

### Перед началом обработки

- [ ] Файл находится в `input/` директории
- [ ] Определена страна и индустрия
- [ ] Выбран или создан подходящий конфиг
- [ ] Проверены existing обработки (может уже есть clean файл)

### Во время обработки

- [ ] Базовая LVP фильтрация выполнена (если нужно)
- [ ] Smart Filter запущен с правильным конфигом
- [ ] Qualified rate >= 85% (если меньше - проверить exclusions)
- [ ] Score диапазон разумный (max >= 60, min >= порога)

### После обработки

- [ ] FINAL CLEAN LIST создан с правильным порогом Score
- [ ] Охват соответствует ожиданиям (30-65%)
- [ ] TXT файл содержит только emails (без заголовков, дубликатов)
- [ ] CSV файл корректно открывается и содержит все колонки
- [ ] Промежуточные файлы удалены (smart_filtered_*)
- [ ] Создан отчёт с результатами

### Финальная верификация

- [ ] Проверить TOP-10 emails (должны быть корпоративные, релевантные)
- [ ] Проверить LAST-10 emails (должны быть на пороге, но acceptable)
- [ ] Нет дубликатов в финальном списке
- [ ] Файлы названы корректно с датой
- [ ] Результаты задокументированы

---

## Дополнительные ресурсы

### Созданные конфигурации

- [configs/italy_hydraulics.json](configs/italy_hydraulics.json) - Италия, гидравлика
- [configs/spain_agriculture.json](configs/spain_agriculture.json) - Испания, агротехника
- [configs/portugal_agriculture_hydraulics.json](configs/portugal_agriculture_hydraulics.json) - Португалия, агро + гидравлика (hybrid)

### Связанные документы

- [CLAUDE.md](CLAUDE.md) - Обзор всего проекта Email Checker
- [SMART_FILTER_GUIDE.md](SMART_FILTER_GUIDE.md) - Подробное руководство по Smart Filter
- [README.md](README.md) - Основная документация

### Команды Quick Reference

```bash
# Базовая фильтрация LVP
python3 email_checker.py check-lvp "input/file.lvp"

# Smart Filter
python3 smart_filter.py "output/file_clean.txt" --config config_name --verbose

# Проверка результатов
wc -l output/smart_filtered_*.txt
head -5 output/smart_filtered_*.csv

# Создание FINAL CLEAN LIST
# (см. раздел "ШАГ 5.2")

# Очистка
rm output/smart_filtered_*.{txt,csv,json}
```

---

## Контакты и поддержка

**Версия документа**: 1.0
**Последнее обновление**: 13 октября 2025

**Создано на основе**:
- ✅ Обработки Италии (2,012 emails)
- ✅ Обработки Испании (2,699 emails)
- ✅ Обработки Португалии (1,583 emails)

**Всего опыта**: 6,294 qualified emails из 3 стран

---

**🎯 Готовы начать?** Следуйте инструкции шаг за шагом, и вы получите качественный CLEAN LIST для рассылки!
