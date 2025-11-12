#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Анализ совпадений email адресов из LVP файла с базой данных
"""

import sqlite3
import xml.etree.ElementTree as ET
import re
import sys
from collections import defaultdict
from pathlib import Path


def sanitize_xml(content):
    """Удаляет недопустимые XML символы"""
    # Удаляем управляющие символы (кроме \n, \r, \t)
    control_chars = ''.join([chr(i) for i in range(0, 32) if i not in (9, 10, 13)])
    translator = str.maketrans('', '', control_chars)
    return content.translate(translator)


def parse_lvp_file(filepath):
    """
    Парсит LVP файл и извлекает email адреса с метаданными

    Returns:
        list of dict: Список email адресов с метаданными
    """
    print(f"📂 Чтение файла: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Очистка XML
    content = sanitize_xml(content)

    # Парсинг XML
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"❌ Ошибка парсинга XML: {e}")
        return []

    emails = []

    # Поиск всех записей
    namespaces = {
        'ns': 'http://schemas.datacontract.org/2004/07/Verifier',
        'arr': 'http://schemas.microsoft.com/2003/10/Serialization/Arrays'
    }

    # Пробуем разные пути к элементам
    items = (
        root.findall('.//ns:ValidatorDataClass.ValidatorDataClassItem', namespaces) or
        root.findall('.//ValidatorDataClass.ValidatorDataClassItem') or
        []
    )

    print(f"📊 Найдено записей в LVP: {len(items)}")

    for item in items:
        # Извлекаем email
        email_elem = item.find('.//ns:Email', namespaces) or item.find('.//Email')
        if email_elem is not None and email_elem.text:
            email = email_elem.text.strip().lower()

            # Извлекаем статус
            status_elem = item.find('.//ns:Status', namespaces) or item.find('.//Status')
            status = status_elem.text if status_elem is not None and status_elem.text else 'Unknown'

            # Извлекаем метаданные из _Data
            metadata = {}
            data_elem = item.find('.//{http://schemas.microsoft.com/2003/10/Serialization/Arrays}KeyValueOfstringstring/..')
            if data_elem is not None:
                for kv in data_elem.findall('.//{http://schemas.microsoft.com/2003/10/Serialization/Arrays}KeyValueOfstringstring'):
                    key_elem = kv.find('{http://schemas.microsoft.com/2003/10/Serialization/Arrays}Key')
                    value_elem = kv.find('{http://schemas.microsoft.com/2003/10/Serialization/Arrays}Value')
                    if key_elem is not None and value_elem is not None:
                        metadata[key_elem.text] = value_elem.text or ''

            emails.append({
                'email': email,
                'status': status,
                'metadata': metadata
            })

    return emails


def normalize_email(email):
    """Нормализует email для сравнения"""
    email = email.lower().strip()

    # Удаляем префиксы '//' и '20'
    if email.startswith('//'):
        email = email[2:]
    if email.startswith('20') and '@' in email:
        email = email[2:]

    return email


def check_duplicates_in_db(emails, db_path='.cache/processing_cache_final.db'):
    """
    Проверяет какие email адреса уже есть в базе данных

    Args:
        emails: list of dict - Список email с метаданными
        db_path: str - Путь к базе данных (по умолчанию кэш-база)

    Returns:
        tuple: (found_in_db, not_in_db, db_stats)
    """
    print(f"\n🔍 Проверка совпадений с базой данных...")
    print(f"📁 Используется БД: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    found_in_db = []
    not_in_db = []

    # Получаем общую статистику из БД
    cursor.execute('SELECT COUNT(*) FROM processed_emails')
    total_in_db = cursor.fetchone()[0]
    print(f"📚 Всего email адресов в БД: {total_in_db:,}")

    # Получаем статистику по источникам
    cursor.execute('''
        SELECT source_file, category, COUNT(*) as count
        FROM processed_emails
        GROUP BY source_file, category
        ORDER BY count DESC
    ''')
    source_stats = cursor.fetchall()

    # Получаем статистику по категориям
    cursor.execute('''
        SELECT category, COUNT(*) as count
        FROM processed_emails
        GROUP BY category
    ''')
    category_stats = {row[0]: row[1] for row in cursor.fetchall()}

    print(f"\n📊 Распределение по категориям в БД:")
    for category, count in category_stats.items():
        print(f"  • {category}: {count:,} ({count/total_in_db*100:.1f}%)")

    # Проверяем каждый email из LVP файла
    for item in emails:
        email = normalize_email(item['email'])

        # Проверяем наличие в БД (ищем в обоих полях)
        cursor.execute('''
            SELECT
                email,
                email_normalized,
                source_file,
                category,
                processed_at
            FROM processed_emails
            WHERE email_normalized = ? OR email = ?
            LIMIT 1
        ''', (email, email))

        result = cursor.fetchone()

        if result:
            found_in_db.append({
                'email': email,
                'lvp_status': item['status'],
                'db_email': result[0],
                'db_email_normalized': result[1],
                'db_source_file': result[2],
                'db_category': result[3],
                'db_processed_at': result[4],
                'lvp_metadata': item['metadata']
            })
        else:
            not_in_db.append({
                'email': email,
                'lvp_status': item['status'],
                'lvp_metadata': item['metadata']
            })

    conn.close()

    db_stats = {
        'total_in_db': total_in_db,
        'source_stats': source_stats,
        'category_stats': category_stats
    }

    return found_in_db, not_in_db, db_stats


def print_statistics(lvp_emails, found_in_db, not_in_db, db_stats):
    """Выводит подробную статистику"""

    print("\n" + "="*80)
    print("📊 СТАТИСТИКА АНАЛИЗА")
    print("="*80)

    print(f"\n📁 LVP файл:")
    print(f"  • Всего email адресов: {len(lvp_emails):,}")

    # Статистика по статусам в LVP
    status_counts = defaultdict(int)
    for item in lvp_emails:
        status_counts[item['status']] += 1

    print(f"\n  Распределение по статусам в LVP:")
    for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {status}: {count:,} ({count/len(lvp_emails)*100:.1f}%)")

    print(f"\n💾 База данных:")
    print(f"  • Всего email адресов: {db_stats['total_in_db']:,}")

    print(f"\n🔍 Результаты проверки:")
    print(f"  ✅ Найдено в БД: {len(found_in_db):,} ({len(found_in_db)/len(lvp_emails)*100:.1f}%)")
    print(f"  ❌ Не найдено в БД (новые): {len(not_in_db):,} ({len(not_in_db)/len(lvp_emails)*100:.1f}%)")

    # Анализ совпадений по источникам
    if found_in_db:
        source_counts = defaultdict(int)
        category_counts = defaultdict(int)

        for item in found_in_db:
            source = item.get('db_source_file', 'Unknown')
            category = item.get('db_category', 'Unknown')
            source_counts[source] += 1
            category_counts[category] += 1

        print(f"\n  Источники совпадений в БД (топ 10):")
        for source, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"    - {source}: {count:,} ({count/len(found_in_db)*100:.1f}%)")

        print(f"\n  Распределение найденных по категориям:")
        for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"    - {category}: {count:,} ({count/len(found_in_db)*100:.1f}%)")

    print("\n" + "="*80)


def save_results(found_in_db, not_in_db, output_dir='output'):
    """Сохраняет результаты в файлы"""

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Сохраняем найденные дубликаты
    if found_in_db:
        duplicates_file = output_path / 'lvp_duplicates_found.txt'
        with open(duplicates_file, 'w', encoding='utf-8') as f:
            f.write("# Email адреса из LVP файла, которые уже есть в базе данных\n")
            f.write(f"# Всего: {len(found_in_db):,}\n\n")
            for item in found_in_db:
                f.write(f"{item['email']}\n")
        print(f"\n✅ Дубликаты сохранены: {duplicates_file} ({len(found_in_db):,} emails)")

        # Детальный отчет
        report_file = output_path / 'lvp_duplicates_report.txt'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("ДЕТАЛЬНЫЙ ОТЧЕТ О ДУБЛИКАТАХ\n")
            f.write("="*80 + "\n")
            f.write(f"Всего дубликатов: {len(found_in_db):,}\n")
            f.write("="*80 + "\n\n")
            for item in found_in_db:
                f.write(f"Email: {item['email']}\n")
                f.write(f"  LVP статус: {item['lvp_status']}\n")
                f.write(f"  БД категория: {item.get('db_category', 'N/A')}\n")
                if item.get('db_source_file'):
                    f.write(f"  Источник в БД: {item['db_source_file']}\n")
                if item.get('db_processed_at'):
                    f.write(f"  Обработан: {item['db_processed_at']}\n")
                f.write("\n")
        print(f"✅ Детальный отчет: {report_file}")

        # CSV отчет для Excel
        csv_file = output_path / 'lvp_duplicates_report.csv'
        with open(csv_file, 'w', encoding='utf-8-sig') as f:
            f.write("Email;LVP_Status;DB_Category;DB_Source_File;DB_Processed_At\n")
            for item in found_in_db:
                f.write(f"{item['email']};{item['lvp_status']};")
                f.write(f"{item.get('db_category', '')};")
                f.write(f"{item.get('db_source_file', '')};")
                f.write(f"{item.get('db_processed_at', '')}\n")
        print(f"✅ CSV отчет: {csv_file}")

    # Сохраняем уникальные email
    if not_in_db:
        unique_file = output_path / 'lvp_unique_emails.txt'
        with open(unique_file, 'w', encoding='utf-8') as f:
            f.write("# Email адреса из LVP файла, которых НЕТ в базе данных (НОВЫЕ)\n")
            f.write(f"# Всего: {len(not_in_db):,}\n\n")
            for item in not_in_db:
                f.write(f"{item['email']}\n")
        print(f"✅ Уникальные emails: {unique_file} ({len(not_in_db):,} emails)")

        # CSV с метаданными новых email
        csv_file = output_path / 'lvp_unique_emails_with_metadata.csv'
        with open(csv_file, 'w', encoding='utf-8-sig') as f:
            f.write("Email;LVP_Status;Column_2;Column_3;Column_7\n")
            for item in not_in_db:
                metadata = item.get('lvp_metadata', {})
                f.write(f"{item['email']};{item['lvp_status']};")
                f.write(f"{metadata.get('Column_2', '')};")
                f.write(f"{metadata.get('Column_3', '')};")
                f.write(f"{metadata.get('Column_7', '')}\n")
        print(f"✅ CSV с метаданными новых emails: {csv_file}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_lvp_duplicates.py <lvp_file_path>")
        print("\nПример:")
        print('  python analyze_lvp_duplicates.py "input/En HC от Глеба.lvp"')
        sys.exit(1)

    lvp_file = sys.argv[1]

    if not Path(lvp_file).exists():
        print(f"❌ Файл не найден: {lvp_file}")
        sys.exit(1)

    print("🚀 Анализ совпадений LVP файла с базой данных")
    print("="*80)

    # Парсим LVP файл
    lvp_emails = parse_lvp_file(lvp_file)

    if not lvp_emails:
        print("❌ Не удалось извлечь email адреса из LVP файла")
        sys.exit(1)

    # Проверяем дубликаты
    found_in_db, not_in_db, sources = check_duplicates_in_db(lvp_emails)

    # Выводим статистику
    print_statistics(lvp_emails, found_in_db, not_in_db, sources)

    # Сохраняем результаты
    save_results(found_in_db, not_in_db)

    print("\n✅ Анализ завершен!")


if __name__ == '__main__':
    main()
