#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Exclusion Filter - Apply ONLY exclusion filtering (no priority scoring)

Filters email lists based on hard exclusion criteria from config file.
Does NOT calculate scores or segment into HIGH/MEDIUM/LOW priority.

Output:
- *_QUALIFIED_*.txt - All emails that passed exclusions
- *_QUALIFIED_*.csv - With metadata (if available)
- *_EXCLUDED_*.txt - All excluded emails
- *_EXCLUSION_REPORT_*.csv - Detailed exclusion reasons
"""

import json
import csv
import sys
import os
from datetime import datetime
from collections import defaultdict


class ExclusionFilter:
    """Filter emails using only hard exclusion rules from config"""

    def __init__(self, config_path):
        """Load filter configuration"""
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)

        self.exclusions = self.config.get('hard_exclusions', {})
        self.geographic = self.config.get('geographic', {})

        # Pre-compile lowercase lists for faster lookups
        self.personal_domains = set(d.lower() for d in self.exclusions.get('personal_domains', []))
        self.excluded_media_domains = set(d.lower() for d in self.exclusions.get('excluded_media_domains', []))
        self.hr_prefixes = [p.lower() for p in self.exclusions.get('hr_prefixes', {}).get('english', [])]
        self.service_prefixes = [p.lower() for p in self.exclusions.get('service_prefixes', [])]
        self.excluded_countries = [c.lower().lstrip('.') for c in self.geographic.get('excluded_countries', [])]
        self.excluded_cities = set(c.lower() for c in self.geographic.get('excluded_cities', []))

        # Build industry keyword sets for faster matching
        self.industry_keywords = {}
        for industry_name, industry_data in self.exclusions.get('excluded_industries', {}).items():
            keywords = industry_data.get('english', [])
            self.industry_keywords[industry_name] = set(k.lower() for k in keywords)

    def check_email(self, email, metadata=None):
        """
        Check if email passes exclusion filters

        Returns:
            (passed: bool, exclusion_reason: str or None)
        """
        email_lower = email.lower()
        domain = email_lower.split('@')[-1] if '@' in email_lower else ''

        # Check personal domains
        if domain in self.personal_domains:
            return False, f"Personal domain: {domain}"

        # Check excluded media domains
        if domain in self.excluded_media_domains:
            return False, f"Excluded media domain: {domain}"

        # Check HR prefixes
        for prefix in self.hr_prefixes:
            if email_lower.startswith(prefix):
                return False, f"HR prefix: {prefix}"

        # Check service prefixes
        for prefix in self.service_prefixes:
            if email_lower.startswith(prefix):
                return False, f"Service prefix: {prefix}"

        # Check excluded countries (in domain)
        for country_code in self.excluded_countries:
            if domain.endswith(country_code):
                return False, f"Excluded country domain: .{country_code}"

        # Check metadata for excluded industries and cities
        if metadata:
            # Check excluded industries
            for industry_name, keywords in self.industry_keywords.items():
                # Collect text fields from metadata (support both LVP and standard formats)
                text_fields = [
                    metadata.get('Column_Title', metadata.get('page_title', '')),
                    metadata.get('Column_METADescription', metadata.get('meta_description', '')),
                    metadata.get('Column_METAKeywords', metadata.get('meta_keywords', '')),
                    metadata.get('Column_Keywords', metadata.get('keywords', '')),
                    metadata.get('Column_Source', metadata.get('source_url', '')),
                    metadata.get('Column_Domain', metadata.get('domain', '')),
                    metadata.get('Column_Name', metadata.get('company_name', '')),
                    metadata.get('Column_Category', metadata.get('category', ''))
                ]

                combined_text = ' '.join(str(f) for f in text_fields if f).lower()

                for keyword in keywords:
                    if keyword in combined_text:
                        return False, f"Excluded industry ({industry_name}): {keyword}"

            # Check excluded cities (support both LVP and standard formats)
            city = str(metadata.get('Column_City', metadata.get('city', ''))).lower()
            if city and city in self.excluded_cities:
                return False, f"Excluded city: {city}"

            # Check country in metadata (support both LVP and standard formats)
            country = str(metadata.get('Column_Country', metadata.get('country', ''))).lower()
            if country:
                for country_code in self.excluded_countries:
                    if country_code in country:
                        return False, f"Excluded country: {country}"

        return True, None


def load_metadata(clean_file_path):
    """
    Load metadata from corresponding JSON or CSV file

    Returns:
        dict: email -> metadata mapping
    """
    base_path = clean_file_path.replace('_clean_', '_clean_metadata_')

    # Try JSON first (preferred format with full structure)
    json_path = base_path.replace('.txt', '.json')
    if os.path.exists(json_path):
        print(f"📋 Загрузка метаданных из JSON: {os.path.basename(json_path)}")
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Handle nested structure: {"metadata": {...}, "emails": [...]}
            if 'emails' in data:
                emails_list = data['emails']
            else:
                emails_list = data if isinstance(data, list) else []

            # Create email -> metadata mapping (support both LVP and standard formats)
            metadata_map = {}
            for item in emails_list:
                # Try LVP format first (uppercase 'Email'), then standard (lowercase 'email')
                email = item.get('Email', item.get('email', '')).lower()
                if email:
                    metadata_map[email] = item

            return metadata_map

    # Try CSV fallback
    csv_path = base_path.replace('.txt', '.csv')
    if os.path.exists(csv_path):
        print(f"📋 Загрузка метаданных из CSV: {os.path.basename(csv_path)}")
        metadata_map = {}
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Support both LVP (Email) and standard (email) formats
                email = row.get('Email', row.get('email', '')).lower()
                if email:
                    metadata_map[email] = row
        return metadata_map

    print(f"⚠️  Файл метаданных не найден")
    return {}


def process_file(input_file, config_path):
    """Process email list with exclusion filtering"""

    print(f"\n{'='*70}")
    print(f"  EXCLUSION FILTER - Фильтрация без сегментации по приоритетам")
    print(f"{'='*70}\n")

    print(f"🔍 Загрузка конфигурации из {os.path.basename(config_path)}...")
    filter_obj = ExclusionFilter(config_path)

    print(f"📧 Загрузка email-адресов из {os.path.basename(input_file)}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        emails = [line.strip() for line in f if line.strip()]

    print(f"📊 Загрузка метаданных...")
    metadata_map = load_metadata(input_file)

    print(f"\n✅ Загружено {len(emails):,} email-адресов")
    print(f"📋 Найдено {len(metadata_map):,} записей метаданных")

    # Display loaded exclusion rules
    print(f"\n📋 Правила исключения:")
    print(f"  - Персональные домены: {len(filter_obj.personal_domains)}")
    print(f"  - Медиа домены: {len(filter_obj.excluded_media_domains)}")
    print(f"  - HR префиксы: {len(filter_obj.hr_prefixes)}")
    print(f"  - Сервисные префиксы: {len(filter_obj.service_prefixes)}")
    print(f"  - Исключенные страны/домены: {len(filter_obj.excluded_countries)}")
    print(f"  - Исключенные города: {len(filter_obj.excluded_cities)}")
    print(f"  - Исключенные отрасли: {len(filter_obj.industry_keywords)}")

    # Filter emails
    qualified = []
    excluded = []
    exclusion_stats = defaultdict(int)
    exclusion_details = []

    print(f"\n🔄 Применение фильтров исключений...")

    processed = 0
    for email in emails:
        processed += 1
        if processed % 1000 == 0:
            print(f"  Обработано: {processed:,} / {len(emails):,} ({processed/len(emails)*100:.1f}%)")

        metadata = metadata_map.get(email.lower())
        passed, reason = filter_obj.check_email(email, metadata)

        if passed:
            qualified.append((email, metadata))
        else:
            excluded.append((email, metadata))
            exclusion_stats[reason] += 1
            # Support both LVP and standard formats in exclusion report
            exclusion_details.append({
                'Email': email,
                'Exclusion_Reason': reason,
                'Domain': metadata.get('Column_Domain', metadata.get('domain', '')) if metadata else email.split('@')[-1],
                'Page_Title': metadata.get('Column_Title', metadata.get('page_title', '')) if metadata else '',
                'Country': metadata.get('Column_Country', metadata.get('country', '')) if metadata else '',
                'City': metadata.get('Column_City', metadata.get('city', '')) if metadata else ''
            })

    # Generate output filenames
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    base_name = os.path.basename(input_file).replace('_clean_', '_').replace('.txt', '')
    output_dir = os.path.dirname(input_file)

    qualified_txt = os.path.join(output_dir, f"{base_name}_QUALIFIED_{timestamp}.txt")
    qualified_csv = os.path.join(output_dir, f"{base_name}_QUALIFIED_{timestamp}.csv")
    qualified_json = os.path.join(output_dir, f"{base_name}_QUALIFIED_{timestamp}.json")
    excluded_txt = os.path.join(output_dir, f"{base_name}_EXCLUDED_{timestamp}.txt")
    exclusion_report = os.path.join(output_dir, f"{base_name}_EXCLUSION_REPORT_{timestamp}.csv")

    # Save qualified emails (TXT)
    print(f"\n💾 Сохранение результатов...")
    with open(qualified_txt, 'w', encoding='utf-8') as f:
        for email, _ in qualified:
            f.write(email + '\n')

    # Save qualified with metadata (CSV and JSON) if metadata exists
    if metadata_map:
        # CSV format
        with open(qualified_csv, 'w', encoding='utf-8', newline='') as f:
            if qualified and qualified[0][1]:
                # Get all field names from first record
                sample_metadata = qualified[0][1]
                fieldnames = ['email'] + [k for k in sample_metadata.keys() if k != 'email']

                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for email, meta in qualified:
                    if meta:
                        row = {'email': email}
                        row.update({k: v for k, v in meta.items() if k != 'email'})
                        writer.writerow(row)

        # JSON format (preserves nested structure)
        with open(qualified_json, 'w', encoding='utf-8') as f:
            json_data = {
                'metadata': {
                    'generated_date': datetime.now().isoformat(),
                    'total_count': len(qualified),
                    'format_version': '1.0',
                    'filter_applied': 'exclusion_only'
                },
                'emails': []
            }

            for email, meta in qualified:
                if meta:
                    json_data['emails'].append(meta)

            json.dump(json_data, f, ensure_ascii=False, indent=2)

    # Save excluded emails (TXT)
    with open(excluded_txt, 'w', encoding='utf-8') as f:
        for email, _ in excluded:
            f.write(email + '\n')

    # Save exclusion report (CSV)
    with open(exclusion_report, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['Email', 'Exclusion_Reason', 'Domain', 'Page_Title', 'Country', 'City']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(exclusion_details)

    # Print statistics
    print(f"\n{'='*70}")
    print(f"📊 СТАТИСТИКА ФИЛЬТРАЦИИ")
    print(f"{'='*70}")
    print(f"Всего обработано:        {len(emails):,}")
    print(f"✅ Прошли фильтр:        {len(qualified):,} ({len(qualified)/len(emails)*100:.1f}%)")
    print(f"❌ Исключено:            {len(excluded):,} ({len(excluded)/len(emails)*100:.1f}%)")

    print(f"\n{'='*70}")
    print(f"ПРИЧИНЫ ИСКЛЮЧЕНИЯ (ТОП-20):")
    print(f"{'='*70}")

    # Sort by count and show top 20
    sorted_reasons = sorted(exclusion_stats.items(), key=lambda x: x[1], reverse=True)
    for i, (reason, count) in enumerate(sorted_reasons[:20], 1):
        print(f"{i:2d}. {reason}: {count:,} ({count/len(excluded)*100:.1f}%)")

    if len(sorted_reasons) > 20:
        other_count = sum(count for _, count in sorted_reasons[20:])
        print(f"    ... и еще {len(sorted_reasons) - 20} причин ({other_count:,} исключений)")

    print(f"\n{'='*70}")
    print(f"📁 ВЫХОДНЫЕ ФАЙЛЫ:")
    print(f"{'='*70}")
    print(f"✅ Прошедшие фильтр (TXT): {os.path.basename(qualified_txt)}")
    if metadata_map:
        print(f"✅ Прошедшие фильтр (CSV): {os.path.basename(qualified_csv)}")
        print(f"✅ Прошедшие фильтр (JSON): {os.path.basename(qualified_json)}")
    print(f"❌ Исключенные (TXT):      {os.path.basename(excluded_txt)}")
    print(f"📋 Отчет об исключениях:   {os.path.basename(exclusion_report)}")
    print(f"{'='*70}\n")

    # Return stats for programmatic use
    return {
        'total': len(emails),
        'qualified': len(qualified),
        'excluded': len(excluded),
        'exclusion_stats': dict(exclusion_stats),
        'output_files': {
            'qualified_txt': qualified_txt,
            'qualified_csv': qualified_csv if metadata_map else None,
            'qualified_json': qualified_json if metadata_map else None,
            'excluded_txt': excluded_txt,
            'exclusion_report': exclusion_report
        }
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("="*70)
        print("  EXCLUSION FILTER - Фильтрация без сегментации по приоритетам")
        print("="*70)
        print("\nИспользование:")
        print("  python exclusion_filter.py <input_file> [config_file]")
        print("\nПримеры:")
        print("  python exclusion_filter.py output/file_clean.txt")
        print("  python exclusion_filter.py output/file_clean.txt smart_filters/configs/custom_config.json")
        print("\nПо умолчанию используется конфигурация:")
        print("  smart_filters/configs/mechanical_power_transmission_config.json")
        print("="*70)
        sys.exit(1)

    input_file = sys.argv[1]
    config_file = sys.argv[2] if len(sys.argv) > 2 else 'smart_filters/configs/mechanical_power_transmission_config.json'

    if not os.path.exists(input_file):
        print(f"❌ Файл не найден: {input_file}")
        sys.exit(1)

    if not os.path.exists(config_file):
        print(f"❌ Конфигурация не найдена: {config_file}")
        sys.exit(1)

    process_file(input_file, config_file)
