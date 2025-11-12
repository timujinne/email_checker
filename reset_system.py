#!/usr/bin/env python
"""
Скрипт для сброса и очистки системы Email Checker

Использование:
    python reset_system.py --help
    python reset_system.py --clean-cache
    python reset_system.py --clean-config
    python reset_system.py --clean-output
    python reset_system.py --clean-metadata-db
    python reset_system.py --full-reset --backup
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path
from datetime import datetime

class SystemResetter:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.cache_dir = self.base_dir / ".cache"
        self.cache_file = self.cache_dir / "processed_files.json"
        self.config_file = self.base_dir / "lists_config.json"
        self.metadata_db = self.base_dir / "metadata.db"
        self.output_dir = self.base_dir / "output"
        self.input_dir = self.base_dir / "input"
        self.backup_dir = self.base_dir / "backups"

    def create_backup(self):
        """Создает резервную копию важных файлов"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"backup_{timestamp}"
        backup_path.mkdir(parents=True, exist_ok=True)

        print(f"📦 Создание резервной копии в {backup_path}...")

        # Бэкап кеша
        if self.cache_file.exists():
            shutil.copy2(self.cache_file, backup_path / "processed_files.json")
            print(f"  ✓ Скопирован кеш ({self._format_size(self.cache_file.stat().st_size)})")

        # Бэкап конфигурации
        if self.config_file.exists():
            shutil.copy2(self.config_file, backup_path / "lists_config.json")
            print(f"  ✓ Скопирован конфиг ({self._format_size(self.config_file.stat().st_size)})")

        # Бэкап БД метаданных
        if self.metadata_db.exists():
            print(f"  ⏳ Копирование БД метаданных (это может занять время)...")
            shutil.copy2(self.metadata_db, backup_path / "metadata.db")
            print(f"  ✓ Скопирована БД ({self._format_size(self.metadata_db.stat().st_size)})")

        # Создаем info файл
        info = {
            "created": timestamp,
            "files_backed_up": {
                "cache": self.cache_file.exists(),
                "config": self.config_file.exists(),
                "metadata_db": self.metadata_db.exists()
            }
        }
        with open(backup_path / "backup_info.json", 'w', encoding='utf-8') as f:
            json.dump(info, f, indent=2)

        print(f"✅ Резервная копия создана: {backup_path}\n")
        return backup_path

    def clean_cache(self):
        """Очищает кеш обработки"""
        if not self.cache_file.exists():
            print("ℹ️  Кеш не найден, пропуск...")
            return

        size = self.cache_file.stat().st_size
        self.cache_file.unlink()
        print(f"🗑️  Удален кеш обработки ({self._format_size(size)})")

    def clean_config(self):
        """Пересоздает конфигурацию из текущих файлов в input/"""
        print("🔄 Пересоздание конфигурации списков...")

        # Получаем все файлы из input/
        if not self.input_dir.exists():
            print("⚠️  Директория input/ не найдена!")
            return

        input_files = list(self.input_dir.glob("*"))
        input_files = [f for f in input_files if f.is_file()]

        if not input_files:
            print("ℹ️  В input/ нет файлов")
            new_config = {"lists": []}
        else:
            new_config = {"lists": []}

            for file in input_files:
                file_ext = file.suffix.lower()
                if file_ext not in ['.txt', '.lvp']:
                    continue

                # Автоопределение метаданных
                metadata = self._detect_metadata(file.name)

                list_entry = {
                    "filename": file.name,
                    "display_name": file.stem.title(),
                    "file_type": file_ext[1:],  # без точки
                    "country": metadata.get("country", "Unknown"),
                    "category": metadata.get("category", "General"),
                    "priority": 50,
                    "processed": False,
                    "date_added": datetime.now().strftime("%Y-%m-%d"),
                    "description": f"Auto-detected: {file.name}"
                }

                new_config["lists"].append(list_entry)

            print(f"  ✓ Найдено файлов: {len(new_config['lists'])}")

        # Сохраняем новую конфигурацию
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, ensure_ascii=False, indent=2)

        print(f"✅ Конфигурация пересоздана: {len(new_config['lists'])} списков")

    def clean_output(self):
        """Удаляет все файлы из output/"""
        if not self.output_dir.exists():
            print("ℹ️  Директория output/ не найдена, пропуск...")
            return

        files = list(self.output_dir.glob("*"))
        files = [f for f in files if f.is_file()]

        if not files:
            print("ℹ️  Директория output/ уже пуста")
            return

        total_size = sum(f.stat().st_size for f in files)
        print(f"🗑️  Удаление {len(files)} файлов из output/ ({self._format_size(total_size)})...")

        for file in files:
            file.unlink()

        print(f"✅ Удалено файлов: {len(files)}")

    def clean_metadata_db(self):
        """Удаляет или пересоздает БД метаданных"""
        if not self.metadata_db.exists():
            print("ℹ️  БД метаданных не найдена, пропуск...")
            return

        size = self.metadata_db.stat().st_size
        print(f"🗑️  Удаление БД метаданных ({self._format_size(size)})...")

        self.metadata_db.unlink()
        print(f"✅ БД метаданных удалена")

    def full_reset(self, backup=True):
        """Полный сброс системы"""
        print("=" * 60)
        print("🔴 ПОЛНЫЙ СБРОС СИСТЕМЫ EMAIL CHECKER")
        print("=" * 60)

        if backup:
            self.create_backup()

        print("\n🧹 Начинаем очистку...")
        print("-" * 60)

        self.clean_cache()
        self.clean_config()
        self.clean_output()
        self.clean_metadata_db()

        print("\n" + "=" * 60)
        print("✅ ПОЛНЫЙ СБРОС ЗАВЕРШЕН")
        print("=" * 60)
        print("\nСледующие шаги:")
        print("1. Запустите restore_data.py для восстановления данных")
        print("2. Или запустите python email_checker.py check-all-incremental")

    def _detect_metadata(self, filename: str) -> dict:
        """Автоопределение метаданных из имени файла"""
        filename_lower = filename.lower()

        # Определение страны
        country_map = {
            'germany': 'Germany', 'германия': 'Germany', 'de': 'Germany',
            'austria': 'Austria', 'австрия': 'Austria', 'at': 'Austria',
            'poland': 'Poland', 'польша': 'Poland', 'pl': 'Poland',
            'belgium': 'Belgium', 'бельгия': 'Belgium', 'be': 'Belgium',
            'finland': 'Finland', 'финляндия': 'Finland', 'fi': 'Finland',
            'bulgaria': 'Bulgaria', 'болгария': 'Bulgaria', 'bg': 'Bulgaria',
            'romania': 'Romania', 'румыния': 'Romania', 'ro': 'Romania',
            'serbia': 'Serbia', 'сербия': 'Serbia', 'rs': 'Serbia',
            'slovakia': 'Slovakia', 'словакия': 'Slovakia', 'sk': 'Slovakia',
            'slovenia': 'Slovenia', 'словения': 'Slovenia', 'si': 'Slovenia',
            'switzerland': 'Switzerland', 'швейцария': 'Switzerland', 'ch': 'Switzerland',
            'norway': 'Norway', 'норвегия': 'Norway', 'no': 'Norway',
            'russia': 'Russia', 'рф': 'Russia', 'ru': 'Russia'
        }

        # Определение категории
        category_map = {
            'motor': 'Automotive', 'мотор': 'Automotive',
            'hydro': 'Automotive', 'гидро': 'Automotive',
            'agro': 'Agriculture', 'агро': 'Agriculture',
            'forest': 'Forestry', 'лесо': 'Forestry',
            'строительн': 'Construction', 'construction': 'Construction',
            'землеройн': 'Manufacturing', 'excavat': 'Manufacturing',
            'metal': 'Manufacturing', 'металло': 'Manufacturing'
        }

        country = "Unknown"
        for key, value in country_map.items():
            if key in filename_lower:
                country = value
                break

        category = "General"
        for key, value in category_map.items():
            if key in filename_lower:
                category = value
                break

        return {"country": country, "category": category}

    def _format_size(self, bytes: int) -> str:
        """Форматирование размера файла"""
        if bytes < 1024:
            return f"{bytes} B"
        elif bytes < 1024 * 1024:
            return f"{bytes / 1024:.1f} KB"
        else:
            return f"{bytes / (1024 * 1024):.1f} MB"


