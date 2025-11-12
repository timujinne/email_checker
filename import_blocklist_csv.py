#!/usr/bin/env python3
"""
CSV Blocklist Importer - Утилита для импорта email из CSV логов в блок-листы

Поддерживает:
- SMTP логи с запятыми (st_text,ts,sub,frm,email,tag,mid,link)
- Unsubscribe логи с точкой-с-запятой (Дата отписки;Email адреса;Причина)
- Фильтрация по статусам (Hard bounce, Blocked, Complaint, Unsubscribed, Invalid Email)
- Автоматическую дедупликацию
- Извлечение проблемных доменов
"""

import csv
import re
from pathlib import Path
from typing import Set, Dict, List, Tuple
from collections import defaultdict, Counter
from datetime import datetime


class BlocklistCSVImporter:
    """Импортер email из CSV логов в блок-листы"""

    # Статусы, которые должны быть добавлены в блок-лист
    CRITICAL_STATUSES = {
        'Hard bounce',      # Email не существует
        'Blocked',          # Заблокирован на сервере получателя
        'Complaint',        # Жалоба на спам
        'Unsubscribed',     # Отписался
        'Invalid Email',    # Невалидный формат
    }

    # Причины отписки, которые должны быть в блок-листе
    CRITICAL_UNSUBSCRIBE_REASONS = {
        'Отметил рассылку как спам',
        'Добавлен вручную',
    }

    # Опциональные статусы (можно включить/выключить)
    OPTIONAL_STATUSES = {
        'Отписался',  # GDPR compliance
    }

    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.blocklists_dir = self.base_dir / "blocklists"

        # Статистика
        self.stats = {
            'total_processed': 0,
            'emails_extracted': 0,
            'emails_added': 0,
            'domains_added': 0,
            'duplicates_skipped': 0,
            'by_status': defaultdict(int),
            'by_source': defaultdict(int),
        }

        # Накопленные данные
        self.collected_emails: Set[str] = set()
        self.emails_by_domain: Dict[str, Set[str]] = defaultdict(set)
        self.existing_blocked_emails: Set[str] = set()
        self.existing_blocked_domains: Set[str] = set()

    def load_existing_blocklists(self):
        """Загружает существующие блок-листы для проверки дубликатов"""
        print("🔄 Загрузка существующих блок-листов...")

        # Загрузка заблокированных email
        email_blocklist = self.blocklists_dir / "blocked_emails.txt"
        if email_blocklist.exists():
            with open(email_blocklist, 'r', encoding='utf-8') as f:
                for line in f:
                    email = line.strip().lower()
                    if email:
                        self.existing_blocked_emails.add(email)

        # Загрузка заблокированных доменов
        domain_blocklist = self.blocklists_dir / "blocked_domains.txt"
        if domain_blocklist.exists():
            with open(domain_blocklist, 'r', encoding='utf-8') as f:
                for line in f:
                    domain = line.strip().lower()
                    if domain:
                        self.existing_blocked_domains.add(domain)

        print(f"✓ Загружено {len(self.existing_blocked_emails)} заблокированных email")
        print(f"✓ Загружено {len(self.existing_blocked_domains)} заблокированных доменов\n")

    def normalize_email(self, email: str) -> str:
        """Нормализует email адрес (lowercase, убирает пробелы)"""
        if not email:
            return ""

        email = email.strip().lower()

        # Убираем префикс '//' если есть
        if email.startswith('//'):
            email = email[2:]

        # Убираем префикс '20' если есть
        if email.startswith('20') and '@' in email:
            email = email[2:]

        return email

    def is_valid_email(self, email: str) -> bool:
        """Проверяет валидность email формата"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def extract_domain(self, email: str) -> str:
        """Извлекает домен из email адреса"""
        try:
            return email.split('@', 1)[1]
        except (IndexError, AttributeError):
            return ""

    def detect_csv_delimiter(self, filepath: Path) -> str:
        """Автоматически определяет разделитель CSV (запятая или точка-с-запятой)"""
        with open(filepath, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            if ';' in first_line:
                return ';'
            return ','

    def parse_smtp_log_csv(self, filepath: Path, include_optional: bool = False) -> Set[str]:
        """
        Парсит SMTP лог файл (формат: st_text,ts,sub,frm,email,tag,mid,link)

        Args:
            filepath: Путь к CSV файлу
            include_optional: Включить опциональные статусы (например, "Отписался")

        Returns:
            Множество email адресов для блокировки
        """
        emails = set()
        delimiter = self.detect_csv_delimiter(filepath)

        print(f"📄 Обработка {filepath.name} (разделитель: '{delimiter}')")

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter=delimiter)

                for row_num, row in enumerate(reader, start=2):
                    self.stats['total_processed'] += 1

                    # Извлекаем статус и email
                    status = row.get('st_text', '').strip()
                    email_raw = row.get('email', '').strip()

                    if not status or not email_raw:
                        continue

                    # Проверяем, нужно ли добавлять этот статус
                    should_block = status in self.CRITICAL_STATUSES
                    if include_optional and status in self.OPTIONAL_STATUSES:
                        should_block = True

                    if not should_block:
                        continue

                    # Нормализуем и валидируем email
                    email = self.normalize_email(email_raw)
                    if not email or not self.is_valid_email(email):
                        continue

                    # Добавляем в коллекцию
                    emails.add(email)
                    self.stats['by_status'][status] += 1
                    self.stats['by_source'][filepath.name] += 1

                    # Группируем по доменам
                    domain = self.extract_domain(email)
                    if domain:
                        self.emails_by_domain[domain].add(email)

            print(f"  ✓ Извлечено {len(emails)} email для блокировки")

        except Exception as e:
            print(f"  ❌ Ошибка при обработке {filepath.name}: {e}")

        return emails

    def parse_unsubscribe_csv(self, filepath: Path, include_optional: bool = False) -> Set[str]:
        """
        Парсит файл отписок (формат: Дата отписки;Email адреса;Причина)

        Args:
            filepath: Путь к CSV файлу
            include_optional: Включить опциональные причины (например, "Отписался")

        Returns:
            Множество email адресов для блокировки
        """
        emails = set()
        delimiter = self.detect_csv_delimiter(filepath)

        print(f"📄 Обработка {filepath.name} (разделитель: '{delimiter}')")

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter=delimiter)

                for row_num, row in enumerate(reader, start=2):
                    self.stats['total_processed'] += 1

                    # Извлекаем причину и email
                    reason = row.get('Причина', '').strip()
                    email_raw = row.get('Email адреса', '').strip()

                    if not reason or not email_raw:
                        continue

                    # Проверяем, нужно ли добавлять эту причину
                    should_block = reason in self.CRITICAL_UNSUBSCRIBE_REASONS
                    if include_optional and reason in self.OPTIONAL_STATUSES:
                        should_block = True

                    if not should_block:
                        continue

                    # Нормализуем и валидируем email
                    email = self.normalize_email(email_raw)
                    if not email or not self.is_valid_email(email):
                        continue

                    # Добавляем в коллекцию
                    emails.add(email)
                    self.stats['by_status'][reason] += 1
                    self.stats['by_source'][filepath.name] += 1

                    # Группируем по доменам
                    domain = self.extract_domain(email)
                    if domain:
                        self.emails_by_domain[domain].add(email)

            print(f"  ✓ Извлечено {len(emails)} email для блокировки")

        except Exception as e:
            print(f"  ❌ Ошибка при обработке {filepath.name}: {e}")

        return emails

    def process_csv_file(self, filepath: Path, include_optional: bool = False) -> Set[str]:
        """
        Автоматически определяет тип CSV и обрабатывает его

        Args:
            filepath: Путь к CSV файлу
            include_optional: Включить опциональные статусы/причины

        Returns:
            Множество email адресов для блокировки
        """
        # Определяем тип файла по заголовку
        with open(filepath, 'r', encoding='utf-8') as f:
            header = f.readline().lower()

        if 'st_text' in header and 'email' in header:
            # SMTP лог
            return self.parse_smtp_log_csv(filepath, include_optional)
        elif 'email адреса' in header and 'причина' in header:
            # Unsubscribe лог
            return self.parse_unsubscribe_csv(filepath, include_optional)
        else:
            print(f"⚠️  Неизвестный формат файла: {filepath.name}")
            return set()

    def identify_problematic_domains(self, min_emails: int = 5) -> Set[str]:
        """
        Выявляет проблемные домены (с большим количеством заблокированных email)

        Args:
            min_emails: Минимальное количество заблокированных email для домена

        Returns:
            Множество доменов для добавления в блок-лист
        """
        problematic_domains = set()

        for domain, emails in self.emails_by_domain.items():
            if len(emails) >= min_emails:
                problematic_domains.add(domain)

        return problematic_domains

    def save_to_blocklists(self, dry_run: bool = False) -> Tuple[int, int]:
        """
        Сохраняет собранные email и домены в блок-листы

        Args:
            dry_run: Если True, только показывает что будет добавлено (без записи)

        Returns:
            Кортеж (добавлено email, добавлено доменов)
        """
        # Определяем новые email
        new_emails = self.collected_emails - self.existing_blocked_emails

        # Определяем проблемные домены
        problematic_domains = self.identify_problematic_domains(min_emails=5)
        new_domains = problematic_domains - self.existing_blocked_domains

        if dry_run:
            print("\n🔍 Режим предпросмотра (файлы не изменяются):")
            print(f"  • Будет добавлено email: {len(new_emails)}")
            print(f"  • Будет добавлено доменов: {len(new_domains)}")
            if new_domains:
                print(f"\n  Проблемные домены (≥5 заблокированных email):")
                for domain in sorted(new_domains)[:10]:
                    count = len(self.emails_by_domain[domain])
                    print(f"    - {domain} ({count} email)")
                if len(new_domains) > 10:
                    print(f"    ... и еще {len(new_domains) - 10} доменов")
            return (len(new_emails), len(new_domains))

        # Сохраняем email
        if new_emails:
            email_blocklist = self.blocklists_dir / "blocked_emails.txt"
            with open(email_blocklist, 'a', encoding='utf-8') as f:
                for email in sorted(new_emails):
                    f.write(f"{email}\n")
            print(f"✓ Добавлено {len(new_emails)} новых email в blocked_emails.txt")

        # Сохраняем домены
        if new_domains:
            domain_blocklist = self.blocklists_dir / "blocked_domains.txt"
            with open(domain_blocklist, 'a', encoding='utf-8') as f:
                for domain in sorted(new_domains):
                    f.write(f"{domain}\n")
            print(f"✓ Добавлено {len(new_domains)} новых доменов в blocked_domains.txt")

            # Показываем какие домены добавлены
            print("\n  Добавленные проблемные домены:")
            for domain in sorted(new_domains)[:10]:
                count = len(self.emails_by_domain[domain])
                print(f"    - {domain} ({count} заблокированных email)")
            if len(new_domains) > 10:
                print(f"    ... и еще {len(new_domains) - 10} доменов")

        self.stats['emails_added'] = len(new_emails)
        self.stats['domains_added'] = len(new_domains)
        self.stats['duplicates_skipped'] = len(self.collected_emails) - len(new_emails)

        return (len(new_emails), len(new_domains))

    def generate_report(self) -> str:
        """Генерирует детальный отчет об импорте"""
        report_lines = [
            "=" * 70,
            "📊 ОТЧЕТ ОБ ИМПОРТЕ В БЛОК-ЛИСТЫ",
            "=" * 70,
            "",
            f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Общая статистика:",
            f"  • Всего обработано записей: {self.stats['total_processed']:,}",
            f"  • Извлечено уникальных email: {len(self.collected_emails):,}",
            f"  • Добавлено новых email: {self.stats['emails_added']:,}",
            f"  • Добавлено новых доменов: {self.stats['domains_added']:,}",
            f"  • Пропущено дубликатов: {self.stats['duplicates_skipped']:,}",
            "",
            "Распределение по источникам:",
        ]

        for source, count in sorted(self.stats['by_source'].items()):
            report_lines.append(f"  • {source}: {count:,} email")

        report_lines.extend([
            "",
            "Распределение по статусам/причинам:",
        ])

        for status, count in sorted(self.stats['by_status'].items(), key=lambda x: -x[1]):
            report_lines.append(f"  • {status}: {count:,} email")

        # Топ проблемных доменов
        if self.emails_by_domain:
            report_lines.extend([
                "",
                "Топ-10 проблемных доменов:",
            ])

            sorted_domains = sorted(
                self.emails_by_domain.items(),
                key=lambda x: len(x[1]),
                reverse=True
            )[:10]

            for domain, emails in sorted_domains:
                report_lines.append(f"  • {domain}: {len(emails)} заблокированных email")

        report_lines.append("=" * 70)

        return "\n".join(report_lines)

    def import_csv_files(
        self,
        filepaths: List[Path],
        include_optional: bool = False,
        dry_run: bool = False
    ):
        """
        Главный метод для импорта CSV файлов

        Args:
            filepaths: Список путей к CSV файлам
            include_optional: Включить опциональные статусы (например, "Отписался")
            dry_run: Если True, только показывает что будет добавлено
        """
        print("🚀 Импорт CSV файлов в блок-листы")
        print(f"Файлов для обработки: {len(filepaths)}\n")

        # Загружаем существующие блок-листы
        self.load_existing_blocklists()

        # Обрабатываем каждый файл
        for filepath in filepaths:
            if not filepath.exists():
                print(f"⚠️  Файл не найден: {filepath}")
                continue

            emails = self.process_csv_file(filepath, include_optional)
            self.collected_emails.update(emails)

        print(f"\n✅ Всего собрано уникальных email: {len(self.collected_emails):,}")

        # Сохраняем в блок-листы
        print()
        added_emails, added_domains = self.save_to_blocklists(dry_run)

        # Генерируем отчет
        print()
        report = self.generate_report()
        print(report)

        # Сохраняем отчет в файл
        if not dry_run:
            report_file = self.base_dir / "output" / f"blocklist_import_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            report_file.parent.mkdir(exist_ok=True)
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\n💾 Отчет сохранен: {report_file}")


def main():
    """CLI интерфейс"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Импорт email из CSV логов в блок-листы',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  # Импорт одного файла (режим предпросмотра)
  python3 import_blocklist_csv.py blocklists/logs-7116644-1761286616244.csv --dry-run

  # Импорт нескольких файлов
  python3 import_blocklist_csv.py blocklists/*.csv

  # Импорт с включением опциональных статусов (например, "Отписался")
  python3 import_blocklist_csv.py blocklists/*.csv --include-optional

Поддерживаемые статусы:
  - Hard bounce (email не существует)
  - Blocked (заблокирован на сервере)
  - Complaint (жалоба на спам)
  - Unsubscribed (отписался)
  - Invalid Email (невалидный формат)
  - Отметил рассылку как спам
        """
    )

    parser.add_argument(
        'files',
        nargs='+',
        help='CSV файлы для импорта'
    )

    parser.add_argument(
        '--include-optional',
        action='store_true',
        help='Включить опциональные статусы (например, "Отписался")'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Режим предпросмотра (не изменяет файлы)'
    )

    parser.add_argument(
        '--base-dir',
        default='.',
        help='Базовая директория проекта (по умолчанию: текущая)'
    )

    args = parser.parse_args()

    # Преобразуем пути в Path объекты
    filepaths = [Path(f) for f in args.files]

    # Создаем импортер и запускаем
    importer = BlocklistCSVImporter(args.base_dir)
    importer.import_csv_files(
        filepaths,
        include_optional=args.include_optional,
        dry_run=args.dry_run
    )


if __name__ == '__main__':
    main()
