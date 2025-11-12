# 🎯 Smart Filter Guide - Умная фильтрация clean-листов

## Обзор

**Smart Filter** - это система контекстной фильтрации уже очищенных email-листов (после базовой проверки по блок-листам). Она применяет умную логику для определения релевантности контактов для конкретных индустрий и стран.

### Ключевые особенности:

- ✅ **Контекстный анализ**: Анализирует компанию, описание, ключевые слова
- ✅ **Многоязычность**: Поддержка нескольких языков (например, IT+EN для Италии)
- ✅ **Географические приоритеты**: Оценка по странам (high/medium/low)
- ✅ **Скоринг лидов**: 0-100 баллов с разбивкой по компонентам
- ✅ **Приоритизация**: Автоматическое разделение на HIGH/MEDIUM/LOW/EXCLUDED

---

## 🚀 Быстрый старт

### 1. Через CLI

```bash
# Обработать один clean-файл
python3 email_checker.py smart-filter output/italy_list_clean_20251010.txt

# С другим конфигом
python3 email_checker.py smart-filter output/list_clean.txt --config italy_hydraulics

# Batch обработка всех clean-файлов
python3 email_checker.py smart-filter-batch

# С custom паттерном
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# Без метаданных (только TXT)
python3 email_checker.py smart-filter output/list_clean.txt --no-metadata
```

### 2. Через веб-интерфейс

1. Запустите веб-сервер:
   ```bash
   python3 web_server.py
   ```

2. Откройте http://localhost:8082 в браузере

3. В интерфейсе появится новая секция **"Smart Filter"**

4. Выберите clean-файл и фильтр, нажмите "Process"

---

## 📋 Доступные фильтры

### Italy Hydraulics (`italy_hydraulics`)

**Цель**: Итальянские компании в гидравлической индустрии

**Языки**: Итальянский + Английский

**Ключевые термины**:
- Итальянские: `cilindro idraulico`, `pompa idraulica`, `valvola idraulica`, `centralina idraulica`
- Английские: `hydraulic cylinder`, `hydraulic pump`, `hydraulic valve`, `power unit`

**Географические приоритеты**:
- **High**: Италия (Milano, Torino, Bologna, Brescia и т.д.)
- **Medium**: Европа (Switzerland, Austria, Slovenia)
- **Excluded**: Китай, Индия, Турция, Польша, Россия

**Исключения**:
- Персональные домены: `gmail.com`, `libero.it`, `virgilio.it`
- HR email: `hr@`, `lavoro@`, `jobs@`, `carriere@`
- Нерелевантные индустрии: образование, медиа, финансы, HR-агентства

---

## 📊 Результаты фильтрации

### Выходные файлы

После обработки файла `italy_list_clean_20251010.txt` создаются:

```
output/
├── Italy_Hydraulics_italy_list_HIGH_PRIORITY_20251010_120000.txt           # Email только
├── Italy_Hydraulics_italy_list_HIGH_PRIORITY_metadata_20251010_120000.csv  # С метаданными
├── Italy_Hydraulics_italy_list_HIGH_PRIORITY_metadata_20251010_120000.json # JSON
├── Italy_Hydraulics_italy_list_MEDIUM_PRIORITY_*.txt/csv/json
├── Italy_Hydraulics_italy_list_LOW_PRIORITY_*.txt/csv/json
├── Italy_Hydraulics_italy_list_EXCLUDED_*.txt/csv/json
└── Italy_Hydraulics_italy_list_EXCLUSION_REPORT_20251010_120000.csv        # Отчет
```

### Структура CSV с метаданными

| Колонка | Описание |
|---------|----------|
| `email` | Email адрес |
| `company` | Название компании |
| `description` | Описание (meta description) |
| `keywords` | Ключевые слова |
| `source` | Источник email |
| `domain` | Веб-домен компании |
| `overall_score` | Итоговый score (0-100) |
| `email_score` | Качество email |
| `relevance_score` | Релевантность индустрии |
| `geographic_score` | Географический приоритет |
| `engagement_score` | Вовлеченность |
| `priority` | `high` / `medium` / `low` / `exclude` |
| `target_category` | `primary_target` / `secondary_target` / `potential` / `excluded` |

### Пример записи

```csv
email,company,overall_score,relevance_score,geographic_score,priority,target_category
info@idraulica-torino.it,"Idraulica Torino SRL",95,85,100,high,primary_target
sales@hydraulic-europe.com,"European Hydraulics",68,75,60,medium,secondary_target
contact@generic-company.com,"Generic Company",15,10,30,exclude,excluded
```

---

## 🎯 Система скоринга

### Компоненты score (weights):

1. **Email Quality (10%)**:
   - Корпоративный домен vs бесплатный провайдер: +35 vs +15
   - Структура local part (firstname.lastname): +15
   - Разумная длина (3-25 символов): +10
   - Гидравлический домен: +25

2. **Company Relevance (45%)**:
   - Primary термины (IT): +25 за термин
   - Primary термины (EN): +20 за термин
   - Secondary термины: +10/+8
   - OEM indicators: +15/+12
   - Негативные keywords: -50

3. **Geographic Priority (30%)**:
   - **High** (Италия): 100 баллов
   - **Medium** (Европа): 60 баллов
   - **Low** (остальные): 30 баллов

4. **Engagement (15%)**:
   - Источник `product`/`prodott`: 85
   - Источник `service`/`serviz`: 80
   - Источник `contact`/`contatt`: 75
   - Источник `about`/`chi siamo`: 65
   - Прочие: 40

