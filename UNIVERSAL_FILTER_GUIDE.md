# Universal Exclusion Template Guide

## Overview

Универсальный шаблон фильтрации (`universal_exclusion_template.json`) содержит общие слова-исключения для всех рынков на трех языках: английском, немецком и французском.

## Структура

Шаблон организован по следующим категориям исключений:

### 1. Asian Markets (Азиатские рынки)
Исключает контакты из Китая и Индии:
- **Английский**: china, chinese, india, indian
- **Немецкий**: China, chinesisch, Indien
- **Французский**: Chine, Chinois, Inde

### 2. Healthcare (Здравоохранение)
Медицинские учреждения и сервисы:
- **Английский**: hospital, medical, health, dental, doctor, clinic
- **Немецкий**: Krankenhaus, medizinische, Gesundheit, Zahn, Arzt
- **Французский**: hôpital, médical, santé, dentaire, médecin, clinique

### 3. Education (Образование)
Учебные заведения:
- **Английский**: school, university, college, academy, training, course, institute, learning, skill, student, campus
- **Немецкий**: Schule, Universität, Hochschule, Akademie, Ausbildung, Kurs, Institut, Lernen, Fähigkeit, Student
- **Французский**: école, université, collège, académie, entraînement, cours, institut, apprentissage, compétence, étudiant

### 4. Government & Public (Правительственные и государственные)
Государственные учреждения:
- **Английский**: government, court, police, ministry
- **Немецкий**: regierung, Gericht, Polizei, ministerium
- **Французский**: gouvernement, tribunal, police, ministère
- **Домены**: .gov, .gov.*

### 5. Tourism & Hospitality (Туризм и гостиничный бизнес)
Отели, рестораны, туристические агентства:
- **Английский**: hotel, resort, restaurant, cafe, travel, tourism, tourist, entertainment
- **Немецкий**: Hotel, Resort, Restaurant, Cafe, reisen, tourismus, Touristik, Unterhaltung
- **Французский**: hôtel, station balnéaire, restaurant, café, voyage, tourisme, touristique, divertissement

### 6. Retail & Consumer (Розничная торговля)
Розничные магазины и e-commerce:
- **Английский**: retail, shop, shopify, webshop
- **Немецкий**: Einzelhandel, geschäft, onlineshop
- **Французский**: vente au détail, magasin

### 7. Media & Advertising (Медиа и реклама)
СМИ и издательства:
- **Английский**: news, media, magazine, newspaper
- **Немецкий**: Nachricht, Medien, Magazin, Zeitung
- **Французский**: nouvelles, médias, magazine, journal

### 8. Finance & Insurance (Финансы и страхование)
Банки, страховые компании, инвестиционные фонды:
- **Английский**: bank, finance, credit, insurance, broker, loan, investment, fund, capital
- **Немецкий**: Bank, Finanzen, Kredit, Versicherung, Makler, Darlehen, Investition, Fonds, Hauptstadt
- **Французский**: banque, finance, crédit, assurance, courtier, prêt, investissement, fonds, capital

### 9. Legal Services (Юридические услуги)
Юристы, нотариусы, консалтинг, аудит:
- **Английский**: legal, consulting, consultancy, advocate, audit, notary, lawyer, attorney
- **Немецкий**: legal, Beratung, Fürsprecher, Prüfung, Notar, Anwalt, Rechtsanwalt
- **Французский**: légal, consultant, conseil, avocat, audit, notaire

### 10. Non-Profit (Некоммерческие организации)
Благотворительность, фонды, ассоциации, музеи:
- **Английский**: charity, foundation, association, museum, club
- **Немецкий**: Wohltätigkeit, Stiftung, Verein, Museum
- **Французский**: charité, fondation, association, musée, club

### 11. IT & Software (IT и разработка ПО)
Разработчики ПО, стартапы, IT-компании:
- **Английский**: software, digital, developer, programming, startup, computer, techpilot, network
- **Немецкий**: Software, digital, Entwickler, Programmierung, Start-up, netzwerk
- **Французский**: logiciel, numérique, promoteur, programmation, démarrer, réseau

### 12. Logistics & Transport (Логистика и транспорт)
Курьерские службы, аэропорты:
- **Английский**: courier, parcel, airport
- **Немецкий**: Kurier, Paket, Flughafen
- **Французский**: courrier, colis, aéroport

### 13. Other Excluded (Прочие исключения)
- **Английский**: watches
- **Немецкий**: Uhren
- **Французский**: montres

## Префиксы Email (Email Prefixes)

Исключаются технические и служебные адреса:

### Service Prefixes
- noreply@, no-reply@, donotreply@
- admin@, webmaster@, postmaster@
- info@, contact@

### Специализированные префиксы
- **HR**: hr@, jobs@, careers@, recruitment@
- **Medical**: patient@, reception@, ambulance@, diagnosis@, laboratory@, pharmacy@
- **Government**: office@, ministry@, administration@, municipality@
- **Legal**: notary@, lawyer@, attorney@, legal@
- **Tourism**: booking@, travel@, tourism@, tour@, reservation@

## Домены (Domains)

### Personal Domains (Персональные домены)
Исключаются бесплатные email-провайдеры:
- gmail.com, yahoo.com, hotmail.com, outlook.com
- icloud.com, me.com, mac.com
- aol.com, live.com, msn.com

### Excluded Country Domains
- .cn, .com.cn (Китай)
- .in, .co.in (Индия)

## Использование

### 1. Как самостоятельный фильтр

```bash
# Применить универсальный фильтр к чистому списку
python3 smart_filter.py output/list_clean.txt --config universal_exclusion_template

# Или через email_checker.py
python3 email_checker.py smart-filter output/list_clean.txt --config universal_exclusion_template
```

