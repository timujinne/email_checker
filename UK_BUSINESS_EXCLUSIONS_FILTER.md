# UK Business Exclusions Filter - Руководство

## Описание

Smart filter для фильтрации UK бизнес-контактов с **исключением нежелательных индустрий**:

### Исключаемые категории:
1. **Travel & Tourism** - туристические агентства, операторы туров, бронирование отелей
2. **Media & News** - газеты, журналы, TV/радио станции, новостные порталы
3. **Legal Services** - адвокаты, юристы, нотариусы, law firms
4. **Financial Services** - банки, страховые компании, инвестиционные фонды
5. **Accounting & Audit** - бухгалтерские и аудиторские фирмы
6. **Advertising & Marketing** - рекламные и маркетинговые агентства
7. **Education** - школы, университеты, образовательные центры
8. **Recruitment Agencies** - кадровые агентства, headhunters
9. **Retail & E-commerce** - магазины, интернет-магазины, торговые сети

## Использование

### Базовая команда

```bash
# 1. Обработка LVP файла
python3 email_checker.py check-lvp "input/your_file.lvp"

# 2. Применение smart filter
python3 email_checker.py smart-filter "output/your_file_clean_*.txt" --config uk_business_exclusions
```

### Полный workflow

```bash
# Шаг 1: Базовая проверка
python3 email_checker.py check-lvp "input/En HC от Глеба.lvp"

# Шаг 2: Умная фильтрация с исключениями
python3 email_checker.py smart-filter "output/En HC от Глеба_clean_20251110_091359.txt" --config uk_business_exclusions

# Результат:
# - output/uk_business_filtered_*_clean_*.txt (TXT)
# - output/uk_business_filtered_*_clean_*.csv (CSV с приоритетами)
# - output/uk_business_filtered_*_clean_*.json (JSON с метаданными)
```

## Результаты обработки файла "En HC от Глеба"

### Статистика

| Метрика | Значение |
|---------|----------|
| **Всего обработано** | 6,268 email |
| **Прошли фильтрацию** | 6,038 email (96.3%) |
| **Исключено жестко** | 230 email (3.7%) |
| **Время обработки** | 4.08 секунд |

### Распределение по приоритетам

| Приоритет | Количество | Score Range | Описание |
|-----------|------------|-------------|----------|
| **Low** | 5,793 (95.9%) | 10-49 | Базовые контакты |
| **Medium** | 245 (4.1%) | 50-99 | Релевантные B2B контакты |
| **High** | 0 (0%) | 100+ | Приоритетные контакты |

### Причины исключения (230 email)

| Причина | Количество | Описание |
|---------|------------|----------|
| **HR/Service Prefix** | 84 | Адреса hr@, jobs@, noreply@ и т.д. |
| **Geographic Restriction** | 74 | Исключенные страны (.cn, .in, .tr, .ru и т.д.) |
| **Suspicious Pattern** | 74 | Подозрительные паттерны (хеши, случайные строки) |

## Конфигурация фильтра

### Географические приоритеты

**High Priority (UK):**
- Домены: .uk, .co.uk
- Города: London, Manchester, Birmingham, Leeds, Glasgow, Edinburgh и др.

**Medium Priority:**
- Ireland (.ie), Scotland, Wales, Northern Ireland

**Исключены:**
- Китай (.cn), Индия (.in), Турция (.tr), Россия (.ru), и др.

### Scoring система

#### Веса компонентов:
- **Email Quality**: 15% - корпоративный домен, профессиональный prefix
- **Company Relevance**: 35% - релевантность бизнесу (manufacturing, B2B)
- **Geographic Priority**: 25% - UK приоритет
- **Engagement**: 25% - тип email (sales@, contact@, info@)

#### Бонусы (мультипликаторы):
- **Manufacturing Company**: ×1.4
- **Target Geography** (UK): ×1.8
- **Domain Match**: ×1.3
- **B2B Indicator**: ×1.2

#### Штрафы (мультипликаторы):
- **Excluded Industry**: ×0.05 (критическое снижение)
- **Excluded Domain Keyword**: ×0.1

### Пороги приоритетов

- **High Priority**: score >= 100
- **Medium Priority**: score >= 50
- **Low Priority**: score >= 10
- **Excluded**: score < 10

## Выходные файлы

### 1. TXT файл
```
output/uk_business_filtered_*_clean_*.txt
```
Простой список email (один email на строку).

### 2. CSV файл
```
output/uk_business_filtered_*_clean_*.csv
```
Колонки:
- `email` - Email адрес
- `final_score` - Финальный score
- `priority` - Приоритет (high/medium/low)
- `target_category` - Категория (excluded/qualified)
- `processing_timestamp` - Время обработки
- `filter_name` - Имя фильтра

