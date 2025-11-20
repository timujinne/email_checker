#!/usr/bin/env python3
"""
Обработка невалидных DNS доменов

1. Обновляет metadata.db - помечает email'ы с invalid DNS как невалидные
2. Добавляет домены в blocklists/blocked_domains.txt
3. Создает отчет о внесенных изменениях

Использование:
    python process_invalid_domains.py output/domain_validation/INVALID_DNS_20251117_125531.txt
    python process_invalid_domains.py output/domain_validation/INVALID_DNS_20251117_125531.txt --dry-run
"""

import sqlite3
from pathlib import Path
from typing import Set, Dict, List
from datetime import datetime
import argparse


def load_invalid_domains(file_path: str) -> Dict[str, str]:
    """
    Загружает список невалидных доменов с причиной невалидности

    Args:
        file_path: Путь к файлу INVALID_DNS_*.txt

    Returns:
        Dict: {domain: error_message}
    """
    invalid_domains = {}

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            # Формат: domain\terror_message
            parts = line.split('\t')
            if len(parts) >= 2:
                domain = parts[0].strip().lower()
                error = parts[1].strip()
                invalid_domains[domain] = error
            else:
                # Если нет табуляции, считаем что просто домен
                domain = line.lower()
                invalid_domains[domain] = "DNS validation failed"

    return invalid_domains


def update_metadata_database(invalid_domains: Dict[str, str], dry_run: bool = False) -> Dict:
    """
    Обновляет metadata.db - помечает email'ы с невалидными доменами

    Args:
        invalid_domains: Словарь {domain: error_message}
        dry_run: Если True, не вносит изменения (только показывает что будет сделано)

    Returns:
        Dict со статистикой обновления
    """
    db_path = Path("metadata.db")
    if not db_path.exists():
        print(f"⚠️  База данных не найдена: {db_path}")
        return {'updated': 0, 'not_found': 0}

    print(f"\n{'='*80}")
    print("📊 ОБНОВЛЕНИЕ METADATA.DB")
    print(f"{'='*80}")

    if dry_run:
        print("⚠️  DRY RUN MODE - изменения НЕ будут сохранены\n")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    stats = {
        'updated': 0,
        'not_found': 0,
        'already_invalid': 0,
        'domains_processed': 0
    }

    # Обрабатываем каждый невалидный домен
    for domain, error_msg in invalid_domains.items():
        stats['domains_processed'] += 1

        # Проверяем, есть ли email'ы с этим доменом
        cursor.execute("""
            SELECT COUNT(*) FROM email_metadata
            WHERE domain = ? COLLATE NOCASE
        """, (domain,))
        count = cursor.fetchone()[0]

        if count == 0:
            stats['not_found'] += 1
            continue

        # Проверяем, сколько уже помечено как invalid
        cursor.execute("""
            SELECT COUNT(*) FROM email_metadata
            WHERE domain = ? COLLATE NOCASE
            AND validation_status = 'invalid'
        """, (domain,))
        already_invalid = cursor.fetchone()[0]
        stats['already_invalid'] += already_invalid

        # Обновляем записи
        if not dry_run:
            cursor.execute("""
                UPDATE email_metadata
                SET
                    validation_status = 'invalid',
                    validation_date = ?,
                    validation_log = ?
                WHERE domain = ? COLLATE NOCASE
                AND (validation_status IS NULL OR validation_status != 'invalid')
            """, (
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                f"DNS validation failed: {error_msg}",
                domain
            ))

            updated = cursor.rowcount
            stats['updated'] += updated

            if updated > 0:
                print(f"   ✅ {domain:40s} - обновлено {updated:4d} записей")
        else:
            to_update = count - already_invalid
            if to_update > 0:
                stats['updated'] += to_update
                print(f"   📝 {domain:40s} - будет обновлено {to_update:4d} записей")

        # Прогресс
        if stats['domains_processed'] % 100 == 0:
            print(f"\n   [{stats['domains_processed']}/{len(invalid_domains)}] доменов обработано...\n")

    if not dry_run:
        conn.commit()
        print(f"\n✅ Изменения сохранены в базу данных")
    else:
        print(f"\n⚠️  DRY RUN - изменения НЕ сохранены")

    conn.close()

    return stats


