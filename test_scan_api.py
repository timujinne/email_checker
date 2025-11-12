#!/usr/bin/env python3
"""
Тестовый скрипт для проверки API endpoint /api/scan-input-directory
"""

import sys
import json
from pathlib import Path

# Добавляем текущую директорию в PATH для импорта модулей
sys.path.insert(0, str(Path(__file__).parent))

from email_checker import EmailChecker

def test_scan_directory():
    """Тестирование функции сканирования директории"""
    print("🔍 Тестирование сканирования input/ директории...")
    print()

    # Инициализируем EmailChecker
    checker = EmailChecker(".")

    # Загружаем текущую конфигурацию
    config_file = Path("lists_config.json")
    existing_files = set()

    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            existing_files = {item['filename'] for item in config.get('lists', [])}
            print(f"📋 Файлов в конфигурации: {len(existing_files)}")

    # Сканируем input/ директорию
    input_dir = Path("input")
    new_files = []

    if input_dir.exists():
        all_files = list(input_dir.glob('*.txt')) + list(input_dir.glob('*.lvp'))
        print(f"📁 Файлов в input/: {len(all_files)}")
        print()

        for filepath in all_files:
            filename = filepath.name

            # Пропускаем файлы, которые уже в конфигурации
            if filename in existing_files:
                print(f"⏭️  Пропущен (уже в конфигурации): {filename}")
                continue

            # Получаем метаданные с авто-определением
            try:
                metadata = checker._get_list_metadata(filename)

                # Добавляем file_type если отсутствует
                if 'file_type' not in metadata:
                    metadata['file_type'] = 'lvp' if filename.endswith('.lvp') else 'txt'

                # Добавляем размер файла
                metadata['file_size'] = filepath.stat().st_size

                new_files.append(metadata)
                print(f"✅ НАЙДЕН НОВЫЙ ФАЙЛ: {filename}")
                print(f"   - Country: {metadata.get('country')}")
                print(f"   - Category: {metadata.get('category')}")
                print(f"   - File type: {metadata.get('file_type')}")
                print(f"   - Size: {metadata.get('file_size')} bytes")
                print()
            except Exception as e:
                print(f"❌ Ошибка обработки {filename}: {e}")
                print()

    # Результат
    print()
    print("=" * 60)
    print(f"📊 РЕЗУЛЬТАТ: Найдено {len(new_files)} новых файлов")
    print("=" * 60)

    if new_files:
        print()
        print("Новые файлы будут добавлены в lists_config.json:")
        for f in new_files:
            print(f"  - {f['filename']} ({f['country']}, {f['category']})")

    return new_files


if __name__ == "__main__":
    new_files = test_scan_directory()
    print()
    print(f"✅ Тест завершен. Найдено {len(new_files)} новых файлов.")
