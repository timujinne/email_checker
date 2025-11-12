import os
from datetime import datetime

# Список импортированных файлов
imported_files = {
    'En HC от Глеба.lvp': 6287, 'Chilli2.lvp': 3214, 'Португалия, HC, Агро, по картам.lvp': 2699,
    'EU Бельгия гидромоторы, парсинг по картам.lvp': 2617, 'РФ коммунальная.lvp': 4947,
    'РФ коммунальная(полностью проверен).lvp': 3991, 'РФ парса дорожной техники по картам.lvp': 5977,
    'РФ парса Производители металлообрабатывающего оборудования по картам.lvp': 4039,
    'РФ Производители подъемно-транспортного оборудования по картам.lvp': 4274,
    'РФ Производители литейного оборудования по картам.lvp': 5627,
    'EU Германия Новый блок ключей по моторам, поиск по картам.lvp': 4679,
    'EU Польша Новый блок ключей по моторам, поиск по картам.lvp': 2221,
    'EU Австрия Новый блок ключей по моторам, поиск по картам.lvp': 1832,
    'Венгрия Гидромоторы поиск по картам.lvp': 831, 'Болгария Гидромоторы поиск по картам.lvp': 1290,
    'РФ Общий список Гидромоторы 15.lvp': 1123, 'РФ Полный список 16.lvp': 2717,
    'Польша СГ по картам.lvp': 3646, 'Румуния Гидромоторы поиск по картам.lvp': 1270,
    'Польша строительн_ по картам.lvp': 5072, 'Венгрия, HC, Агро, по картам.lvp': 3056,
    'Сербия, HC, Агро, по картам.lvp': 1462, 'Чехия Гидромоторы поиск по картам.lvp': 3069
}

# Получаем список всех LVP файлов
input_dir = 'input'
all_files = []

for filename in os.listdir(input_dir):
    if filename.endswith('.lvp'):
        filepath = os.path.join(input_dir, filename)
        stat = os.stat(filepath)
        size_mb = stat.st_size / (1024 * 1024)
        mod_time = datetime.fromtimestamp(stat.st_mtime)
        
        is_imported = filename in imported_files
        record_count = imported_files.get(filename, 0)
        
        all_files.append({
            'filename': filename,
            'size_mb': size_mb,
            'modified': mod_time,
            'imported': is_imported,
            'records': record_count
        })

all_files.sort(key=lambda x: x['modified'], reverse=True)
not_imported = [f for f in all_files if not f['imported']]

# Группировка по приоритетам
print('=' * 102)
print(' ' * 25 + 'ДЕТАЛЬНЫЙ АНАЛИЗ НЕИМПОРТИРОВАННЫХ ФАЙЛОВ' + ' ' * 36)
print('=' * 102)
print()

