#!/usr/bin/env python3
"""
Скрипт для исправления lists_config.json:
1. Удаление записей о несуществующих файлах
2. Автоматическое определение и обновление метаданных для LVP файлов
"""

import json
import os
from pathlib import Path
from typing import Dict, List
import re


def detect_country(filename: str) -> str:
    """Определяет страну по имени файла"""
    filename_lower = filename.lower()

    # Прямое упоминание стран
    country_patterns = {
        'Austria': ['австрия', 'austria'],
        'Belgium': ['бельгия', 'belgium'],
        'Bulgaria': ['болгария', 'bulgaria'],
        'Germany': ['германия', 'germany'],
        'Poland': ['польша', 'poland'],
        'Romania': ['румыния', 'romania', 'румуния'],
        'Serbia': ['сербия', 'serbia'],
        'Slovakia': ['словакия', 'slovakia'],
        'Slovenia': ['словения', 'slovenia'],
        'Finland': ['финляндия', 'finland', 'фины'],
        'Switzerland': ['швейцария', 'switzerland'],
        'Czech Republic': ['чехия', 'czech', 'czeh'],
        'Hungary': ['венгрия', 'hungary'],
        'Portugal': ['португалия', 'portugal'],
        'Greece': ['греция', 'greece'],
        'Ireland': ['ирландия', 'ireland'],
        'Italy': ['италия', 'italy'],
        'UK': ['великобритания', 'britain', 'uk'],
        'Norway': ['норвегия', 'norway'],
        'Sweden': ['швеция', 'sweden', 'шведы'],
        'Chile': ['chilli', 'chile'],
        'Ecuador': ['ecuador', 'эквадор'],
        'Brazil': ['бразилия', 'brazil'],
        'Russia': ['рф', 'ru ', 'россия', 'russia', 'российская'],
        'Saudi Arabia': ['саудовская', 'saudi'],
        'UAE': ['оае', 'uae', 'эмираты'],
        'Kuwait': ['кувейт', 'kuwait'],
        'Qatar': ['катар', 'qatar'],
        'Jordan': ['йордан', 'jordan'],
        'Oman': ['оман', 'oman'],
        'Bahrain': ['бахрейн', 'bahrain'],
        'South Africa': ['юар', 'south africa'],
        'Francophone Africa': ['франкоговорящая африка', 'francophone'],
        'Arab Countries': ['арабские страны', 'arab countries', 'аравия'],
    }

    for country, patterns in country_patterns.items():
        for pattern in patterns:
            if pattern in filename_lower:
                return country

    # EU prefix без конкретной страны
    if filename.startswith('EU ') or filename.startswith('eu '):
        return 'Europe'

    return 'Unknown'


def detect_category(filename: str) -> str:
    """Определяет категорию по имени файла"""
    filename_lower = filename.lower()

    # Категории по ключевым словам (порядок важен - более специфичные первыми)
    category_patterns = {
        'Mining': ['горняшка', 'mining', 'горношахт'],
        'Maritime': ['суда', 'порт', 'shiping', 'shipping', 'портов'],
        'Agriculture': ['агро', 'сельскохозяйств'],
        'Forestry': ['лесозаготовка', 'forestry', 'деревообраб'],
        'Automotive': ['моторам', 'motors', 'гидромоторы', 'автомобил', 'automotive'],
        'Manufacturing': ['hc', 'heavy construction', 'строительн', 'заводы', 'завод',
                         'производител', 'машиностро', 'металлообраб', 'оборудован',
                         'powder metal', 'гидравлик', 'станков', 'литейного',
                         'компрессор', 'насосн', 'котельн'],
        'Energy': ['энергетика', 'энергет', 'тэц', 'energy'],
        'Food Industry': ['пищев', 'food', 'общепит', 'тестомесил', 'фасовочн', 'упаковочн'],
        'Municipal': ['коммунальн', 'municipal', 'муниципал'],
        'Transportation': ['дорожн техник', 'транспорт', 'подъемно-транспорт'],
        'Laboratory': ['лабораторн', 'laboratory'],
        'Logistics': ['логистик', 'logistic'],
        'Service': ['сервис', 'service'],
        'Trade': ['торговые компании', 'trade'],
    }

    for category, patterns in category_patterns.items():
        for pattern in patterns:
            if pattern in filename_lower:
                return category

    return 'General'


