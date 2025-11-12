#!/usr/bin/env python3
"""Оптимизированный скрипт для быстрого анализа дубликатов"""

import sqlite3
import xml.etree.ElementTree as ET
import re
import os
from datetime import datetime

def sanitize_xml(content):
    """Удаляет недопустимые XML-символы"""
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', content)

def normalize_email(email):
    """Нормализует email-адрес"""
    email = email.lower().strip()
    if email.startswith('//'):
        email = email[2:]
    if email.startswith('20'):
        email = email[2:]
    return email

def parse_lvp_file(filepath):
    """Парсит LVP файл и возвращает список email-адресов"""
    emails = []

    try:
        print(f"📄 Читаем файл: {filepath}")
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        print("🧹 Санитизация XML...")
        content = sanitize_xml(content)

        print("🔍 Парсинг XML...")
        root = ET.fromstring(content)

        # Поиск всех элементов с email
        namespaces = {
            '': 'http://schemas.datacontract.org/2004/07/Verifier',
            'i': 'http://www.w3.org/2001/XMLSchema-instance'
        }

        email_paths = [
            './/Email',
            './/{http://schemas.datacontract.org/2004/07/Verifier}Email',
            './/ValidatorDataClass.ValidatorDataClassItem/Email'
        ]

        for path in email_paths:
            email_elements = root.findall(path, namespaces)
            if email_elements:
                for elem in email_elements:
                    if elem.text:
                        email = normalize_email(elem.text)
                        if email and '@' in email:
                            emails.append(email)
                break

        print(f"✅ Извлечено {len(emails):,} email-адресов")

    except Exception as e:
        print(f"❌ Ошибка парсинга: {e}")

    return emails

def load_db_emails(db_path='metadata.db'):
    """Загружает все email из базы данных в set для быстрого поиска"""

    if not os.path.exists(db_path):
        print(f"❌ База данных {db_path} не найдена")
        return set()

    print(f"\n📊 Загрузка email из базы данных...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('SELECT LOWER(email) FROM email_metadata')
    db_emails = set(row[0].lower() for row in cursor.fetchall())

    conn.close()

    print(f"✅ Загружено {len(db_emails):,} уникальных email из БД")
    return db_emails

def analyze_duplicates(file_emails, db_emails):
    """Быстрый анализ дубликатов через set intersection"""

    # Убираем внутренние дубликаты из файла
    unique_file_emails = set(email.lower() for email in file_emails)
    internal_dups = len(file_emails) - len(unique_file_emails)

    # Находим пересечения с БД
    duplicates = unique_file_emails & db_emails
    new_emails = unique_file_emails - db_emails

    return {
        'total': len(file_emails),
        'unique': len(unique_file_emails),
        'internal_duplicates': internal_dups,
        'db_duplicates': len(duplicates),
        'new_emails': len(new_emails),
        'duplicates_list': sorted(duplicates),
        'new_emails_list': sorted(new_emails)
    }

def main():
    lvp_file = 'input/Germany HC 10.11.2025.lvp'

    print("="*70)
    print("📋 БЫСТРЫЙ АНАЛИЗ ДУБЛИКАТОВ В LVP ФАЙЛЕ")
    print("="*70)
    print(f"\nФайл: {lvp_file}\n")

    # Шаг 1: Парсим LVP файл
    print("1️⃣ Парсинг LVP файла...")
    emails = parse_lvp_file(lvp_file)

    if not emails:
        print("❌ Не удалось извлечь email из файла")
        return

    # Шаг 2: Загружаем все email из БД в память (быстро!)
    print("\n2️⃣ Загрузка базы данных...")
    db_emails = load_db_emails()

    if not db_emails:
        print("❌ База данных пуста или не найдена")
        return

    # Шаг 3: Быстрое сравнение через set operations
    print("\n3️⃣ Анализ дубликатов (быстрое сравнение)...")
    results = analyze_duplicates(emails, db_emails)

    # Финальная статистика
    print("\n" + "="*70)
    print("📊 РЕЗУЛЬТАТЫ АНАЛИЗА")
    print("="*70)

    print(f"\n📦 Файл Germany HC 10.11.2025.lvp:")
    print(f"  • Всего записей: {results['total']:,}")
    print(f"  • Уникальных email: {results['unique']:,}")
    print(f"  • Внутренних дубликатов: {results['internal_duplicates']:,}")

    print(f"\n🔍 Сравнение с базой данных ({len(db_emails):,} email):")
    print(f"  • ✅ Новых email (НЕ в БД): {results['new_emails']:,} ({results['new_emails']/results['unique']*100:.1f}%)")
    print(f"  • 🔄 Дубликатов (УЖЕ в БД): {results['db_duplicates']:,} ({results['db_duplicates']/results['unique']*100:.1f}%)")

    # Сохраняем результаты
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    if results['duplicates_list']:
        dup_file = f'output/Germany_HC_duplicates_{timestamp}.txt'
        with open(dup_file, 'w', encoding='utf-8') as f:
            f.write(f"Дубликаты из файла Germany HC 10.11.2025.lvp\n")
            f.write(f"Всего дубликатов: {len(results['duplicates_list']):,}\n")
            f.write(f"Дата проверки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*70 + "\n\n")
            for email in results['duplicates_list']:
                f.write(f"{email}\n")

        print(f"\n💾 Список дубликатов сохранен: {dup_file}")

    if results['new_emails_list']:
        new_file = f'output/Germany_HC_new_emails_{timestamp}.txt'
        with open(new_file, 'w', encoding='utf-8') as f:
            f.write(f"Новые email из файла Germany HC 10.11.2025.lvp\n")
            f.write(f"Всего новых: {len(results['new_emails_list']):,}\n")
            f.write(f"Дата проверки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*70 + "\n\n")
            for email in results['new_emails_list']:
                f.write(f"{email}\n")

        print(f"💾 Список новых email сохранен: {new_file}")

    print("\n" + "="*70)
    print("✅ Анализ завершен!")
    print("="*70)

if __name__ == '__main__':
    main()
