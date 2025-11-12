# 🎯 Smart Filter Expert Skill

**Универсальный специалист по созданию и управлению email-фильтрами для любых стран и отраслей**

---

## 📖 Что это такое?

**Smart Filter Expert Skill** - это комплексный набор инструментов, знаний и шаблонов для быстрого создания умных фильтров email-списков. Скилл глубоко понимает:

- ✅ Как работает система смарт-фильтрации
- ✅ Отраслевую терминологию на 7+ языках
- ✅ Географические особенности разных стран
- ✅ Паттерны корпоративных email-адресов
- ✅ Оптимальные настройки скоринга для разных индустрий

**Цель**: Создание фильтра за 5 минут вместо нескольких часов ручной работы.

---

## 🚀 Быстрый старт

### Вариант 1: Интерактивное создание фильтра

```bash
cd e:\Shtim\Downloads\email_checker
python3 smart_filter_skill/filter_generator.py --interactive
```

**Диалог:**
```
🎯 Smart Filter Generator - Interactive Mode

1. Target country code (e.g., DE, FR, IT, ES, PL): DE
   ✅ Germany selected
   ✅ Auto-loaded: German geographic data
   ✅ Primary language: German (de)

2. Additional languages (comma-separated, or press Enter): en
   ✅ Languages: de, en

3. Target industry:
   [1] Hydraulics
   [2] Earthmoving
   [3] Automotive
   [4] Construction
   [5] Manufacturing
   [6] Custom

   Select (1-6): 2
   ✅ Earthmoving industry selected
   ✅ Loaded template: earthmoving_template.json

4. Filter name (default: germany_earthmoving):
   ✅ Using: germany_earthmoving

5. Generate files? [Y/n]: Y

✅ Created: smart_filters/configs/germany_earthmoving_config.json
✅ Created: smart_filters/germany_earthmoving_filter.py
✅ Updated: smart_filters/__init__.py

📝 Your filter is ready! Use it:
   python3 email_checker.py smart-filter <file> --config germany_earthmoving
```

### Вариант 2: Создание из шаблона

```bash
# Адаптировать существующий фильтр для другой страны
python3 smart_filter_skill/filter_generator.py \
  --from-template italy_hydraulics \
  --adapt-country ES \
  --output spain_hydraulics
```

### Вариант 3: Создание из командной строки

```bash
python3 smart_filter_skill/filter_generator.py \
  --country FR \
  --industry construction \
  --languages fr,en \
  --output france_construction
```

---

## 📚 Структура скилла

```
smart_filter_skill/
├── SKILL_README.md                 # Эта документация
├── KNOWLEDGE_BASE.md               # Глубокая база знаний для AI
├── filter_generator.py             # Интерактивный генератор фильтров
├── blocklist_analyzer.py           # Анализатор блок-листов
│
├── language_library/               # Библиотека языковых терминов
│   ├── de_industry_terms.json     # Немецкие термины
│   ├── fr_industry_terms.json     # Французские
│   ├── it_industry_terms.json     # Итальянские
│   ├── en_industry_terms.json     # Английские
│   ├── es_industry_terms.json     # Испанские
│   ├── pl_industry_terms.json     # Польские
│   ├── pt_industry_terms.json     # Португальские
│   └── multi_language_matcher.py  # Мультиязычный матчер
│
├── industry_templates/             # Отраслевые шаблоны
│   ├── hydraulics_template.json
│   ├── earthmoving_template.json
│   ├── automotive_template.json
│   ├── construction_template.json
│   └── manufacturing_template.json
│
├── geographic_data/                # Географические данные
│   ├── europe_regions.json        # Европейские регионы
│   ├── country_domains.json       # Доменные зоны стран
│   ├── city_lists.json            # Списки городов по странам
│   └── geo_priorities.json        # Приоритеты по странам
│
├── config_templates/               # Базовые шаблоны конфигов
│   ├── base_config_template.json
│   └── quick_start_configs/       # Готовые конфиги
│       ├── germany_automotive.json
│       ├── france_construction.json
│       ├── spain_hydraulics.json
│       └── poland_earthmoving.json
│
└── examples/                       # Примеры использования
    ├── example_germany_filter.md
    ├── example_france_filter.md
    └── example_workflow.md
```

---

## 🛠️ Основные инструменты

### 1. Filter Generator

**Назначение**: Создание новых фильтров

**Режимы работы:**

```bash
# Интерактивный режим (рекомендуется для начинающих)
python3 filter_generator.py --interactive

# Из командной строки (быстрый режим)
python3 filter_generator.py --country DE --industry hydraulics --languages de,en

# Адаптация существующего фильтра
python3 filter_generator.py --from-template italy_hydraulics --adapt-country FR

# Валидация фильтра
python3 filter_generator.py --validate germany_earthmoving

# Тестирование фильтра
python3 filter_generator.py --test germany_earthmoving --sample-file test_emails.txt
```

