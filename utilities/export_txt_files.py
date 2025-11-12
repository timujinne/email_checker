#!/usr/bin/env python3
"""
Утилита для экспорта TXT файлов с очищенными email

Этот скрипт собирает все TXT файлы из output/ и экспортирует их
в удобном формате для дальнейшего использования.

Функции:
1. Сбор всех *_clean_*.txt файлов
2. Переименование для удобства (без timestamp)
3. Объединение всех в один файл (опционально)
4. Статистика по файлам
"""

import sys
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict
import argparse


class TxtFileExporter:
    """Экспортер TXT файлов с очищенными email"""

    def __init__(self, output_dir: str = "output", export_dir: str = "exports"):
        self.output_dir = Path(output_dir)
        self.export_dir = Path(export_dir)

    def find_clean_txt_files(self) -> List[Path]:
        """Находит все *_clean_*.txt файлы"""
        return sorted(self.output_dir.glob("*_clean_*.txt"))

    def get_latest_files(self) -> Dict[str, Path]:
        """Получает последние версии файлов (по timestamp)"""
        files = self.find_clean_txt_files()

        # Группируем по базовому имени (без timestamp)
        latest = {}

        for file in files:
            # Извлекаем базовое имя (до первого timestamp)
            # Формат: name_clean_YYYYMMDD_HHMMSS.txt
            parts = file.stem.split('_')

            # Ищем timestamp (8 цифр)
            base_parts = []
            for part in parts:
                if len(part) == 8 and part.isdigit():
                    break
                base_parts.append(part)

            base_name = '_'.join(base_parts)

            # Сохраняем самый свежий файл
            if base_name not in latest:
                latest[base_name] = file
            else:
                # Сравниваем по времени модификации
                if file.stat().st_mtime > latest[base_name].stat().st_mtime:
                    latest[base_name] = file

        return latest

    def export_files(self, rename: bool = True, merge: bool = False):
        """
        Экспортирует файлы в папку exports/

        Args:
            rename: Переименовать файлы (убрать timestamp)
            merge: Объединить все в один файл
        """
        self.export_dir.mkdir(exist_ok=True)

        latest_files = self.get_latest_files()

        if not latest_files:
            print("❌ Не найдено TXT файлов для экспорта")
            return

        print(f"\n📤 ЭКСПОРТ TXT ФАЙЛОВ\n")
        print("="*60)
        print(f"Источник: {self.output_dir}")
        print(f"Назначение: {self.export_dir}")
        print(f"Файлов для экспорта: {len(latest_files)}")
        print()

        total_emails = 0
        exported_files = []

        for base_name, file_path in sorted(latest_files.items()):
            # Считаем email
            with open(file_path, 'r', encoding='utf-8') as f:
                emails = [line.strip() for line in f if line.strip()]
                count = len(emails)
                total_emails += count

            # Определяем имя для экспорта
            if rename:
                export_name = f"{base_name}.txt"
            else:
                export_name = file_path.name

            export_path = self.export_dir / export_name

            # Копируем файл
            shutil.copy(file_path, export_path)

            print(f"✓ {export_name:60s} {count:>8,} email")
            exported_files.append((export_path, emails))

        print()
        print("="*60)
        print(f"✅ Экспортировано: {len(latest_files)} файлов, {total_emails:,} email")

        # Объединение в один файл
        if merge:
            self._merge_files(exported_files, total_emails)

        print(f"\n📁 Файлы сохранены в: {self.export_dir.absolute()}")

    def _merge_files(self, files: List[tuple], total_emails: int):
        """Объединяет все файлы в один"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        merged_file = self.export_dir / f"all_clean_emails_{timestamp}.txt"

        print(f"\n🔗 Объединение всех файлов в один...")

        # Собираем все уникальные email
        all_emails = set()
        for file_path, emails in files:
            all_emails.update(emails)

        # Сохраняем
        with open(merged_file, 'w', encoding='utf-8') as f:
            for email in sorted(all_emails):
                f.write(f"{email}\n")

        duplicates = total_emails - len(all_emails)

        print(f"✓ Создан объединенный файл: {merged_file.name}")
        print(f"  Всего email: {total_emails:,}")
        print(f"  Уникальных: {len(all_emails):,}")
        if duplicates > 0:
            print(f"  Дубликатов между файлами: {duplicates:,}")

    def show_statistics(self):
        """Показывает статистику по TXT файлам"""
        files = self.find_clean_txt_files()

        if not files:
            print("❌ Не найдено TXT файлов")
            return

        print(f"\n📊 СТАТИСТИКА TXT ФАЙЛОВ\n")
        print("="*60)

        total_files = len(files)
        total_emails = 0
        total_size_mb = 0

        # По категориям
        by_category = {}

        for file in files:
            # Размер
            size_mb = file.stat().st_size / (1024 * 1024)
            total_size_mb += size_mb

            # Количество email
            with open(file, 'r', encoding='utf-8') as f:
                count = sum(1 for line in f if line.strip())
                total_emails += count

            # Определяем категорию из имени
            # Формат: name_clean_YYYYMMDD_HHMMSS.txt или name_incremental_clean_...
            if '_incremental_clean_' in file.name:
                category = 'incremental'
            elif '_clean_' in file.name:
                category = 'regular'
            else:
                category = 'other'

            if category not in by_category:
                by_category[category] = {'files': 0, 'emails': 0, 'size_mb': 0}

            by_category[category]['files'] += 1
            by_category[category]['emails'] += count
            by_category[category]['size_mb'] += size_mb

        print(f"Всего TXT файлов: {total_files}")
        print(f"Всего email: {total_emails:,}")
        print(f"Общий размер: {total_size_mb:.2f} MB")
        print()

        print("По типам:")
        for category, stats in sorted(by_category.items()):
            print(f"  {category:15s}: {stats['files']:3d} файлов, "
                  f"{stats['emails']:>10,} email, {stats['size_mb']:>8.2f} MB")

        # Топ-10 самых больших файлов
        print("\n📈 Топ-10 самых больших файлов:")
        files_with_count = []
        for file in files:
            with open(file, 'r', encoding='utf-8') as f:
                count = sum(1 for line in f if line.strip())
                files_with_count.append((file, count))

        files_with_count.sort(key=lambda x: x[1], reverse=True)

        for file, count in files_with_count[:10]:
            print(f"  {file.name:60s} {count:>10,} email")

    def clean_old_versions(self, keep_latest: int = 3):
        """
        Удаляет старые версии файлов, оставляя только последние

        Args:
            keep_latest: Сколько последних версий оставить
        """
        files = self.find_clean_txt_files()

        # Группируем по базовому имени
        by_base_name = {}

        for file in files:
            parts = file.stem.split('_')

            base_parts = []
            for part in parts:
                if len(part) == 8 and part.isdigit():
                    break
                base_parts.append(part)

            base_name = '_'.join(base_parts)

            if base_name not in by_base_name:
                by_base_name[base_name] = []

            by_base_name[base_name].append(file)

        # Удаляем старые версии
        removed = 0
        for base_name, file_list in by_base_name.items():
            if len(file_list) <= keep_latest:
                continue

            # Сортируем по времени (новые первые)
            file_list.sort(key=lambda x: x.stat().st_mtime, reverse=True)

            # Удаляем старые
            for old_file in file_list[keep_latest:]:
                print(f"🗑️  Удаляю старую версию: {old_file.name}")
                old_file.unlink()
                removed += 1

        if removed > 0:
            print(f"\n✅ Удалено {removed} старых версий файлов")
        else:
            print("\n✓ Нечего удалять, все файлы актуальные")


def main():
    parser = argparse.ArgumentParser(
        description="Экспорт и управление TXT файлами с очищенными email"
    )

    parser.add_argument('command', choices=['export', 'stats', 'clean'],
                       help='Команда для выполнения')

    parser.add_argument('--output-dir', default='output',
                       help='Папка с TXT файлами (по умолчанию: output)')

    parser.add_argument('--export-dir', default='exports',
                       help='Папка для экспорта (по умолчанию: exports)')

    parser.add_argument('--rename', action='store_true',
                       help='Переименовать файлы (убрать timestamp)')

    parser.add_argument('--merge', action='store_true',
                       help='Объединить все файлы в один')

    parser.add_argument('--keep', type=int, default=3,
                       help='Сколько версий оставить при очистке (по умолчанию: 3)')

    args = parser.parse_args()

    exporter = TxtFileExporter(args.output_dir, args.export_dir)

    if args.command == 'export':
        exporter.export_files(rename=args.rename, merge=args.merge)

    elif args.command == 'stats':
        exporter.show_statistics()

    elif args.command == 'clean':
        exporter.clean_old_versions(keep_latest=args.keep)


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════╗
║   ЭКСПОРТ TXT ФАЙЛОВ                                    ║
║                                                          ║
║   Команды:                                               ║
║   • export  - экспорт файлов в папку exports/           ║
║   • stats   - статистика по TXT файлам                  ║
║   • clean   - удаление старых версий                    ║
║                                                          ║
║   Опции export:                                          ║
║   --rename  - переименовать (убрать timestamp)          ║
║   --merge   - объединить все в один файл                ║
╚══════════════════════════════════════════════════════════╝
    """)

    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