def determine_priority(filename: str, country: str, category: str) -> int:
    """Определяет приоритет файла"""
    filename_lower = filename.lower()

    # Высокий приоритет для важных стран/категорий
    high_priority_countries = ['Germany', 'Poland', 'Europe']
    high_priority_categories = ['Automotive', 'Manufacturing', 'Agriculture']

    # Проверенные файлы - высокий приоритет
    if 'полностью проверен' in filename_lower or 'проверен' in filename_lower:
        return 50

    # Важные страны и категории
    if country in high_priority_countries:
        if category in high_priority_categories:
            return 100
        return 200

    # Остальные
    if category in high_priority_categories:
        return 300

    return 999


def fix_config():
    """Основная функция исправления конфига"""
    config_file = Path('lists_config.json')
    input_dir = Path('input')

    # Загружаем конфиг
    print("📂 Загрузка конфига...")
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)

    # Получаем список реальных файлов
    real_files = set(f.name for f in input_dir.glob('*') if f.is_file())
    print(f"📁 Файлов в input/: {len(real_files)}")

    original_count = len(config['lists'])
    print(f"📝 Записей в конфиге: {original_count}")

    # Шаг 1: Удаляем записи о несуществующих файлах
    removed_files = []
    updated_lists = []

    for item in config['lists']:
        if item['filename'] in real_files:
            updated_lists.append(item)
        else:
            removed_files.append(item['filename'])

    print(f"\n🗑️  Удалено записей о несуществующих файлах: {len(removed_files)}")
    for f in removed_files:
        print(f"   - {f}")

    # Шаг 2: Обновляем метаданные для LVP файлов
    print(f"\n🔄 Обновление метаданных для LVP файлов...")
    updated_count = 0

    for item in updated_lists:
        if item['filename'].endswith('.lvp'):
            old_country = item.get('country', 'Unknown')
            old_category = item.get('category', 'General')

            # Определяем новые метаданные
            new_country = detect_country(item['filename'])
            new_category = detect_category(item['filename'])
            new_priority = determine_priority(item['filename'], new_country, new_category)

            # Обновляем только если изменилось
            changed = False
            if old_country == 'Unknown' and new_country != 'Unknown':
                item['country'] = new_country
                changed = True
            if old_category == 'General' and new_category != 'General':
                item['category'] = new_category
                changed = True
            if item.get('priority', 999) == 999:
                item['priority'] = new_priority
                changed = True

            # Добавляем file_type если нет
            if 'file_type' not in item:
                item['file_type'] = 'lvp'
                changed = True

            if changed:
                updated_count += 1
                print(f"   ✓ {item['filename'][:60]:60} | {old_country:10} → {item['country']:15} | {old_category:12} → {item['category']}")

    print(f"\n📊 Обновлено метаданных: {updated_count}")

    # Сохраняем обновлённый конфиг
    config['lists'] = updated_lists

    # Сортируем по приоритету
    config['lists'].sort(key=lambda x: (x.get('priority', 999), x['filename']))

    print(f"\n💾 Сохранение обновлённого конфига...")
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Готово!")
    print(f"   Было записей: {original_count}")
    print(f"   Удалено: {len(removed_files)}")
    print(f"   Осталось: {len(updated_lists)}")
    print(f"   Обновлено метаданных: {updated_count}")

    # Статистика по странам и категориям
    countries = {}
    categories = {}
    for item in updated_lists:
        if item['filename'].endswith('.lvp'):
            country = item.get('country', 'Unknown')
            category = item.get('category', 'General')
            countries[country] = countries.get(country, 0) + 1
            categories[category] = categories.get(category, 0) + 1

    print(f"\n📈 Статистика LVP файлов:")
    print(f"\n  Страны:")
    for country, count in sorted(countries.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"    {country:20} {count:3}")

    print(f"\n  Категории:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"    {category:20} {count:3}")


if __name__ == '__main__':
    fix_config()