**Что генерирует:**
- ✅ Конфиг JSON (`smart_filters/configs/<name>_config.json`)
- ✅ Python класс фильтра (`smart_filters/<name>_filter.py`)
- ✅ Обновляет `__init__.py` для регистрации фильтра
- ✅ Создает документацию фильтра
- ✅ Генерирует тестовые кейсы

### 2. Blocklist Analyzer

**Назначение**: Анализ и интеграция блок-листов

```bash
# Анализ текущих блок-листов
python3 blocklist_analyzer.py --analyze

# Результат:
# 📊 Blocklist Statistics:
#   - Total blocked emails: 22,347
#   - Total blocked domains: 723
#   - Top country TLDs: .ru (45%), .cn (23%), .pl (12%)
#   - Recommended exclusions for configs: 15 patterns

# Обновление конфигов на основе анализа
python3 blocklist_analyzer.py --update-configs

# Добавление новых паттернов в блок-листы
python3 blocklist_analyzer.py --add-pattern "*.tempmail.com"

# Экспорт статистики
python3 blocklist_analyzer.py --export-stats blocklist_report.json
```

**Функции:**
- Статистический анализ заблокированных доменов
- Выявление паттернов (одноразовые email, спам-домены)
- Предложения для `hard_exclusions` в конфигах
- Автоматическое обновление конфигов

---

## 🌍 Поддерживаемые страны и языки

### Европа

| Страна | Код | Языки | Готовые шаблоны |
|--------|-----|-------|-----------------|
| 🇩🇪 Германия | DE | de, en | Automotive, Machinery |
| 🇫🇷 Франция | FR | fr, en | Construction, Machinery |
| 🇮🇹 Италия | IT | it, en | Hydraulics ✅, Machinery |
| 🇪🇸 Испания | ES | es, en | Hydraulics, Construction |
| 🇵🇱 Польша | PL | pl, en | Earthmoving, Construction |
| 🇨🇭 Швейцария | CH | de, fr, it, en | Machinery ✅ |
| 🇦🇹 Австрия | AT | de, en | Machinery, Construction |
| 🇳🇱 Нидерланды | NL | nl, en | Machinery, Logistics |
| 🇧🇪 Бельгия | BE | nl, fr, en | Machinery, Logistics |
| 🇵🇹 Португалия | PT | pt, en | Construction, Manufacturing |

✅ = Готовый конфиг включен

### Другие регионы

Скилл легко адаптируется для любой страны. Нужно только:
1. Добавить географические данные
2. Добавить языковые термины
3. Настроить исключения

---

## 🏭 Поддерживаемые отрасли

### 1. Hydraulics (Гидравлика)
- Гидравлические цилиндры
- Насосы, моторы, клапаны
- Системы управления
- **Языки**: IT, EN, DE, FR, ES

### 2. Earthmoving (Землеройная техника)
- Экскаваторы, погрузчики
- Строительная техника
- Компоненты и запчасти
- **Языки**: EN, DE, FR, PL, ES

### 3. Automotive (Автомобильная промышленность)
- Производители автомобилей
- Поставщики компонентов
- Aftermarket
- **Языки**: DE, EN, IT, FR, ES

### 4. Construction (Строительство)
- Строительное оборудование
- Инструменты
- Материалы
- **Языки**: EN, DE, FR, ES, PL

### 5. Manufacturing (Производство)
- Промышленное оборудование
- Автоматизация
- Станки
- **Языки**: EN, DE, IT, FR, ES

---

## 📊 Как работает скоринг

### Формула скоринга

```
Overall Score =
  (Email Quality × 0.10) +
  (Company Relevance × 0.45) +
  (Geographic Priority × 0.30) +
  (Engagement × 0.15)

Final Score = Overall Score × Bonuses
```

### Компоненты

#### 1. Email Quality (0-100)
- Корпоративный домен: +35
- Бесплатный провайдер: +15
- Структура (firstname.lastname): +15
- Разумная длина (3-25 символов): +10
- Индустриальный домен: +25

#### 2. Company Relevance (0-100)
- Primary термины: +20-25 за термин
- Secondary термины: +8-10 за термин
- OEM индикаторы: +12-15
- Негативные keywords: -50

#### 3. Geographic Priority (0-100)
- **High** (целевая страна): 100
- **Medium** (соседние страны): 60
- **Low** (другие): 30

#### 4. Engagement (0-100)
- Source = product/service: 80-85
- Source = contact: 75
- Source = about: 65
- Прочие: 40

### Бонусные мультипликаторы

