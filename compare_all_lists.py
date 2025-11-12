#!/usr/bin/env python3
"""Сравнение всех списков email между собой"""

import os
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime
import json

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

def parse_txt_file(filepath):
    """Парсит TXT файл"""
    emails = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                email = normalize_email(line.strip())
                if email and '@' in email:
                    emails.append(email)
    except Exception as e:
        print(f"  ⚠️  Ошибка чтения TXT: {e}")
    return emails

def parse_lvp_file(filepath):
    """Парсит LVP файл"""
    emails = []
    try:
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
    except Exception as e:
        print(f"  ⚠️  Ошибка чтения LVP: {e}")

    return emails

def load_file_emails(filepath):
    """Загружает email из файла (TXT или LVP)"""
    if filepath.endswith('.txt'):
        return parse_txt_file(filepath)
    elif filepath.endswith('.lvp'):
        return parse_lvp_file(filepath)
    return []

def short_name(filename):
    """Сокращает длинное имя файла для отчета"""
    name = os.path.splitext(filename)[0]
    if len(name) > 40:
        return name[:37] + '...'
    return name

def main():
    input_dir = 'input'

    print("="*80)
    print("📊 СРАВНЕНИЕ ВСЕХ СПИСКОВ EMAIL МЕЖДУ СОБОЙ")
    print("="*80)

    # Получаем список всех файлов
    all_files = []
    for filename in os.listdir(input_dir):
        if filename.endswith(('.txt', '.lvp')):
            filepath = os.path.join(input_dir, filename)
            all_files.append((filename, filepath))

    all_files.sort()

    print(f"\n📁 Найдено файлов: {len(all_files)}")
    print(f"  • TXT: {sum(1 for f, _ in all_files if f.endswith('.txt'))}")
    print(f"  • LVP: {sum(1 for f, _ in all_files if f.endswith('.lvp'))}")

    # Загружаем email из каждого файла
    print("\n1️⃣ Загрузка email из всех файлов...")

    file_emails = {}  # {filename: set(emails)}
    file_stats = {}   # {filename: {'total': X, 'unique': Y}}

    for i, (filename, filepath) in enumerate(all_files, 1):
        print(f"  [{i}/{len(all_files)}] {short_name(filename)}...", end=' ', flush=True)

        try:
            emails = load_file_emails(filepath)
            unique_emails = set(emails)

            file_emails[filename] = unique_emails
            file_stats[filename] = {
                'total': len(emails),
                'unique': len(unique_emails),
                'duplicates_internal': len(emails) - len(unique_emails)
            }

            print(f"✅ {len(unique_emails):,} уникальных")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            file_emails[filename] = set()
            file_stats[filename] = {'total': 0, 'unique': 0, 'duplicates_internal': 0}

    # Анализ пересечений
    print("\n2️⃣ Анализ пересечений между файлами...")

    # Для каждого email подсчитываем, в скольких файлах он встречается
    email_file_count = defaultdict(set)

    for filename, emails in file_emails.items():
        for email in emails:
            email_file_count[email].add(filename)

    # Подсчет дубликатов
    duplicate_counts = defaultdict(int)
    for email, files in email_file_count.items():
        count = len(files)
        if count > 1:
            duplicate_counts[count] += 1

    # Общая статистика
    total_emails_all = sum(stats['total'] for stats in file_stats.values())
    unique_emails_all = len(email_file_count)
    emails_in_multiple_files = sum(1 for files in email_file_count.values() if len(files) > 1)

    print("\n" + "="*80)
    print("📊 ОБЩАЯ СТАТИСТИКА")
    print("="*80)

    print(f"\n📦 Всего файлов: {len(all_files)}")
    print(f"📧 Всего записей: {total_emails_all:,}")
    print(f"✅ Уникальных email: {unique_emails_all:,}")
    print(f"🔄 Email в нескольких файлах: {emails_in_multiple_files:,} ({emails_in_multiple_files/unique_emails_all*100:.1f}%)")

    if duplicate_counts:
        print(f"\n📊 Распределение дубликатов:")
        for count in sorted(duplicate_counts.keys(), reverse=True)[:10]:
            print(f"  • В {count} файлах: {duplicate_counts[count]:,} email")

    # Топ-10 файлов с наибольшим количеством уникальных email
    print(f"\n🏆 Топ-10 файлов по количеству уникальных email:")
    top_files = sorted(file_stats.items(), key=lambda x: x[1]['unique'], reverse=True)[:10]
    for i, (filename, stats) in enumerate(top_files, 1):
        print(f"  {i:2d}. {short_name(filename):40s} - {stats['unique']:>7,} уникальных")

    # Сохраняем детальный отчет
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f'output/lists_comparison_report_{timestamp}.txt'

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("ДЕТАЛЬНЫЙ ОТЧЕТ СРАВНЕНИЯ ВСЕХ СПИСКОВ\n")
        f.write("="*80 + "\n\n")

        f.write(f"Дата анализа: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Всего файлов: {len(all_files)}\n")
        f.write(f"Всего записей: {total_emails_all:,}\n")
        f.write(f"Уникальных email: {unique_emails_all:,}\n")
        f.write(f"Email в нескольких файлах: {emails_in_multiple_files:,}\n\n")

        f.write("="*80 + "\n")
        f.write("СТАТИСТИКА ПО ФАЙЛАМ\n")
        f.write("="*80 + "\n\n")

        for filename in sorted(file_stats.keys()):
            stats = file_stats[filename]
            f.write(f"{filename}\n")
            f.write(f"  Всего записей: {stats['total']:,}\n")
            f.write(f"  Уникальных: {stats['unique']:,}\n")
            f.write(f"  Внутренних дубликатов: {stats['duplicates_internal']:,}\n\n")

        f.write("="*80 + "\n")
        f.write("РАСПРЕДЕЛЕНИЕ ДУБЛИКАТОВ\n")
        f.write("="*80 + "\n\n")

        for count in sorted(duplicate_counts.keys(), reverse=True):
            f.write(f"Email в {count} файлах: {duplicate_counts[count]:,}\n")

    print(f"\n💾 Детальный отчет сохранен: {report_file}")

    # Сохраняем матрицу пересечений в JSON (топ-20 файлов)
    print("\n3️⃣ Создание матрицы пересечений (топ-20 файлов)...")

    top20_files = [f for f, _ in sorted(file_stats.items(), key=lambda x: x[1]['unique'], reverse=True)[:20]]

    matrix = {}
    for file1 in top20_files:
        matrix[file1] = {}
        for file2 in top20_files:
            if file1 == file2:
                matrix[file1][file2] = len(file_emails[file1])
            else:
                intersection = len(file_emails[file1] & file_emails[file2])
                matrix[file1][file2] = intersection

    matrix_file = f'output/lists_intersection_matrix_{timestamp}.json'
    with open(matrix_file, 'w', encoding='utf-8') as f:
        json.dump(matrix, f, ensure_ascii=False, indent=2)

    print(f"💾 Матрица пересечений сохранена: {matrix_file}")

    # Находим файлы с наибольшим пересечением
    print("\n🔍 Файлы с наибольшим пересечением (топ-10 пар):")

    intersections = []
    for i, file1 in enumerate(top20_files):
        for file2 in top20_files[i+1:]:
            intersection_count = len(file_emails[file1] & file_emails[file2])
            if intersection_count > 0:
                percent1 = intersection_count / len(file_emails[file1]) * 100
                percent2 = intersection_count / len(file_emails[file2]) * 100
                intersections.append((file1, file2, intersection_count, percent1, percent2))

    intersections.sort(key=lambda x: x[2], reverse=True)

    for i, (file1, file2, count, p1, p2) in enumerate(intersections[:10], 1):
        print(f"  {i:2d}. {short_name(file1)}")
        print(f"      ↔ {short_name(file2)}")
        print(f"      {count:,} общих email ({p1:.1f}% / {p2:.1f}%)")

    print("\n" + "="*80)
    print("✅ Анализ завершен!")
    print("="*80)

if __name__ == '__main__':
    main()