### Бонусные мультипликаторы:

- **OEM manufacturer**: ×1.3
- **Target geography** (high): ×2.0
- **Domain match**: ×1.5

### Пороги приоритетов:

- **HIGH**: score >= 100
- **MEDIUM**: score >= 50
- **LOW**: score >= 10
- **EXCLUDED**: score < 10

---

## 🛠️ API Endpoints (для веб-интерфейса)

### GET /api/smart-filter/available

Получить список доступных фильтров.

**Response**:
```json
{
  "success": true,
  "filters": ["italy_hydraulics"]
}
```

### GET /api/smart-filter/config?name=italy_hydraulics

Получить конфигурацию фильтра.

**Response**:
```json
{
  "success": true,
  "config": {
    "filter_name": "Italy Hydraulics Equipment Filter",
    "version": "1.0.0",
    "target_country": "IT",
    "target_industry": "hydraulics",
    ...
  }
}
```

### POST /api/smart-filter/process

Обработать один clean-файл.

**Request**:
```json
{
  "clean_file": "output/italy_list_clean_20251010.txt",
  "filter_name": "italy_hydraulics",
  "include_metadata": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Smart filter запущен для файла: output/italy_list_clean_20251010.txt"
}
```

### POST /api/smart-filter/process-batch

Batch обработка clean-файлов.

**Request**:
```json
{
  "filter_name": "italy_hydraulics",
  "pattern": "output/*Italy*_clean_*.txt",
  "include_metadata": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Batch smart filter запущен (паттерн: output/*Italy*_clean_*.txt)"
}
```

---

## 📖 Примеры использования

### Сценарий 1: Простая фильтрация

```bash
# 1. Обычная проверка (базовая фильтрация)
python3 email_checker.py check input/italy_contacts.txt

# 2. Умная фильтрация результатов
python3 email_checker.py smart-filter output/italy_contacts_clean_20251010.txt

# Результат:
# - Italy_Hydraulics_..._HIGH_PRIORITY_*.txt (топ лиды)
# - Italy_Hydraulics_..._MEDIUM_PRIORITY_*.txt (средние)
# - Italy_Hydraulics_..._LOW_PRIORITY_*.txt (низкие)
# - Italy_Hydraulics_..._EXCLUDED_*.txt (исключенные)
```

### Сценарий 2: Batch обработка

```bash
# 1. Обработать все LVP файлы для Италии
python3 email_checker.py check-lvp-batch --exclude-duplicates

# 2. Умная фильтрация всех clean-файлов
python3 email_checker.py smart-filter-batch --pattern "output/*Italy*_clean_*.txt"

# 3. Получить только HIGH priority contacts
cat output/Italy_Hydraulics_*_HIGH_PRIORITY_*.txt > italy_top_leads.txt
```

### Сценарий 3: Через веб-интерфейс

1. Откройте http://localhost:8082
2. Перейдите в секцию "Smart Filter"
3. Выберите filter: `italy_hydraulics`
4. Выберите clean-файл из списка
5. Нажмите "Process"
6. Отслеживайте прогресс в разделе "Processing Status"
7. Скачайте результаты

---

## 🔧 Создание собственного фильтра

### Шаг 1: Создать конфиг

Скопируйте `smart_filters/configs/italy_hydraulics_config.json` и измените:

```json
{
  "filter_name": "Poland Earthmoving Equipment",
  "target_country": "PL",
  "target_industry": "earthmoving",
  "languages": ["pl", "en"],

  "industry_keywords": {
    "earthmoving_polish": {
      "primary": ["kopar", "spych", "ład", ...],
      ...
    }
  }
}
```

### Шаг 2: Зарегистрировать фильтр

Добавьте в `smart_filters/__init__.py`:

```python
AVAILABLE_FILTERS = [
    "italy_hydraulics",
    "poland_earthmoving"  # ← новый фильтр
]
```

### Шаг 3: Создать класс фильтра (опционально)

Для простых случаев конфига достаточно. Для сложной логики создайте:

```python
# smart_filters/poland_earthmoving_filter.py
class PolandEarthmovingFilter:
    # Аналогично ItalyHydraulicsFilter
    ...
```

---

## ❓ FAQ

**Q: Можно ли использовать smart filter без базовой фильтрации?**
A: Да, но это не рекомендуется. Лучше сначала очистить от блок-листов, затем применить smart filter.

**Q: Как изменить пороги приоритетов?**
A: Измените в конфиге:
```json
"scoring": {
  "thresholds": {
    "high_priority": 120,  // было 100
    "medium_priority": 70,  // было 50
    "low_priority": 20      // было 10
  }
}
```

**Q: Поддерживается ли параллельная обработка?**
A: Пока нет, но это в roadmap. Текущая версия обрабатывает файлы последовательно.

**Q: Сколько времени занимает обработка?**
A: ~1-3 секунды на 1000 email. Зависит от сложности конфига и наличия метаданных.

**Q: Можно ли комбинировать несколько фильтров?**
A: Да, запустите их последовательно:
```bash
python3 email_checker.py smart-filter output/file_clean.txt --config filter1
python3 email_checker.py smart-filter output/Filter1_file_HIGH_*.txt --config filter2
```

---

## 📚 См. также

- [README.md](README.md) - Общая документация
- [CLAUDE.md](CLAUDE.md) - Руководство разработчика
- [WEB_INTERFACE.md](WEB_INTERFACE.md) - Документация веб-интерфейса
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Тестирование

---

**Версия**: 1.0.0
**Последнее обновление**: 2025-10-10
**Автор**: Email Checker Team
