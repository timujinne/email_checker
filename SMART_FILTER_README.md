# Умный Фильтр Email Checker - Документация

## Обзор

Умный фильтр - это автономная система для интеллектуальной фильтрации email списков, разработанная как полный аналог Google Script логики. Система использует контекстуальный анализ, географическое приоритезирование и скоринг для определения наиболее релевантных контактов.

## Архитектура

### Основные компоненты

1. **SmartFilterProcessor** - основной процессор фильтрации
2. **SmartHardExclusionFilter** - фильтр жестких исключений
3. **SmartHydraulicDetector** - детектор гидравлической релевантности
4. **SmartGeographicPrioritizer** - географический приоритезер
5. **SmartLeadScorer** - скорер контактов
6. **SmartFileProcessor** - безопасный процессор файлов с бэкапами

### Файлы системы

```
smart_filter_processor_v2.py  # Основной модуль умной фильтрации
smart_filter.py               # Удобный скрипт запуска
configs/
├── italy_hydraulics.json     # Конфигурация: Италия - гидравлические цилиндры
└── ...                       # Другие конфигурации
reports/                      # Отчеты об обработке
backups/                      # Бэкапы обрабатываемых файлов
```

## Использование

### Быстрый запуск

```bash
# Базовое использование
python3 smart_filter.py путь/к/файлу.txt

# С указанием конфигурации
python3 smart_filter.py путь/к/файлу.txt --config italy_hydraulics

# Подробный вывод
python3 smart_filter.py путь/к/файлу.txt --verbose

# Показать доступные конфигурации
python3 smart_filter.py --list-configs
```

### Интеграция с Email Checker

```bash
# Через основной email_checker.py
python3 email_checker.py smart-filter путь/к/файлу.txt

# Batch обработка
python3 email_checker.py smart-filter-batch --config italy_hydraulics
```

## Конфигурация

### Структура конфигурационного файла

```json
{
  "config_name": "italy_hydraulics",
  "display_name": "Italy - Hydraulic Cylinders",
  "version": "1.0",
  "target_market": {
    "country_code": "IT",
    "country_name": "Italy",
    "primary_language": "it"
  },
  "target_industry": {
    "name": "Hydraulic Cylinders",
    "description": "Производители и дистрибьюторы гидравлических цилиндров"
  },
  "keywords": {
    "hydraulic_cylinders": [
      "cilindri idraulici",
      "cilindro idraulico",
      "attuatori oleodinamici"
    ],
    "applications": [...],
    "components": [...],
    "oem_indicators": [...]
  },
  "exclusions": {
    "personal_domains": [...],
    "hr_prefixes": [...],
    "suspicious_patterns": [...],
    "excluded_country_domains": [...]
  },
  "geographic_priorities": {
    "high": [...],
    "medium": [...],
    "regions": [...]
  },
  "scoring": {
    "weights": {...},
    "thresholds": {...}
  },
  "domain_patterns": {
    "relevant_patterns": [...],
    "high_value_domains": [...]
  },
  "processing": {
    "batch_size": 100,
    "processing_delay": 50,
    "backup_original": true
  }
}
```

## Результаты обработки

### Выходные файлы

- **TXT**: Отфильтрованные email (один email на строку)
- **CSV**: Email с метаданными и скорами
- **JSON**: Полные результаты с детальной информацией

### Отчеты

Для каждой обработки генерируется отчет в `reports/`:
```
SMART FILTER PROCESSING REPORT
================================================================================
Filter: italy_hydraulics
Config: Italy - Hydraulic Cylinders
Input file: output/Италия Агро Покартам IT_clean_20251010_120537.txt
Processing time: 7.31 seconds

STATISTICS:
  Total processed: 11043
  Valid emails: 11043
  Hard excluded: 741
  Qualified leads: 10302
  High priority: 0
  Medium priority: 744
  Low priority: 9558

EXCLUSION REASONS:
  suspicious_pattern: 548
  personal_domain: 38
  geographic_restriction: 56
  hr_service_prefix: 106
```

## Алгоритм работы

### 1. Предварительная фильтрация
- Проверка формата email
- Жесткие исключения (персональные домены, HR префиксы, подозрительные паттерны)
- Географические ограничения

### 2. Контекстуальный анализ
- Детекция релевантности по ключевым словам гидравлики
- Анализ доменов на предмет релевантности
- OEM индикаторы

### 3. Скоринг
- Качество email
- Релевантность компании
- Географический приоритет
- Вовлеченность (источник контакта)

### 4. Классификация
- **High priority**: > 100 баллов
- **Medium priority**: 50-100 баллов
- **Low priority**: 10-50 баллов
- **Exclude**: < 10 баллов

## Безопасность

### Бэкапы
- Автоматическое создание бэкапов перед обработкой
- Хранение в `backups/` с временной меткой
- Атомарные операции записи для предотвращения порчи данных

### Изоляция
- Полностью автономная работа без конфликтов с основной системой
- Независимые логи и конфигурации
- Минимальные права доступа

## Расширение системы

### Добавление новой конфигурации

1. Создайте JSON файл в `configs/`:
```bash
cp configs/italy_hydraulics.json configs/new_config.json
```

2. Отредактируйте параметры под вашу задачу

3. Используйте новую конфигурацию:
```bash
python3 smart_filter.py file.txt --config new_config
```

### Кастомизация фильтров

Модифицируйте соответствующие классы в `smart_filter_processor_v2.py`:
- `SmartHardExclusionFilter` - правила исключений
- `SmartHydraulicDetector` - ключевые слова детекции
- `SmartGeographicPrioritizer` - географические приоритеты
- `SmartLeadScorer` - веса и пороги скоринга

## Troubleshooting

### Частые проблемы

1. **Configuration not found**
   - Проверьте наличие файла в `configs/`
   - Убедитесь в правильности имени конфигурации

2. **No data loaded from file**
   - Проверьте кодировку файла (UTF-8)
   - Убедитесь что файл не пустой

3. **Permission denied**
   - Проверьте права на запись в директориях `output/`, `backups/`, `reports/`

### Логирование

Детальные логи сохраняются в `logs/{filter_name}_{date}.log`

## Производительность

### Типичные показатели
- **Скорость**: ~1500 emails/секунда
- **Память**: ~50MB на 10K emails
- **Точность**: >90% релевантных результатов

### Оптимизация
- Увеличение `batch_size` для ускорения обработки
- Настройка `processing_delay` для снижения нагрузки
- Оптимизация ключевых слов для повышения точности

## Версионирование

- **v1.0**: Базовая функциональность
- **v1.1**: Добавлена поддержка метаданных LVP
- **v1.2**: Улучшенная обработка ошибок

---

Для вопросов и предложений по улучшению системы обращайтесь к разработчику.