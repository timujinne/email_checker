#!/usr/bin/env python3
"""
Smart Filter Launcher - Умный фильтр Email Checker
Автономная система умной фильтрации email списков

Использование:
    python3 smart_filter.py [файл] [опции]

Примеры:
    python3 smart_filter.py output/list_clean.txt
    python3 smart_filter.py output/list_clean.txt --config italy_hydraulics
    python3 smart_filter.py --help
"""

import sys
import argparse
from pathlib import Path

# Добавляем текущую директорию в путь для импортов
sys.path.insert(0, str(Path(__file__).parent))

from smart_filter_processor_v2 import SmartFilterProcessor

def main():
    parser = argparse.ArgumentParser(
        description='Умный фильтр email списков - автономная система фильтрации',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  %(prog)s output/list_clean.txt
  %(prog)s output/list_clean.txt --config italy_hydraulics
  %(prog)s output/list_clean.txt --config italy_hydraulics --output-dir filtered_output
  %(prog)s --list-configs

Доступные конфигурации:
  - italy_hydraulics: Италия - гидравлические цилиндры
  - norway_earthmoving: Норвегия - землеройная техника
        """
    )

    parser.add_argument('file', nargs='?', help='Файл с email списком для фильтрации')
    parser.add_argument('--config', '-c', default='italy_hydraulics',
                       help='Конфигурация фильтрации (по умолчанию: italy_hydraulics)')
    parser.add_argument('--output-dir', '-o', default='smart_filtered',
                       help='Директория для результатов (по умолчанию: smart_filtered)')
    parser.add_argument('--list-configs', action='store_true',
                       help='Показать доступные конфигурации')
    parser.add_argument('--no-backup', action='store_true',
                       help='Не создавать бэкап исходного файла')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Подробный вывод')

    args = parser.parse_args()

    # Показываем доступные конфигурации
    if args.list_configs:
        print("Доступные конфигурации:")
        configs_dir = Path('configs')
        if configs_dir.exists():
            for config_file in configs_dir.glob('*.json'):
                print(f"  - {config_file.stem}: {config_file.name}")
        else:
            print("  Директория configs не найдена")
        return

    # Проверяем, что указан файл
    if not args.file:
        print("Ошибка: Укажите файл для фильтрации")
        print("Используйте --help для получения справки")
        sys.exit(1)

    file_path = Path(args.file)

    # Проверяем существование файла
    if not file_path.exists():
        print(f"Ошибка: Файл не найден: {file_path}")
        sys.exit(1)

    # Проверяем, что это текстовый файл
    if file_path.suffix.lower() not in ['.txt']:
        print(f"Ошибка: Неподдерживаемый формат файла: {file_path.suffix}")
        print("Поддерживаются только .txt файлы")
        sys.exit(1)

    if args.verbose:
        print(f"🚀 Запуск умного фильтра...")
        print(f"📁 Входной файл: {file_path}")
        print(f"⚙️  Конфигурация: {args.config}")
        print(f"📂 Выходная директория: {args.output_dir}")
        print()

    try:
        # Создаем процессор с указанной конфигурацией
        processor = SmartFilterProcessor(filter_name=args.config)

        # Настраиваем выходную директорию
        processor.output_dir = Path(args.output_dir)

        # Обрабатываем файл
        result = processor.process_clean_file(file_path)

        if args.verbose:
            print()
            print("✅ Обработка завершена успешно!")
            stats = result.get('statistics', {})
            print(f"📊 Статистика:")
            print(f"   Всего обработано: {stats.get('total_processed', 0)}")
            print(f"   Квалифицированные лиды: {stats.get('qualified_leads', 0)}")
            print(f"   Исключено: {stats.get('hard_excluded', 0)}")
            print(f"   Приоритетные: High={stats.get('high_priority', 0)}, Medium={stats.get('medium_priority', 0)}, Low={stats.get('low_priority', 0)}")
            print(f"   Ошибки: {stats.get('errors', 0)}")
            print(f"   Время обработки: {stats.get('processing_time', 0):.2f} сек")
            print()
            print(f"📁 Выходные файлы:")
            for file_type, file_path in result.get('output_files', {}).items():
                print(f"   - {file_type.upper()}: {file_path}")

        stats = result.get('statistics', {})
        print(f"✅ Умная фильтрация завершена. Обработано: {stats.get('qualified_leads', 0)} квалифицированных лидов")

    except FileNotFoundError as e:
        print(f"❌ Ошибка: Файл конфигурации не найден: {e}")
        print(f"Доступные конфигурации можно посмотреть командой: {sys.argv[0]} --list-configs")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Ошибка при обработке: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()