def add_to_blocklist(invalid_domains: Dict[str, str], dry_run: bool = False) -> Dict:
    """
    Добавляет невалидные домены в blocklist

    Args:
        invalid_domains: Словарь {domain: error_message}
        dry_run: Если True, не вносит изменения

    Returns:
        Dict со статистикой добавления
    """
    blocklist_file = Path("blocklists/blocked_domains.txt")

    print(f"\n{'='*80}")
    print("🚫 ОБНОВЛЕНИЕ BLOCKLIST")
    print(f"{'='*80}")

    if dry_run:
        print("⚠️  DRY RUN MODE - изменения НЕ будут сохранены\n")

    # Создаем директорию если не существует
    blocklist_file.parent.mkdir(parents=True, exist_ok=True)

    # Загружаем существующий blocklist
    existing_blocked = set()
    if blocklist_file.exists():
        with open(blocklist_file, 'r', encoding='utf-8') as f:
            for line in f:
                domain = line.strip().lower()
                if domain:
                    existing_blocked.add(domain)

    print(f"📂 Blocklist файл: {blocklist_file}")
    print(f"📊 Существующих доменов в блок-листе: {len(existing_blocked):,}")

    # Определяем новые домены для добавления
    new_domains = set()
    for domain in invalid_domains.keys():
        if domain not in existing_blocked:
            new_domains.add(domain)

    stats = {
        'total_invalid': len(invalid_domains),
        'already_blocked': len(invalid_domains) - len(new_domains),
        'new_blocked': len(new_domains)
    }

    print(f"📊 Уже в блок-листе: {stats['already_blocked']:,}")
    print(f"➕ Будет добавлено: {stats['new_blocked']:,}")

    if new_domains and not dry_run:
        # Добавляем новые домены в blocklist
        with open(blocklist_file, 'a', encoding='utf-8') as f:
            for domain in sorted(new_domains):
                f.write(f"{domain}\n")

        print(f"\n✅ Добавлено {len(new_domains):,} новых доменов в блок-лист")
    elif new_domains and dry_run:
        print(f"\n⚠️  DRY RUN - {len(new_domains):,} доменов НЕ добавлены")
        print(f"\nПримеры доменов для добавления (первые 10):")
        for domain in sorted(new_domains)[:10]:
            print(f"   • {domain}")
    else:
        print(f"\n✅ Все невалидные домены уже в блок-листе")

    return stats


