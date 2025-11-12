#!/usr/bin/env python3
"""Сравнение трех конкретных списков: Switzerland, Austria, Germany HC"""

import xml.etree.ElementTree as ET
import re
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
        print(f"  📄 Читаем: {filepath}")
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        content = sanitize_xml(content)
        root = ET.fromstring(content)

        namespaces = {
            '': 'http://schemas.datacontract.org/2004/07/Verifier',
            'i': 'http://www.w3.org/2001/XMLSchema-instance'
        }

        email_paths = [
            './/Email',
            './/{http://schemas.datacontract.org/2004/07/Verifier}Email',
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

        print(f"  ✅ Извлечено: {len(emails):,} записей")

    except Exception as e:
        print(f"  ❌ Ошибка: {e}")

    return emails

def main():
    print("="*80)
    print("📊 СРАВНЕНИЕ ТРЕХ СПИСКОВ HC (НОЯБРЬ 2025)")
    print("="*80)

    # Файлы для сравнения
    files = {
        'Germany': 'input/Germany HC 10.11.2025.lvp',
        'Austria': 'input/Austria HC 11.11.2025.lvp',
        'Switzerland': 'input/Switherland HC 11.11.2025_fixed.lvp'
    }

    # Загрузка данных
    print("\n1️⃣ Загрузка данных из файлов...\n")

    data = {}
    for country, filepath in files.items():
        emails = parse_lvp_file(filepath)
        unique_emails = set(emails)
        internal_dups = len(emails) - len(unique_emails)

        data[country] = {
            'emails': unique_emails,
            'total': len(emails),
            'unique': len(unique_emails),
            'internal_dups': internal_dups
        }

        if internal_dups > 0:
            print(f"  🧹 Внутренних дубликатов: {internal_dups}")
        print()

    # Статистика по каждому файлу
    print("="*80)
    print("📊 СТАТИСТИКА ПО КАЖДОМУ ФАЙЛУ")
    print("="*80)

    for country in ['Germany', 'Austria', 'Switzerland']:
        d = data[country]
        print(f"\n🇩🇪 {country} HC:")
        print(f"  • Всего записей: {d['total']:,}")
        print(f"  • Уникальных email: {d['unique']:,}")
        if d['internal_dups'] > 0:
            print(f"  • Внутренних дубликатов: {d['internal_dups']:,}")

    # Анализ пересечений
    print("\n" + "="*80)
    print("🔍 АНАЛИЗ ПЕРЕСЕЧЕНИЙ")
    print("="*80)

    # Пересечения между парами
    print("\n📌 Пересечения между странами:\n")

    germany = data['Germany']['emails']
    austria = data['Austria']['emails']
    switzerland = data['Switzerland']['emails']

    # Germany ↔ Austria
    ger_aus = germany & austria
    print(f"🇩🇪 Germany ↔ 🇦🇹 Austria:")
    print(f"  Общих email: {len(ger_aus):,}")
    print(f"  От Germany: {len(ger_aus)/len(germany)*100:.1f}%")
    print(f"  От Austria: {len(ger_aus)/len(austria)*100:.1f}%")

    # Germany ↔ Switzerland
    ger_swi = germany & switzerland
    print(f"\n🇩🇪 Germany ↔ 🇨🇭 Switzerland:")
    print(f"  Общих email: {len(ger_swi):,}")
    if len(germany) > 0:
        print(f"  От Germany: {len(ger_swi)/len(germany)*100:.1f}%")
    if len(switzerland) > 0:
        print(f"  От Switzerland: {len(ger_swi)/len(switzerland)*100:.1f}%")
    else:
        print(f"  ⚠️  Switzerland: файл не прочитан (ошибка XML)")

    # Austria ↔ Switzerland
    aus_swi = austria & switzerland
    print(f"\n🇦🇹 Austria ↔ 🇨🇭 Switzerland:")
    print(f"  Общих email: {len(aus_swi):,}")
    if len(austria) > 0:
        print(f"  От Austria: {len(aus_swi)/len(austria)*100:.1f}%")
    if len(switzerland) > 0:
        print(f"  От Switzerland: {len(aus_swi)/len(switzerland)*100:.1f}%")
    else:
        print(f"  ⚠️  Switzerland: файл не прочитан (ошибка XML)")

    # Пересечение всех трех
    all_three = germany & austria & switzerland
    print(f"\n🌍 Во всех трех списках:")
    print(f"  Общих email: {len(all_three):,}")

    # Уникальные только в одном списке
    print("\n📌 Уникальные email (только в одном списке):\n")

    only_germany = germany - austria - switzerland
    print(f"🇩🇪 Только в Germany:")
    print(f"  Email: {len(only_germany):,} ({len(only_germany)/len(germany)*100:.1f}%)")

    only_austria = austria - germany - switzerland
    print(f"\n🇦🇹 Только в Austria:")
    print(f"  Email: {len(only_austria):,} ({len(only_austria)/len(austria)*100:.1f}%)")

    only_switzerland = switzerland - germany - austria
    print(f"\n🇨🇭 Только в Switzerland:")
    if len(switzerland) > 0:
        print(f"  Email: {len(only_switzerland):,} ({len(only_switzerland)/len(switzerland)*100:.1f}%)")
    else:
        print(f"  ⚠️  Файл не прочитан (ошибка XML)")

    # Общая уникальность
    all_unique = germany | austria | switzerland
    total_records = data['Germany']['total'] + data['Austria']['total'] + data['Switzerland']['total']

    print("\n" + "="*80)
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print("="*80)
    print(f"\n📦 Всего записей (во всех файлах): {total_records:,}")
    print(f"✅ Всего уникальных email: {len(all_unique):,}")
    print(f"🔄 Дубликатов (пересечений): {total_records - len(all_unique):,}")
    print(f"📈 Уникальность: {len(all_unique)/total_records*100:.1f}%")

    # Сохранение результатов
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Сохраняем общие email между всеми тремя
    if all_three:
        filename = f'output/HC_3countries_common_{timestamp}.txt'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"Email, присутствующие во всех трех списках HC\n")
            f.write(f"Germany HC, Austria HC, Switzerland HC\n")
            f.write(f"Всего: {len(all_three):,}\n")
            f.write(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*80 + "\n\n")
            for email in sorted(all_three):
                f.write(f"{email}\n")
        print(f"\n💾 Email во всех трех списках: {filename}")

    # Сохраняем уникальные для каждой страны
    countries_data = [
        ('Germany', only_germany),
        ('Austria', only_austria),
        ('Switzerland', only_switzerland)
    ]

    for country, emails in countries_data:
        if emails:
            filename = f'output/HC_{country}_unique_{timestamp}.txt'
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"Email уникальные для {country} HC\n")
                f.write(f"Не встречаются в других списках\n")
                f.write(f"Всего: {len(emails):,}\n")
                f.write(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*80 + "\n\n")
                for email in sorted(emails):
                    f.write(f"{email}\n")
            print(f"💾 Уникальные {country}: {filename}")

    print("\n" + "="*80)
    print("✅ Анализ завершен!")
    print("="*80)

if __name__ == '__main__':
    main()