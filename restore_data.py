#!/usr/bin/env python
"""
Скрипт для пошагового восстановления данных Email Checker

Этот скрипт выполняет полный цикл восстановления:
1. Импорт всех LVP файлов в metadata.db
2. Обработка LVP файлов с сохранением метаданных
3. Обработка TXT файлов с обогащением из metadata.db
4. Генерация единого HTML отчета

Использование:
    python restore_data.py --help
    python restore_data.py --step1  # Только импорт LVP
    python restore_data.py --step2  # Только обработка LVP
    python restore_data.py --step3  # Только обработка TXT
    python restore_data.py --all    # Все шаги
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
import time

class DataRestorer:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.input_dir = self.base_dir / "input"
        self.output_dir = self.base_dir / "output"
        self.metadata_db = self.base_dir / "metadata.db"

    def print_header(self, title):
        """Красивый заголовок"""
        print("\n" + "=" * 70)
        print(f"  {title}")
        print("=" * 70 + "\n")

    def print_step(self, step_num, total_steps, title):
        """Заголовок шага"""
        print(f"\n{'─' * 70}")
        print(f"📋 ШАГ {step_num}/{total_steps}: {title}")
        print(f"{'─' * 70}\n")

    def check_prerequisites(self):
        """Проверка наличия необходимых файлов и директорий"""
        print("🔍 Проверка системы...")

        if not self.input_dir.exists():
            print("❌ Директория input/ не найдена!")
            return False

        if not self.output_dir.exists():
            self.output_dir.mkdir(parents=True)
            print("✓ Создана директория output/")

        # Проверяем наличие Python скриптов
        required_scripts = [
            'email_checker.py',
            'lvp_importer.py'
        ]

        for script in required_scripts:
            if not (self.base_dir / script).exists():
                print(f"❌ Не найден скрипт {script}")
                return False

        print("✅ Все необходимые компоненты на месте\n")
        return True

    def scan_input_files(self):
        """Сканирование input/ для определения файлов"""
        print("📂 Сканирование input/...")

        lvp_files = list(self.input_dir.glob("*.lvp"))
        txt_files = list(self.input_dir.glob("*.txt"))

        print(f"  Найдено LVP файлов: {len(lvp_files)}")
        print(f"  Найдено TXT файлов: {len(txt_files)}")

        if lvp_files:
            print("\n  LVP файлы:")
            for f in lvp_files[:10]:  # Показываем первые 10
                size = f.stat().st_size / (1024 * 1024)
                print(f"    • {f.name} ({size:.1f} MB)")
            if len(lvp_files) > 10:
                print(f"    ... и еще {len(lvp_files) - 10}")

        if txt_files:
            print("\n  TXT файлы:")
            for f in txt_files[:10]:
                size = f.stat().st_size / (1024 * 1024)
                print(f"    • {f.name} ({size:.1f} MB)")
            if len(txt_files) > 10:
                print(f"    ... и еще {len(txt_files) - 10}")

        print()
        return lvp_files, txt_files

    def step1_import_lvp(self, lvp_files):
        """Шаг 1: Импорт LVP файлов в metadata.db"""
        self.print_step(1, 4, "Импорт LVP файлов в metadata.db")

        if not lvp_files:
            print("ℹ️  Нет LVP файлов для импорта, пропуск...\n")
            return True

        print(f"📥 Начинаем импорт {len(lvp_files)} LVP файлов...")
        print("⏱️  Это может занять несколько минут в зависимости от размера файлов\n")

        start_time = time.time()

        for i, lvp_file in enumerate(lvp_files, 1):
            print(f"[{i}/{len(lvp_files)}] Импорт {lvp_file.name}...")

            # Запускаем lvp_importer.py
            result = subprocess.run(
                [sys.executable, "lvp_importer.py", str(lvp_file)],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                print(f"  ⚠️  Предупреждение: {lvp_file.name} - {result.stderr[:100]}")
            else:
                print(f"  ✓ Импортирован")

        elapsed = time.time() - start_time
        print(f"\n✅ Импорт завершен за {elapsed:.1f} секунд")

        # Проверяем размер БД
        if self.metadata_db.exists():
            size_mb = self.metadata_db.stat().st_size / (1024 * 1024)
            print(f"📊 Размер metadata.db: {size_mb:.1f} MB\n")

        return True

    def step2_process_lvp(self):
        """Шаг 2: Обработка LVP файлов через check-lvp-batch"""
        self.print_step(2, 4, "Обработка LVP файлов с метаданными")

        print("🔄 Запуск обработки LVP файлов...")
        print("   Команда: python email_checker.py check-lvp-batch --exclude-duplicates --generate-html\n")

        start_time = time.time()

        result = subprocess.run(
            [sys.executable, "email_checker.py", "check-lvp-batch",
             "--exclude-duplicates", "--generate-html"],
            capture_output=False,  # Показываем вывод в реальном времени
            text=True
        )

        elapsed = time.time() - start_time

        if result.returncode != 0:
            print(f"\n⚠️  Обработка завершена с ошибками (код: {result.returncode})")
            return False

        print(f"\n✅ Обработка LVP завершена за {elapsed:.1f} секунд\n")
        return True

    def step3_process_txt(self):
        """Шаг 3: Обработка TXT файлов с обогащением"""
        self.print_step(3, 4, "Обработка TXT файлов с обогащением")

        print("🔄 Запуск обработки TXT файлов с обогащением метаданными...")
        print("   Команда: python email_checker.py incremental --exclude-duplicates --generate-html\n")

        start_time = time.time()

        result = subprocess.run(
            [sys.executable, "email_checker.py", "incremental",
             "--exclude-duplicates", "--generate-html"],
            capture_output=False,
            text=True
        )

        elapsed = time.time() - start_time

        if result.returncode != 0:
            print(f"\n⚠️  Обработка завершена с ошибками (код: {result.returncode})")
            return False

        print(f"\n✅ Обработка TXT завершена за {elapsed:.1f} секунд\n")
        return True

    def step4_unified_processing(self):
        """Шаг 4: Единая обработка всех файлов (альтернативный подход)"""
        self.print_step(4, 4, "Единая обработка всех файлов (TXT + LVP)")

        print("🔄 Запуск единой обработки всех файлов...")
        print("   Команда: python email_checker.py check-all-incremental --exclude-duplicates --generate-html\n")

        start_time = time.time()

        result = subprocess.run(
            [sys.executable, "email_checker.py", "check-all-incremental",
             "--exclude-duplicates", "--generate-html"],
            capture_output=False,
            text=True
        )

        elapsed = time.time() - start_time

        if result.returncode != 0:
            print(f"\n⚠️  Обработка завершена с ошибками (код: {result.returncode})")
            return False

        print(f"\n✅ Единая обработка завершена за {elapsed:.1f} секунд\n")
        return True

    def show_results_summary(self):
        """Показать итоговую статистику"""
        self.print_header("ИТОГОВАЯ СТАТИСТИКА")

        # Подсчитываем файлы в output/
        if self.output_dir.exists():
            clean_files = list(self.output_dir.glob("*_clean_*.txt"))
            metadata_json = list(self.output_dir.glob("*_metadata_*.json"))
            metadata_csv = list(self.output_dir.glob("*_metadata_*.csv"))
            reports = list(self.output_dir.glob("*_report_*.html"))

            print(f"📁 Результаты в output/:")
            print(f"   • Clean TXT файлов: {len(clean_files)}")
            print(f"   • Metadata JSON файлов: {len(metadata_json)}")
            print(f"   • Metadata CSV файлов: {len(metadata_csv)}")
            print(f"   • HTML отчетов: {len(reports)}")

            # Размер output/
            total_size = sum(f.stat().st_size for f in self.output_dir.glob("*") if f.is_file())
            print(f"\n📊 Общий размер output/: {total_size / (1024 * 1024):.1f} MB")

        # Размер БД
        if self.metadata_db.exists():
            db_size = self.metadata_db.stat().st_size / (1024 * 1024)
            print(f"📊 Размер metadata.db: {db_size:.1f} MB")

        # Показываем последний отчет
        if reports:
            latest_report = max(reports, key=lambda f: f.stat().st_mtime)
            print(f"\n📄 Последний HTML отчет:")
            print(f"   {latest_report.name}")
            print(f"\n   Откройте его в браузере для просмотра результатов")

        print()

    def full_restore(self, unified=False):
        """Полное восстановление данных"""
        self.print_header("ПОЛНОЕ ВОССТАНОВЛЕНИЕ ДАННЫХ EMAIL CHECKER")

        if not self.check_prerequisites():
            print("❌ Проверка не пройдена, восстановление невозможно")
            return False

        lvp_files, txt_files = self.scan_input_files()

        if not lvp_files and not txt_files:
            print("❌ Нет файлов для обработки в input/")
            return False

        print(f"📋 План восстановления:")
        if unified:
            print("   Режим: Единая обработка всех файлов")
            print("   1. Импорт LVP в metadata.db")
            print("   2. Единая обработка всех файлов (TXT + LVP)")
        else:
            print("   Режим: Раздельная обработка")
            print("   1. Импорт LVP в metadata.db")
            print("   2. Обработка LVP файлов")
            print("   3. Обработка TXT файлов с обогащением")

        response = input("\nНачать восстановление? (yes/no): ")
        if response.lower() not in ['yes', 'y', 'да']:
            print("❌ Восстановление отменено")
            return False

        total_start = time.time()

        # Шаг 1: Импорт LVP
        if not self.step1_import_lvp(lvp_files):
            return False

        if unified:
            # Единая обработка
            if not self.step4_unified_processing():
                return False
        else:
            # Раздельная обработка
            if lvp_files:
                if not self.step2_process_lvp():
                    return False

            if txt_files:
                if not self.step3_process_txt():
                    return False

        total_elapsed = time.time() - total_start

        self.print_header("ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО")
        print(f"⏱️  Общее время: {total_elapsed / 60:.1f} минут\n")

        self.show_results_summary()

        return True


def main():
    parser = argparse.ArgumentParser(
        description="Пошаговое восстановление данных Email Checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  # Полное восстановление (раздельная обработка)
  python restore_data.py --all

  # Полное восстановление (единая обработка)
  python restore_data.py --all --unified

  # Только импорт LVP
  python restore_data.py --step1

  # Только обработка LVP
  python restore_data.py --step2

  # Только обработка TXT
  python restore_data.py --step3
        """
    )

    parser.add_argument('--all', action='store_true',
                        help='Выполнить полное восстановление')
    parser.add_argument('--unified', action='store_true',
                        help='Использовать единую обработку (check-all-incremental)')
    parser.add_argument('--step1', action='store_true',
                        help='Только Шаг 1: Импорт LVP в metadata.db')
    parser.add_argument('--step2', action='store_true',
                        help='Только Шаг 2: Обработка LVP файлов')
    parser.add_argument('--step3', action='store_true',
                        help='Только Шаг 3: Обработка TXT файлов')
    parser.add_argument('--step4', action='store_true',
                        help='Только Шаг 4: Единая обработка всех файлов')

    args = parser.parse_args()

    if not any([args.all, args.step1, args.step2, args.step3, args.step4]):
        parser.print_help()
        return

    restorer = DataRestorer()

    if args.all:
        restorer.full_restore(unified=args.unified)
    else:
        if not restorer.check_prerequisites():
            print("❌ Проверка не пройдена")
            return

        lvp_files, txt_files = restorer.scan_input_files()

        if args.step1:
            restorer.step1_import_lvp(lvp_files)

        if args.step2:
            restorer.step2_process_lvp()

        if args.step3:
            restorer.step3_process_txt()

        if args.step4:
            restorer.step4_unified_processing()


if __name__ == "__main__":
    main()
