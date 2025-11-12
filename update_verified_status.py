#!/usr/bin/env python3
"""
Утилита для обновления validation_status в базе данных
для списков с пометкой "полностью проверен"

Обновляет только поле validation_status, сохраняя все остальные метаданные без изменений.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime
from collections import Counter

from email_metadata import LVPParser, EmailWithMetadata
from metadata_database import MetadataDatabase


class VerifiedStatusUpdater:
    """Класс для обновления validation_status из LVP файлов"""

    def __init__(self, db_path: str = "metadata.db", dry_run: bool = False):
        self.db = MetadataDatabase(db_path)
        self.parser = LVPParser()
        self.dry_run = dry_run

        # Статистика
        self.stats = {
            'files_processed': 0,
            'emails_found': 0,
            'emails_updated': 0,
            'emails_not_in_db': 0,
            'emails_already_correct': 0,
            'status_changes': Counter(),
            'errors': 0
        }

    def find_verified_lists(self, input_dir: str = "input") -> List[Path]:
        """
        Находит все LVP файлы с пометкой "полностью проверен"

        Returns:
            Список путей к найденным файлам
        """
        input_path = Path(input_dir)
        if not input_path.exists():
            print(f"❌ Директория {input_dir} не найдена")
            return []

        # Паттерны для поиска
        patterns = [
            "*полностью проверен*.lvp",
            "*полностью_проверен*.lvp",
            "*полностью*проверен*.lvp"
        ]

        found_files = []
        for pattern in patterns:
            found_files.extend(input_path.glob(pattern))

        # Убираем дубликаты (если есть)
        found_files = list(set(found_files))
        found_files.sort()

        return found_files

    def update_validation_status(self, email: str, new_status: str) -> Tuple[bool, str]:
        """
        Обновляет validation_status для одного email

        Args:
            email: Email адрес
            new_status: Новый статус (Valid, NotSure, Invalid, etc.)

        Returns:
            Tuple (успешность, старый_статус или "NOT_IN_DB")
        """
        if self.dry_run:
            # В режиме dry-run только проверяем, есть ли email в БД
            existing = self.db.get_email_metadata(email)
            if existing:
                return (True, existing.validation_status or "None")
            else:
                return (False, "NOT_IN_DB")

        try:
            cursor = self.db.conn.cursor()

            # Получаем текущий статус
            cursor.execute(
                'SELECT validation_status FROM email_metadata WHERE email = ?',
                (email.lower(),)
            )
            row = cursor.fetchone()

            if not row:
                return (False, "NOT_IN_DB")

            old_status = row[0] or "None"

            # Если статус уже правильный, пропускаем
            if old_status == new_status:
                self.stats['emails_already_correct'] += 1
                return (True, old_status)

            # Обновляем только validation_status и updated_at
            cursor.execute('''
                UPDATE email_metadata
                SET validation_status = ?,
                    updated_at = ?
                WHERE email = ?
            ''', (new_status, datetime.now().isoformat(), email.lower()))

            self.db.conn.commit()

            # Записываем изменение статуса
            self.stats['status_changes'][f"{old_status} → {new_status}"] += 1

            return (True, old_status)

        except Exception as e:
            print(f"❌ Ошибка обновления {email}: {e}")
            self.stats['errors'] += 1
            return (False, "ERROR")

    def process_lvp_file(self, filepath: Path) -> Dict:
        """
        Обрабатывает один LVP файл

        Returns:
            Словарь со статистикой обработки
        """
        print(f"\n{'='*80}")
        print(f"📄 Обработка файла: {filepath.name}")
        print(f"{'='*80}")

        file_stats = {
            'filename': filepath.name,
            'emails_found': 0,
            'emails_updated': 0,
            'emails_not_in_db': 0,
            'emails_already_correct': 0,
            'status_distribution': Counter(),
            'errors': 0
        }

        try:
            # Парсим LVP файл
            print(f"🔍 Парсинг LVP файла...")
            emails_with_metadata = self.parser.parse_file(str(filepath))
            file_stats['emails_found'] = len(emails_with_metadata)

            print(f"✅ Найдено {file_stats['emails_found']} email адресов")

            if self.dry_run:
                print(f"\n⚠️  РЕЖИМ DRY-RUN: Изменения НЕ будут применены к базе данных")

            # Обрабатываем каждый email
            print(f"\n📊 Обновление статусов...")

            for i, email_data in enumerate(emails_with_metadata, 1):
                email = email_data.email.lower()
                new_status = email_data.validation_status or "NotChecked"

                # Подсчитываем распределение статусов в файле
                file_stats['status_distribution'][new_status] += 1

                # Обновляем статус
                success, old_status = self.update_validation_status(email, new_status)

                if success:
                    if old_status != "NOT_IN_DB":
                        file_stats['emails_updated'] += 1
                        self.stats['emails_updated'] += 1
                else:
                    if old_status == "NOT_IN_DB":
                        file_stats['emails_not_in_db'] += 1
                        self.stats['emails_not_in_db'] += 1
                    else:
                        file_stats['errors'] += 1

                # Прогресс каждые 1000 emails
                if i % 1000 == 0:
                    print(f"  ⏳ Обработано {i}/{file_stats['emails_found']} emails...")

            print(f"\n✅ Файл обработан!")
            print(f"  📧 Найдено emails: {file_stats['emails_found']}")
            print(f"  ✏️  Обновлено: {file_stats['emails_updated']}")
            print(f"  ⚠️  Не найдено в БД: {file_stats['emails_not_in_db']}")
            print(f"  ✓  Уже правильный статус: {file_stats['emails_already_correct']}")

            if file_stats['status_distribution']:
                print(f"\n  📊 Распределение статусов в файле:")
                for status, count in file_stats['status_distribution'].most_common():
                    percentage = (count / file_stats['emails_found']) * 100
                    print(f"    • {status}: {count} ({percentage:.1f}%)")

            self.stats['files_processed'] += 1
            self.stats['emails_found'] += file_stats['emails_found']

            return file_stats

        except Exception as e:
            print(f"❌ Ошибка обработки файла {filepath.name}: {e}")
            import traceback
            traceback.print_exc()
            file_stats['errors'] += 1
            self.stats['errors'] += 1
            return file_stats

    def process_all_verified_lists(self, input_dir: str = "input") -> None:
        """
        Находит и обрабатывает все списки "полностью проверен"
        """
        print(f"{'='*80}")
        print(f"🔍 Поиск LVP файлов с пометкой 'полностью проверен' в {input_dir}/")
        print(f"{'='*80}")

        verified_files = self.find_verified_lists(input_dir)

        if not verified_files:
            print(f"❌ Не найдено файлов с пометкой 'полностью проверен'")
            return

        print(f"\n✅ Найдено {len(verified_files)} файлов:")
        for i, filepath in enumerate(verified_files, 1):
            print(f"  {i}. {filepath.name}")

        # Обрабатываем каждый файл
        print(f"\n{'='*80}")
        print(f"🚀 Начало обработки...")
        print(f"{'='*80}")

        file_results = []
        for filepath in verified_files:
            file_stats = self.process_lvp_file(filepath)
            file_results.append(file_stats)

        # Итоговая статистика
        self.print_summary(file_results)

    def print_summary(self, file_results: List[Dict]) -> None:
        """Выводит итоговую статистику"""
        print(f"\n{'='*80}")
        print(f"📊 ИТОГОВАЯ СТАТИСТИКА")
        print(f"{'='*80}")

        print(f"\n📁 Обработано файлов: {self.stats['files_processed']}")
        print(f"📧 Всего найдено emails: {self.stats['emails_found']}")

        if self.dry_run:
            print(f"\n⚠️  РЕЖИМ DRY-RUN: Изменения НЕ были применены!")
            print(f"📝 Emails, которые БУДУТ обновлены: {self.stats['emails_updated']}")
        else:
            print(f"\n✅ Обновлено emails: {self.stats['emails_updated']}")

        print(f"✓  Emails с правильным статусом: {self.stats['emails_already_correct']}")
        print(f"⚠️  Emails не найдено в БД: {self.stats['emails_not_in_db']}")

        if self.stats['errors'] > 0:
            print(f"❌ Ошибок: {self.stats['errors']}")

        # Изменения статусов
        if self.stats['status_changes']:
            print(f"\n📈 Изменения статусов:")
            for change, count in self.stats['status_changes'].most_common():
                print(f"  • {change}: {count}")

        # Таблица по файлам
        if file_results:
            print(f"\n📄 Детали по файлам:")
            print(f"{'─'*80}")
            for result in file_results:
                print(f"  {result['filename']}")
                print(f"    Найдено: {result['emails_found']}, "
                      f"Обновлено: {result['emails_updated']}, "
                      f"Не в БД: {result['emails_not_in_db']}")

        print(f"\n{'='*80}")
        if self.dry_run:
            print(f"✅ DRY-RUN завершен! Для реального обновления запустите без --dry-run")
        else:
            print(f"✅ Обновление завершено успешно!")
        print(f"{'='*80}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Обновление validation_status для списков "полностью проверен"',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  # Dry-run (проверка без изменений)
  python update_verified_status.py --dry-run

  # Реальное обновление
  python update_verified_status.py

  # Указать путь к базе данных
  python update_verified_status.py --db-path /path/to/metadata.db

  # Указать директорию с входными файлами
  python update_verified_status.py --input-dir ./input
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Режим проверки без применения изменений'
    )

    parser.add_argument(
        '--db-path',
        type=str,
        default='metadata.db',
        help='Путь к базе данных (по умолчанию: metadata.db)'
    )

    parser.add_argument(
        '--input-dir',
        type=str,
        default='input',
        help='Директория с LVP файлами (по умолчанию: input/)'
    )

    args = parser.parse_args()

    # Проверяем существование базы данных
    if not os.path.exists(args.db_path):
        print(f"❌ База данных не найдена: {args.db_path}")
        sys.exit(1)

    # Создаем updater и запускаем обработку
    updater = VerifiedStatusUpdater(db_path=args.db_path, dry_run=args.dry_run)
    updater.process_all_verified_lists(input_dir=args.input_dir)


if __name__ == '__main__':
    main()