### 3. JSON файл
```
output/uk_business_filtered_*_clean_*.json
```
Полная информация с метаданными, scoring details, bonuses, penalties.

### 4. Отчет
```
reports/uk_business_exclusions_report_*.txt
```
Статистика обработки, исключения, timing.

## Примеры результатов

### Medium Priority (Score 50-99)

UK компании с релевантными доменами:

```
accounts@guymachinery.co.uk        (score: 50.75)
accounts@ifmgroup.co.uk            (score: 54.25)
contact@robertsgardenmachinery.co.uk (score: 50.75)
```

**Почему Medium:**
- ✅ UK домен (.co.uk) - бонус ×1.8
- ✅ B2B индикаторы (ltd, group) - бонус ×1.2
- ⚠️ Недостаточно manufacturing keywords для High Priority

### Low Priority (Score 10-49)

Базовые контакты без четкой B2B принадлежности:

```
341office@frasencnc.com
a.campanelli@cmcmt.it
a.cubley@ccagri.co.uk
```

**Почему Low:**
- ❌ Не UK домены или отсутствие явных B2B индикаторов
- ❌ Недостаточно manufacturing/industry keywords
- ✅ Но прошли жесткие исключения

### Исключенные (Hard Exclusions)

```
hr@example.co.uk         → HR prefix
jobs@company.cn          → Geographic restriction + HR
info@travelagency.co.uk  → Excluded industry: travel_tourism
contact@lawfirm.co.uk    → Excluded industry: legal_services
info@ukbank.com          → Excluded industry: financial_services
```

## Файлы конфигурации

### Конфиг
```
configs/uk_business_exclusions.json
```
Основная конфигурация с keywords, scoring, exclusions.

### Класс фильтра
```
smart_filters/uk_business_exclusions_filter.py
```
Python класс с логикой фильтрации (для тестирования).

## Тестирование

### Запуск теста
```bash
python3 smart_filters/uk_business_exclusions_filter.py
```

Тестирует 4 сценария:
1. ✅ Manufacturing (hydraulics) - НЕ исключается
2. ❌ Travel agency - исключается
3. ❌ Law firm (solicitors) - исключается
4. ❌ Bank (financial services) - исключается

## Расширение фильтра

### Добавление новых исключаемых индустрий

Редактируйте `configs/uk_business_exclusions.json`:

```json
"exclusions": {
  "excluded_industries": {
    "your_new_industry": [
      "keyword1", "keyword2", "keyword3"
    ]
  }
}
```

### Изменение scoring весов

```json
"scoring": {
  "weights": {
    "email_quality": 0.15,
    "company_relevance": 0.35,
    "geographic_priority": 0.25,
    "engagement": 0.25
  }
}
```

### Изменение порогов приоритетов

```json
"scoring": {
  "thresholds": {
    "high_priority": 100,
    "medium_priority": 50,
    "low_priority": 10
  }
}
```

## Troubleshooting

### Фильтр не находится

```bash
# Проверить доступные фильтры
python3 -c "from smart_filters import list_available_filters; filters = list_available_filters(); print('\\n'.join(f[\"name\"] + \": \" + f[\"display_name\"] for f in filters))"
```

Должен быть в списке:
```
uk_business_exclusions: UK - Business (Exclusion Filter)
```

### Слишком много исключений

1. **Проверить логи:**
   ```bash
   cat logs/uk_business_exclusions_*.log
   ```

2. **Ослабить фильтры** в конфиге:
   - Уменьшить список excluded_industries
   - Изменить penalty_multipliers

3. **Снизить пороги:**
   ```json
   "thresholds": {
     "high_priority": 80,    // вместо 100
     "medium_priority": 40,  // вместо 50
     "low_priority": 5       // вместо 10
   }
   ```

### Мало High Priority

Это нормально для негативного фильтра. High Priority требует:
- UK домен
- Manufacturing/B2B keywords
- Профессиональный email prefix
- Отсутствие excluded industries

Для увеличения High Priority:
1. Снизить порог high_priority (100 → 80)
2. Увеличить bonus_multipliers
3. Добавить больше positive keywords

## Заключение

UK Business Exclusions Filter успешно:

✅ Исключает 9 категорий нежелательных индустрий
✅ Приоритизирует UK geography
✅ Фильтрует HR/service/suspicious email
✅ Сохраняет метаданные
✅ Генерирует детальные отчеты

**Результат для "En HC от Глеба":**
- Из 6,268 → 6,038 квалифицированных контактов (96.3%)
- 245 medium priority (4.1%)
- 230 жестко исключены (3.7%)

Фильтр готов к использованию!