def create_report(invalid_domains: Dict[str, str], db_stats: Dict, bl_stats: Dict, output_dir: str = "output/invalid_domains"):
    """
    Создает отчет об обработке невалидных доменов

    Args:
        invalid_domains: Словарь {domain: error_message}
        db_stats: Статистика обновления БД
        bl_stats: Статистика blocklist
        output_dir: Директория для отчета
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1. Текстовый отчет
    report_file = output_path / f"INVALID_DOMAINS_REPORT_{timestamp}.txt"

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("ОТЧЕТ ОБ ОБРАБОТКЕ НЕВАЛИДНЫХ DNS ДОМЕНОВ\n")
        f.write("="*80 + "\n\n")

        f.write(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Невалидных доменов: {len(invalid_domains):,}\n\n")

        f.write("="*80 + "\n")
        f.write("ОБНОВЛЕНИЕ METADATA.DB\n")
        f.write("="*80 + "\n")
        f.write(f"Доменов обработано:           {db_stats['domains_processed']:,}\n")
        f.write(f"Записей обновлено:            {db_stats['updated']:,}\n")
        f.write(f"Уже помечено как invalid:     {db_stats['already_invalid']:,}\n")
        f.write(f"Домены не найдены в БД:       {db_stats['not_found']:,}\n\n")

        f.write("="*80 + "\n")
        f.write("ОБНОВЛЕНИЕ BLOCKLIST\n")
        f.write("="*80 + "\n")
        f.write(f"Всего невалидных доменов:     {bl_stats['total_invalid']:,}\n")
        f.write(f"Уже в блок-листе:             {bl_stats['already_blocked']:,}\n")
        f.write(f"Добавлено в блок-лист:        {bl_stats['new_blocked']:,}\n\n")

        f.write("="*80 + "\n")
        f.write("СПИСОК НЕВАЛИДНЫХ ДОМЕНОВ\n")
        f.write("="*80 + "\n\n")

        for domain, error in sorted(invalid_domains.items()):
            f.write(f"{domain:40s} - {error}\n")

    print(f"\n💾 Отчет сохранен: {report_file}")

    # 2. CSV отчет
    csv_file = output_path / f"INVALID_DOMAINS_{timestamp}.csv"
    with open(csv_file, 'w', encoding='utf-8') as f:
        f.write("Domain,Error,Zone\n")
        for domain, error in sorted(invalid_domains.items()):
            # Определяем зону
            zone = ""
            for z in ['.ru', '.by', '.kz', '.su', '.uz', '.az', '.ge', '.am', '.md', '.kg', '.tj']:
                if domain.endswith(z):
                    zone = z
                    break
            f.write(f"{domain},\"{error}\",{zone}\n")

    print(f"💾 CSV файл: {csv_file}")


def print_summary(invalid_domains: Dict[str, str], db_stats: Dict, bl_stats: Dict):
    """Выводит итоговую статистику"""
    print(f"\n{'='*80}")
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print(f"{'='*80}")

    print(f"\n📂 НЕВАЛИДНЫЕ ДОМЕНЫ:")
    print(f"   Всего обработано:              {len(invalid_domains):,}")

    print(f"\n📊 METADATA.DB:")
    print(f"   Записей обновлено:             {db_stats['updated']:,}")
    print(f"   Уже помечено как invalid:      {db_stats['already_invalid']:,}")
    print(f"   Домены не найдены в БД:        {db_stats['not_found']:,}")

    print(f"\n🚫 BLOCKLIST:")
    print(f"   Уже в блок-листе:              {bl_stats['already_blocked']:,}")
    print(f"   Добавлено новых:               {bl_stats['new_blocked']:,}")

    # Статистика по зонам
    zones = {}
    for domain in invalid_domains.keys():
        for z in ['.ru', '.by', '.kz', '.su', '.uz', '.az', '.ge', '.am', '.md', '.kg', '.tj']:
            if domain.endswith(z):
                zones[z] = zones.get(z, 0) + 1
                break

    print(f"\n📈 ПО ДОМЕННЫМ ЗОНАМ:")
    for zone, count in sorted(zones.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(invalid_domains) * 100) if invalid_domains else 0
        print(f"   {zone:8s}: {count:6,d} доменов ({pct:5.1f}%)")

    print(f"\n{'='*80}")


def main():
    """Основная функция"""
    parser = argparse.ArgumentParser(
        description='Обработка невалидных DNS доменов - обновление metadata.db и blocklist'
    )
    parser.add_argument(
        'input_file',
        help='Файл с невалидными доменами (INVALID_DNS_*.txt)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Режим предпросмотра - не вносить изменения'
    )
    parser.add_argument(
        '--output-dir',
        default='output/invalid_domains',
        help='Директория для отчетов'
    )

    args = parser.parse_args()

    print("="*80)
    print("🔧 ОБРАБОТКА НЕВАЛИДНЫХ DNS ДОМЕНОВ")
    print("="*80)

    if args.dry_run:
        print("\n⚠️  РЕЖИМ ПРЕДПРОСМОТРА (DRY RUN)")
        print("   Изменения НЕ будут внесены в базу данных и blocklist\n")

    # 1. Загружаем невалидные домены
    print(f"\n📂 Загружаем файл: {args.input_file}")
    invalid_domains = load_invalid_domains(args.input_file)
    print(f"✅ Загружено невалидных доменов: {len(invalid_domains):,}")

    if not invalid_domains:
        print("❌ Невалидные домены не найдены")
        return

    # 2. Обновляем metadata.db
    db_stats = update_metadata_database(invalid_domains, dry_run=args.dry_run)

    # 3. Добавляем в blocklist
    bl_stats = add_to_blocklist(invalid_domains, dry_run=args.dry_run)

    # 4. Создаем отчет
    if not args.dry_run:
        create_report(invalid_domains, db_stats, bl_stats, args.output_dir)

    # 5. Итоговая статистика
    print_summary(invalid_domains, db_stats, bl_stats)

    if args.dry_run:
        print(f"\n{'='*80}")
        print("⚠️  DRY RUN MODE - ИЗМЕНЕНИЯ НЕ ВНЕСЕНЫ")
        print("   Запустите без --dry-run для применения изменений")
        print(f"{'='*80}")
    else:
        print(f"\n{'='*80}")
        print("✅ ОБРАБОТКА ЗАВЕРШЕНА!")
        print(f"{'='*80}")


if __name__ == "__main__":
    main()
