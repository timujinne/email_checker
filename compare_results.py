#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Compare clean list with qualified and excluded results
"""

import sys

def load_emails(filepath):
    """Load emails from file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return set(line.strip().lower() for line in f if line.strip())

def main(clean_file, qualified_file, excluded_file):
    print("\n" + "="*70)
    print("  СРАВНЕНИЕ РЕЗУЛЬТАТОВ ФИЛЬТРАЦИИ")
    print("="*70 + "\n")

    # Load all files
    print("📂 Загрузка файлов...")
    clean = load_emails(clean_file)
    qualified = load_emails(qualified_file)
    excluded = load_emails(excluded_file)

    print(f"  Clean list:     {len(clean):,} emails")
    print(f"  Qualified:      {len(qualified):,} emails")
    print(f"  Excluded:       {len(excluded):,} emails")

    # Check for overlaps
    print(f"\n{'='*70}")
    print("🔍 ПРОВЕРКА ЦЕЛОСТНОСТИ")
    print("="*70)

    overlap = qualified & excluded
    if overlap:
        print(f"⚠️  Email в ОБОИХ списках (qualified И excluded): {len(overlap)}")
        print("Примеры:")
        for email in list(overlap)[:10]:
            print(f"  - {email}")
    else:
        print("✅ Нет пересечений между qualified и excluded")

    # Check if all clean emails are accounted for
    total_filtered = qualified | excluded

    if len(total_filtered) == len(clean):
        print(f"✅ Все {len(clean):,} email из clean распределены")
    else:
        print(f"⚠️  Не все email распределены!")
        print(f"   Clean: {len(clean):,}")
        print(f"   Qualified + Excluded: {len(total_filtered):,}")

        missing = clean - total_filtered
        extra = total_filtered - clean

        if missing:
            print(f"\n⚠️  Email из clean, которых НЕТ в результатах: {len(missing)}")
            print("Примеры:")
            for email in list(missing)[:10]:
                print(f"  - {email}")

        if extra:
            print(f"\n⚠️  Email в результатах, которых НЕТ в clean: {len(extra)}")
            print("Примеры:")
            for email in list(extra)[:10]:
                print(f"  - {email}")

    # Statistics
    print(f"\n{'='*70}")
    print("📊 СТАТИСТИКА")
    print("="*70)
    print(f"Исходный список (clean):   {len(clean):,}")
    print(f"Прошли фильтр (qualified): {len(qualified):,} ({len(qualified)/len(clean)*100:.1f}%)")
    print(f"Исключено (excluded):      {len(excluded):,} ({len(excluded)/len(clean)*100:.1f}%)")

    # Domain analysis for qualified
    print(f"\n{'='*70}")
    print("🌐 АНАЛИЗ ДОМЕНОВ (QUALIFIED)")
    print("="*70)

    qualified_domains = {}
    for email in qualified:
        domain = email.split('@')[-1] if '@' in email else 'unknown'
        qualified_domains[domain] = qualified_domains.get(domain, 0) + 1

    print("Топ-20 доменов в qualified списке:")
    sorted_domains = sorted(qualified_domains.items(), key=lambda x: x[1], reverse=True)
    for i, (domain, count) in enumerate(sorted_domains[:20], 1):
        print(f"{i:2d}. {domain:40s} {count:5,} emails")

    # Sample qualified emails
    print(f"\n{'='*70}")
    print("📋 ПРИМЕРЫ QUALIFIED EMAIL")
    print("="*70)

    sample_qualified = sorted(list(qualified))[:20]
    for i, email in enumerate(sample_qualified, 1):
        print(f"{i:2d}. {email}")

    print("\n" + "="*70 + "\n")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python compare_results.py <clean_file> <qualified_file> <excluded_file>")
        sys.exit(1)

    main(sys.argv[1], sys.argv[2], sys.argv[3])
