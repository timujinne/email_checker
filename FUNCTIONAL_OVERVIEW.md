# Email Checker - Полный обзор функционала

> Высокопроизводительная система валидации и интеллектуальной фильтрации email-списков
>
> **Обработка:** 7-8K emails за 1-2 секунды
> **Блок-листы:** 22K+ emails, 700+ доменов
> **База метаданных:** 174MB+ (SQLite)
> **Smart Filters:** 16 настраиваемых конфигов для разных стран/индустрий

---

## 📋 Содержание

1. [Основной функционал обработки](#1-основной-функционал-обработки)
2. [Работа с метаданными (LVP)](#2-работа-с-метаданными-lvp)
3. [Smart Filters - Интеллектуальная фильтрация](#3-smart-filters---интеллектуальная-фильтрация)
4. [Управление блок-листами](#4-управление-блок-листами)
5. [Кеширование и оптимизация](#5-кеширование-и-оптимизация)
6. [Веб-интерфейс](#6-веб-интерфейс)
7. [API и интеграции](#7-api-и-интеграции)
8. [Утилиты и вспомогательные инструменты](#8-утилиты-и-вспомогательные-инструменты)
9. [Генерация фильтров и экспертные системы](#9-генерация-фильтров-и-экспертные-системы)
10. [Анализ и отчетность](#10-анализ-и-отчетность)

---

## 1. Основной функционал обработки

### EmailChecker (`email_checker.py`)

**Основная система проверки email-списков против блок-листов**

#### Возможности:

**1.1. Загрузка и нормализация email**
- ✅ Загрузка из TXT файлов
- ✅ Нормализация email адресов:
  - Удаление префиксов `//` и `20`
  - Удаление недопустимых символов в начале (`.`, `-`, `+`, `_`)
  - Приведение к нижнему регистру
  - Удаление trailing точек из локальной части

**1.2. Валидация email**
- ✅ RFC-совместимая валидация формата
- ✅ Фильтрация технических токенов:
  - MD5 хеши (32 символа)
  - SHA1 хеши (40 символов)
  - UUID (формат 8-4-4-4-12)
- ✅ Фильтрация технических мониторинг-доменов (sentry, bugsnag, etc.)
- ✅ Проверка длины локальной части (max 64 символа)
- ✅ Проверка на двойные точки и недопустимые комбинации

**1.3. Проверка против блок-листов**
- ✅ O(1) lookup через множества (sets)
- ✅ Проверка email по полному адресу
- ✅ Проверка домена отдельно
- ✅ Кешированная загрузка блок-листов (загружаются один раз)

**1.4. Обнаружение дубликатов**
- ✅ Дубликаты между списками (`--exclude-duplicates`)
- ✅ Дубликаты с префиксом '20' (если есть `user@domain.com`, то `20user@domain.com` удаляется)
- ✅ Внутренние дубликаты в файле (dictionary-based deduplication)

**1.5. Режимы обработки**

```bash
# Одиночный файл
python3 email_checker.py check input/list.txt

# Последовательность файлов с дедупликацией
python3 email_checker.py check-sequence input/list1.txt input/list2.txt --exclude-duplicates

# Batch обработка всех TXT
python3 email_checker.py batch --exclude-duplicates --generate-html

# Инкрементальная обработка (только изменившиеся файлы)
python3 email_checker.py incremental --exclude-duplicates --generate-html

# ⭐ RECOMMENDED: Unified обработка (TXT + LVP)
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html
```

**1.6. Автоопределение метаданных списков**
- ✅ Автоопределение страны из имени файла (Italy, Poland, Germany, etc.)
- ✅ Автоопределение категории (Automotive, Agriculture, Construction, etc.)
- ✅ Сохранение в `lists_config.json`

**1.7. Выходные форматы**
- 📄 **TXT** - один email на строку (backward compatible)
- 📊 **CSV** - все поля метаданных в колонках
- 📦 **JSON** - полные структурированные метаданные
- 📈 **HTML** - визуальные отчёты с графиками (Google Charts)

---

### UnifiedEmailProcessor (`unified_processor.py`)

**Новая архитектура для унифицированной обработки всех форматов**

#### Возможности:

**2.1. Унифицированная обработка**
- ✅ Автоматическая обработка TXT + LVP файлов в один проход
- ✅ Cross-type дедупликация (между TXT и LVP)
- ✅ Сохранение метаданных между форматами
- ✅ Автоматическая обработка ошибок с логированием

**2.2. Progress Tracking**
- ✅ Real-time отслеживание прогресса
- ✅ Расчёт ETA (estimated time to completion)
- ✅ Консольный прогресс-бар

**2.3. Эффективное кеширование**
- ✅ SQLite-based кеш (90% меньше JSON)
- ✅ MD5-based инкрементальные обновления
- ✅ Пропуск неизменившихся файлов

---

### EmailProcessor (`email_processor.py`)

**Модуль унифицированной логики обработки**

#### Классы данных:

**3.1. ProcessResult**
- Результат обработки одного файла
- Разделение по категориям: clean, blocked_email, blocked_domain, invalid
- Метаданные (для LVP файлов)
- Метрики производительности
- Обработка ошибок

**3.2. BatchResult**
- Агрегация результатов множества файлов
- Общая статистика
- Время обработки

#### Функции:

**3.3. Обработка файлов**
- ✅ `process_file()` - обработка одного файла (TXT/LVP)
- ✅ `process_sequence()` - последовательность с дедупликацией
- ✅ `process_batch()` - массовая обработка с прогрессом

**3.4. Сохранение результатов**
- ✅ `save_results()` - сохранение в TXT/CSV/JSON
- ✅ `save_results_with_metadata()` - сохранение с полными метаданными

---

## 2. Работа с метаданными (LVP)

### EmailMetadata (`email_metadata.py`)

**Структуры данных для расширенных метаданных**

#### Класс EmailWithMetadata:

**2.1. Основные поля**
- `email` - адрес электронной почты
- `source_url` - URL источника
- `domain` - домен
- `page_title` - заголовок страницы

**2.2. Контактная информация**
- `company_name` - название компании
- `phone` - телефон
- `country` - страна
- `city` - город
- `address` - адрес

**2.3. SEO метаданные**
- `meta_description` - мета-описание
- `meta_keywords` - ключевые слова
- `keywords` - дополнительные ключевые слова

**2.4. Валидация (из LVP)**
- `validation_status` - статус валидации
- `validation_log` - лог валидации
- `validation_date` - дата валидации

**2.5. Категоризация**
- `category` - категория бизнеса
- Auto-detection из имени файла

---

### LVPParser (`email_metadata.py`)

**Парсер LVP (XML) файлов от системы валидации**

#### Возможности:

**2.6. XML парсинг**
- ✅ Поддержка множественных namespace вариантов
- ✅ Санитизация невалидных XML символов (0x00-0x1F)
- ✅ Fallback на альтернативные пути элементов
- ✅ Обработка ошибок парсинга

**2.7. Извлечение данных**
- ✅ Извлечение всех метаданных из LVP записей
- ✅ Преобразование в EmailWithMetadata объекты
- ✅ Валидация и очистка данных

---

### MetadataDatabase (`metadata_database.py`)

**Централизованная SQLite база метаданных (174MB+)**

#### Таблицы:

**2.8. email_metadata**
- Полные метаданные для каждого email
- 20+ полей (контакты, SEO, валидация)
- Индексы для быстрого поиска
- JSON для расширяемости

**2.9. lvp_sources**
- Tracking импортированных LVP файлов
- MD5 хеши для предотвращения дублирования
- Статистика импорта

**2.10. validation_statuses**
- Отслеживание статусов валидации
- GDPR compliance (unsubscribed, complaints)

#### Операции:

**2.11. CRUD операции**
- ✅ `insert_email()` - добавление email с метаданными
- ✅ `get_email()` - получение метаданных по email
- ✅ `search_emails()` - поиск с фильтрами
- ✅ `update_validation_status()` - обновление статуса

**2.12. Импорт/Экспорт**
- ✅ `bulk_insert()` - массовая вставка
- ✅ `export_to_csv()` - экспорт в CSV
- ✅ Миграции схемы базы данных

---

### LVPImporter (`lvp_importer.py`)

**Система импорта LVP файлов в базу**

#### Возможности:

**2.13. Импорт файлов**
- ✅ Автоматическое обнаружение дубликатов (по MD5 хешу)
- ✅ Batch импорт с прогрессом
- ✅ Статистика импорта
- ✅ Обработка ошибок

**2.14. Scanning директорий**
- ✅ `--scan` режим для автопоиска LVP файлов
- ✅ Рекурсивный поиск

---

### LVPExporter (`lvp_exporter.py`)

**Экспорт метаданных обратно в LVP формат**

#### Возможности:

**2.15. Экспорт из базы**
- ✅ Экспорт всех метаданных в LVP XML
- ✅ Валидный XML с namespace
- ✅ Сохранение всех полей

---

### EmailEnricher (`email_enricher.py`)

**Обогащение email списков метаданными из базы**

#### Возможности:

**2.16. Обогащение списков**
- ✅ Автопоиск доступных списков для обогащения
- ✅ Batch обогащение всех списков (`--enrich-all`)
- ✅ Force overwrite режим (`--force`)

**2.17. Выходные форматы**
- ✅ Enriched CSV с полными метаданными
- ✅ Enriched JSON с вложенными объектами

```bash
# Обогатить один список
python3 email_enricher.py output/list_clean.txt

# Обогатить все списки
python3 email_enricher.py --enrich-all

# Force перезапись
python3 email_enricher.py --force output/list_clean.txt
```

---

### MetadataStore (`metadata_store.py`)

**Кеш метаданных для обогащения между форматами**

#### Возможности:

**2.18. Хранилище метаданных**
- ✅ SQLite хранилище (`.cache/metadata_store.db`)
- ✅ Сохранение метаданных из LVP
- ✅ Использование при обработке TXT (не теряем метаданные)
- ✅ Быстрый lookup по email

**2.19. API**
- ✅ `store_email()` - сохранить метаданные
- ✅ `get_email()` - получить метаданные
- ✅ `has_metadata()` - проверка наличия

---

### MetadataIntegrator (`metadata_integration.py`)

**Интеграция метаданных из LVP в обработанные списки**

#### Возможности:

**2.20. Обогащение результатов**
- ✅ Автоматический матчинг email с LVP источниками
- ✅ Сохранение метаданных в результирующих файлах
- ✅ Enriched версии списков с полными данными

---

## 3. Smart Filters - Интеллектуальная фильтрация

### SmartFilterProcessor (`smart_filter_processor_v2.py`)

**Система умной фильтрации по странам и индустриям**

#### Архитектура:

**3.1. Scoring система**

```python
overall_score = (
    email_quality * 0.10 +
    company_relevance * 0.45 +
    geographic_priority * 0.30 +
    engagement * 0.15
) * bonuses
```

**Компоненты скоринга:**

1. **Email Quality (10%):**
   - Корпоративный домен vs персональный
   - Структура email (contact@, info@ = лучше)
   - Generic vs specific addresses

2. **Company Relevance (45%):**
   - Industry keywords (primary vs secondary)
   - OEM manufacturer индикаторы
   - Negative filter patterns

3. **Geographic Priority (30%):**
   - Target country/region indicators
   - Domain TLD match
   - Geographic scoring (High/Medium/Low regions)

4. **Engagement (15%):**
   - Email source type (product/service/contact pages)
   - Business category match

**Bonuses (multiplicative):**
- OEM manufacturer: ×1.3
- Target geography High: ×2.0 / Medium: ×1.2
- Domain match: ×1.5

#### Priority Thresholds:

**3.2. Сегментация**
- 🔴 **HIGH_PRIORITY**: score >= 100 (top leads)
- 🟡 **MEDIUM_PRIORITY**: score >= 50
- 🟢 **LOW_PRIORITY**: score >= 10
- ⚫ **EXCLUDED**: score < 10

#### Фильтры исключений:

**3.3. SmartHardExclusionFilter**
- ✅ Персональные домены (gmail, yahoo, etc.)
- ✅ HR и сервисные email (hr@, recruitment@, etc.)
- ✅ Географические исключения (excluded_country_domains)
- ✅ Подозрительные паттерны (regex-based)
- ✅ Исключённые индустрии

#### Конфигурации:

**3.4. Доступные фильтры (16 configs)**

📁 `smart_filters/configs/`

- `italy_hydraulics.json` - Италия: гидравлика
- `germany_hydraulics.json` - Германия: гидравлика
- `poland_powder_metal.json` - Польша: порошковая металлургия
- `switzerland_hydraulics.json` - Швейцария: гидравлика (4 языка: DE/FR/IT/EN)
- `austria_hydraulics.json` - Австрия: гидравлика
- `czech_powder_metal.json` - Чехия: порошковая металлургия
- `france_powder_metal.json` - Франция: порошковая металлургия
- `uk_business_exclusions.json` - UK: бизнес-исключения
- + 8 дополнительных конфигураций

**Каждая конфигурация содержит:**
- `industry_keywords` - ключевые слова индустрии (primary/secondary)
- `exclusions` - исключения (personal domains, HR, patterns)
- `geographic_scoring` - географическое скоринг
- `weights` - веса компонентов
- `thresholds` - пороги приоритетов
- `languages` - поддерживаемые языки

#### Выходные файлы:

**3.5. Output формат**

```
smart_filtered/
├── Italy_Hydraulics_HIGH_PRIORITY_20251117.txt    # score >= 100
├── Italy_Hydraulics_HIGH_PRIORITY_20251117.csv
├── Italy_Hydraulics_HIGH_PRIORITY_20251117.json
├── Italy_Hydraulics_MEDIUM_PRIORITY_20251117.txt  # 50-99
├── Italy_Hydraulics_MEDIUM_PRIORITY_20251117.csv
├── Italy_Hydraulics_MEDIUM_PRIORITY_20251117.json
├── Italy_Hydraulics_LOW_PRIORITY_20251117.txt     # 10-49
├── Italy_Hydraulics_LOW_PRIORITY_20251117.csv
├── Italy_Hydraulics_LOW_PRIORITY_20251117.json
├── Italy_Hydraulics_EXCLUDED_20251117.txt         # < 10
├── Italy_Hydraulics_EXCLUDED_20251117.csv
├── Italy_Hydraulics_EXCLUDED_20251117.json
└── Italy_Hydraulics_EXCLUSION_REPORT_20251117.csv # Детальный отчёт
```

#### Команды:

**3.6. Использование**

```bash
# Обработать один файл
python3 email_checker.py smart-filter output/list_clean.txt

# Batch обработка по паттерну
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# Использование конкретного фильтра
python3 smart_filter.py output/list_clean.txt --config italy_hydraulics

# Список доступных фильтров
python3 smart_filter.py --list-configs
```

---

### SmartFilterWorkflowManager (`smart_filter_workflow_manager.py`)

**Управление workflow умной фильтрации**

#### Возможности:

**3.7. Workflow automation**
- ✅ Автоматический pipeline: check → smart-filter → report
- ✅ Batch processing с прогрессом
- ✅ Обработка ошибок и retry

---

## 4. Управление блок-листами

### BlocklistManager (`blocklist_api.py`)

**Менеджер блок-листов с API**

#### Файлы блок-листов:

**4.1. Структура**
- `blocklists/blocked_emails.txt` - 22K+ заблокированных email
- `blocklists/blocked_domains.txt` - 700+ заблокированных доменов
- `blocklists/.blocklist_history.json` - история изменений (undo/redo)

#### Операции:

**4.2. CRUD**
- ✅ `load()` - загрузка блок-листов
- ✅ `save()` - сохранение с сортировкой
- ✅ `add()` - добавление email/домена
- ✅ `remove()` - удаление email/домена
- ✅ `search()` - поиск по паттерну

**4.3. Bulk операции**
- ✅ `bulk_add()` - массовое добавление
- ✅ `bulk_remove()` - массовое удаление
- ✅ Валидация данных

**4.4. История изменений**
- ✅ Tracking всех операций (add/remove/bulk)
- ✅ Timestamp и description
- ✅ Limit 100 последних операций

**4.5. Экспорт**
- ✅ `export()` - экспорт в TXT/CSV/JSON
- ✅ Статистика блок-листов

---

### BlocklistCSVImporter (`import_blocklist_csv.py`)

**Импорт email из CSV логов в блок-листы**

#### Поддерживаемые форматы:

**4.6. CSV форматы**

1. **SMTP логи** (разделитель `,`):
   ```
   st_text,ts,sub,frm,email,tag,mid,link
   ```

2. **Unsubscribe логи** (разделитель `;`):
   ```
   Дата отписки;Email адреса;Причина
   ```

#### Статусы для импорта:

**4.7. Critical statuses (автоматический импорт)**
- `Hard bounce` - email не существует
- `Blocked` - заблокирован на сервере
- `Complaint` - жалоба на спам
- `Unsubscribed` - отписался
- `Invalid Email` - невалидный формат
- `Отметил рассылку как спам` - GDPR

**4.8. Optional statuses**
- `Отписался` - можно включить с `--include-optional`

#### Возможности:

**4.9. Импорт**
- ✅ Автоматическая дедупликация с существующими блок-листами
- ✅ Нормализация email (lowercase, префиксы)
- ✅ Обнаружение проблемных доменов (≥5 заблокированных email)
- ✅ Dry-run режим для preview (`--dry-run`)
- ✅ Детальный отчёт импорта

**4.10. Обнаружение доменов**
- ✅ Автоматическое добавление проблемных доменов в `blocked_domains.txt`
- ✅ Threshold: 5+ заблокированных email = добавляем домен

#### Команды:

```bash
# Preview импорта
python3 email_checker.py import-csv-blocklist blocklists/*.csv --dry-run

# Импорт
python3 email_checker.py import-csv-blocklist blocklists/logs-*.csv

# С optional статусами
python3 email_checker.py import-csv-blocklist blocklists/*.csv --include-optional

# Standalone утилита
python3 import_blocklist_csv.py blocklists/*.csv --dry-run
```

---

### UpdateBlockedDomains (`update_blocked_domains.py`)

**Автоматическое обновление блок-листа доменов**

#### Возможности:

**4.11. Автообновление**
- ✅ Анализ заблокированных email
- ✅ Обнаружение доменов с множественными блокировками
- ✅ Автодобавление в `blocked_domains.txt`

---

## 5. Кеширование и оптимизация

### CacheManager (`cache_manager.py`)

**SQLite-based система кеширования**

#### Архитектура:

**5.1. База данных кеша**

📁 `.cache/processing_cache_optimized.db`

**Таблицы:**
- `processed_files` - обработанные файлы с MD5 хешами
- `processed_emails` - обработанные email для дедупликации

**Преимущества над JSON:**
- ✅ 90% меньше размер
- ✅ O(1) lookup по индексам
- ✅ Быстрые запросы по MD5
- ✅ Поддержка больших объёмов

#### Операции:

**5.2. File caching**
- ✅ `is_file_processed()` - проверка по MD5 хешу
- ✅ `cache_file_result()` - сохранение результата
- ✅ `get_cached_result()` - получение из кеша
- ✅ Автоматическая инвалидация при изменении файла

**5.3. Email deduplication**
- ✅ `is_email_processed()` - проверка обработки email
- ✅ `cache_emails()` - массовое кеширование
- ✅ Поддержка cross-file дедупликации

**5.4. Statistics**
- ✅ `get_statistics()` - статистика кеша
- ✅ Отчёты по производительности

---

### OptimizedCacheIntegration (`optimized_cache_integration.py`)

**Миграция JSON → SQLite**

#### Возможности:

**5.5. Миграция**
- ✅ Автоматический перенос из старого JSON кеша
- ✅ Валидация данных
- ✅ Backup старых файлов
- ✅ Отчёт о размерах (90% экономия)

```bash
# Миграция кеша
python3 migrate_to_optimized_cache.py
```

---

### Cleanup & Optimization Utilities

#### cleanup_cache.py

**5.6. Очистка кеша**
- ✅ Удаление старых backup версий
- ✅ Cleanup дубликатов DB файлов
- ✅ Cleanup дубликатов в output/
- ✅ Освобождение дискового пространства

```bash
python3 utilities/cleanup_cache.py
```

#### optimize_databases.py

**5.7. Оптимизация баз данных**
- ✅ VACUUM для metadata.db
- ✅ ANALYZE для статистики индексов
- ✅ Rebuild индексов
- ✅ Отчёт о размерах до/после

```bash
python3 utilities/optimize_databases.py
```

---

## 6. Веб-интерфейс

### WebServer (`web_server.py`)

**HTTP сервер с REST API и современным UI**

#### Архитектура:

**6.1. Backend**
- ✅ HTTP сервер на базе `http.server`
- ✅ Auto-find свободного порта (8080-8180)
- ✅ CORS support
- ✅ Command injection protection (whitelist validation)
- ✅ Filename sanitization (path traversal prevention)

**6.2. Безопасность**
- ✅ Command whitelist (`ALLOWED_COMMANDS`)
- ✅ Filename validation (no `..`, `/`, `\`)
- ✅ Extension validation (только .txt, .lvp, .csv, .json)
- ✅ `shlex.quote()` для безопасного escaping

**6.3. Background processing**
- ✅ Subprocess execution с логированием
- ✅ Real-time лог streaming
- ✅ Process state tracking
- ✅ Thread-safe операции

#### Frontend (Modern Web UI):

**6.4. Страницы**

📁 `web/`

1. **index.html** - Dashboard
   - KPI метрики
   - Activity feed
   - System status

2. **lists.html** - Lists Manager
   - Email list management
   - Virtual scrolling (22K+ items)
   - Metadata editing

3. **smart-filter.html** - Smart Filter Studio
   - Visual filter builder
   - Scoring preview
   - Config management

4. **blocklist.html** - Blocklist Manager
   - 22K+ email/domains
   - Virtual scrolling
   - Bulk operations
   - Search/filter

5. **processing-queue.html** - Processing Queue
   - Real-time monitoring
   - Progress tracking
   - Task management

6. **analytics.html** - Analytics & Reports
   - Statistical analysis
   - Charts and graphs

7. **ml-analytics.html** - ML-Powered Analytics
   - 10+ ML components
   - Predictive analytics

8. **archive.html** - Archive & Cloud Storage
   - Cloud integration
   - Backup management

9. **settings.html** - Settings
   - Configuration
   - Preferences

**6.5. Frontend технологии**
- ✅ Vanilla JavaScript (ES6+)
- ✅ Tailwind CSS + daisyUI
- ✅ Component-based architecture (50+ компонентов)
- ✅ State management (`utils/state.js`)
- ✅ Client-side routing (`utils/router.js`)
- ✅ Dark/Light theme support
- ✅ Responsive design

**6.6. Performance**
- ✅ Virtual scrolling для больших списков
- ✅ Lazy loading
- ✅ Bundle optimization (<200KB target)
- ✅ 60fps rendering

---

### WebSocketServer (`websocket_server.py`)

**Real-time обновления через WebSocket**

#### Возможности:

**6.7. WebSocket features**
- ✅ Асинхронный сервер (asyncio + websockets)
- ✅ Multiple client support
- ✅ Broadcast messaging
- ✅ Ping/Pong keep-alive
- ✅ Connection tracking

**6.8. Event types**
- `task.started` - Task begins
- `task.progress` - Progress update
- `task.completed` - Task finished
- `notification` - General notifications
- `system.status` - System health

**6.9. Integration**
- ✅ Thread-safe broadcast от HTTP сервера
- ✅ Real-time UI updates
- ✅ Progress tracking

---

## 7. API и интеграции

### REST API Endpoints

#### Core Processing (`web_server.py`)

**7.1. Lists API**
```http
GET  /api/lists                    # Все списки с метаданными
POST /api/lists/bulk-update        # Bulk update метаданных
GET  /api/status                   # Processing status
```

**7.2. Processing API**
```http
POST /api/process                  # Run full processing
POST /api/process_one              # Process single list
POST /api/reset_processing         # Reset processed flags
```

**7.3. Reports API**
```http
GET  /api/reports                  # Available HTML reports
```

#### Metadata API (`web_server.py`)

**7.4. Metadata endpoints**
```http
GET  /api/metadata                 # Database stats
GET  /api/email-metadata/:email    # Metadata for specific email
GET  /api/lvp-sources              # Available LVP files
GET  /api/metadata-search?q=...    # Search metadata
POST /api/import-lvp               # Import LVP to database
POST /api/enrich-list              # Enrich list with metadata
```

#### Smart Filter API (`web_server.py`)

**7.5. Smart Filter endpoints**
```http
GET  /api/smart-filter/available           # List available filters
GET  /api/smart-filter/config?name=...     # Get filter config
POST /api/smart-filter/process             # Process single file
POST /api/smart-filter/process-batch       # Batch process
```

#### Blocklist API (`blocklist_api.py`)

**7.6. Blocklist endpoints**
```http
GET    /api/blocklist                      # Get all blocklist items
GET    /api/blocklist/stats                # Blocklist statistics
POST   /api/blocklist/add                  # Add email/domain
DELETE /api/blocklist/remove               # Remove email/domain
POST   /api/blocklist/bulk-add             # Bulk add
POST   /api/blocklist/bulk-remove          # Bulk remove
POST   /api/blocklist/import-csv           # Import from CSV
GET    /api/blocklist/search?q=...         # Search blocklist
GET    /api/blocklist/export?format=txt    # Export blocklist
```

#### Email Records API (`email_records_api.py`)

**7.7. Email records endpoints**
```http
GET    /api/emails                         # Get emails (paginated)
GET    /api/emails/count                   # Total count
GET    /api/emails/:email                  # Single email record
POST   /api/emails/bulk-update             # Bulk update
POST   /api/emails/bulk-delete             # Bulk delete
POST   /api/emails/bulk-status-update      # Update statuses
DELETE /api/emails/:email                  # Delete email
GET    /api/emails/export?format=csv       # Export emails
```

---

### MCP Integration (Model Context Protocol)

#### mcp_server/email_checker_mcp.py

**7.8. MCP Server**
- ✅ Integration с Claude AI через MCP
- ✅ Tool definitions для AI interactions
- ✅ Context sharing

---

## 8. Утилиты и вспомогательные инструменты

### Domain Extraction Utilities

#### extract_russian_domains.py

**8.1. Извлечение русскоязычных доменов**
- ✅ Извлечение из metadata.db
- ✅ Фильтрация по TLD (.ru, .by, .ua, .kz, etc.)
- ✅ Кириллические домены
- ✅ Статистика по доменным зонам
- ✅ Сохранение по зонам

#### extract_russian_domains_full.py

**8.2. Полное извлечение из кеша**
- ✅ Извлечение из `.cache/processing_cache_final.db`
- ✅ Сравнение с metadata.db
- ✅ Детальная статистика

#### extract_russian_domains_combined.py

**8.3. Комбинированное извлечение**
- ✅ Объединение кеша + metadata
- ✅ Полное покрытие всех источников

### Filtering Utilities

#### filter_russia_belarus.py

**8.4. Фильтрация РФ/BY email**
- ✅ Исключение .ru/.by доменов
- ✅ European domain filter
- ✅ Whitelist/blacklist поддержка
- ✅ Сохранение filtered списков

#### exclusion_filter.py

**8.5. Exclusion фильтр**
- ✅ Фильтрация по конфигам
- ✅ Загрузка метаданных для фильтрации
- ✅ Применение exclusion rules

### Export & Processing

#### export_txt_files.py

**8.6. TxtFileExporter**
- ✅ Экспорт из кеша в TXT
- ✅ Экспорт из metadata.db в TXT
- ✅ Разделение по категориям (clean/blocked)
- ✅ Batch export

#### process_domains.py

**8.7. Domain processing**
- ✅ Извлечение доменов из email
- ✅ Проверка против blocklist
- ✅ Фильтрация доменов

### Database Management

#### reset_system.py

**8.8. Сброс системы**
- ✅ Очистка всех баз данных
- ✅ Очистка кеша
- ✅ Reset processed flags
- ✅ Backup перед сбросом

#### restore_data.py

**8.9. Восстановление данных**
- ✅ Восстановление из backup
- ✅ Валидация данных
- ✅ Rollback changes

#### update_output_sizes.py

**8.10. Обновление размеров**
- ✅ Пересчёт размеров файлов в output/
- ✅ Обновление в lists_config.json

#### update_verified_status.py

**8.11. Обновление статусов валидации**
- ✅ Пересчёт verified статусов
- ✅ Синхронизация с metadata.db

### Miscellaneous

#### add_favicon.py

**8.12. Добавление favicon в HTML отчёты**
- ✅ Inject favicon в существующие HTML
- ✅ Batch processing

#### validate_statistics.py

**8.13. Валидация статистики**
- ✅ Проверка консистентности данных
- ✅ Валидация counts
- ✅ Отчёт о несоответствиях

#### test_api_quick.py

**8.14. Quick API testing**
- ✅ Тестирование API endpoints
- ✅ Validation responses

#### example_bulk_update.py

**8.15. Примеры bulk updates**
- ✅ Примеры использования bulk API
- ✅ Code samples

---

## 9. Генерация фильтров и экспертные системы

### FilterGenerator (`smart_filter_expert/filter_generator.py`)

**Интерактивная система генерации smart filters**

#### Возможности:

**9.1. Interactive mode**
- ✅ Пошаговый wizard для создания фильтров
- ✅ Smart suggestions на основе страны/индустрии
- ✅ Real-time валидация
- ✅ Quality metrics integration

**9.2. Template-based creation**
- ✅ Загрузка существующих templates
- ✅ Автоматическая адаптация под страну
- ✅ Multilingual support

**9.3. Resources**
- ✅ 16+ industry templates
- ✅ Geographic data (countries, regions)
- ✅ Language libraries (DE, FR, IT, EN, ES, PL, PT)
- ✅ Blocklist insights integration

**9.4. Quality targets**
- ✅ High priority: max 10%, min relevance 90%
- ✅ Medium priority: 5-20%
- ✅ Exclusion justification: min 80%

**9.5. Advanced features**
- ✅ Custom scoring weights
- ✅ Custom thresholds
- ✅ Geographic scoring configuration
- ✅ Industry keyword customization

**9.6. Automated testing**
- ✅ Config validation
- ✅ Test against sample data
- ✅ Quality metrics report

#### Команды:

```bash
# Interactive mode
python3 smart_filter_expert/filter_generator.py

# Create from template
python3 smart_filter_expert/filter_generator.py --template hydraulics --country IT

# Validate existing config
python3 smart_filter_expert/filter_generator.py --validate configs/italy_hydraulics.json
```

---

### BlocklistAnalyzer (`smart_filter_expert/blocklist_analyzer.py`)

**Анализ блок-листов для извлечения паттернов**

#### Возможности:

**9.7. Statistical analysis**
- ✅ Подсчёт blocked emails/domains
- ✅ TLD analysis (top-level domains)
- ✅ Domain frequency analysis
- ✅ Pattern extraction

**9.8. Pattern detection**
- ✅ Common prefixes (hr@, recruitment@, etc.)
- ✅ Personal domain patterns
- ✅ Geographic patterns (.cn, .ru, etc.)
- ✅ Suspicious patterns (regex-based)

**9.9. Suggestions**
- ✅ Recommendations для filter configs
- ✅ Auto-update exclusions
- ✅ Quality improvement suggestions

**9.10. Reports**
- ✅ Comprehensive analysis report
- ✅ Export patterns для reuse

#### Команды:

```bash
# Analyze blocklists
python3 smart_filter_expert/blocklist_analyzer.py

# Export patterns
python3 smart_filter_expert/blocklist_analyzer.py --export-patterns
```

---

### FilterValidator (`smart_filter_expert/filter_validator.py`)

**Валидация и тестирование фильтров**

#### Возможности:

**9.11. Config validation**
- ✅ JSON schema validation
- ✅ Required fields check
- ✅ Weights sum validation (должна быть 1.0)
- ✅ Threshold order validation

**9.12. Quality checks**
- ✅ Keyword coverage analysis
- ✅ Language consistency check
- ✅ Geographic scoring validation
- ✅ Exclusion rules completeness

**9.13. Test against data**
- ✅ Test filter на sample data
- ✅ Distribution analysis (HIGH/MEDIUM/LOW)
- ✅ Quality metrics (relevance, precision)
- ✅ Performance benchmarks

**9.14. Optimization suggestions**
- ✅ Threshold tuning recommendations
- ✅ Weight adjustments
- ✅ Missing keyword suggestions

#### Команды:

```bash
# Validate config
python3 smart_filter_expert/filter_validator.py configs/italy_hydraulics.json

# Test against data
python3 smart_filter_expert/filter_validator.py --test configs/italy_hydraulics.json output/list_clean.txt

# Full validation report
python3 smart_filter_expert/filter_validator.py --full-report configs/
```

---

### Expert Scripts

#### analyze_requirements.py

**9.15. Requirements Analyzer**
- ✅ Анализ требований к фильтрам
- ✅ Gap analysis (что не хватает)
- ✅ Coverage report

#### batch_create.py

**9.16. Batch Filter Creator**
- ✅ Создание множества фильтров из CSV спецификаций
- ✅ Template-based mass creation
- ✅ Validation всех созданных фильтров
- ✅ Report generation

```bash
# Batch create from CSV
python3 smart_filter_expert/scripts/batch_create.py specifications.csv
```

#### monitor_quality.py

**9.17. Quality Monitor**
- ✅ Continuous monitoring качества фильтров
- ✅ Performance tracking
- ✅ Alerts при ухудшении метрик
- ✅ Historical trends

```bash
# Monitor quality
python3 smart_filter_expert/scripts/monitor_quality.py --watch

# Quality report
python3 smart_filter_expert/scripts/monitor_quality.py --report
```

---

## 10. Анализ и отчетность

### HTML Reports (`email_checker.py`)

**Визуальные отчёты с графиками**

#### Возможности:

**10.1. Report generation**
- ✅ Автоматическая генерация с `--generate-html`
- ✅ Google Charts integration
- ✅ Responsive design
- ✅ Interactive charts

**10.2. Included charts**
- 📊 Pie chart - распределение email по категориям
- 📈 Bar chart - статистика по файлам
- 📉 Line chart - прогресс обработки
- 📊 Statistics tables

**10.3. Report format**

```
output/
├── Full_Report_20251117.html       # Общий отчёт всех файлов
├── list1_report_20251117.html      # Индивидуальные отчёты
└── list2_report_20251117.html
```

---

### Progress Tracking (`progress_tracker.py`)

**Real-time отслеживание прогресса**

#### Возможности:

**10.4. ProgressTracker**
- ✅ Real-time progress по файлам
- ✅ Расчёт ETA (estimated time to completion)
- ✅ Processing speed metrics
- ✅ Callback listeners для UI

**10.5. FileProgress**
- ✅ Прогресс одного файла
- ✅ Status tracking (pending/processing/completed/failed)
- ✅ Processing time
- ✅ Error tracking

**10.6. ConsoleProgressDisplay**
- ✅ Красивый консольный вывод
- ✅ Progress bar
- ✅ ETA display
- ✅ Speed metrics

---

### Statistics & Analytics

#### validate_statistics.py

**10.7. Валидация статистики**
- ✅ Проверка консистентности данных
- ✅ Валидация counts между источниками
- ✅ Отчёт о несоответствиях
- ✅ Auto-fix suggestions

#### update_output_sizes.py

**10.8. Статистика размеров**
- ✅ Пересчёт размеров всех output файлов
- ✅ Обновление в конфигах
- ✅ Storage usage report

---

## 📊 Производительность

### Метрики системы:

| Метрика | Значение |
|---------|----------|
| **Скорость обработки** | 7-8K emails за 1-2 сек |
| **Блок-листы** | 22K+ emails, 700+ domains |
| **Lookup время** | O(1) через sets |
| **База метаданных** | 174MB+ (SQLite) |
| **Кеш (SQLite)** | 90% меньше JSON |
| **Smart Filter** | ~1-3 сек на 1000 emails |
| **WebSocket latency** | <50ms |
| **Virtual scrolling** | 22K+ items @ 60fps |

---

### Кеш оптимизация:

| Тип | JSON | SQLite | Экономия |
|-----|------|--------|----------|
| **Размер** | 100MB | 10MB | **90%** |
| **Lookup** | O(n) | O(1) | **10x** |
| **Memory** | High | Low | **5x** |

---

## 🏗️ Архитектура проекта

```
email_checker/
├── 📦 Core Processing
│   ├── email_checker.py              # Main engine
│   ├── unified_processor.py          # Unified processing
│   ├── email_processor.py            # Processing logic
│   └── cache_manager.py              # SQLite caching
│
├── 📊 Metadata System
│   ├── email_metadata.py             # Data structures & LVP parser
│   ├── metadata_database.py          # SQLite metadata (174MB+)
│   ├── metadata_store.py             # Cross-format metadata cache
│   ├── metadata_integration.py       # LVP integration
│   ├── lvp_importer.py               # LVP → DB import
│   ├── lvp_exporter.py               # DB → LVP export
│   └── email_enricher.py             # List enrichment
│
├── 🎯 Smart Filters
│   ├── smart_filter_processor_v2.py  # Main processor
│   ├── smart_filter.py               # CLI launcher
│   ├── smart_filter_workflow_manager.py
│   └── smart_filters/                # Filter implementations
│       ├── configs/                  # 16 JSON configs
│       ├── italy_hydraulics_filter.py
│       ├── swiss_machinery_filter.py
│       └── __init__.py
│
├── 🛡️ Blocklist Management
│   ├── blocklist_api.py              # Blocklist manager + API
│   ├── import_blocklist_csv.py       # CSV import
│   └── update_blocked_domains.py     # Auto-update
│
├── 🌐 Web Interface
│   ├── web_server.py                 # HTTP server + API
│   ├── websocket_server.py           # WebSocket server
│   ├── email_records_api.py          # Email records API
│   └── web/                          # Frontend
│       ├── index.html                # 9 pages
│       ├── lists.html
│       ├── smart-filter.html
│       ├── blocklist.html
│       └── assets/
│           ├── css/                  # Tailwind + daisyUI
│           └── js/                   # 50+ components
│
├── 🤖 Expert Systems
│   └── smart_filter_expert/
│       ├── filter_generator.py       # Interactive generator
│       ├── blocklist_analyzer.py     # Pattern extraction
│       ├── filter_validator.py       # Validation & testing
│       ├── scripts/
│       │   ├── analyze_requirements.py
│       │   ├── batch_create.py
│       │   └── monitor_quality.py
│       └── assets/
│           ├── industry_templates/   # 16+ templates
│           ├── language_library/     # 7 languages
│           └── geographic_data/      # Country data
│
├── 🔧 Utilities
│   └── utilities/
│       ├── cleanup_cache.py
│       ├── optimize_databases.py
│       ├── export_txt_files.py
│       ├── extract_russian_domains*.py (3 versions)
│       ├── filter_russia_belarus.py
│       ├── exclusion_filter.py
│       └── process_domains.py
│
├── 🔄 System Management
│   ├── progress_tracker.py           # Progress tracking
│   ├── reset_system.py               # System reset
│   ├── restore_data.py               # Data restore
│   ├── update_output_sizes.py        # Size tracking
│   ├── update_verified_status.py     # Status sync
│   └── validate_statistics.py        # Stats validation
│
└── 📚 Data Storage
    ├── input/                        # TXT + LVP files
    ├── blocklists/                   # 22K+ emails, 700+ domains
    ├── output/                       # Results (TXT/CSV/JSON/HTML)
    ├── .cache/                       # SQLite cache
    ├── metadata.db                   # SQLite metadata (174MB+)
    └── lists_config.json             # List metadata
```

---

## 🚀 Quick Start

### Рекомендуемый workflow:

```bash
# 1. Поместить файлы в input/ (TXT и/или LVP)

# 2. Unified обработка (TXT + LVP)
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html

# 3. Применить Smart Filter (опционально)
python3 email_checker.py smart-filter-batch --pattern "output/*_clean_*.txt"

# 4. Обогатить метаданными (если нужно)
python3 email_enricher.py --enrich-all

# 5. Запустить веб-интерфейс
python3 web_server.py
```

---

## 📝 Команды по категориям

### Обработка файлов:

```bash
# TXT файлы
python3 email_checker.py check input/list.txt
python3 email_checker.py batch --exclude-duplicates

# LVP файлы
python3 email_checker.py check-lvp input/file.lvp
python3 email_checker.py check-lvp-batch --exclude-duplicates

# Unified (RECOMMENDED)
python3 email_checker.py check-all-incremental --exclude-duplicates --generate-html
```

### Smart Filters:

```bash
# Single file
python3 email_checker.py smart-filter output/list_clean.txt

# Batch processing
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# Specific config
python3 smart_filter.py output/list_clean.txt --config italy_hydraulics

# List configs
python3 smart_filter.py --list-configs
```

### Blocklist Management:

```bash
# Import from CSV
python3 email_checker.py import-csv-blocklist blocklists/*.csv --dry-run
python3 email_checker.py import-csv-blocklist blocklists/*.csv

# Analyze blocklists
python3 smart_filter_expert/blocklist_analyzer.py
```

### Metadata Operations:

```bash
# Import LVP to DB
python3 lvp_importer.py output/file.lvp
python3 lvp_importer.py --scan output/

# Enrich lists
python3 email_enricher.py output/list_clean.txt
python3 email_enricher.py --enrich-all
```

### System Maintenance:

```bash
# Optimize databases
python3 utilities/optimize_databases.py

# Clean cache
python3 utilities/cleanup_cache.py

# Validate statistics
python3 validate_statistics.py
```

### Web Interface:

```bash
# Start server (auto-finds port 8080-8180)
python3 web_server.py

# Open browser to displayed URL
```

---

## 🎯 Ключевые возможности

### ✅ Что мы МОЖЕМ делать:

1. **Валидация email списков**
   - Проверка против 22K+ заблокированных email
   - Проверка против 700+ заблокированных доменов
   - RFC-совместимая валидация
   - Фильтрация технических токенов

2. **Интеллектуальная фильтрация**
   - 16 настраиваемых фильтров для разных стран/индустрий
   - Multi-component scoring система
   - Географическое скоринг
   - Индустрия-специфичная фильтрация

3. **Работа с метаданными**
   - Парсинг LVP (XML) файлов
   - База метаданных 174MB+ (SQLite)
   - Обогащение списков метаданными
   - Сохранение метаданных между форматами

4. **Управление блок-листами**
   - CRUD операции через API
   - Импорт из CSV логов
   - Автообнаружение проблемных доменов
   - История изменений (undo/redo)

5. **Производительность**
   - 7-8K emails за 1-2 секунды
   - O(1) lookup через sets
   - SQLite кеш (90% экономия места)
   - Инкрементальная обработка

6. **Веб-интерфейс**
   - Современный UI (Tailwind + daisyUI)
   - 9 специализированных страниц
   - Real-time updates (WebSocket)
   - Virtual scrolling для больших списков

7. **API интеграция**
   - REST API (30+ endpoints)
   - WebSocket для real-time
   - MCP integration для AI
   - Bulk operations support

8. **Экспертные системы**
   - Interactive filter generator
   - Blocklist pattern analyzer
   - Filter validator & tester
   - Quality monitoring

9. **Утилиты и автоматизация**
   - 15+ utility scripts
   - Database optimization
   - Cache cleanup
   - Batch operations

10. **Отчётность**
    - HTML отчёты с графиками
    - Real-time progress tracking
    - Statistics validation
    - Quality metrics

---

## 📖 Документация

- **README.md** - General documentation (Russian)
- **SMART_FILTER_GUIDE.md** - Smart filter detailed guide
- **BLOCKLIST_IMPORT_GUIDE.md** - CSV import guide
- **REFACTORING.md** - New architecture documentation
- **MIGRATION_GUIDE.md** - Migration to optimized architecture
- **WEB_INTERFACE.md** - Web interface documentation
- **TESTING_GUIDE.md** - Component and integration testing
- **PERFORMANCE_SUMMARY.md** - Performance analysis
- **web/README.md** - Frontend development guide
- **FUNCTIONAL_OVERVIEW.md** - This document

---

## 🔧 Технический стек

### Backend:
- **Python 3.6+**
- **SQLite** - metadata.db (174MB+), cache, metadata_store
- **XML/JSON** - LVP parsing, configs
- **HTTP server** - http.server
- **WebSocket** - asyncio + websockets

### Frontend:
- **Vanilla JavaScript (ES6+)**
- **Tailwind CSS + daisyUI**
- **Google Charts** - visualizations
- **Component-based architecture** - 50+ components
- **State management** - Centralized state
- **Client-side routing**

### Tools:
- **Git** - version control
- **npm** - package management
- **Tailwind CLI** - CSS compilation
- **Lighthouse** - performance auditing

---

## 📊 Статистика проекта

| Метрика | Значение |
|---------|----------|
| **Python файлов** | 60+ |
| **Lines of code** | ~20,000+ |
| **Frontend компонентов** | 50+ |
| **API endpoints** | 30+ |
| **Smart Filter configs** | 16 |
| **Industry templates** | 16+ |
| **Language libraries** | 7 |
| **Utility scripts** | 15+ |
| **Documentation pages** | 10+ |

---

## 🎓 Основные концепции

### 1. Unified Processing
- Обработка TXT + LVP в один проход
- Cross-type deduplication
- Metadata preservation

### 2. Smart Filtering
- Multi-component scoring
- Industry-specific rules
- Geographic prioritization

### 3. Metadata Enrichment
- LVP → Database import
- Database → List enrichment
- Cross-format metadata sharing

### 4. Performance Optimization
- SQLite caching (90% smaller)
- O(1) blocklist lookup
- Incremental processing

### 5. Web Architecture
- Component-based frontend
- REST API + WebSocket
- Virtual scrolling

### 6. Expert Systems
- Interactive filter generation
- Pattern analysis
- Quality validation

---

## 🔮 Будущие возможности

### Планируется:

1. **Machine Learning integration**
   - Auto-scoring optimization
   - Pattern discovery
   - Predictive analytics

2. **Advanced analytics**
   - Lead scoring ML models
   - Engagement prediction
   - ROI tracking

3. **Cloud integration**
   - S3/Azure/GCP storage
   - Distributed processing
   - API Gateway

4. **Enhanced UI**
   - Drag-and-drop workflow builder
   - Visual filter designer
   - Real-time collaboration

5. **API expansion**
   - GraphQL support
   - Webhook integrations
   - OAuth authentication

---

## ⚡ Performance Tips

### Для максимальной производительности:

1. **Use incremental processing:**
   ```bash
   python3 email_checker.py check-all-incremental --exclude-duplicates
   ```

2. **Enable SQLite cache:**
   ```bash
   python3 migrate_to_optimized_cache.py  # One-time migration
   ```

3. **Optimize databases regularly:**
   ```bash
   python3 utilities/optimize_databases.py
   ```

4. **Clean old cache:**
   ```bash
   python3 utilities/cleanup_cache.py
   ```

5. **Use batch operations:**
   ```bash
   python3 email_checker.py smart-filter-batch --pattern "output/*_clean_*.txt"
   ```

---

## 📞 Поддержка

### Для вопросов и помощи:

- **Documentation:** См. файлы `*.md` в корне проекта
- **Code examples:** См. `example_*.py` файлы
- **Skills:** См. `.claude/` директорию для Claude Code Skills

---

**Generated:** 2025-01-17
**Version:** Email Checker v2.0
**Status:** Production Ready ✅
