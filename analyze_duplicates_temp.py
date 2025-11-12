#!/usr/bin/env python3
"""Временный скрипт для анализа дубликатов в новом LVP файле"""

import sqlite3
import xml.etree.ElementTree as ET
import re
import os

def sanitize_xml(content):
    """Удаляет недопустимые XML-символы"""
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', content)

def normalize_email(email):
    """Нормализует email-адрес"""
    email = email.lower().strip()
    # Удаляем префиксы
    if email.startswith('//'):
        email = email[2:]
    if email.startswith('20'):
        email = email[2:]
    return email

def parse_lvp_file(filepath):
    """Парсит LVP файл и возвращает список email-адресов"""
    emails = []

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Санитизация XML
        content = sanitize_xml(content)

        # Парсинг XML
        root = ET.fromstring(content)

        # Поиск всех элементов с email
        namespaces = {
            '': 'http://schemas.datacontract.org/2004/07/Verifier',
            'i': 'http://www.w3.org/2001/XMLSchema-instance'
        }

        # Пробуем разные пути к email элементам
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

        print(f"✅ Извлечено {len(emails)} email-адресов из LVP файла")

    except Exception as e:
        print(f"❌ Ошибка парсинга LVP файла: {e}")

    return emails

def check_duplicates_in_db(emails, db_path='metadata.db'):
    """Проверяет, сколько email-адресов уже есть в базе данных"""

    if not os.path.exists(db_path):
        print(f"❌ База данных {db_path} не найдена")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Подсчет дубликатов
    duplicates = []
    new_emails = []

    print("\n🔍 Проверка дубликатов в базе данных...")

    for i, email in enumerate(emails):
        cursor.execute('SELECT COUNT(*) FROM email_metadata WHERE LOWER(email) = ?', (email.lower(),))
        count = cursor.fetchone()[0]

        if count > 0:
            duplicates.append(email)
        else:
            new_emails.append(email)

        # Прогресс
        if (i + 1) % 1000 == 0:
            print(f"  Проверено {i + 1}/{len(emails)} адресов...")

    conn.close()

    return duplicates, new_emails

def main():
    lvp_file = 'input/Germany HC 10.11.2025.lvp'

    print("="*60)
    print("📋 АНАЛИЗ ДУБЛИКАТОВ В НОВОМ LVP ФАЙЛЕ")
    print("="*60)
    print(f"\nФайл: {lvp_file}")

    # Парсим LVP файл
    print("\n1️⃣ Парсинг LVP файла...")
    emails = parse_lvp_file(lvp_file)

    if not emails:
        print("❌ Не удалось извлечь email-адреса из файла")
        return

    # Проверяем внутренние дубликаты
    unique_emails = list(set(emails))
    internal_duplicates = len(emails) - len(unique_emails)

    print(f"\n📊 Статистика файла:")
    print(f"  Всего записей: {len(emails):,}")
    print(f"  Уникальных email: {len(unique_emails):,}")
    print(f"  Внутренних дубликатов: {internal_duplicates:,}")

    # Проверяем дубликаты в базе данных
    print("\n2️⃣ Проверка дубликатов относительно базы данных...")
    duplicates, new_emails = check_duplicates_in_db(unique_emails)

    # Финальная статистика
    print("\n" + "="*60)
    print("📊 РЕЗУЛЬТАТЫ АНАЛИЗА")
    print("="*60)
    print(f"\n✅ Новых email (отсутствуют в БД): {len(new_emails):,} ({len(new_emails)/len(unique_emails)*100:.1f}%)")
    print(f"🔄 Дубликатов (уже в БД): {len(duplicates):,} ({len(duplicates)/len(unique_emails)*100:.1f}%)")
    print(f"\n📦 Всего уникальных в файле: {len(unique_emails):,}")

    # Сохраняем список дубликатов
    if duplicates:
        dup_file = 'output/Germany_HC_duplicates_analysis.txt'
        with open(dup_file, 'w', encoding='utf-8') as f:
            f.write(f"Дубликаты из файла Germany HC 10.11.2025.lvp\n")
            f.write(f"Всего дубликатов: {len(duplicates)}\n")
            f.write(f"Дата проверки: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*60 + "\n\n")
            for email in sorted(duplicates):
                f.write(f"{email}\n")

        print(f"\n💾 Список дубликатов сохранен: {dup_file}")

    # Сохраняем список новых email
    if new_emails:
        new_file = 'output/Germany_HC_new_emails.txt'
        with open(new_file, 'w', encoding='utf-8') as f:
            f.write(f"Новые email из файла Germany HC 10.11.2025.lvp\n")
            f.write(f"Всего новых: {len(new_emails)}\n")
            f.write(f"Дата проверки: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*60 + "\n\n")
            for email in sorted(new_emails):
                f.write(f"{email}\n")

        print(f"💾 Список новых email сохранен: {new_file}")

if __name__ == '__main__':
    main()