# Приоритет 1: Порошковая металлургия (новые файлы)
print('🔥 ПРИОРИТЕТ 1: ПОРОШКОВАЯ МЕТАЛЛУРГИЯ (8 файлов, 336.2 MB)')
print('-' * 102)
powder_files = [f for f in not_imported if 'порошок' in f['filename'].lower() or 'powder' in f['filename'].lower()]
powder_files.sort(key=lambda x: x['modified'], reverse=True)
for i, f in enumerate(powder_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Приоритет 2: Италия Агро
print('🔥 ПРИОРИТЕТ 2: ИТАЛИЯ АГРО (4 файла, 181.0 MB)')
print('-' * 102)
italy_files = [f for f in not_imported if 'италия' in f['filename'].lower()]
italy_files.sort(key=lambda x: x['modified'], reverse=True)
for i, f in enumerate(italy_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Приоритет 3: Испания Агро
print('🔥 ПРИОРИТЕТ 3: ИСПАНИЯ АГРО (3 файла, 71.2 MB)')
print('-' * 102)
spain_files = [f for f in not_imported if 'испания' in f['filename'].lower()]
spain_files.sort(key=lambda x: x['modified'], reverse=True)
for i, f in enumerate(spain_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Приоритет 4: Россия (РФ) - проверенные списки
print('⭐ ПРИОРИТЕТ 4: РОССИЯ (5 файлов, 125.9 MB)')
print('-' * 102)
rf_files = [f for f in not_imported if f['filename'].startswith('РФ')]
rf_files.sort(key=lambda x: x['modified'], reverse=True)
for i, f in enumerate(rf_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Приоритет 5: Норвегия (проверенные списки)
print('⭐ ПРИОРИТЕТ 5: НОРВЕГИЯ (5 файлов, 99.8 MB)')
print('-' * 102)
norway_files = [f for f in not_imported if 'норвегия' in f['filename'].lower()]
norway_files.sort(key=lambda x: x['modified'], reverse=True)
for i, f in enumerate(norway_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Приоритет 6: Большие производственные списки
print('⚙️  ПРИОРИТЕТ 6: ЗАВОДЫ И ПРОИЗВОДИТЕЛИ (26 файлов, 731.9 MB)')
print('-' * 102)
factory_files = [f for f in not_imported if 'завод' in f['filename'].lower() or 'производител' in f['filename'].lower()]
factory_files.sort(key=lambda x: x['size_mb'], reverse=True)
for i, f in enumerate(factory_files[:10], 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print(f"    ... и еще {len(factory_files)-10} файлов")
print()

# Большие экзотические файлы
print('🌍 БОЛЬШИЕ ЭКЗОТИЧЕСКИЕ ФАЙЛЫ (>100 MB):')
print('-' * 102)
big_files = [f for f in not_imported if f['size_mb'] > 100]
big_files.sort(key=lambda x: x['size_mb'], reverse=True)
for i, f in enumerate(big_files, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

# Европейские страны (недоимпортированные)
print('🇪🇺 ЕВРОПА - НЕДОИМПОРТИРОВАННЫЕ СТРАНЫ:')
print('-' * 102)
eu_countries = ['Германия', 'Польша', 'Чехия', 'Бельгия', 'Финляндия', 'Великобритания', 'Ирландия', 
                'Греция', 'Словакия', 'Словения', 'Болгария', 'Венгрия', 'РУМЫНИЯ']
eu_files = []
for country in eu_countries:
    country_files = [f for f in not_imported if country.lower() in f['filename'].lower()]
    if country_files:
        total_size = sum(f['size_mb'] for f in country_files)
        eu_files.extend(country_files)
        print(f"{country:<20} {len(country_files):>2} файлов ({total_size:>6.1f} MB)")
print()

# Арабские страны и Mining
print('🌏 АРАБСКИЕ СТРАНЫ И MINING:')
print('-' * 102)
arabic_files = [f for f in not_imported if any(x in f['filename'].lower() for x in 
                ['аравия', 'арабские', 'оман', 'катар', 'кувейт', 'бахрейн', 'йордан', 'оае'])]
mining_files = [f for f in not_imported if 'mining' in f['filename'].lower() or 'lato' in f['filename'].lower()]
all_arabic = list(set(arabic_files + mining_files))
all_arabic.sort(key=lambda x: x['size_mb'], reverse=True)
for i, f in enumerate(all_arabic, 1):
    print(f"{i}. {f['filename']:<60} {f['size_mb']:>6.1f} MB  {f['modified'].strftime('%Y-%m-%d')}")
print()

print('=' * 102)
print('📝 ИТОГОВЫЕ РЕКОМЕНДАЦИИ ПО ИМПОРТУ:')
print('=' * 102)
print()
print('1️⃣  НЕМЕДЛЕННЫЙ ИМПОРТ (Топ-15, ~650 MB):')
print('    - Порошковая металлургия: 8 файлов (новейшие данные)')
print('    - Италия Агро: 4 файла')
print('    - Испания Агро: 3 файла')
print()
print('2️⃣  ВЫСОКИЙ ПРИОРИТЕТ (~220 MB):')
print('    - РФ: Сельхоз, Строительная, Энергетика (5 файлов)')
print('    - Норвегия: Лесозаготовка, Землеройная (5 файлов)')
print()
print('3️⃣  СРЕДНИЙ ПРИОРИТЕТ (~730 MB):')
print('    - Заводы и Производители: 26 файлов (производственные базы)')
print()
print('4️⃣  НИЗКИЙ ПРИОРИТЕТ (~1,030 MB):')
print('    - Европейские страны: HC списки, старые базы')
print('    - Арабские страны и Mining: экзотические регионы')
print('    - Большие архивные файлы (Lato ecuador 339 MB)')
print()
print('🎯 ОПТИМАЛЬНАЯ СТРАТЕГИЯ:')
print('    1. Импортировать топ-15 (Приоритет 1-3)')
print('    2. Проанализировать качество данных')
print('    3. Продолжить с Приоритетом 4-5 если данные хорошие')
print('    4. Остальное - по мере необходимости')