- **OEM manufacturer**: ×1.3
- **Target geography (high)**: ×2.0
- **Domain match**: ×1.5

### Пороги приоритетов

- **HIGH**: score >= 100
- **MEDIUM**: score >= 50
- **LOW**: score >= 10
- **EXCLUDED**: score < 10

---

## 🎓 Примеры использования

### Пример 1: Создание фильтра для Германии (Automotive)

```bash
# Создаем фильтр
python3 smart_filter_skill/filter_generator.py \
  --country DE \
  --industry automotive \
  --languages de,en \
  --output germany_automotive

# Применяем к списку
python3 email_checker.py smart-filter \
  output/germany_contacts_clean.txt \
  --config germany_automotive

# Результат:
# - Germany_Automotive_..._HIGH_PRIORITY_*.txt (топ лиды)
# - Germany_Automotive_..._MEDIUM_PRIORITY_*.txt
# - Germany_Automotive_..._LOW_PRIORITY_*.txt
```

### Пример 2: Адаптация Italy Hydraulics для Испании

```bash
# Адаптируем существующий фильтр
python3 smart_filter_skill/filter_generator.py \
  --from-template italy_hydraulics \
  --adapt-country ES \
  --output spain_hydraulics

# Скилл автоматически:
# ✅ Заменит итальянские термины на испанские
# ✅ Обновит географические приоритеты
# ✅ Адаптирует персональные домены (.es вместо .it)
# ✅ Обновит исключенные страны
```

### Пример 3: Batch обработка с новым фильтром

```bash
# Создали фильтр для Франции
python3 smart_filter_skill/filter_generator.py \
  --country FR \
  --industry construction \
  --languages fr,en \
  --output france_construction

# Обрабатываем все французские списки
python3 email_checker.py smart-filter-batch \
  --pattern "output/*France*_clean_*.txt" \
  --config france_construction
```

---

## ⚙️ Настройка и кастомизация

### Изменение порогов скоринга

Отредактируйте конфиг фильтра:

```json
{
  "scoring": {
    "thresholds": {
      "high_priority": 120,   // было 100
      "medium_priority": 70,   // было 50
      "low_priority": 20       // было 10
    }
  }
}
```

### Добавление новых отраслевых терминов

```json
// smart_filters/configs/<your_filter>_config.json
{
  "industry_keywords": {
    "custom_industry": {
      "primary": [
        "ваш термин 1",
        "ваш термин 2"
      ]
    }
  }
}
```

### Добавление новых языков

```bash
# Создайте файл с терминами
# smart_filter_skill/language_library/cs_industry_terms.json (чешский)

{
  "language": "cs",
  "industries": {
    "hydraulics": {
      "primary": ["hydraulický válec", "hydraulické čerpadlo", ...]
    }
  }
}
```

---

## 🔧 Troubleshooting

### Проблема: Слишком много исключений

**Решение**: Смягчите критерии исключений в конфиге

```json
{
  "hard_exclusions": {
    "excluded_industries": {
      // Закомментируйте ненужные индустрии
      // "retail": {...}
    }
  }
}
```

### Проблема: Мало HIGH priority контактов

**Решения**:
1. Снизите порог `high_priority` (100 → 80)
2. Увеличьте веса `company_relevance` (0.45 → 0.55)
3. Добавьте больше primary терминов

### Проблема: Фильтр пропускает нерелевантные контакты

**Решение**: Усильте негативные keywords

```json
{
  "industry_keywords": {
    "negative_keywords": [
      "retail", "e-commerce", "online shop",
      "university", "education", "training"
    ]
  }
}
```

---

## 📖 Дополнительные ресурсы

- **KNOWLEDGE_BASE.md** - глубокая база знаний о системе фильтрации
- **examples/** - реальные примеры фильтров
- **../SMART_FILTER_GUIDE.md** - подробное руководство по смарт-фильтрам
- **../CLAUDE.md** - общая документация проекта

---

## 🤝 Поддержка

**Частые вопросы**: См. раздел Troubleshooting выше

**Создание issue**: Если обнаружили баг или нужна новая функция

**Документация проекта**: См. [../CLAUDE.md](../CLAUDE.md)

---

## 📊 Метрики качества

Хороший фильтр должен показывать:

- ✅ **Точность**: 80%+ HIGH priority контактов релевантны
- ✅ **Охват**: 60%+ релевантных контактов в HIGH/MEDIUM
- ✅ **Исключения**: <5% ложных исключений
- ✅ **Скорость**: ~1-3 секунды на 1000 email

Используйте `filter_generator.py --test` для проверки метрик.

---

**Версия**: 1.0.0
**Дата создания**: 2025-01-21
**Автор**: Email Checker Team