def main():
    parser = argparse.ArgumentParser(
        description="Сброс и очистка системы Email Checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  # Очистить только кеш
  python reset_system.py --clean-cache

  # Пересоздать конфигурацию
  python reset_system.py --clean-config

  # Полный сброс с резервной копией
  python reset_system.py --full-reset --backup

  # Полный сброс без резервной копии (ОПАСНО!)
  python reset_system.py --full-reset --no-backup
        """
    )

    parser.add_argument('--clean-cache', action='store_true',
                        help='Очистить кеш обработки')
    parser.add_argument('--clean-config', action='store_true',
                        help='Пересоздать конфигурацию списков')
    parser.add_argument('--clean-output', action='store_true',
                        help='Удалить все файлы из output/')
    parser.add_argument('--clean-metadata-db', action='store_true',
                        help='Удалить БД метаданных')
    parser.add_argument('--full-reset', action='store_true',
                        help='Полный сброс всей системы')
    parser.add_argument('--backup', action='store_true', default=True,
                        help='Создать резервную копию (по умолчанию включено)')
    parser.add_argument('--no-backup', action='store_true',
                        help='НЕ создавать резервную копию')

    args = parser.parse_args()

    # Если не указаны флаги, показываем help
    if not any([args.clean_cache, args.clean_config, args.clean_output,
                args.clean_metadata_db, args.full_reset]):
        parser.print_help()
        return

    resetter = SystemResetter()

    # Подтверждение для опасных операций
    if args.full_reset or args.clean_metadata_db or args.clean_output:
        print("⚠️  ВНИМАНИЕ: Эта операция удалит данные!")
        if args.no_backup:
            print("⚠️  БЕЗ РЕЗЕРВНОЙ КОПИИ!")

        response = input("\nПродолжить? (yes/no): ")
        if response.lower() not in ['yes', 'y', 'да']:
            print("❌ Операция отменена")
            return

    backup = args.backup and not args.no_backup

    if args.full_reset:
        resetter.full_reset(backup=backup)
    else:
        if backup and any([args.clean_cache, args.clean_config,
                           args.clean_output, args.clean_metadata_db]):
            resetter.create_backup()

        if args.clean_cache:
            resetter.clean_cache()

        if args.clean_config:
            resetter.clean_config()

        if args.clean_output:
            resetter.clean_output()

        if args.clean_metadata_db:
            resetter.clean_metadata_db()

        print("\n✅ Операция завершена")


if __name__ == "__main__":
    main()