### 2. Как база для нового фильтра

Создайте новый конфиг на основе универсального шаблона:

```bash
# Скопируйте шаблон
cp smart_filters/configs/universal_exclusion_template.json \
   smart_filters/configs/my_custom_filter.json

# Отредактируйте:
# - filter_name
# - config_name
# - target_country
# - target_industry
# - Добавьте специфичные keywords
# - Настройте scoring weights
```

### 3. Расширение существующего фильтра

Используйте категории из универсального шаблона в своих конфигах:

```json
{
  "filter_name": "My Custom Filter",
  "exclusions": {
    "excluded_industries": {
      "healthcare": ["hospital", "Krankenhaus", "hôpital", ...],
      "education": ["school", "Schule", "école", ...],
      "finance_insurance": ["bank", "Bank", "banque", ...]
    }
  }
}
```

## Scoring Settings

Универсальный шаблон использует стандартные настройки скоринга:

```json
{
  "weights": {
    "email_quality": 0.1,      // 10% - качество email адреса
    "company_relevance": 0.45, // 45% - релевантность компании
    "geographic_priority": 0.3, // 30% - географический приоритет
    "engagement": 0.15         // 15% - вовлеченность
  },
  "thresholds": {
    "high_priority": 100,      // ≥100 = HIGH
    "medium_priority": 50,     // ≥50 = MEDIUM
    "low_priority": 10         // ≥10 = LOW, <10 = EXCLUDED
  }
}
```

## Batch Processing

```bash
# Применить к нескольким файлам
python3 email_checker.py smart-filter-batch \
  --pattern "output/*_clean_*.txt" \
  --config universal_exclusion_template

# Или с помощью standalone скрипта
python3 smart_filter.py output/*_clean_*.txt \
  --config universal_exclusion_template
```

## Output Files

Результаты сохраняются в `output/` с префиксом `Universal_Filter_`:

- `Universal_Filter_*_HIGH_PRIORITY_*.txt/csv/json` - Score ≥ 100
- `Universal_Filter_*_MEDIUM_PRIORITY_*.txt/csv/json` - Score 50-99
- `Universal_Filter_*_LOW_PRIORITY_*.txt/csv/json` - Score 10-49
- `Universal_Filter_*_EXCLUDED_*.txt/csv/json` - Score < 10
- `Universal_Filter_*_EXCLUSION_REPORT_*.csv` - Детальный отчет по исключениям

## Примеры использования

### Пример 1: Базовая фильтрация списка

```bash
# 1. Обработать список (проверить на блокировку)
python3 email_checker.py check input/contacts.txt

# 2. Применить универсальный фильтр
python3 email_checker.py smart-filter \
  output/contacts_clean_20251117.txt \
  --config universal_exclusion_template

# 3. Результаты в output/Universal_Filter_*
ls -lh output/Universal_Filter_*
```

### Пример 2: Создание кастомного фильтра

```bash
# 1. Копируем шаблон
cp smart_filters/configs/universal_exclusion_template.json \
   smart_filters/configs/germany_manufacturing.json

# 2. Редактируем germany_manufacturing.json:
# - Добавляем немецкие термины для производства
# - Настраиваем geographic_priorities для Германии
# - Добавляем keywords для целевой индустрии

# 3. Применяем фильтр
python3 email_checker.py smart-filter \
  output/german_contacts_clean.txt \
  --config germany_manufacturing
```

### Пример 3: Комбинированная фильтрация

```bash
# 1. Сначала универсальная фильтрация (убрать очевидно нерелевантные)
python3 email_checker.py smart-filter \
  output/contacts_clean.txt \
  --config universal_exclusion_template

# 2. Затем специализированная фильтрация HIGH/MEDIUM приоритетов
python3 email_checker.py smart-filter \
  output/Universal_Filter_*_HIGH_PRIORITY_*.txt \
  --config italy_hydraulics
```

## Расширение шаблона

Если вам нужно добавить новые слова-исключения:

1. Откройте `smart_filters/configs/universal_exclusion_template.json`
2. Найдите нужную категорию в `exclusions.excluded_industries`
3. Добавьте слова на всех трех языках (EN/DE/FR)
4. Сохраните файл

**Пример:**

```json
{
  "excluded_industries": {
    "healthcare": [
      "hospital",
      "Krankenhaus",
      "hôpital",
      "pharmacy",      // Добавляем новые слова
      "Apotheke",
      "pharmacie"
    ]
  }
}
```

## Maintenance

### Добавление нового языка

Если нужно добавить еще один язык (например, испанский):

1. Добавьте `"es"` в `languages`
2. Добавьте испанские термины в каждую категорию
3. Обновите версию конфига

### Обновление категорий

При добавлении новой категории исключений:

1. Добавьте раздел в `exclusions` (например, `crypto_patterns`)
2. Добавьте соответствующую категорию в `excluded_industries`
3. Документируйте изменения в этом файле

## Technical Notes

- **Case-sensitivity**: Фильтр учитывает регистр, поэтому включены варианты с заглавной буквы
- **Partial matching**: Слова проверяются как подстроки в домене и названии компании
- **Multi-language**: Один email может попасть под исключение по любому из трех языков
- **Performance**: ~1-3 секунды на 1000 emails

## See Also

- [SMART_FILTER_GUIDE.md](SMART_FILTER_GUIDE.md) - Полное руководство по Smart Filters
- [CLAUDE.md](CLAUDE.md) - Общая документация проекта
- `smart_filters/configs/*.json` - Другие конфигурационные файлы

## Version History

- **1.0.0** (2025-01-17) - Initial release
  - 13 категорий исключений
  - 3 языка (EN/DE/FR)
  - 200+ ключевых слов-исключений
